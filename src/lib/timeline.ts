/**
 * Lay a day out the way a student thinks about it: the things on their calendar,
 * and between them, stretches of free time with the work planned for each one.
 * Also answers "what should I be doing right now", which leads the Plan view.
 */
import type { DayPlan, Gap, PlannedBlock, Plan } from "./planner";
import type { CalEvent, Task } from "./types";

const MINUTE = 60_000;

export interface PlannedWork {
  block: PlannedBlock;
  task: Task;
}

export type ScheduleItem =
  | { kind: "event"; key: string; start: Date; end: Date; event: CalEvent }
  | { kind: "free"; key: string; start: Date; end: Date; minutes: number; work: PlannedWork[]; leftover: number }
  | { kind: "due"; key: string; start: Date; task: Task };

export interface DaySchedule {
  items: ScheduleItem[];
  allDayEvents: CalEvent[];
  /** Work due on this day with no specific time. */
  dueAllDay: Task[];
}

const ORDER: Record<ScheduleItem["kind"], number> = { event: 0, free: 1, due: 2 };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function buildDaySchedule(date: Date, dayPlan: DayPlan | null, events: CalEvent[], tasks: Task[]): DaySchedule {
  const dayStart = startOfDay(date).getTime();
  const next = new Date(dayStart);
  next.setDate(next.getDate() + 1);
  const dayEnd = next.getTime();
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const items: ScheduleItem[] = [];

  const allDayEvents: CalEvent[] = [];
  for (const e of events) {
    const s = Date.parse(e.start);
    const en = Date.parse(e.end);
    if (en <= dayStart || s >= dayEnd) continue;
    if (e.allDay) allDayEvents.push(e);
    else items.push({ kind: "event", key: `e:${e.id}`, start: new Date(s), end: new Date(en), event: e });
  }

  for (const gap of dayPlan?.gaps ?? []) {
    const work = workIn(gap, dayPlan!.blocks, taskById);
    const used = work.reduce((sum, w) => sum + w.block.minutes, 0);
    items.push({
      kind: "free",
      key: `f:${gap.start.getTime()}`,
      start: gap.start,
      end: gap.end,
      minutes: gap.minutes,
      work,
      leftover: Math.max(0, gap.minutes - used),
    });
  }

  const dueAllDay: Task[] = [];
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const due = Date.parse(t.dueAt);
    if (due < dayStart || due >= dayEnd) continue;
    if (t.allDay) dueAllDay.push(t);
    else items.push({ kind: "due", key: `d:${t.id}`, start: new Date(due), task: t });
  }

  items.sort((a, b) => a.start.getTime() - b.start.getTime() || ORDER[a.kind] - ORDER[b.kind]);
  return { items, allDayEvents, dueAllDay };
}

/** The planned work that falls inside a gap, in order. */
function workIn(gap: Gap, blocks: PlannedBlock[], taskById: Map<string, Task>): PlannedWork[] {
  const gs = gap.start.getTime();
  const ge = gap.end.getTime();
  return blocks
    .filter((b) => b.start.getTime() >= gs && b.end.getTime() <= ge)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((block) => ({ block, task: taskById.get(block.taskId)! }))
    .filter((w) => w.task);
}

export type NowStatus =
  | { state: "free"; until: Date; minutes: number; nextEvent: CalEvent | null; work: PlannedWork[] }
  | { state: "busy"; event: CalEvent; next: Gap | null; work: PlannedWork[] }
  | { state: "later"; next: Gap; work: PlannedWork[] }
  | { state: "done" };

/**
 * Where the student is right now, and what to do with the next stretch of free time.
 * Today's gaps already start at the current moment, so a gap that has begun is "now".
 */
export function nowStatus(plan: Plan, events: CalEvent[], tasks: Task[], now: Date): NowStatus {
  const today = plan.days[0];
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const work = (gap: Gap) => workIn(gap, today?.blocks ?? [], taskById);

  const t = now.getTime();
  const gaps = today?.gaps ?? [];
  // Gaps snap to five minutes, so one starting within the next five has effectively begun.
  const current = gaps.find((g) => g.start.getTime() <= t + 5 * MINUTE && g.end.getTime() > t);
  const upcoming = gaps.find((g) => g.start.getTime() > t);
  const busyNow = events
    .filter((e) => e.busy && !e.allDay && Date.parse(e.start) <= t && Date.parse(e.end) > t)
    .sort((a, b) => Date.parse(a.end) - Date.parse(b.end))[0];

  if (current) {
    const nextEvent =
      events
        .filter((e) => e.busy && !e.allDay && Date.parse(e.start) >= current.end.getTime() - 60 * MINUTE)
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0] ?? null;
    return {
      state: "free",
      until: current.end,
      minutes: Math.round((current.end.getTime() - Math.max(t, current.start.getTime())) / MINUTE),
      nextEvent,
      work: work(current),
    };
  }
  if (busyNow) return { state: "busy", event: busyNow, next: upcoming ?? null, work: upcoming ? work(upcoming) : [] };
  if (upcoming) return { state: "later", next: upcoming, work: work(upcoming) };
  return { state: "done" };
}
