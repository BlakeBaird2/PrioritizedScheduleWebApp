"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, MapPin, Pencil, Plus, Trash, X } from "lucide-react";
import { daysLabel, meetingPatterns, parseMeetingKey, type MeetingPattern } from "@/lib/meetings";
import { randomId } from "@/lib/workspace";
import type { Course, WeeklyBlock } from "@/lib/types";
import { hhmmToMinutes, minutesLabel, minutesToHHMM } from "@/lib/ui";
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

/** A time that happened once is a special event, not when the class meets. */
const recurring = (patterns: MeetingPattern[]) => patterns.filter((p) => p.count >= 2);

export interface ClassTimeValues {
  days: number[];
  start: string;
  end: string;
  location: string;
}

const toHHMM = (minutes: number) => minutesToHHMM(Math.min(minutes, 23 * 60 + 59));

export function valuesFromPattern(p: MeetingPattern): ClassTimeValues {
  return { days: p.days, start: toHHMM(p.start), end: toHHMM(p.end), location: "" };
}

export function valuesFromBlock(b: WeeklyBlock): ClassTimeValues {
  return { days: b.days, start: b.start, end: b.end, location: b.location ?? "" };
}

function blockFrom(courseId: string, v: ClassTimeValues, id = randomId()): WeeklyBlock {
  const block: WeeklyBlock = { id, label: "Class", courseId, days: [...v.days].sort(), start: v.start, end: v.end };
  if (v.location.trim()) block.location = v.location.trim().slice(0, 80);
  return block;
}

/** Saving class times, including corrections to times that came from a class calendar. */
export function useClassTimeActions() {
  const { update } = useApp();
  return {
    add: (courseId: string, v: ClassTimeValues) => update((w) => ({ ...w, weekly: [...w.weekly, blockFrom(courseId, v)] })),
    replace: (block: WeeklyBlock, v: ClassTimeValues) =>
      update((w) => ({ ...w, weekly: w.weekly.map((b) => (b.id === block.id ? { ...blockFrom(block.courseId ?? "", v, block.id), skip: b.skip } : b)) })),
    /** Hide the calendar's meetings at this time and use the corrected time instead. */
    correct: (courseId: string, key: string, v: ClassTimeValues) =>
      update((w) => {
        const edit = w.courseEdits[courseId] ?? {};
        const off = [...new Set([...(edit.feedTimesOff ?? []), key])];
        return { ...w, weekly: [...w.weekly, blockFrom(courseId, v)], courseEdits: { ...w.courseEdits, [courseId]: { ...edit, feedTimesOff: off } } };
      }),
    restore: (courseId: string, key: string) =>
      update((w) => {
        const edit = { ...(w.courseEdits[courseId] ?? {}) };
        edit.feedTimesOff = (edit.feedTimesOff ?? []).filter((k) => k !== key);
        if (!edit.feedTimesOff.length) delete edit.feedTimesOff;
        return { ...w, courseEdits: { ...w.courseEdits, [courseId]: edit } };
      }),
  };
}

/** The weekly times a class meets, whether entered here or already on its calendar. */
export function useClassTimes(course: Course) {
  const { ws, model, now } = useApp();
  const entered = ws.weekly.filter((b) => b.courseId === course.id);
  const fromFeed = useMemo(() => recurring(meetingPatterns(model.events, course.id, now)), [model.events, course.id, now]);
  const replaced = ws.courseEdits[course.id]?.feedTimesOff ?? [];
  return { entered, fromFeed, replaced, any: entered.length > 0 || fromFeed.length > 0 };
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

export function ClassTimeForm({
  initial,
  note,
  onSave,
  onCancel,
}: {
  initial?: ClassTimeValues;
  note?: string;
  onSave: (v: ClassTimeValues) => void;
  onCancel: () => void;
}) {
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [start, setStart] = useState(initial?.start ?? "09:00");
  const [end, setEnd] = useState(initial?.end ?? "09:50");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (days.length === 0) return setError("Pick the days it meets.");
    if (end <= start) return setError("The end time needs to be after the start.");
    onSave({ days, start, end, location });
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
      {note ? <p className="text-xs text-muted">{note}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary !py-1.5 !text-[0.8125rem]">
          Save
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

type Editing = { kind: "new" } | { kind: "block"; block: WeeklyBlock } | { kind: "feed"; pattern: MeetingPattern } | null;

function ClassTimesRow({ course }: { course: Course }) {
  const { update, model } = useApp();
  const { entered, fromFeed, replaced } = useClassTimes(course);
  const actions = useClassTimeActions();
  const [editing, setEditing] = useState<Editing>(null);
  const feedName = model.feedById.get(course.feedId)?.name ?? "its calendar";
  const done = () => setEditing(null);

  const editButton = (onClick: () => void, what: string) => (
    <button type="button" className="text-faint hover:text-fg p-1" aria-label={`Edit ${what}`} title="Change this time" onClick={onClick}>
      <Pencil size={13} />
    </button>
  );

  return (
    <li className="py-3" style={courseStyle(course.color)}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="course-dot" />
        <span className="course-text font-semibold text-sm">{course.code}</span>
        {course.title !== course.code ? <span className="text-sm text-muted truncate">{course.title}</span> : null}
      </div>
      <div className="pl-4 mt-1.5 space-y-1">
        {fromFeed.map((p) =>
          editing?.kind === "feed" && editing.pattern.key === p.key ? (
            <ClassTimeForm
              key={p.key}
              initial={valuesFromPattern(p)}
              note={`Your time replaces ${feedName}'s ${timeRange(p.start, p.end)} meetings. You can switch back any time.`}
              onSave={(v) => {
                actions.correct(course.id, p.key, v);
                done();
              }}
              onCancel={done}
            />
          ) : (
            <div key={p.key} className="flex items-center gap-2 text-sm">
              <span>
                {daysLabel(p.days)} · {timeRange(p.start, p.end)} <span className="text-xs text-muted">· from {feedName}</span>
              </span>
              <span className="ml-auto">{editButton(() => setEditing({ kind: "feed", pattern: p }), `${course.code} time`)}</span>
            </div>
          ),
        )}
        {entered.map((b) =>
          editing?.kind === "block" && editing.block.id === b.id ? (
            <ClassTimeForm
              key={b.id}
              initial={valuesFromBlock(b)}
              onSave={(v) => {
                actions.replace(b, v);
                done();
              }}
              onCancel={done}
            />
          ) : (
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
              <span className="ml-auto flex items-center">
                {editButton(() => setEditing({ kind: "block", block: b }), `${course.code} time`)}
                <button
                  type="button"
                  className="text-faint hover:text-danger p-1"
                  aria-label={`Remove this ${course.code} time`}
                  onClick={() => update((w) => ({ ...w, weekly: w.weekly.filter((x) => x.id !== b.id) }))}
                >
                  <Trash size={13} />
                </button>
              </span>
            </div>
          ),
        )}
        {replaced.map((key) => {
          const { start, end } = parseMeetingKey(key);
          return (
            <p key={key} className="text-xs text-muted">
              {feedName}&apos;s {timeRange(start, end)} meetings are hidden.{" "}
              <button type="button" className="underline underline-offset-2 hover:text-fg" onClick={() => actions.restore(course.id, key)}>
                Show them again
              </button>
            </p>
          );
        })}
        {editing?.kind === "new" ? (
          <ClassTimeForm
            onSave={(v) => {
              actions.add(course.id, v);
              done();
            }}
            onCancel={done}
          />
        ) : (
          <button type="button" className="inline-flex items-center gap-1 text-sm text-accent font-medium hover:underline" onClick={() => setEditing({ kind: "new" })}>
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
            <p className="mt-0.5 text-sm text-muted">They&apos;ll show on your calendar, and SmartScheduler will plan work around them.</p>
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
      model.visibleCourses.filter((c) => !ws.weekly.some((b) => b.courseId === c.id) && recurring(meetingPatterns(model.events, c.id, now)).length === 0),
    [ws.weekly, model, now],
  );
}
