/**
 * Lay a day out as a timeline: events, planned work, leftover free time, and
 * deadlines, in the order they happen. Also answers "what should I be doing right
 * now", which is the first thing the Plan view shows.
 */
import type { DayPlan, Gap, PlannedBlock, Plan } from "./planner";
import type { CalEvent, Task } from "./types";

const MINUTE = 60_000;
/** Leftover free time shorter than this is not worth showing. */
const SHOW_FREE_MIN = 15;

export type TimelineItem =
  | { kind: "event"; key: string; start: Date; end: Date; event: CalEvent }
  | { kind: "work"; key: string; start: Date; end: Date; block: PlannedBlock; task: Task }
  | { kind: "free"; key: string; start: Date; end: Date; minutes: number }
  | { kind: "due"; key: string; start: Date; end: Date; task: Task };

export interface DayTimeline {
  items: TimelineItem[];
  allDayEvents: CalEvent[];
  /** Work due today with no specific time. */
  dueAllDay: Task[];
}

const ORDER: Record<TimelineItem["kind"], number> = { event: 0, work: 1, free: 2, due: 3 };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function buildDayTimeline(date: Date, dayPlan: DayPlan | null, events: CalEvent[], tasks: Task[]): DayTimeline {
  const dayStart = startOfDay(date).getTime();
  const next = new Date(dayStart);
  next.setDate(next.getDate() + 1);
  const dayEnd = next.getTime();
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const items: TimelineItem[] = [];

  const allDayEvents: CalEvent[] = [];
  for (const e of events) {
    const s = Date.parse(e.start);
    const en = Date.parse(e.end);
    if (en <= dayStart || s >= dayEnd) continue;
    if (e.allDay) allDayEvents.push(e);
    else items.push({ kind: "event", key: `e:${e.id}`, start: new Date(s), end: new Date(en), event: e });
  }

  if (dayPlan) {
    for (const block of dayPlan.blocks) {
      const task = taskById.get(block.taskId);
      if (task) items.push({ kind: "work", key: `w:${block.taskId}:${block.part}`, start: block.start, end: block.end, block, task });
    }
    for (const gap of dayPlan.gaps) {
      for (const [s, e] of leftovers(gap, dayPlan.blocks)) {
        const minutes = Math.round((e - s) / MINUTE);
        if (minutes >= SHOW_FREE_MIN) items.push({ kind: "free", key: `f:${s}`, start: new Date(s), end: new Date(e), minutes });
      }
    }
  }

  const dueAllDay: Task[] = [];
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const due = Date.parse(t.dueAt);
    if (due < dayStart || due >= dayEnd) continue;
    if (t.allDay) dueAllDay.push(t);
    else items.push({ kind: "due", key: `d:${t.id}`, start: new Date(due), end: new Date(due), task: t });
  }

  items.sort((a, b) => a.start.getTime() - b.start.getTime() || ORDER[a.kind] - ORDER[b.kind]);
  return { items, allDayEvents, dueAllDay };
}

/** The parts of a gap not taken by planned work. */
function leftovers(gap: Gap, blocks: PlannedBlock[]): [number, number][] {
  const gs = gap.start.getTime();
  const ge = gap.end.getTime();
  const taken = blocks
    .map((b): [number, number] => [b.start.getTime(), b.end.getTime()])
    .filter(([s, e]) => e > gs && s < ge)
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let cursor = gs;
  for (const [s, e] of taken) {
    if (s > cursor) out.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < ge) out.push([cursor, ge]);
  return out;
}

export type NowStatus =
  | { state: "free"; until: Date; minutes: number; nextEvent: CalEvent | null; work: { block: PlannedBlock; task: Task }[] }
  | { state: "busy"; event: CalEvent; next: Gap | null; work: { block: PlannedBlock; task: Task }[] }
  | { state: "later"; next: Gap; work: { block: PlannedBlock; task: Task }[] }
  | { state: "done"; };

/**
 * Where the student is right now, and what to do with the next stretch of free time.
 * Today's gaps already start at the current moment, so a gap that has begun is "now".
 */
export function nowStatus(plan: Plan, events: CalEvent[], tasks: Task[], now: Date): NowStatus {
  const today = plan.days[0];
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const workIn = (gap: Gap) =>
    (today?.blocks ?? [])
      .filter((b) => b.start.getTime() >= gap.start.getTime() && b.end.getTime() <= gap.end.getTime())
      .map((block) => ({ block, task: taskById.get(block.taskId)! }))
      .filter((w) => w.task);

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
      work: workIn(current),
    };
  }
  if (busyNow) return { state: "busy", event: busyNow, next: upcoming ?? null, work: upcoming ? workIn(upcoming) : [] };
  if (upcoming) return { state: "later", next: upcoming, work: workIn(upcoming) };
  return { state: "done" };
}
