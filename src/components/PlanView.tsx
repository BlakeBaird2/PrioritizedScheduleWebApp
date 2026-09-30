"use client";

import { useMemo } from "react";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { ArrowRight, Check, CircleAlert, Flag, MapPin } from "lucide-react";
import type { PlannedWork, ScheduleItem } from "@/lib/timeline";
import { buildDaySchedule, nowStatus } from "@/lib/timeline";
import type { Task } from "@/lib/types";
import { clock, clockRange, dueIn, duration, minutesLabel, plural, typeMeta } from "@/lib/ui";
import { courseStyle, useApp } from "./context";
import { DoneToggle, PlanNote } from "./TaskRow";
import { TypeChip } from "./TypeChip";

/**
 * The home screen. Three questions, in order:
 * what should I do right now, how does the rest of my day look, and what's due soon.
 */
export function PlanView() {
  const { snapshot, syncing, now } = useApp();
  if (!snapshot.at && syncing) return <Loading />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{format(now, "EEEE, MMMM d")}</h1>
        <p className="mt-0.5 text-sm text-muted">Prio fills your free time with whatever is due soonest. Tick things off as you finish them.</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
        <div className="space-y-5 min-w-0">
          <NowCard />
          <DaySchedule />
        </div>
        <DueSoon />
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-3" aria-busy="true">
      <p className="text-sm text-muted">Reading your calendars…</p>
      <div className="skeleton h-40 w-full" />
      <div className="skeleton h-14 w-full" />
      <div className="skeleton h-14 w-full" />
    </div>
  );
}

function useCourse(task: Task | undefined) {
  const { model } = useApp();
  return task?.courseId ? model.courseById.get(task.courseId) : undefined;
}

// ---------------------------------------------------------------------------
// Right now
// ---------------------------------------------------------------------------

function NowCard() {
  const { plan, model, now, ws, setPlanDay } = useApp();
  const status = useMemo(() => nowStatus(plan, model.events, model.tasks, now), [plan, model, now]);
  const hasWork = model.tasks.some((t) => !t.done);

  let dot = "bg-ok";
  let headline: React.ReactNode;
  let detail: string | null = null;
  let work: PlannedWork[] = [];
  let lead = "Work on";

  if (status.state === "free") {
    headline = `Free until ${clock(status.until)}`;
    // Name what comes next only when it is what ends this free time.
    const next = status.nextEvent && Date.parse(status.nextEvent.start) - status.until.getTime() <= 45 * 60_000 ? status.nextEvent : null;
    detail = next ? `${duration(status.minutes)} free, then ${next.title} at ${clock(new Date(next.start))}` : `${duration(status.minutes)} of free time left today`;
    work = status.work;
  } else if (status.state === "busy") {
    dot = "bg-warn";
    headline = `${status.event.title} until ${clock(new Date(status.event.end))}`;
    detail = status.next ? `Next free time ${clockRange(status.next.start, status.next.end)}` : "No more free time today";
    work = status.work;
    if (status.next) lead = `At ${clock(status.next.start)}, work on`;
  } else if (status.state === "later") {
    dot = "bg-accent";
    headline = `Free from ${clock(status.next.start)} to ${clock(status.next.end)}`;
    const first = model.events.find((e) => e.busy && !e.allDay && Date.parse(e.start) >= now.getTime() && Date.parse(e.start) < status.next.start.getTime());
    detail = first ? `${first.title} at ${clock(new Date(first.start))} comes first` : `Your day starts at ${minutesLabel(ws.prefs.dayStart)}`;
    work = status.work;
    lead = `At ${clock(status.next.start)}, work on`;
  } else {
    dot = "bg-faint";
    headline = "No more free time today";
    detail = `You plan work until ${minutesLabel(ws.prefs.dayEnd)}`;
  }

  const [first, second] = work;

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="truncate">{headline}</span>
      </div>
      {detail ? <p className="mt-0.5 pl-4 text-sm text-muted">{detail}</p> : null}

      {first ? (
        <>
          <FocusTask lead={lead} item={first} />
          {second ? (
            <p className="mt-3 pt-3 border-t border-line text-sm text-muted">
              Then <span className="text-fg font-medium">{second.task.title}</span> · {duration(second.block.minutes)}
            </p>
          ) : null}
        </>
      ) : status.state === "done" ? (
        <button type="button" className="btn mt-4" onClick={() => setPlanDay(1)}>
          See tomorrow
          <ArrowRight size={14} />
        </button>
      ) : (
        <p className="mt-4 text-[0.9375rem]">{hasWork ? "Nothing due soon fits in this time. Enjoy the break." : "You're all caught up."}</p>
      )}
    </section>
  );
}

function FocusTask({ lead, item }: { lead: string; item: PlannedWork }) {
  const { toggleDone, select, now } = useApp();
  const { task, block } = item;
  const course = useCourse(task);
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const late = due ? due.getTime() < now.getTime() : false;

  return (
    <div className="mt-4">
      <div className="section-title">{lead}</div>
      <div className="mt-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => select({ kind: "task", id: task.id })} className="text-left text-xl font-semibold leading-snug hover:underline underline-offset-4 decoration-line-strong">
            {task.title}
          </button>
          <div className="mt-1.5 flex items-center gap-x-2 gap-y-1 flex-wrap text-sm text-muted" style={courseStyle(course?.color)}>
            {course ? <span className="course-chip rounded-md px-1.5 py-0.5 text-xs font-semibold">{course.code}</span> : null}
            {typeMeta(task.type).loud ? <TypeChip type={task.type} /> : null}
            <span>
              {duration(block.minutes)}
              {block.parts > 1 ? ` (part ${block.part} of ${block.parts})` : ""}
            </span>
            {due ? <span className={late ? "text-danger font-medium" : ""}>· {dueIn(due, now)}</span> : null}
          </div>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={() => toggleDone(task)}>
          <Check size={16} strokeWidth={2.5} />
          Done
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One day: what's on, and the free time between it
// ---------------------------------------------------------------------------

function DayPicker() {
  const { plan, planDay, setPlanDay } = useApp();
  return (
    <div className="-mx-1 px-1 overflow-x-auto scrollbar-thin">
      <div className="flex gap-1 w-max">
        {plan.days.slice(0, 7).map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPlanDay(i)}
            aria-pressed={i === planDay}
            className={`rounded-lg px-2.5 py-1 text-sm transition ${i === planDay ? "bg-accent text-white font-medium" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
          >
            {i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d.date, "EEE d")}
          </button>
        ))}
      </div>
    </div>
  );
}

function DaySchedule() {
  const { plan, planDay, model, now, ws, select, setView } = useApp();
  const day = plan.days[planDay];
  const schedule = useMemo(() => buildDaySchedule(day.date, day, model.events, model.tasks), [day, model.events, model.tasks]);
  const isToday = planDay === 0;
  // On today, what has already happened is behind you.
  const items = isToday ? schedule.items.filter((it) => (it.kind === "due" ? it.start : it.end).getTime() > now.getTime()) : schedule.items;
  const capReached = day.plannedMinutes >= ws.prefs.dailyMax;
  const dueAllDay = schedule.dueAllDay.filter((t) => !t.done);

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-base font-semibold">{isToday ? "The rest of today" : format(day.date, "EEEE, MMMM d")}</h2>
        <div className="ml-auto min-w-0 max-w-full">
          <DayPicker />
        </div>
      </div>

      {schedule.allDayEvents.length > 0 || dueAllDay.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {schedule.allDayEvents.map((e) => (
            <button key={e.id} type="button" onClick={() => select({ kind: "event", id: e.id })} className="course-chip rounded-md px-2 py-0.5 text-xs font-medium" style={courseStyle(e.color)}>
              {e.title}
            </button>
          ))}
          {dueAllDay.map((t) => (
            <button key={t.id} type="button" onClick={() => select({ kind: "task", id: t.id })} className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-0.5 text-xs">
              <Flag size={11} className={t.type === "exam" ? "text-danger" : "text-muted"} />
              Due {isToday ? "today" : "this day"}: {t.title}
            </button>
          ))}
        </div>
      ) : null}

      {!day.working ? (
        <p className="mt-4 text-sm text-muted">
          You have weekends off, so no work is planned.{" "}
          <button type="button" className="underline underline-offset-2 hover:text-fg" onClick={() => setView("settings")}>
            Change this
          </button>
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{isToday ? "Nothing else today." : "Nothing on this day."}</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {items.map((item) => (
            <Row key={item.key} item={item} capReached={capReached} />
          ))}
        </ol>
      )}
    </section>
  );
}

function Row({ item, capReached }: { item: ScheduleItem; capReached: boolean }) {
  return (
    <li className="flex gap-2 sm:gap-3">
      <div className="w-14 sm:w-[4.5rem] shrink-0 text-right pt-2">
        <div className="text-xs font-medium tabular-nums">{clock(item.start)}</div>
        {item.kind !== "due" ? <div className="text-[11px] text-faint tabular-nums">{clock(item.end)}</div> : null}
      </div>
      <div className="min-w-0 flex-1">
        {item.kind === "event" ? <EventRow item={item} /> : null}
        {item.kind === "free" ? <FreeBlock item={item} capReached={capReached} /> : null}
        {item.kind === "due" ? <DueRow task={item.task} /> : null}
      </div>
    </li>
  );
}

function EventRow({ item }: { item: Extract<ScheduleItem, { kind: "event" }> }) {
  const { model, select } = useApp();
  const e = item.event;
  const course = e.courseId ? model.courseById.get(e.courseId) : undefined;
  const source = course?.code ?? (e.source === "weekly" ? "Weekly" : e.feedId ? model.feedById.get(e.feedId)?.name : undefined);
  return (
    <button
      type="button"
      onClick={() => select({ kind: "event", id: e.id })}
      className="course-item w-full text-left rounded-xl border border-line bg-surface-2/70 pr-3 py-2"
      style={courseStyle(e.color)}
    >
      <div className="text-sm font-medium truncate">{e.title}</div>
      <div className="text-xs text-muted flex items-center gap-1.5 min-w-0">
        {source ? <span className="course-text font-medium truncate">{source}</span> : null}
        {e.location ? (
          <span className="inline-flex items-center gap-0.5 truncate">
            <MapPin size={11} className="shrink-0" />
            {e.location}
          </span>
        ) : null}
        {!e.busy ? <span className="text-faint">doesn&apos;t block your time</span> : null}
      </div>
    </button>
  );
}

function FreeBlock({ item, capReached }: { item: Extract<ScheduleItem, { kind: "free" }>; capReached: boolean }) {
  return (
    <div className="rounded-xl border border-ok/30 bg-ok/[0.06] p-1.5 sm:p-2.5">
      <div className="px-1 pt-0.5 text-sm font-semibold text-ok">Free · {duration(item.minutes)}</div>
      {item.work.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {item.work.map((w) => (
            <WorkRow key={`${w.task.id}:${w.block.part}`} work={w} />
          ))}
        </ul>
      ) : null}
      {item.leftover >= 15 ? (
        <p className="mt-1.5 px-1 text-xs text-muted">
          {item.work.length === 0
            ? capReached
              ? "You've hit your daily work limit, so this time stays free."
              : "Nothing due soon fits here. It's yours."
            : `${duration(item.leftover)} left over${capReached ? " (daily work limit reached)" : ""}`}
        </p>
      ) : null}
    </div>
  );
}

function WorkRow({ work }: { work: PlannedWork }) {
  const { select, now } = useApp();
  const { task, block } = work;
  const course = useCourse(task);
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const late = due ? due.getTime() < now.getTime() : false;
  return (
    <li
      className="course-item flex items-center gap-2.5 sm:gap-3 rounded-lg border border-line bg-surface pr-2.5 sm:pr-3 py-2 cursor-pointer"
      style={courseStyle(course?.color ?? "var(--accent)")}
      onClick={() => select({ kind: "task", id: task.id })}
    >
      <DoneToggle task={task} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-snug line-clamp-2">{task.title}</div>
        <div className="mt-0.5 text-xs text-muted flex items-center gap-x-1.5 flex-wrap">
          {course ? <span className="course-text font-medium">{course.code}</span> : null}
          {due ? <span className={late ? "text-danger" : ""}>{dueIn(due, now)}</span> : null}
          {block.parts > 1 ? <span className="text-faint">part {block.part} of {block.parts}</span> : null}
        </div>
      </div>
      <span className="text-sm font-medium tabular-nums shrink-0">{duration(block.minutes)}</span>
    </li>
  );
}

function DueRow({ task }: { task: Task }) {
  const { select } = useApp();
  const course = useCourse(task);
  const loud = typeMeta(task.type).loud && !task.done;
  return (
    <button
      type="button"
      onClick={() => select({ kind: "task", id: task.id })}
      className={`w-full text-left flex items-center gap-2 px-1 py-2 text-xs ${task.done ? "text-faint line-through" : loud ? "text-danger" : "text-muted"}`}
    >
      <Flag size={12} className="shrink-0" />
      <span className="truncate">
        <span className="font-medium">Due:</span> {task.title}
      </span>
      {course ? (
        <span className="course-text shrink-0" style={courseStyle(course.color)}>
          {course.code}
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// What's due soon, and whether it fits
// ---------------------------------------------------------------------------

const DUE_SOON_DAYS = 7;
const DUE_SOON_LIMIT = 14;

function DueSoon() {
  const { model, plan, now, setView } = useApp();

  const groups = useMemo(() => {
    const until = addDays(startOfDay(now), DUE_SOON_DAYS).getTime();
    const late: Task[] = [];
    const byDay = new Map<number, Task[]>();
    for (const t of model.tasks) {
      if (t.done || !t.dueAt) continue;
      const due = Date.parse(t.dueAt);
      if (due >= until) continue;
      if (due < now.getTime()) {
        if (due >= now.getTime() - 7 * 86_400_000) late.push(t);
        continue;
      }
      const offset = differenceInCalendarDays(new Date(due), now);
      byDay.set(offset, [...(byDay.get(offset) ?? []), t]);
    }
    const out: { label: string; tasks: Task[]; late?: boolean }[] = [];
    if (late.length) out.push({ label: "Overdue", tasks: late, late: true });
    for (const [offset, tasks] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      const date = addDays(startOfDay(now), offset);
      out.push({ label: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : format(date, "EEEE, MMM d"), tasks });
    }
    return out;
  }, [model.tasks, now]);

  let shown = 0;
  const total = groups.reduce((s, g) => s + g.tasks.length, 0);
  const risky = plan.atRisk.filter((r) => r.dueAt && r.dueAt.getTime() < addDays(startOfDay(now), DUE_SOON_DAYS).getTime()).length;

  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-base font-semibold">Due this week</h2>
      {risky > 0 ? (
        <p className="mt-1 text-sm text-danger flex items-start gap-1.5">
          <CircleAlert size={15} className="shrink-0 mt-0.5" />
          {risky === 1 ? "1 thing won't fit before it's due." : `${risky} things won't fit before they're due.`} Open it to see why.
        </p>
      ) : total > 0 ? (
        <p className="mt-1 text-sm text-muted">Everything here fits in your free time.</p>
      ) : null}

      {total === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing due in the next week.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {groups.map((g) => {
            if (shown >= DUE_SOON_LIMIT) return null;
            const tasks = g.tasks.slice(0, DUE_SOON_LIMIT - shown);
            shown += tasks.length;
            return (
              <div key={g.label}>
                <div className={`section-title mb-1.5 ${g.late ? "!text-danger" : ""}`}>{g.label}</div>
                <ul className="space-y-1">
                  {tasks.map((t) => (
                    <DueItem key={t.id} task={t} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <button type="button" className="btn mt-4 w-full justify-center" onClick={() => setView("upcoming")}>
        {total > shown ? `See all ${plural(total, "item")}` : "See everything coming up"}
        <ArrowRight size={14} />
      </button>
    </section>
  );
}

function DueItem({ task }: { task: Task }) {
  const { select, now } = useApp();
  const course = useCourse(task);
  const due = new Date(task.dueAt!);
  const late = due.getTime() < now.getTime();
  return (
    <li className="flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-surface-2 transition cursor-pointer" onClick={() => select({ kind: "task", id: task.id })}>
      <span className="pt-0.5">
        <DoneToggle task={task} size="sm" />
      </span>
      <div className="min-w-0 flex-1" style={courseStyle(course?.color)}>
        <div className="text-sm font-medium leading-snug">{task.title}</div>
        <div className="mt-0.5 flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs text-muted">
          {course ? <span className="course-text font-medium">{course.code}</span> : null}
          <span className={late ? "text-danger" : ""}>{late ? dueIn(due, now) : task.allDay ? "end of day" : clock(due)}</span>
          <PlanNote task={task} />
        </div>
      </div>
    </li>
  );
}
