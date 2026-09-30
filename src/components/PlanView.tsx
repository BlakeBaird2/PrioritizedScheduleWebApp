"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { ArrowRight, CalendarCheck, CircleAlert, Coffee, Flag, MapPin, Target } from "lucide-react";
import type { PlannedBlock } from "@/lib/planner";
import { buildDayTimeline, nowStatus, type TimelineItem } from "@/lib/timeline";
import type { CalEvent, Task } from "@/lib/types";
import { clock, clockRange, dayHeading, dueIn, duration, minutesLabel, plural, typeMeta } from "@/lib/ui";
import { courseStyle, useApp } from "./context";
import { DoneToggle, PlanNote } from "./TaskRow";
import { TypeChip } from "./TypeChip";

export function PlanView() {
  const { snapshot, syncing, model } = useApp();

  if (!snapshot.at && syncing) return <Loading />;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
      <div className="space-y-4 min-w-0">
        <NowCard />
        <AtRiskCard />
        <DayStrip />
        <DayTimeline />
      </div>
      <aside className="space-y-4 min-w-0">
        <Capacity />
        <PriorityQueue />
        {model.tasks.length === 0 ? (
          <p className="text-xs text-muted px-1 leading-relaxed">
            No assignments yet. Add a school calendar in Settings, or add work by hand with the + button.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-3" aria-busy="true">
      <p className="text-sm text-muted">Reading your calendars…</p>
      <div className="skeleton h-40 w-full" />
      <div className="skeleton h-16 w-full" />
      <div className="skeleton h-14 w-full" />
      <div className="skeleton h-14 w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right now
// ---------------------------------------------------------------------------

const NOW_LIMIT = 3;

function NowCard() {
  const { plan, model, now, setPlanDay, ws } = useApp();
  const status = useMemo(() => nowStatus(plan, model.events, model.tasks, now), [plan, model, now]);

  let tone = "bg-ok";
  let label = "Free now";
  let headline: React.ReactNode = null;
  let sub: React.ReactNode = null;
  let work: { block: PlannedBlock; task: Task }[] = [];

  if (status.state === "free") {
    headline = (
      <>
        {duration(status.minutes)} free <span className="text-muted font-medium">until {clock(status.until)}</span>
      </>
    );
    sub = status.nextEvent ? `Then ${status.nextEvent.title} at ${clock(new Date(status.nextEvent.start))}` : "Nothing else on your calendar after this.";
    work = status.work;
  } else if (status.state === "busy") {
    tone = "bg-warn";
    label = "Busy now";
    headline = (
      <>
        {status.event.title} <span className="text-muted font-medium">until {clock(new Date(status.event.end))}</span>
      </>
    );
    sub = status.next ? `Next free: ${clockRange(status.next.start, status.next.end)} (${duration(status.next.minutes)})` : "No more free time today.";
    work = status.work;
  } else if (status.state === "later") {
    tone = "bg-accent";
    label = "Next free time";
    headline = (
      <>
        {clockRange(status.next.start, status.next.end)} <span className="text-muted font-medium">· {duration(status.next.minutes)}</span>
      </>
    );
    const first = model.events.find((e) => e.busy && !e.allDay && Date.parse(e.start) >= now.getTime() && Date.parse(e.start) < status.next.start.getTime());
    sub = first ? `${first.title} at ${clock(new Date(first.start))} comes first.` : `Your working day starts at ${minutesLabel(ws.prefs.dayStart)}.`;
    work = status.work;
  } else {
    tone = "bg-faint";
    label = "Today";
    headline = "No free time left today";
    sub = `Prio plans between ${minutesLabel(ws.prefs.dayStart)} and ${minutesLabel(ws.prefs.dayEnd)}.`;
  }

  const hasWork = model.tasks.some((t) => !t.done);

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <span className={`w-2 h-2 rounded-full ${tone}`} />
        {label}
      </div>
      <h2 className="mt-1.5 text-xl sm:text-2xl font-semibold tracking-tight leading-tight">{headline}</h2>
      <p className="mt-1 text-sm text-muted">{sub}</p>

      {work.length > 0 ? (
        <div className="mt-4">
          <div className="section-title mb-2">{status.state === "free" ? "Work on this now" : "Then work on"}</div>
          <ol className="space-y-1.5">
            {work.slice(0, NOW_LIMIT).map((w, i) => (
              <WorkLine key={`${w.task.id}:${w.block.part}`} n={i + 1} block={w.block} task={w.task} />
            ))}
          </ol>
          {work.length > NOW_LIMIT ? (
            <p className="mt-2 text-xs text-muted">
              Then {plural(work.length - NOW_LIMIT, "more thing")} in this stretch, shown in today&apos;s plan below.
            </p>
          ) : null}
        </div>
      ) : status.state === "done" ? (
        <button type="button" className="btn mt-4" onClick={() => setPlanDay(1)}>
          See tomorrow&apos;s plan
          <ArrowRight size={14} />
        </button>
      ) : (
        <p className="mt-4 text-sm text-muted flex items-center gap-2">
          <Coffee size={15} className="shrink-0" />
          {hasWork ? "Nothing that fits here is due soon. Take the break, or get ahead from the list." : "You're all caught up."}
        </p>
      )}
    </section>
  );
}

function WorkLine({ n, block, task }: { n: number; block: PlannedBlock; task: Task }) {
  const { model, select, now } = useApp();
  const course = task.courseId ? model.courseById.get(task.courseId) : undefined;
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const late = due ? due.getTime() < now.getTime() : false;
  return (
    <li
      className="course-item flex items-center gap-3 rounded-xl border border-line bg-surface pr-3 py-2 cursor-pointer"
      style={courseStyle(course?.color ?? "var(--accent)")}
      onClick={() => select({ kind: "task", id: task.id })}
    >
      <span className="text-xs font-semibold text-faint tabular-nums w-3 text-center">{n}</span>
      <DoneToggle task={task} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{task.title}</div>
        <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
          {course ? <span className="course-text font-medium">{course.code}</span> : null}
          <span className="tabular-nums">{clockRange(block.start, block.end)}</span>
          {block.parts > 1 ? <span className="text-faint">part {block.part} of {block.parts}</span> : null}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold tabular-nums">{duration(block.minutes)}</div>
        {due ? <div className={`text-[11px] ${late ? "text-danger" : "text-faint"}`}>{dueIn(due, now)}</div> : null}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Work that will not fit
// ---------------------------------------------------------------------------

function AtRiskCard() {
  const { plan, model, select, now, setView } = useApp();
  const [open, setOpen] = useState(false);
  const items = useMemo(
    () =>
      plan.atRisk
        .map((r) => ({ risk: r, task: model.tasks.find((t) => t.id === r.taskId) }))
        .filter((x): x is { risk: typeof x.risk; task: Task } => Boolean(x.task)),
    [plan.atRisk, model.tasks],
  );
  if (items.length === 0) return null;
  const shown = open ? items : items.slice(0, 3);

  return (
    <section className="rounded-[var(--radius-xl)] border border-danger/35 bg-danger/5 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-danger">
        <CircleAlert size={16} />
        {items.length === 1 ? "1 thing won't fit before it's due" : `${items.length} things won't fit before they're due`}
      </h2>
      <ul className="mt-2.5 space-y-1.5">
        {shown.map(({ risk, task }) => {
          const course = task.courseId ? model.courseById.get(task.courseId) : undefined;
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => select({ kind: "task", id: task.id })}
                className="w-full text-left flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface/70 transition"
                style={courseStyle(course?.color)}
              >
                <span className="course-dot" />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium truncate block">{task.title}</span>
                  <span className="text-xs text-muted">
                    {risk.planned > 0
                      ? `Needs ${duration(task.estimate)}, only ${duration(risk.planned)} fits`
                      : `Needs ${duration(task.estimate)}, no free time before it's due`}
                  </span>
                </span>
                {risk.dueAt ? (
                  <span className="text-xs text-danger font-medium shrink-0">
                    {dueIn(risk.dueAt, now)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs text-muted">
        <span>Open one to change how long it needs, or give yourself more hours.</span>
        <button type="button" className="underline underline-offset-2 hover:text-fg" onClick={() => setView("settings")}>
          Working hours
        </button>
        {items.length > 3 ? (
          <button type="button" className="ml-auto underline underline-offset-2 hover:text-fg" onClick={() => setOpen((o) => !o)}>
            {open ? "Show fewer" : `Show all ${items.length}`}
          </button>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Picking a day
// ---------------------------------------------------------------------------

function DayStrip() {
  const { plan, planDay, setPlanDay, model } = useApp();
  const loudDue = useMemo(() => {
    const s = new Set<string>();
    for (const t of model.tasks) if (!t.done && t.dueAt && typeMeta(t.type).loud) s.add(format(new Date(t.dueAt), "yyyy-MM-dd"));
    return s;
  }, [model.tasks]);

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-thin">
      <div className="flex gap-1.5 pb-1 w-max">
        {plan.days.map((d, i) => {
          const used = d.freeMinutes ? Math.min(1, d.plannedMinutes / d.freeMinutes) : 0;
          const selected = i === planDay;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setPlanDay(i)}
              aria-pressed={selected}
              className={`relative w-[3.75rem] shrink-0 rounded-xl border px-1.5 pt-1.5 pb-2 text-center transition ${
                selected ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${selected ? "text-accent" : "text-muted"}`}>
                {i === 0 ? "Today" : format(d.date, "EEE")}
              </div>
              <div className="text-lg font-semibold leading-tight tabular-nums">{format(d.date, "d")}</div>
              <div className="text-[10px] text-muted tabular-nums">{d.working ? (d.plannedMinutes ? duration(d.plannedMinutes) : "free") : "off"}</div>
              <div className="mt-1 h-1 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${Math.round(used * 100)}%` }} />
              </div>
              {loudDue.has(format(d.date, "yyyy-MM-dd")) ? (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger" title="Exam or quiz due" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One day, in order
// ---------------------------------------------------------------------------

function DayTimeline() {
  const { plan, planDay, model, now, ws, select } = useApp();
  const day = plan.days[planDay];
  const timeline = useMemo(() => buildDayTimeline(day.date, day, model.events, model.tasks), [day, model.events, model.tasks]);
  const heading = dayHeading(day.date, now);
  const capReached = day.plannedMinutes >= ws.prefs.dailyMax;
  const items = planDay === 0 ? timeline.items.filter((it) => it.kind !== "event" || it.end.getTime() > now.getTime() - 60 * 60_000) : timeline.items;

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h2 className="text-base font-semibold">{heading.title}</h2>
        <span className="text-sm text-muted">{heading.sub}</span>
        <span className="ml-auto text-xs text-muted tabular-nums">
          {day.working ? `${duration(day.freeMinutes)} free · ${duration(day.plannedMinutes)} planned` : "Day off"}
        </span>
      </div>

      {timeline.allDayEvents.length > 0 || timeline.dueAllDay.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {timeline.allDayEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => select({ kind: "event", id: e.id })}
              className="course-chip rounded-md px-2 py-0.5 text-xs font-medium"
              style={courseStyle(e.color)}
            >
              {e.title}
            </button>
          ))}
          {timeline.dueAllDay.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => select({ kind: "task", id: t.id })}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${t.done ? "border-line text-faint line-through" : "border-line-strong"}`}
            >
              <Flag size={11} className={t.type === "exam" ? "text-danger" : "text-muted"} />
              Due today: {t.title}
            </button>
          ))}
        </div>
      ) : null}

      {!day.working ? (
        <p className="mt-3 text-sm text-muted">You have weekends off, so nothing is planned. Change this in Settings.</p>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-6 mb-2 text-center">
          <CalendarCheck size={24} className="mx-auto text-ok" />
          <p className="mt-2 text-sm text-muted">Nothing on this day.</p>
        </div>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {items.map((item) => (
            <TimelineRow key={item.key} item={item} capReached={capReached} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TimeCol({ start, end }: { start: Date; end?: Date }) {
  return (
    <div className="w-[4.25rem] shrink-0 text-right pt-2 pr-1">
      <div className="text-xs font-medium tabular-nums">{clock(start)}</div>
      {end && end.getTime() !== start.getTime() ? <div className="text-[11px] text-faint tabular-nums">{clock(end)}</div> : null}
    </div>
  );
}

function TimelineRow({ item, capReached }: { item: TimelineItem; capReached: boolean }) {
  const { now } = useApp();
  const past = item.end.getTime() <= now.getTime() && item.kind !== "due";
  return (
    <li className={`flex gap-3 ${past ? "opacity-50" : ""}`}>
      <TimeCol start={item.start} end={item.kind === "due" ? undefined : item.end} />
      <div className="min-w-0 flex-1">
        {item.kind === "event" ? <EventBlock event={item.event} /> : null}
        {item.kind === "work" ? <WorkBlock block={item.block} task={item.task} /> : null}
        {item.kind === "free" ? (
          <div className="rounded-xl border border-dashed border-line-strong px-3 py-2 text-sm text-muted flex items-center gap-2">
            <Coffee size={14} className="shrink-0" />
            <span>
              Free · {duration(item.minutes)}
              {capReached ? <span className="text-faint"> · daily work limit reached</span> : null}
            </span>
          </div>
        ) : null}
        {item.kind === "due" ? <DueMarker task={item.task} /> : null}
      </div>
    </li>
  );
}

function EventBlock({ event }: { event: CalEvent }) {
  const { model, select } = useApp();
  const course = event.courseId ? model.courseById.get(event.courseId) : undefined;
  const feed = event.feedId ? model.feedById.get(event.feedId) : undefined;
  const source = course?.code ?? (event.source === "weekly" ? "Weekly" : feed?.name);
  return (
    <button
      type="button"
      onClick={() => select({ kind: "event", id: event.id })}
      className="course-item w-full text-left rounded-xl border border-line bg-surface-2/70 pr-3 py-2"
      style={courseStyle(event.color)}
    >
      <div className="text-sm font-medium truncate">{event.title}</div>
      <div className="text-xs text-muted flex items-center gap-1.5 min-w-0">
        {source ? <span className="course-text font-medium truncate">{source}</span> : null}
        {event.kind === "exam" ? <span className="text-danger font-medium">Exam</span> : null}
        {event.location ? (
          <span className="inline-flex items-center gap-0.5 truncate">
            <MapPin size={11} className="shrink-0" />
            {event.location}
          </span>
        ) : null}
        {!event.busy ? <span className="text-faint">not blocking</span> : null}
      </div>
    </button>
  );
}

function WorkBlock({ block, task }: { block: PlannedBlock; task: Task }) {
  const { model, select, now } = useApp();
  const course = task.courseId ? model.courseById.get(task.courseId) : undefined;
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const meta = typeMeta(task.type);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => select({ kind: "task", id: task.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter") select({ kind: "task", id: task.id });
      }}
      className="course-item flex items-center gap-3 rounded-xl border border-accent/40 bg-surface pr-3 py-2 cursor-pointer shadow-sm"
      style={courseStyle(course?.color ?? "var(--accent)")}
    >
      <DoneToggle task={task} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <Target size={13} className="text-accent shrink-0" />
          <span className="text-sm font-semibold truncate">{task.title}</span>
          {meta.loud ? <TypeChip type={task.type} compact /> : null}
        </div>
        <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
          {course ? <span className="course-text font-medium">{course.code}</span> : null}
          <span>{duration(block.minutes)}</span>
          {block.parts > 1 ? <span className="text-faint">part {block.part} of {block.parts}</span> : null}
          {due ? <span className={due.getTime() < now.getTime() ? "text-danger" : "text-faint"}>{dueIn(due, now)}</span> : null}
        </div>
      </div>
    </div>
  );
}

function DueMarker({ task }: { task: Task }) {
  const { model, select } = useApp();
  const course = task.courseId ? model.courseById.get(task.courseId) : undefined;
  const loud = typeMeta(task.type).loud && !task.done;
  return (
    <button
      type="button"
      onClick={() => select({ kind: "task", id: task.id })}
      className={`w-full text-left flex items-center gap-2 px-1 py-2 text-xs ${task.done ? "text-faint line-through" : loud ? "text-danger" : "text-muted"}`}
    >
      <Flag size={12} className="shrink-0" />
      <span className="font-medium">Due</span>
      <span className="truncate">{task.title}</span>
      {course ? (
        <span className="course-text shrink-0" style={courseStyle(course.color)}>
          {course.code}
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// The week at a glance, and the order things will be done in
// ---------------------------------------------------------------------------

function Capacity() {
  const { plan } = useApp();
  const week = plan.days.slice(0, 7);
  const free = week.reduce((s, d) => s + d.freeMinutes, 0);
  const planned = week.reduce((s, d) => s + d.plannedMinutes, 0);
  const pct = free ? Math.min(100, Math.round((planned / free) * 100)) : 0;
  return (
    <section className="card p-4">
      <div className="section-title">Next 7 days</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{duration(planned)}</span>
        <span className="text-sm text-muted">of work in {duration(free)} free</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className={`h-full rounded-full ${pct > 85 ? "bg-warn" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {plan.atRisk.length ? (
          <span className="text-danger font-medium">{plural(plan.atRisk.length, "item")} won&apos;t fit in time</span>
        ) : planned === 0 ? (
          "Nothing to plan this week."
        ) : (
          "Everything due fits in your free time."
        )}
      </p>
    </section>
  );
}

const QUEUE_PAGE = 8;

function PriorityQueue() {
  const { plan, model, select, now } = useApp();
  const [all, setAll] = useState(false);
  const tasks = useMemo(() => {
    const byId = new Map(model.tasks.map((t) => [t.id, t]));
    return plan.order.map((id) => byId.get(id)).filter((t): t is Task => Boolean(t));
  }, [plan.order, model.tasks]);
  if (tasks.length === 0) return null;
  const shown = all ? tasks : tasks.slice(0, QUEUE_PAGE);

  return (
    <section className="card p-4">
      <div className="section-title">Up next, in order</div>
      <p className="mt-1 text-xs text-muted leading-relaxed">Soonest deadline first. Exams and projects win ties.</p>
      <ol className="mt-3 space-y-0.5">
        {shown.map((t, i) => {
          const course = t.courseId ? model.courseById.get(t.courseId) : undefined;
          const due = t.dueAt ? new Date(t.dueAt) : null;
          const days = due ? differenceInCalendarDays(due, now) : null;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => select({ kind: "task", id: t.id })}
                className="w-full text-left flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-surface-2 transition"
                style={courseStyle(course?.color)}
              >
                <span className="text-xs text-faint tabular-nums w-4 text-right pt-0.5 shrink-0">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium leading-snug line-clamp-2">{t.title}</span>
                  <span className="mt-0.5 flex items-center gap-x-2 gap-y-0.5 text-[11px] text-muted flex-wrap">
                    {course ? <span className="course-text font-medium">{course.code}</span> : null}
                    <span className="tabular-nums">{duration(t.estimate)}</span>
                    <PlanNote task={t} />
                  </span>
                </span>
                {due ? (
                  <span className={`text-[11px] shrink-0 pt-0.5 ${days !== null && days <= 0 ? "text-danger font-medium" : "text-faint"}`}>
                    {due.getTime() < now.getTime() ? "late" : days === 0 ? "today" : days === 1 ? "tmrw" : format(due, "MMM d")}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      {tasks.length > QUEUE_PAGE ? (
        <button type="button" className="btn mt-2 w-full justify-center" onClick={() => setAll((a) => !a)}>
          {all ? "Show fewer" : `Show all ${tasks.length}`}
        </button>
      ) : null}
    </section>
  );
}

