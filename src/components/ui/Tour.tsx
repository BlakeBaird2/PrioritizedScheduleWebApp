"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "./Button";

export type TourStep = {
  /** Matches `data-tour="…"` on the element to point at. The first visible match is used. */
  target: string;
  title: string;
  body: string;
};

type Box = { top: number; left: number; width: number; height: number };

/**
 * A short guided tour: it outlines one part of the screen at a time and explains it
 * in a sentence or two. Deliberately light:
 *
 * - nothing is blocked or dimmed, so people can still look around and click
 * - "Skip tour" and Esc end it at any point, and it is never forced to the end
 * - it always says where you are ("2 of 4") and lets you go back
 *
 * On phones the card sits at the bottom of the screen instead of next to the part.
 */
export function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [narrow, setNarrow] = useState(false);
  const titleId = useId();
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const find = useCallback((target: string) => {
    return [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].find((el) => el.offsetParent !== null) ?? null;
  }, []);

  // Keep the outline on the part, looking it up again each frame: the screen can
  // re-render underneath (calendars finishing loading), replacing the element.
  // Each time a new element turns up, bring it into view.
  useLayoutEffect(() => {
    let frame = 0;
    let shown: HTMLElement | null = null;
    const measure = () => {
      const el = find(step.target);
      if (el && el !== shown) {
        shown = el;
        el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
      const r = el?.getBoundingClientRect();
      // Only re-render when the part actually moved (scrolling, resizing).
      setBox((b) =>
        !r || r.width === 0
          ? null
          : b && b.top === r.top && b.left === r.left && b.width === r.width && b.height === r.height
            ? b
            : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
      setNarrow(window.innerWidth < 640);
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [step.target, find]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Put the card under the part if there is room, otherwise above it.
  const CARD_W = 340;
  let cardStyle: React.CSSProperties | undefined;
  if (box && !narrow) {
    const below = box.top + box.height + 14;
    const fitsBelow = below + 230 < window.innerHeight;
    const left = Math.min(Math.max(12, box.left), window.innerWidth - CARD_W - 12);
    cardStyle = fitsBelow ? { top: below, left, width: CARD_W } : { top: Math.max(12, box.top - 14 - 230), left, width: CARD_W };
  }

  return (
    <>
      {box ? (
        <div
          aria-hidden
          className="fixed z-[70] pointer-events-none border-[3px] border-fg"
          style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        className={`fixed z-[71] bg-surface border-2 border-fg p-4 fade-in ${narrow || !box ? "inset-x-3 bottom-3" : ""}`}
        style={cardStyle}
      >
        <div className="flex items-center gap-2">
          <span className="section-title">
            Quick tour · {index + 1} of {steps.length}
          </span>
          <span className="ml-auto flex gap-1" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.target} className={`h-1.5 w-4 border border-fg ${i <= index ? "bg-fg" : "bg-surface"}`} />
            ))}
          </span>
        </div>
        <h2 id={titleId} className="mt-2 text-lg font-bold leading-snug">
          {step.title}
        </h2>
        <p className="mt-1 text-[0.9375rem] text-muted leading-relaxed">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="quiet" size="sm" onClick={onClose}>
            Skip tour
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {index > 0 ? (
              <Button size="sm" icon={ArrowLeft} onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            ) : null}
            <Button
              ref={nextRef}
              variant="primary"
              size="sm"
              icon={last ? Check : undefined}
              trailingIcon={last ? undefined : ArrowRight}
              onClick={() => (last ? onClose() : setIndex(index + 1))}
            >
              {last ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
