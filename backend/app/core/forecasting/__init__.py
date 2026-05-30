"""Public exports for the forecasting package."""
from app.core.forecasting.forecaster import HospitalForecaster, ForecastResult

__all__ = ["HospitalForecaster", "ForecastResult"]
