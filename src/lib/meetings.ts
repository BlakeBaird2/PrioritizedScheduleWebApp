/**
 * Describing when a class meets, in words a person would use.
 */
import type { CalEvent } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY = 86_400_000;

/** "Mon, Wed", "Weekdays", "Every day". Weeks are listed Monday first. */
export function daysLabel(days: number[]): string {
  const set = new Set(days);
  const key = [...set].sort().join("");
  if (key === "12345") return "Weekdays";
  if (key === "06") return "Weekends";
  if (key === "0123456") return "Every day";
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => set.has(d)).map((d) => DAY_NAMES[d]).join(", ");
}

export interface MeetingPattern {
  /** 0 = Sunday ... 6 = Saturday */
  days: number[];
  /** Minutes after midnight. */
  start: number;
  end: number;
}

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/**
 * The regular meeting times a class's own calendar already has, found from its
 * class events in the weeks around now. Used to tell someone a class is already
 * covered, so they don't enter it twice.
 */
export function meetingPatterns(events: CalEvent[], courseId: string, now: Date): MeetingPattern[] {
  const from = now.getTime() - 21 * DAY;
  const to = now.getTime() + 35 * DAY;
  const byTime = new Map<string, { start: number; end: number; days: Set<number> }>();
  for (const e of events) {
    if (e.courseId !== courseId || e.kind !== "class" || e.allDay || e.source !== "feed") continue;
    const s = new Date(e.start);
    if (s.getTime() < from || s.getTime() > to) continue;
    const start = minutesOf(s);
    const end = minutesOf(new Date(e.end)) || 24 * 60;
    const key = `${start}-${end}`;
    const entry = byTime.get(key) ?? { start, end, days: new Set<number>() };
    entry.days.add(s.getDay());
    byTime.set(key, entry);
  }
  return [...byTime.values()]
    .map((p) => ({ days: [...p.days].sort(), start: p.start, end: p.end }))
    .sort((a, b) => a.start - b.start);
}
