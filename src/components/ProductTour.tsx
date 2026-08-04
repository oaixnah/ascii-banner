import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  TOUR_STORAGE_KEY,
  parseTourState,
  serializeTourState,
  type TourMessages,
  type TourStatus,
  type TourStep,
} from "../lib/tour";

interface Props {
  copy: TourMessages;
  ready: boolean;
  replayToken: number;
  steps: TourStep[];
}

interface TargetRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

type TourMode = "idle" | "welcome" | "tour";

const SPOTLIGHT_GAP = 7;
const HEADER_OFFSET = 84;

const readStoredState = () => {
  try {
    return parseTourState(window.localStorage.getItem(TOUR_STORAGE_KEY));
  } catch {
    return null;
  }
};

const persistState = (status: TourStatus) => {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, serializeTourState(status));
  } catch {
    // The tour remains usable when storage is unavailable.
  }
};

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
);

export default function ProductTour({ copy, ready, replayToken, steps }: Props) {
  const [mode, setMode] = useState<TourMode>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const checkedFirstVisitRef = useRef(false);
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const previousReplayTokenRef = useRef(replayToken);
  const step = steps[stepIndex];
  const descriptionId = step ? `product-tour-description-${step.id}` : "product-tour-description";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!ready || checkedFirstVisitRef.current) return;
    checkedFirstVisitRef.current = true;
    if (readStoredState()) return;
    const root = document.querySelector<HTMLElement>("[data-tour-root]");
    if (!root) return;
    let animationFrame = 0;
    const showWhenVisible = () => {
      animationFrame = 0;
      const rect = root.getBoundingClientRect();
      if (rect.top >= window.innerHeight || rect.bottom <= HEADER_OFFSET) return;
      setMode("welcome");
      observer.disconnect();
      window.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
    };
    const scheduleCheck = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(showWhenVisible);
    };
    const observer = new IntersectionObserver(scheduleCheck, { threshold: 0 });
    observer.observe(root);
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck);
    showWhenVisible();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [ready]);

  useEffect(() => {
    if (replayToken === previousReplayTokenRef.current) return;
    previousReplayTokenRef.current = replayToken;
    setStepIndex(0);
    setMode("tour");
  }, [replayToken]);

  useEffect(() => {
    if (mode !== "tour" || !step) {
      setTargetRect(null);
      return;
    }

    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let previousDescription = "";
    let previousTarget: HTMLElement | null = null;

    const restoreTarget = () => {
      if (!previousTarget) return;
      previousTarget.removeAttribute("data-tour-active");
      if (previousDescription) previousTarget.setAttribute("aria-describedby", previousDescription);
      else previousTarget.removeAttribute("aria-describedby");
      previousTarget = null;
      previousDescription = "";
    };

    const resolveTarget = () => (
      document.querySelector<HTMLElement>(step.target) ??
      document.querySelector<HTMLElement>(step.fallback)
    );

    const updateGeometry = () => {
      animationFrame = 0;
      const target = resolveTarget();
      if (!target) {
        restoreTarget();
        activeTargetRef.current = null;
        setTargetRect(null);
        return;
      }

      if (target !== previousTarget) {
        restoreTarget();
        previousTarget = target;
        previousDescription = target.getAttribute("aria-describedby") ?? "";
        const descriptions = [previousDescription, descriptionId].filter(Boolean).join(" ");
        target.setAttribute("aria-describedby", descriptions);
        target.setAttribute("data-tour-active", "");
        activeTargetRef.current = target;
        resizeObserver?.disconnect();
        resizeObserver?.observe(target);
      }

      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: Math.max(0, rect.top - SPOTLIGHT_GAP),
        right: Math.min(window.innerWidth, rect.right + SPOTLIGHT_GAP),
        bottom: Math.min(window.innerHeight, rect.bottom + SPOTLIGHT_GAP),
        left: Math.max(0, rect.left - SPOTLIGHT_GAP),
        width: Math.min(window.innerWidth, rect.right + SPOTLIGHT_GAP) - Math.max(0, rect.left - SPOTLIGHT_GAP),
        height: Math.min(window.innerHeight, rect.bottom + SPOTLIGHT_GAP) - Math.max(0, rect.top - SPOTLIGHT_GAP),
      });
    };

    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateGeometry);
    };

    const target = resolveTarget();
    if (target) {
      const rect = target.getBoundingClientRect();
      const isMobile = window.matchMedia("(max-width: 700px)").matches;
      const usableBottom = window.innerHeight - (isMobile ? 230 : 24);
      if (rect.top < HEADER_OFFSET || rect.bottom > usableBottom) {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
      }
    }

    resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);
    const root = document.querySelector<HTMLElement>("[data-tour-root]");
    const mutationObserver = typeof MutationObserver === "undefined" || !root
      ? null
      : new MutationObserver(scheduleUpdate);
    if (root) mutationObserver?.observe(root, { childList: true, subtree: true });
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    updateGeometry();
    const settleTimer = window.setTimeout(scheduleUpdate, 220);

    return () => {
      window.clearTimeout(settleTimer);
      restoreTarget();
      activeTargetRef.current = null;
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [descriptionId, mode, step]);

  useEffect(() => {
    if (mode !== "tour") return;
    popoverRef.current?.focus({ preventScroll: true });
  }, [mode, stepIndex]);

  useEffect(() => {
    if (mode === "idle") return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      persistState("dismissed");
      setMode("idle");
    };
    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [mode]);

  const start = () => {
    setStepIndex(0);
    setMode("tour");
  };

  const close = (status: TourStatus) => {
    persistState(status);
    setMode("idle");
  };

  const next = () => {
    if (stepIndex === steps.length - 1) close("completed");
    else setStepIndex((current) => current + 1);
  };

  const previous = () => setStepIndex((current) => Math.max(0, current - 1));

  const popoverPosition = (): CSSProperties => {
    if (!targetRect || typeof window === "undefined") return {};
    const width = 340;
    const height = 220;
    const gap = 16;
    const margin = 12;
    if (targetRect.right + gap + width <= window.innerWidth - margin) {
      return {
        left: targetRect.right + gap,
        top: clamp(targetRect.top + targetRect.height / 2 - height / 2, HEADER_OFFSET, window.innerHeight - height - margin),
      };
    }
    if (targetRect.left - gap - width >= margin) {
      return {
        left: targetRect.left - gap - width,
        top: clamp(targetRect.top + targetRect.height / 2 - height / 2, HEADER_OFFSET, window.innerHeight - height - margin),
      };
    }
    if (targetRect.bottom + gap + height <= window.innerHeight - margin) {
      return {
        left: clamp(targetRect.left + targetRect.width / 2 - width / 2, margin, window.innerWidth - width - margin),
        top: targetRect.bottom + gap,
      };
    }
    return {
      left: clamp(targetRect.left + targetRect.width / 2 - width / 2, margin, window.innerWidth - width - margin),
      top: Math.max(HEADER_OFFSET, targetRect.top - height - gap),
    };
  };

  if (!mounted || mode === "idle") return null;

  return createPortal(
    mode === "welcome" ? (
      <aside className="tour-welcome" role="dialog" aria-labelledby="tour-welcome-title" aria-describedby="tour-welcome-description">
        <button className="tour-close" type="button" aria-label={copy.closeLabel} onClick={() => close("dismissed")}>
          <X size={16} aria-hidden="true" />
        </button>
        <span className="tour-eyebrow">{copy.welcomeEyebrow}</span>
        <h2 id="tour-welcome-title">{copy.welcomeTitle}</h2>
        <p id="tour-welcome-description">{copy.welcomeDescription}</p>
        <div className="tour-welcome-actions">
          <button className="tour-secondary" type="button" onClick={() => close("dismissed")}>{copy.notNow}</button>
          <button className="tour-primary" type="button" onClick={start}>
            {copy.start} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </aside>
    ) : step ? (
      <div className="product-tour" data-step={step.id}>
        {targetRect && (
          <div
            className="tour-spotlight"
            aria-hidden="true"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />
        )}
        <div
          className={`tour-popover ${targetRect ? "has-target" : ""}`}
          role="dialog"
          aria-modal="false"
          aria-labelledby="product-tour-title"
          aria-describedby={descriptionId}
          ref={popoverRef}
          tabIndex={-1}
          style={popoverPosition()}
        >
          <div className="tour-progress-row">
            <span className="tour-progress" aria-live="polite">{copy.progress(stepIndex + 1, steps.length)}</span>
            <button className="tour-close" type="button" aria-label={copy.closeLabel} onClick={() => close("dismissed")}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="tour-progress-track" aria-hidden="true">
            <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
          </div>
          <h2 id="product-tour-title">{step.title}</h2>
          <p id={descriptionId}>{step.description}</p>
          <div className="tour-actions">
            <button className="tour-skip" type="button" onClick={() => close("dismissed")}>{copy.skip}</button>
            <span className="tour-step-actions">
              {stepIndex > 0 && (
                <button className="tour-secondary" type="button" onClick={previous}>
                  <ArrowLeft size={14} aria-hidden="true" /> {copy.back}
                </button>
              )}
              <button className="tour-primary" type="button" onClick={next}>
                {stepIndex === steps.length - 1 ? (
                  <>{copy.finish} <Check size={15} aria-hidden="true" /></>
                ) : (
                  <>{copy.next} <ArrowRight size={15} aria-hidden="true" /></>
                )}
              </button>
            </span>
          </div>
        </div>
      </div>
    ) : null,
    document.body,
  );
}
