"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, MapPin, Plus, Trash, X } from "lucide-react";
import { daysLabel, meetingPatterns } from "@/lib/meetings";
import { randomId } from "@/lib/workspace";
import type { Course, WeeklyBlock } from "@/lib/types";
import { hhmmToMinutes, minutesLabel } from "@/lib/ui";
import { courseStyle, useApp } from "./context";

/** Monday-first day buttons. */
export function DayToggles({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const letters = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
  return (
    <div className="flex gap-1" role="group" aria-label="Days">
      {order.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={names[d]}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
            className={`w-8 h-8 rounded-full text-xs font-semibold border transition ${on ? "bg-accent text-white border-accent" : "border-line text-muted hover:border-line-strong"}`}
          >
            {letters[d]}
          </button>
        );
      })}
    </div>
  );
}

export function timeRange(start: number, end: number): string {
  return `${minutesLabel(start)} – ${minutesLabel(end)}`;
}

/** The weekly times a class meets, whether entered here or already on its calendar. */
export function useClassTimes(course: Course) {
  const { ws, model, now } = useApp();
  const entered = ws.weekly.filter((b) => b.courseId === course.id);
  const fromFeed = useMemo(() => meetingPatterns(model.events, course.id, now), [model.events, course.id, now]);
  return { entered, fromFeed, any: entered.length > 0 || fromFeed.length > 0 };
}

/** One line per meeting pattern, e.g. "Mon, Wed · 9:30 AM – 10:45 AM". */
export function ClassTimesSummary({ course }: { course: Course }) {
  const { entered, fromFeed } = useClassTimes(course);
  const lines = [
    ...entered.map((b) => `${daysLabel(b.days)} · ${timeRange(hhmmToMinutes(b.start), hhmmToMinutes(b.end))}${b.location ? ` · ${b.location}` : ""}`),
    ...fromFeed.map((p) => `${daysLabel(p.days)} · ${timeRange(p.start, p.end)}`),
  ];
  if (lines.length === 0) return null;
  return (
    <div className="text-xs text-muted space-y-0.5">
      {lines.map((l) => (
        <div key={l} className="flex items-center gap-1.5">
          <CalendarClock size={12} className="shrink-0" />
          {l}
        </div>
      ))}
    </div>
  );
}

function ClassTimeForm({ courseId, onDone }: { courseId: string; onDone: () => void }) {
  const { update } = useApp();
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:50");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (days.length === 0) return setError("Pick the days it meets.");
    if (end <= start) return setError("The end time needs to be after the start.");
    const block: WeeklyBlock = { id: randomId(), label: "Class", courseId, days: [...days].sort(), start, end };
    if (location.trim()) block.location = location.trim().slice(0, 80);
    update((w) => ({ ...w, weekly: [...w.weekly, block] }));
    onDone();
  };

  return (
    <form onSubmit={save} className="mt-2 rounded-xl border border-dashed border-line-strong p-3 space-y-2.5">
      <DayToggles value={days} onChange={setDays} />
      <div className="flex items-center gap-1.5 flex-wrap">
        <input type="time" step={300} className="input input-sm" aria-label="Starts" value={start} onChange={(e) => setStart(e.target.value)} />
        <span className="text-muted text-sm">to</span>
        <input type="time" step={300} className="input input-sm" aria-label="Ends" value={end} onChange={(e) => setEnd(e.target.value)} />
        <input className="input input-sm flex-1 min-w-[8rem]" placeholder="Room (optional)" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} />
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary !py-1.5 !text-[0.8125rem]">
          Save
        </button>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ClassTimesRow({ course }: { course: Course }) {
  const { update, model } = useApp();
  const { entered, fromFeed } = useClassTimes(course);
  const [adding, setAdding] = useState(false);
  const feedName = model.feedById.get(course.feedId)?.name ?? "its calendar";

  return (
    <li className="py-3" style={courseStyle(course.color)}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="course-dot" />
        <span className="course-text font-semibold text-sm">{course.code}</span>
        {course.title !== course.code ? <span className="text-sm text-muted truncate">{course.title}</span> : null}
      </div>
      <div className="pl-4 mt-1.5 space-y-1">
        {fromFeed.map((p) => (
          <p key={`${p.start}-${p.end}`} className="text-sm">
            {daysLabel(p.days)} · {timeRange(p.start, p.end)} <span className="text-xs text-muted">· already on {feedName}</span>
          </p>
        ))}
        {entered.map((b) => (
          <div key={b.id} className="flex items-center gap-2 text-sm">
            <span>
              {daysLabel(b.days)} · {timeRange(hhmmToMinutes(b.start), hhmmToMinutes(b.end))}
            </span>
            {b.location ? (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted">
                <MapPin size={11} />
                {b.location}
              </span>
            ) : null}
            <button
              type="button"
              className="ml-auto text-faint hover:text-danger p-1"
              aria-label={`Remove this ${course.code} time`}
              onClick={() => update((w) => ({ ...w, weekly: w.weekly.filter((x) => x.id !== b.id) }))}
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
        {adding ? (
          <ClassTimeForm courseId={course.id} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" className="inline-flex items-center gap-1 text-sm text-accent font-medium hover:underline" onClick={() => setAdding(true)}>
            <Plus size={14} />
            {entered.length || fromFeed.length ? "Add another time" : "Add class time"}
          </button>
        )}
      </div>
    </li>
  );
}

/** Every class, with when it meets and a way to add times. */
export function ClassTimesEditor() {
  const { model } = useApp();
  if (model.visibleCourses.length === 0) return <p className="text-sm text-muted">Classes appear here once you add a school calendar.</p>;
  return (
    <ul className="divide-y divide-line">
      {model.visibleCourses.map((c) => (
        <ClassTimesRow key={c.id} course={c} />
      ))}
    </ul>
  );
}

export function ClassTimesDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 fade-in" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="class-times-title" className="fixed z-50 inset-x-4 top-[6vh] mx-auto max-w-lg card p-5 fade-in max-h-[88dvh] overflow-y-auto scrollbar-thin">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 id="class-times-title" className="text-base font-semibold">
              When do your classes meet?
            </h2>
            <p className="mt-0.5 text-sm text-muted">They&apos;ll show on your calendar, and Prio will plan work around them.</p>
          </div>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="mt-2">
          <ClassTimesEditor />
        </div>
        <button type="button" className="btn-primary mt-3 w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </>
  );
}

/** Classes nobody has said the meeting times for yet. */
export function useClassesWithoutTimes(): Course[] {
  const { ws, model, now } = useApp();
  return useMemo(
    () =>
      model.visibleCourses.filter((c) => !ws.weekly.some((b) => b.courseId === c.id) && meetingPatterns(model.events, c.id, now).length === 0),
    [ws.weekly, model, now],
  );
}
