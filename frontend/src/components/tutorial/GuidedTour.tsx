"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTourStore } from "@/store/tourStore";
import { TOUR_STEPS } from "@/components/tutorial/tourSteps";

const SEEN_KEY = "pf-tour-seen";
const POPUP_WIDTH = 340;
const SPOTLIGHT_PAD = 8;
const VIEWPORT_MARGIN = 16;
const DODGE_GAP = 16;
const POPUP_HEIGHT_ESTIMATE = 260;

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { active, stepIndex, start, stop, next, prev } = useTourStore();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [popupEl, setPopupEl] = useState<HTMLDivElement | null>(null);
  const [popupHeight, setPopupHeight] = useState(POPUP_HEIGHT_ESTIMATE);
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined"
      ? { w: 1280, h: 800 }
      : { w: window.innerWidth, h: window.innerHeight },
  );
  const lastNavigatedStep = useRef(-1);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        const t = setTimeout(() => start(), 900);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [start]);

  useEffect(() => {
    if (!active) {
      lastNavigatedStep.current = -1;
      return;
    }
    if (!step) return;
    if (lastNavigatedStep.current !== stepIndex) {
      lastNavigatedStep.current = stepIndex;
      setRect(null);
      if (pathname !== step.route) router.push(step.route);
    }
  }, [active, stepIndex, step, pathname, router]);

  useEffect(() => {
    if (!active || !step) return;
    if (pathname !== step.route) setRect(null);
  }, [active, pathname, step]);

  useEffect(() => {
    if (!active || !step || pathname !== step.route || !step.target) return;
    let cancelled = false;

    const locate = (attempts = 0) => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        window.setTimeout(() => {
          if (!cancelled) setRect(el.getBoundingClientRect());
        }, 300);
      } else if (attempts < 30) {
        window.setTimeout(() => locate(attempts + 1), 100);
      }
    };
    locate();

    const update = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, stepIndex, pathname, step]);

  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!popupEl) return;
    const measure = () => setPopupHeight(popupEl.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(popupEl);
    return () => observer.disconnect();
  }, [popupEl]);

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    stop();
  };

  const handleNext = () => (isLast ? finish() : next());

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft" && !isFirst) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, isFirst, isLast, stepIndex]);

  if (!active || !step) return null;

  const hasSpotlight = !!step.target && !!rect;
  const spotlightStyle = hasSpotlight
    ? {
        top: rect!.top - SPOTLIGHT_PAD,
        left: rect!.left - SPOTLIGHT_PAD,
        width: rect!.width + SPOTLIGHT_PAD * 2,
        height: rect!.height + SPOTLIGHT_PAD * 2,
      }
    : null;

  const popupPos: { top: number; left: number } = (() => {
    const { w: vw, h: vh } = viewport;
    const clampLeft = (left: number) =>
      Math.min(
        Math.max(left, VIEWPORT_MARGIN),
        Math.max(vw - POPUP_WIDTH - VIEWPORT_MARGIN, VIEWPORT_MARGIN),
      );
    const top = Math.max((vh - popupHeight) / 2, VIEWPORT_MARGIN);
    const centred = clampLeft((vw - POPUP_WIDTH) / 2);

    if (!hasSpotlight) return { top, left: centred };

    const spot = {
      top: rect!.top - SPOTLIGHT_PAD,
      bottom: rect!.bottom + SPOTLIGHT_PAD,
      left: rect!.left - SPOTLIGHT_PAD,
      right: rect!.right + SPOTLIGHT_PAD,
    };
    const overlaps =
      top < spot.bottom &&
      top + popupHeight > spot.top &&
      centred < spot.right &&
      centred + POPUP_WIDTH > spot.left;
    if (!overlaps) return { top, left: centred };

    const needed = POPUP_WIDTH + DODGE_GAP + VIEWPORT_MARGIN;
    if (vw - spot.right >= needed) return { top, left: clampLeft(spot.right + DODGE_GAP) };
    if (spot.left >= needed) return { top, left: clampLeft(spot.left - DODGE_GAP - POPUP_WIDTH) };
    return { top, left: centred };
  })();

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {hasSpotlight ? (
        <motion.div
          className="fixed pointer-events-none rounded-[10px] border border-ink"
          style={{
            ...spotlightStyle,
            boxShadow: "0 0 0 9999px rgba(15, 24, 48, 0.75)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      ) : (
        <motion.div
          className="absolute inset-0"
          style={{ background: "rgba(15, 24, 48, 0.75)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          ref={setPopupEl}
          role="document"
          className="fixed bg-elevated border border-line rounded-lg p-5 shadow-2xl overflow-y-auto"
          style={{
            width: POPUP_WIDTH,
            top: popupPos.top,
            left: popupPos.left,
            maxHeight: viewport.h - VIEWPORT_MARGIN * 2,
          }}
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="mono text-[11px] text-muted uppercase tracking-widest">
              Step {stepIndex + 1} / {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={finish}
              aria-label="Close tour"
              className="text-muted hover:text-ink transition-colors -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-1 bg-canvas rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-status-safe rounded-full transition-all"
              style={{ width: `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          <h3 className="text-[15px] font-medium text-ink">{step.title}</h3>
          <p className="text-[13px] text-muted mt-2 leading-relaxed">{step.body}</p>

          <div className="flex items-center justify-between mt-5">
            <button
              type="button"
              onClick={finish}
              className="text-[12px] text-muted hover:text-ink transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous step"
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-muted hover:text-ink hover:bg-canvas transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-ink text-canvas hover:opacity-90 transition-opacity"
              >
                {isLast ? "Done" : "Next"}
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}