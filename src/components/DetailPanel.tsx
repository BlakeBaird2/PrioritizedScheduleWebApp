"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { ArrowRight, CircleAlert, Clock3, ExternalLink, MapPin, Pencil, Trash, X } from "lucide-react";
import { PROVIDER_LABEL } from "@/lib/feeds/url";
import { parseWeeklyId } from "@/lib/model";
import { daysLabel, meetingKey, meetingPatterns } from "@/lib/meetings";
import type { CalEvent, Task } from "@/lib/types";
import { clockRange, dueDate, duration, relativeDue, typeMeta } from "@/lib/ui";
import { courseStyle, useApp, type Selection } from "./context";
import { DoneToggle } from "./TaskRow";
import { TypeChip } from "./TypeChip";
import { ClassTimeForm, useClassTimeActions, valuesFromBlock, valuesFromPattern } from "./ClassTimes";

export function DetailPanel({ selection, onClose }: { selection: NonNullable<Selection>; onClose: () => void }) {
  const { model } = useApp();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const task = selection.kind === "task" ? model.tasks.find((t) => t.id === selection.id) : undefined;
  const event = selection.kind === "event" ? model.events.find((e) => e.id === selection.id) : undefined;
  if (!task && !event) return null;
  const color = task ? (task.courseId ? model.courseById.get(task.courseId)?.color : undefined) : event?.color;

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-40 fade-in" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={task?.title ?? event?.title}
        style={courseStyle(color)}
        className="panel-enter fixed z-50 bg-surface border-line shadow-xl flex flex-col
                   inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t
                   md:inset-y-0 md:right-0 md:left-auto md:w-[26rem] md:max-h-none md:rounded-none md:border-l md:border-t-0"
      >
        {task ? <TaskDetail task={task} onClose={onClose} /> : <EventDetail event={event!} onClose={onClose} />}
      </aside>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="section-title mb-1">{children}</div>;
}

const ESTIMATES = [15, 30, 45, 60, 90, 120, 180, 240, 360];

function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const { model, index, now, changes, ws, setEstimate, update, setView, setPlanDay } = useApp();
  const course = task.courseId ? model.courseById.get(task.courseId) : undefined;
  const feed = task.feedId ? model.feedById.get(task.feedId) : undefined;
  const d = dueDate(task);
  const overdue = Boolean(d && d.getTime() < now.getTime() && !task.done);
  const blocks = index.blocks.get(task.id) ?? [];
  const risk = index.atRisk.get(task.id);
  const history = useMemo(() => changes.filter((c) => c.taskId === task.id).slice(0, 6), [changes, task.id]);
  const typeDefault = ws.prefs.estimates[task.type];
  const options = [...new Set([...ESTIMATES, task.estimate])].sort((a, b) => a - b);

  const openDay = (date: Date) => {
    setPlanDay(differenceInCalendarDays(date, now));
    setView("plan");
    onClose();
  };

  return (
    <>
      <header className="flex items-start gap-3 p-4 border-b border-line">
        <DoneToggle task={task} />
        <div className="min-w-0 flex-1">
          <h2 className={`font-semibold leading-snug ${task.done ? "line-through text-muted" : ""}`}>{task.title}</h2>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {course ? (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="course-dot" />
                <span className="course-text font-medium">{course.code}</span>
              </span>
            ) : null}
            <TypeChip type={task.type} />
            {task.generated === "study" ? <span className="text-xs text-muted">Study time added by Prio</span> : null}
          </div>
        </div>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </header>

      <div className="p-4 space-y-5 overflow-y-auto scrollbar-thin">
        <div>
          <Label>Due</Label>
          <div className={`text-[0.9375rem] font-medium ${overdue ? "text-danger" : ""}`}>
            {d ? `${format(d, "EEEE, MMMM d")}${task.allDay ? "" : ` at ${format(d, "h:mm a")}`}` : "No due date"}
          </div>
          {d ? <div className="text-xs text-muted mt-0.5">{relativeDue(d, now)}</div> : null}
        </div>

        <div>
          <Label>Time it needs</Label>
          <div className="flex flex-wrap gap-1.5">
            {options.map((m) => (
              <button key={m} type="button" className="pill" aria-pressed={task.estimate === m} onClick={() => setEstimate(task.id, m === typeDefault ? null : m)}>
                {duration(m)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {task.customEstimate ? (
              <>
                Set by you.{" "}
                <button type="button" className="underline underline-offset-2 hover:text-fg" onClick={() => setEstimate(task.id, null)}>
                  Use the {typeMeta(task.type).label.toLowerCase()} default ({duration(typeDefault)})
                </button>
              </>
            ) : (
              `The default for ${typeMeta(task.type).plural.toLowerCase()}. Part-way through? Lower it to what's left.`
            )}
          </p>
        </div>

        {!task.done ? (
          <div>
            <Label>In your plan</Label>
            {blocks.length > 0 ? (
              <ul className="space-y-1">
                {blocks.map((b) => (
                  <li key={b.part}>
                    <button
                      type="button"
                      onClick={() => openDay(b.start)}
                      className="w-full text-left flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm hover:bg-surface-2 transition"
                    >
                      <Clock3 size={14} className="text-accent shrink-0" />
                      <span className="flex-1 min-w-0">
                        {format(b.start, "EEE, MMM d")} · {clockRange(b.start, b.end)}
                      </span>
                      <span className="text-xs text-muted tabular-nums">{duration(b.minutes)}</span>
                      <ArrowRight size={13} className="text-faint" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {risk ? (
              <p className="mt-2 text-sm text-danger flex gap-1.5">
                <CircleAlert size={15} className="shrink-0 mt-0.5" />
                {risk.planned > 0
                  ? `Only ${duration(risk.planned)} of free time before it's due. ${duration(risk.shortBy)} won't fit.`
                  : "There's no free time left before it's due."}
              </p>
            ) : blocks.length === 0 ? (
              <p className="text-sm text-muted">
                {d && d.getTime() < now.getTime() - 7 * 86_400_000
                  ? "More than a week late, so it's left out of the plan."
                  : "Due more than two weeks out. It'll be planned as it gets closer."}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ok font-medium">Done{ws.done[task.id] ? ` · ${format(new Date(ws.done[task.id]), "MMM d, h:mm a")}` : ""}</p>
        )}

        {task.description ? (
          <div>
            <Label>Details</Label>
            <p className="text-sm leading-relaxed whitespace-pre-line text-fg/90">{task.description}</p>
          </div>
        ) : null}

        {history.length > 0 ? (
          <div>
            <Label>Recent changes</Label>
            <ul className="space-y-1.5 text-xs">
              {history.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-faint tabular-nums">{format(new Date(c.at), "MMM d")}</span>
                  {c.kind === "due_changed" ? (
                    <>
                      <span className="text-muted">due moved</span>
                      <span className="line-through text-faint">{c.from ? format(new Date(c.from), "MMM d, h:mm a") : "none"}</span>
                      <ArrowRight size={11} className="text-muted" />
                      <span className="font-medium">{c.to ? format(new Date(c.to), "MMM d, h:mm a") : "none"}</span>
                    </>
                  ) : (
                    <span className="text-muted">{c.kind === "added" ? "added to the class calendar" : "removed from the class calendar"}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {task.url ? (
          <a href={task.url} target="_blank" rel="noreferrer" className="btn w-full justify-center">
            Open in {feed && feed.provider !== "other" ? PROVIDER_LABEL[feed.provider] : "the class site"}
            <ExternalLink size={14} />
          </a>
        ) : null}

        {task.manual ? (
          <button
            type="button"
            className="btn w-full justify-center text-danger"
            onClick={() => {
              const id = task.id.replace(/^manual:/, "");
              update((w) => ({ ...w, manualTasks: w.manualTasks.filter((m) => m.id !== id) }));
              onClose();
            }}
          >
            <Trash size={14} />
            Delete this task
          </button>
        ) : null}

        <p className="text-[11px] text-faint">{task.manual ? "Added by you." : `From ${feed?.name ?? "a calendar"}.`}</p>
      </div>
    </>
  );
}

function EventDetail({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  const { model, ws, now, setView, update, openClassTimes } = useApp();
  const course = event.courseId ? model.courseById.get(event.courseId) : undefined;
  const feed = event.feedId ? model.feedById.get(event.feedId) : undefined;
  const start = new Date(event.start);
  const end = new Date(event.end);
  const weekly = parseWeeklyId(event.id);
  const actions = useClassTimeActions();
  const [editing, setEditing] = useState(false);

  // A class meeting can be corrected: one entered here directly, one from a class
  // calendar by standing in for every meeting at that time. One-off events can't.
  const block = weekly && event.courseId ? ws.weekly.find((b) => b.id === weekly.blockId) : undefined;
  const pattern =
    !weekly && event.courseId && event.kind === "class"
      ? meetingPatterns(model.events, event.courseId, now).find((p) => p.key === meetingKey(start, end) && p.count >= 2)
      : undefined;
  const editable = Boolean(block || pattern);
  const kind = event.kind === "class" ? "Class" : event.kind === "exam" ? "Exam" : event.source === "weekly" ? "Every week" : "Event";

  const skipDay = () => {
    if (!weekly) return;
    update((w) => ({
      ...w,
      weekly: w.weekly.map((b) => (b.id === weekly.blockId ? { ...b, skip: [...new Set([...(b.skip ?? []), weekly.date])].sort() } : b)),
    }));
    onClose();
  };

  return (
    <>
      <header className="flex items-start gap-3 p-4 border-b border-line">
        <span className="course-dot mt-2" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-snug">{event.title}</h2>
          <div className="mt-1 text-xs text-muted">
            {kind}
            {course && course.code !== event.title ? <span className="course-text font-medium"> · {course.code}</span> : feed ? ` · ${feed.name}` : ""}
          </div>
        </div>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </header>
      <div className="p-4 space-y-5 overflow-y-auto scrollbar-thin">
        <div>
          <Label>When</Label>
          <div className="text-[0.9375rem] font-medium">
            {event.allDay ? format(start, "EEEE, MMMM d") : `${format(start, "EEEE, MMMM d")} · ${clockRange(start, end)}`}
          </div>
          {event.allDay ? <div className="text-xs text-muted mt-0.5">All day</div> : null}
        </div>
        {event.location ? (
          <div>
            <Label>Where</Label>
            <div className="text-sm flex items-center gap-1.5">
              <MapPin size={14} className="text-muted" />
              {event.location}
            </div>
          </div>
        ) : null}
        <p className="text-sm text-muted">
          {event.busy ? "Prio plans your work around this." : "This doesn't block your time, so Prio can plan work during it."}
        </p>
        {editable ? (
          editing ? (
            <div>
              <Label>Class time</Label>
              <ClassTimeForm
                initial={block ? valuesFromBlock(block) : { ...valuesFromPattern(pattern!), location: event.location ?? "" }}
                note={
                  pattern
                    ? `This changes every ${daysLabel(pattern.days)} meeting at this time. ${feed?.name ?? "The calendar"}'s version is hidden; you can switch back in Class times.`
                    : "This changes every meeting of this class time."
                }
                onSave={(v) => {
                  if (block) actions.replace(block, v);
                  else if (pattern && event.courseId) actions.correct(event.courseId, pattern.key, v);
                  onClose();
                }}
                onCancel={() => setEditing(false)}
              />
            </div>
          ) : (
            <button type="button" className="btn-primary w-full" onClick={() => setEditing(true)}>
              <Pencil size={15} />
              Change class time
            </button>
          )
        ) : null}
        {weekly ? (
          <div className="space-y-2">
            <button type="button" className="btn w-full justify-center" onClick={skipDay}>
              Not happening on {format(start, "EEE, MMM d")}
            </button>
            <button
              type="button"
              className="btn w-full justify-center"
              onClick={() => {
                onClose();
                if (event.courseId) openClassTimes();
                else setView("settings");
              }}
            >
              {event.courseId ? "All class times" : "Change weekly busy times"}
            </button>
          </div>
        ) : null}
        {event.url ? (
          <a href={event.url} target="_blank" rel="noreferrer" className="btn w-full justify-center">
            Open link
            <ExternalLink size={14} />
          </a>
        ) : null}
      </div>
    </>
  );
}
