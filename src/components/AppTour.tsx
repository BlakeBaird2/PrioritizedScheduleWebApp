"use client";

import { useEffect, useState } from "react";
import { useApp } from "./context";
import { KEYS, useStored, writeStored } from "./store";
import { Tour, type TourStep } from "./ui";

const START_EVENT = "prio:start-tour";

/** Shows the quick tour again, from Settings or the development shortcuts. */
export function startTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

/**
 * Four stops, in the order the Plan screen answers its questions: what to do now,
 * the rest of today, what's due, and where everything else lives.
 */
const STEPS: TourStep[] = [
  {
    target: "now",
    title: "Start here",
    body: "This is the one task to work on in your free time right now. Press Done when you finish it, and the plan moves on to the next thing.",
  },
  {
    target: "today",
    title: "Your day, already planned",
    body: "Every free gap between your classes and work is filled with what's due soonest. Pick another day to see its plan.",
  },
  {
    target: "due",
    title: "What's due this week",
    body: "Everything due in the next seven days, and when it's planned. If something won't fit before it's due, it says so here.",
  },
  {
    target: "nav",
    title: "Everything else",
    body: "Calendar shows your week, Upcoming lists everything due, and Classes shows each class. Settings has your calendars and this tour.",
  },
];

/**
 * Runs the tour once, the first time someone reaches the Plan screen, after they
 * have read the prototype notice and while nothing else is open. After that it
 * only runs when asked for.
 */
export function AppTour({ blocked }: { blocked: boolean }) {
  const { view, setView } = useApp();
  const seen = useStored(KEYS.tour);
  const noticeRead = useStored(KEYS.prototypeNotice);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    const onStart = () => {
      setView("plan");
      setAsked(true);
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [setView]);

  const firstTime = seen === null && noticeRead !== null;
  if (view !== "plan" || blocked || !(asked || firstTime)) return null;

  return (
    <Tour
      steps={STEPS}
      onClose={() => {
        writeStored(KEYS.tour, new Date().toISOString());
        setAsked(false);
      }}
    />
  );
}
