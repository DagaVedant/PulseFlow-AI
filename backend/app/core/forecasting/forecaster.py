"""
PulseFlow AI — Forecasting Engine
Time-series forecasting for hospital demand, wait times, and capacity planning.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

import numpy as np
from scipy.signal import savgol_filter
from scipy.stats import norm

@dataclass
class ForecastResult:
    horizon_minutes: int
    department: str
    metric: str
    timestamps: List[float]
    values: List[float]
    lower_bound: List[float]
    upper_bound: List[float]
    trend: str
    severity: str
    predicted_peak: Optional[float]
    predicted_peak_time: Optional[float]
    confidence: float

    def to_dict(self) -> dict:
        return {
            "horizon_minutes": self.horizon_minutes,
            "department": self.department,
            "metric": self.metric,
            "timestamps": [round(t, 1) for t in self.timestamps],
            "values": [round(v, 2) for v in self.values],
            "lower_bound": [round(v, 2) for v in self.lower_bound],
            "upper_bound": [round(v, 2) for v in self.upper_bound],
            "trend": self.trend,
            "severity": self.severity,
            "predicted_peak": round(self.predicted_peak, 2) if self.predicted_peak else None,
            "predicted_peak_time": round(self.predicted_peak_time, 1) if self.predicted_peak_time else None,
            "confidence": round(self.confidence, 3),
        }

class HospitalForecaster:
    """
    Multi-horizon forecasting for hospital operations.
    Uses Holt-Winters exponential smoothing with uncertainty quantification.
    """

    HORIZONS = {
        "1h": 60,
        "3h": 180,
        "6h": 360,
        "24h": 1440,
    }

    def forecast_all(
        self, metrics_history: List[dict], sim_time: float
    ) -> Dict[str, ForecastResult]:
        """Generate forecasts for all key metrics across all horizons."""
        results = {}

        if len(metrics_history) < 5:
            return {}

        wait_times = [h.get("avg_wait_time", 0) for h in metrics_history]
        icu_utils = [h.get("icu_utilization", 0) for h in metrics_history]
        bed_utils = [h.get("bed_utilization", 0) for h in metrics_history]
        er_utils = [h.get("er_utilization", 0) for h in metrics_history]
        throughputs = [h.get("throughput_per_hour", 0) for h in metrics_history]

        for label, horizon in self.HORIZONS.items():
            results[f"wait_time_{label}"] = self._forecast_series(
                wait_times, horizon, sim_time, "hospital", "avg_wait_time",
                threshold_warning=60, threshold_critical=90, unit="min",
            )
            results[f"icu_utilization_{label}"] = self._forecast_series(
                icu_utils, horizon, sim_time, "ICU", "utilization",
                threshold_warning=0.75, threshold_critical=0.90,
                value_cap=1.0,
            )
            results[f"bed_utilization_{label}"] = self._forecast_series(
                bed_utils, horizon, sim_time, "hospital", "bed_utilization",
                threshold_warning=0.80, threshold_critical=0.92,
                value_cap=1.0,
            )
            results[f"er_utilization_{label}"] = self._forecast_series(
                er_utils, horizon, sim_time, "ER", "utilization",
                threshold_warning=0.70, threshold_critical=0.85,
                value_cap=1.0,
            )

        return results

    def _forecast_series(
        self,
        values: List[float],
        horizon: int,
        sim_time: float,
        department: str,
        metric: str,
        threshold_warning: float = 0.75,
        threshold_critical: float = 0.90,
        value_cap: Optional[float] = None,
        unit: str = "",
    ) -> ForecastResult:
        """
        Holt-Winters double exponential smoothing with uncertainty intervals.
        """
        if not values:
            values = [0.0]

        if len(values) >= 5:
            try:
                smoothed = savgol_filter(values, min(len(values), 5), 2).tolist()
            except Exception:
                smoothed = values
        else:
            smoothed = values

        alpha = 0.3
        beta = 0.1

        level = smoothed[0]
        trend = 0.0
        if len(smoothed) > 1:
            trend = (smoothed[-1] - smoothed[0]) / len(smoothed)

        for v in smoothed[1:]:
            new_level = alpha * v + (1 - alpha) * (level + trend)
            new_trend = beta * (new_level - level) + (1 - beta) * trend
            level = new_level
            trend = new_trend

        forecast_steps = min(horizon, 1440)
        forecast = []
        for i in range(1, forecast_steps + 1):
            val = level + i * trend
            if value_cap is not None:
                val = min(value_cap, max(0.0, val))
            else:
                val = max(0.0, val)
            forecast.append(val)

        residuals = [abs(s - v) for s, v in zip(smoothed, values)]
        sigma = np.std(residuals) if residuals else 0.02
        sigma = max(sigma, 0.01 * (max(values) - min(values) if len(values) > 1 else 0.1))

        lower = []
        upper = []
        for i, v in enumerate(forecast):
            z = 1.645
            uncertainty = z * sigma * math.sqrt(1 + i * 0.05)
            lo = max(0.0, v - uncertainty)
            hi = v + uncertainty
            if value_cap:
                hi = min(value_cap, hi)
            lower.append(lo)
            upper.append(hi)

        if len(forecast) > 10:
            recent = forecast[:10]
            trend_val = (recent[-1] - recent[0]) / max(1, len(recent))
            if trend_val > 0.01 * (max(values) if values else 1):
                trend_str = "increasing"
            elif trend_val < -0.01 * (max(values) if values else 1):
                trend_str = "decreasing"
            else:
                trend_str = "stable"
        else:
            trend_str = "stable"

        peak_val = max(forecast) if forecast else 0
        if peak_val >= threshold_critical:
            severity = "critical"
        elif peak_val >= threshold_warning:
            severity = "warning"
        else:
            severity = "normal"

        peak_idx = forecast.index(peak_val) if forecast else 0
        peak_time = sim_time + peak_idx + 1

        timestamps = [sim_time + i for i in range(1, forecast_steps + 1)]

        confidence = max(0.5, 0.90 - 0.15 * (horizon / 60) / 24)

        return ForecastResult(
            horizon_minutes=horizon,
            department=department,
            metric=metric,
            timestamps=timestamps,
            values=forecast,
            lower_bound=lower,
            upper_bound=upper,
            trend=trend_str,
            severity=severity,
            predicted_peak=peak_val,
            predicted_peak_time=peak_time,
            confidence=confidence,
        )

    def forecast_demand(
        self, history: List[dict], sim_time: float, horizon_minutes: int = 60
    ) -> dict:
        """Forecast patient demand (arrivals) for the next horizon."""
        if len(history) < 5:
            return {}

        active = [h.get("active_patients", 0) for h in history]
        discharged = [h.get("discharged_today", 0) for h in history]

        if len(active) > 1:
            delta_active = [active[i] - active[i-1] for i in range(1, len(active))]
            avg_arrival = max(0, sum(delta_active[-30:]) / max(1, len(delta_active[-30:])))
        else:
            avg_arrival = 8.0 / 60

        current_hour = (sim_time / 60) % 24
        forecast_values = []
        for i in range(horizon_minutes):
            hour = (current_hour + i / 60) % 24
            tod_factor = 1.0 + 0.4 * math.sin((hour - 6) * math.pi / 12)
            rate = max(0, avg_arrival * tod_factor * 60)
            noise = random.gauss(0, 0.5)
            forecast_values.append(max(0, rate + noise))

        return {
            "horizon_minutes": horizon_minutes,
            "arrival_rate_forecast": [round(v, 2) for v in forecast_values],
            "peak_hour_forecast": round(max(forecast_values), 2),
            "avg_forecast": round(sum(forecast_values) / len(forecast_values), 2),
        }

    def generate_bottleneck_predictions(self, state: dict, history: List[dict]) -> List[dict]:
        """Predict upcoming bottlenecks with confidence scores."""
        predictions = []

        if not state or not history:
            return predictions

        depts = state.get("departments", {})
        metrics = state.get("metrics", {})

        for dept_key, dept_data in depts.items():
            occ = dept_data.get("occupancy", 0)
            queue = dept_data.get("queue_length", 0)
            cap = dept_data.get("capacity", 1)
            display = dept_data.get("display_name", dept_key)

            hist_occ = [
                h.get("departments", {}).get(dept_key, {}).get("occupancy", 0)
                if isinstance(h.get("departments"), dict) else occ
                for h in history[-10:]
            ]
            if not hist_occ:
                hist_occ = [occ]

            trend = (hist_occ[-1] - hist_occ[0]) / max(1, len(hist_occ))

            if occ > 0.65 or queue > 3:
                eta = max(5, int((0.95 - occ) / max(0.001, trend)))
                confidence = min(0.95, 0.60 + occ * 0.35)
                severity = "critical" if occ > 0.85 else ("warning" if occ > 0.70 else "info")

                predictions.append({
                    "department": display,
                    "dept_key": dept_key,
                    "metric": "occupancy",
                    "current_value": round(occ, 3),
                    "threshold": 0.90,
                    "predicted_breach": round(min(1.0, occ + trend * 30), 3),
                    "eta_minutes": min(360, max(5, eta)),
                    "confidence": round(confidence, 3),
                    "severity": severity,
                    "queue_length": queue,
                    "trend_direction": "increasing" if trend > 0 else "stable",
                })

        severity_order = {"critical": 0, "warning": 1, "info": 2}
        predictions.sort(
            key=lambda x: (severity_order.get(x["severity"], 2), -x["confidence"])
        )

        return predictions[:5]
