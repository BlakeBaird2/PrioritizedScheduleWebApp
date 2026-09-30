/**
 * What changed between two reads of the same feed.
 *
 * Instructors move due dates, add work and delete it. Comparing each fresh read
 * against the last one catches all three. Only work near the present is
 * reported, and a class appearing or disappearing wholesale is not reported,
 * since that is a feed being added or reconfigured rather than an instructor.
 */
import type { Change, FeedResult } from "./types";

const DAY = 86_400_000;
const NEAR = 7 * DAY;
export const CHANGE_RETENTION = 30 * DAY;
export const MAX_CHANGES = 100;

function recent(iso: string | null, pastMs: number, now: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t >= now - pastMs;
}

export function diffFeed(feedId: string, prev: FeedResult | null, next: FeedResult, at: Date): Change[] {
  if (!prev || prev.role !== next.role) return [];
  const now = at.getTime();
  const stamp = at.toISOString();
  const courseId = (key: string | null) => (key ? `${feedId}:${key}` : null);
  const prevTasks = new Map(prev.tasks.filter((t) => !t.generated).map((t) => [t.uid, t]));
  const nextTasks = new Map(next.tasks.filter((t) => !t.generated).map((t) => [t.uid, t]));
  const prevCourses = new Set(prev.tasks.map((t) => t.courseKey));
  const nextCourses = new Set(next.tasks.map((t) => t.courseKey));
  const changes: Change[] = [];

  for (const [uid, t] of nextTasks) {
    const before = prevTasks.get(uid);
    const taskId = `${feedId}:${uid}`;
    if (!before) {
      if (prevCourses.has(t.courseKey) && recent(t.dueAt, NEAR, now)) {
        changes.push({ id: `added:${taskId}:${stamp}`, at: stamp, kind: "added", taskId, courseId: courseId(t.courseKey), title: t.title, from: null, to: t.dueAt });
      }
      continue;
    }
    if (before.dueAt !== t.dueAt && (recent(before.dueAt, NEAR, now) || recent(t.dueAt, NEAR, now))) {
      changes.push({ id: `due:${taskId}:${stamp}`, at: stamp, kind: "due_changed", taskId, courseId: courseId(t.courseKey), title: t.title, from: before.dueAt, to: t.dueAt });
    }
  }
  for (const [uid, t] of prevTasks) {
    if (nextTasks.has(uid) || !nextCourses.has(t.courseKey) || !recent(t.dueAt, 0, now)) continue;
    const taskId = `${feedId}:${uid}`;
    changes.push({ id: `removed:${taskId}:${stamp}`, at: stamp, kind: "removed", taskId, courseId: courseId(t.courseKey), title: t.title, from: t.dueAt, to: null });
  }
  return changes;
}

/** Newest first, recent only, capped. */
export function mergeChanges(fresh: Change[], existing: Change[], now: Date): Change[] {
  const cutoff = now.getTime() - CHANGE_RETENTION;
  const seen = new Set<string>();
  return [...fresh, ...existing]
    .filter((c) => Date.parse(c.at) >= cutoff && !seen.has(c.id) && seen.add(c.id))
    .slice(0, MAX_CHANGES);
}
