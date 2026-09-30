import assert from "node:assert/strict";
import test from "node:test";
import { decodeSetup, defaultWorkspace, encodeSetup, pastDueIds, sanitizeWorkspace } from "../workspace";
import { buildModel, busyIntervals, expandWeekly } from "../model";
import { diffFeed, mergeChanges } from "../changes";
import { syncAll } from "../sync";
import { feedIdFor } from "../feeds/url";
import type { FeedResult, Snapshot, Workspace } from "../types";

const NOW = new Date(2026, 9, 1, 12); // Thursday Oct 1, noon (TZ=America/Denver)

function feed(url: string, role: "school" | "personal" = "school") {
  return { id: feedIdFor(url), url, name: url, role, provider: "other" as const, color: "#64748b", enabled: true };
}

function result(over: Partial<FeedResult> = {}): FeedResult {
  return {
    url: "https://a.example/cal.ics",
    provider: "canvas",
    role: "school",
    calendarName: null,
    fetchedAt: NOW.toISOString(),
    courses: [
      { key: "course_1", code: "CS 260", title: "Web Programming", url: null },
      { key: "course_2", code: "MGMT 320", title: "MGMT 320", url: null },
    ],
    tasks: [
      { uid: "a1", courseKey: "course_1", title: "Quiz 3", type: "quiz", dueAt: "2026-10-02T23:00:00.000Z", allDay: false, url: null, description: null },
      { uid: "a2", courseKey: "course_2", title: "Case 1", type: "assignment", dueAt: "2026-10-03T16:00:00.000Z", allDay: false, url: null, description: null },
    ],
    events: [
      { uid: "e1", courseKey: "course_1", title: "Class", start: "2026-10-01T20:00:00.000Z", end: "2026-10-01T21:15:00.000Z", allDay: false, busy: true, kind: "class", location: null, url: null },
    ],
    skipped: 0,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Loading stored data safely
// ---------------------------------------------------------------------------

test("garbage and old data load as a usable workspace", () => {
  assert.deepEqual(sanitizeWorkspace(null), defaultWorkspace());
  assert.deepEqual(sanitizeWorkspace("nonsense"), defaultWorkspace());
  const ws = sanitizeWorkspace({
    feeds: [{ url: "https://a.example/cal.ics", role: "personal" }, { url: "" }, { url: "https://a.example/cal.ics" }],
    weekly: [
      { label: "Class", days: [1, 3, 9], start: "09:00", end: "09:50" },
      { label: "Backwards", days: [1], start: "10:00", end: "09:00" },
    ],
    estimates: { x: 45, y: -3, z: "60" },
    prefs: { dayStart: 900, dayEnd: 100, dailyMax: 99999, estimates: { quiz: 20 } },
  });
  assert.equal(ws.feeds.length, 1, "blank and duplicate links are dropped");
  assert.equal(ws.feeds[0].id, feedIdFor("https://a.example/cal.ics"), "ids come from the link, not stored data");
  assert.equal(ws.weekly.length, 1);
  assert.deepEqual(ws.weekly[0].days, [1, 3], "an impossible weekday is dropped");
  assert.deepEqual(ws.estimates, { x: 45 });
  assert.equal(ws.prefs.dayStart, 8 * 60, "an inverted working day falls back to the default");
  assert.equal(ws.prefs.dailyMax, 24 * 60);
  assert.equal(ws.prefs.estimates.quiz, 20);
  assert.equal(ws.prefs.estimates.exam, 180);
});

test("a setup link carries everything to another device", () => {
  const ws: Workspace = { ...defaultWorkspace(), feeds: [feed("https://a.example/cal.ics")], done: { "x:1": "2026-10-01T00:00:00Z" }, estimates: { "x:2": 90 } };
  const back = decodeSetup(encodeSetup(ws))!;
  assert.deepEqual(back.feeds, ws.feeds);
  assert.deepEqual(back.done, ws.done);
  assert.deepEqual(back.estimates, ws.estimates);
  assert.equal(decodeSetup("not-a-setup"), null);
  assert.equal(decodeSetup(encodeSetup(defaultWorkspace())), null, "a setup with no calendars is not worth importing");
});

// ---------------------------------------------------------------------------
// Building the model
// ---------------------------------------------------------------------------

test("classes, work and busy time come together from every feed", () => {
  const school = feed("https://a.example/cal.ics");
  const personal = feed("https://p.example/cal.ics", "personal");
  const ws: Workspace = { ...defaultWorkspace(), feeds: [school, personal] };
  const snapshot: Snapshot = {
    at: null,
    feeds: {
      [school.id]: { result: result(), error: null, syncedAt: null },
      [personal.id]: {
        result: result({
          role: "personal",
          courses: [],
          tasks: [],
          events: [{ uid: "w", courseKey: null, title: "Work", start: "2026-10-01T15:00:00.000Z", end: "2026-10-01T19:00:00.000Z", allDay: false, busy: true, kind: "event", location: null, url: null }],
        }),
        error: null,
        syncedAt: null,
      },
    },
  };
  const m = buildModel(ws, snapshot, NOW);
  assert.deepEqual(m.courses.map((c) => c.code), ["CS 260", "MGMT 320"]);
  assert.notEqual(m.courses[0].color, m.courses[1].color, "every class gets its own colour");
  assert.equal(m.tasks.length, 2);
  assert.equal(m.tasks[0].id, `${school.id}:a1`);
  assert.equal(m.tasks[0].estimate, 30, "a quiz defaults to 30 minutes");
  assert.equal(m.events.length, 2);
  assert.equal(busyIntervals(m.events).length, 2);
  const classEvent = m.events.find((e) => e.courseId)!;
  assert.equal(classEvent.color, m.courseById.get(classEvent.courseId!)!.color, "class meetings wear their class colour");
});

test("the user's renames, estimates, done marks and hidden classes all apply", () => {
  const school = feed("https://a.example/cal.ics");
  const courseId = `${school.id}:course_2`;
  const ws: Workspace = {
    ...defaultWorkspace(),
    feeds: [school],
    courseEdits: { [courseId]: { title: "Organizational Effectiveness", color: "#123456" }, [`${school.id}:course_1`]: { hidden: true } },
    estimates: { [`${school.id}:a2`]: 95 },
    done: { [`${school.id}:a2`]: NOW.toISOString() },
  };
  const m = buildModel(ws, { at: null, feeds: { [school.id]: { result: result(), error: null, syncedAt: null } } }, NOW);
  const hrm = m.courseById.get(courseId)!;
  assert.equal(hrm.title, "Organizational Effectiveness");
  assert.equal(hrm.color, "#123456");
  assert.deepEqual(m.visibleCourses.map((c) => c.id), [courseId]);
  assert.deepEqual(m.tasks.map((t) => t.title), ["Case 1"], "work from a hidden class disappears");
  assert.equal(m.tasks[0].estimate, 95);
  assert.equal(m.tasks[0].customEstimate, true);
  assert.equal(m.tasks[0].done, true);
  assert.equal(m.events.length, 0, "and so do its class meetings");
});

test("a personal calendar never contributes homework, even if its feed has some", () => {
  const personal = feed("https://p.example/cal.ics", "personal");
  const ws: Workspace = { ...defaultWorkspace(), feeds: [personal] };
  const m = buildModel(ws, { at: null, feeds: { [personal.id]: { result: result(), error: null, syncedAt: null } } }, NOW);
  assert.equal(m.tasks.length, 0);
  assert.equal(m.courses.length, 0);
});

test("weekly blocks repeat on their days", () => {
  const events = expandWeekly([{ id: "w", label: "Work", days: [2, 4], start: "13:00", end: "17:00" }], NOW, 0, 7);
  assert.deepEqual(
    events.map((e) => new Date(e.start).toDateString()),
    ["Thu Oct 01 2026", "Tue Oct 06 2026", "Thu Oct 08 2026"],
  );
  assert.equal(new Date(events[0].start).getHours(), 13);
  assert.ok(events.every((e) => e.busy));
});

test("work added by hand joins the rest", () => {
  const ws: Workspace = { ...defaultWorkspace(), manualTasks: [{ id: "m1", title: "Midterm #1", courseId: null, type: "exam", dueAt: "2026-10-07T16:00:00.000Z" }] };
  const m = buildModel(ws, { at: null, feeds: {} }, NOW);
  assert.equal(m.tasks[0].id, "manual:m1");
  assert.equal(m.tasks[0].estimate, 180);
  assert.equal(m.tasks[0].manual, true);
});

// ---------------------------------------------------------------------------
// Noticing changes
// ---------------------------------------------------------------------------

test("a moved due date, new work and deleted work are all noticed", () => {
  const before = result();
  const after = result({
    tasks: [
      { ...before.tasks[0], dueAt: "2026-10-04T23:00:00.000Z" },
      { uid: "a3", courseKey: "course_2", title: "New case", type: "assignment", dueAt: "2026-10-05T16:00:00.000Z", allDay: false, url: null, description: null },
    ],
  });
  const changes = diffFeed("f1", before, after, NOW);
  assert.deepEqual(changes.map((c) => [c.kind, c.title]).sort(), [["added", "New case"], ["due_changed", "Quiz 3"], ["removed", "Case 1"]]);
  const moved = changes.find((c) => c.kind === "due_changed")!;
  assert.equal(moved.from, "2026-10-02T23:00:00.000Z");
  assert.equal(moved.to, "2026-10-04T23:00:00.000Z");
  assert.equal(moved.taskId, "f1:a1");
});

test("the first read of a feed, and generated study time, are not news", () => {
  assert.deepEqual(diffFeed("f1", null, result(), NOW), []);
  const withStudy = result({ tasks: [...result().tasks, { uid: "study:x", courseKey: "course_1", title: "Study for Exam", type: "exam", dueAt: "2026-10-03T16:00:00.000Z", allDay: false, url: null, description: null, generated: "study" }] });
  assert.deepEqual(diffFeed("f1", result(), withStudy, NOW), []);
});

test("changes are kept newest first and old ones expire", () => {
  const old = { id: "old", at: "2026-08-01T00:00:00.000Z", kind: "added" as const, taskId: "t", courseId: null, title: "Old", from: null, to: null };
  const fresh = { ...old, id: "fresh", at: NOW.toISOString(), title: "Fresh" };
  assert.deepEqual(mergeChanges([fresh], [old], NOW).map((c) => c.id), ["fresh"]);
});

// ---------------------------------------------------------------------------
// Syncing
// ---------------------------------------------------------------------------

test("a failing calendar keeps its last copy and the others still refresh", async () => {
  const good = feed("https://good.example/cal.ics");
  const bad = feed("https://bad.example/cal.ics");
  const ws: Workspace = { ...defaultWorkspace(), feeds: [good, bad] };
  const previous: Snapshot = { at: null, feeds: { [bad.id]: { result: result(), error: null, syncedAt: "2026-09-30T00:00:00.000Z" } } };
  const outcome = await syncAll(
    ws,
    previous,
    async (url) => {
      if (url.includes("bad")) throw new Error("That calendar no longer exists.");
      return result();
    },
    "America/Denver",
    NOW,
  );
  assert.equal(outcome.failed, 1);
  assert.equal(outcome.snapshot.feeds[good.id].error, null);
  assert.ok(outcome.snapshot.feeds[good.id].result);
  assert.equal(outcome.snapshot.feeds[bad.id].error, "That calendar no longer exists.");
  assert.ok(outcome.snapshot.feeds[bad.id].result, "the last good copy survives");
  assert.equal(outcome.snapshot.feeds[bad.id].syncedAt, "2026-09-30T00:00:00.000Z");
});

test("a removed calendar leaves nothing behind", async () => {
  const gone = feed("https://gone.example/cal.ics");
  const outcome = await syncAll(defaultWorkspace(), { at: null, feeds: { [gone.id]: { result: result(), error: null, syncedAt: null } } }, async () => result(), "UTC", NOW);
  assert.deepEqual(outcome.snapshot.feeds, {});
});

test("work already past due when a calendar is added is picked out by id", () => {
  const result = {
    tasks: [
      { uid: "a", dueAt: "2026-09-01T12:00:00.000Z" },
      { uid: "b", dueAt: "2026-10-01T12:00:00.000Z" },
    ],
  };
  assert.deepEqual(pastDueIds("f1", result, new Date("2026-09-15T00:00:00.000Z")), ["f1:a"]);
});
