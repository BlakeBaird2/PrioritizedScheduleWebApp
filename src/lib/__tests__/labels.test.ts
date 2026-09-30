import assert from "node:assert/strict";
import test from "node:test";
import { classify, isNoiseEvent } from "../classify";
import { courseLabels, findCourseCode } from "../courses";
import { safeTimezone, zonedEndOfDay, zonedStartOfDay } from "../tz";

test("work types are recognized from titles", () => {
  assert.equal(classify({ title: "Midterm Exam 1" }), "exam");
  assert.equal(classify({ title: "Unit 3 Test" }), "exam");
  assert.equal(classify({ title: "Essay 1: Final Draft" }), "assignment");
  assert.equal(classify({ title: "Final Project" }), "project");
  assert.equal(classify({ title: "Write unit tests for Lab 3" }), "assignment");
  assert.equal(classify({ title: "Quiz 7" }), "quiz");
  assert.equal(classify({ title: "Chapter 12 Reading" }), "reading");
  assert.equal(classify({ title: "Homework 5" }), "assignment");
});

test("class meetings are recognized", () => {
  assert.ok(isNoiseEvent("Lecture"));
  assert.ok(!isNoiseEvent("Lecture Exam 2"));
});

test("course codes are found and titles cleaned", () => {
  assert.equal(findCourseCode("F2026-CS-235-001"), "CS 235");
  assert.equal(findCourseCode("Principles of Economics"), null);
  assert.deepEqual(courseLabels("ECON 110 - Principles of Economics"), { code: "ECON 110", title: "Principles of Economics" });
  assert.deepEqual(courseLabels("Fall 2026 CS 260 001 Web Programming", "CS 260"), { code: "CS 260", title: "Web Programming" });
  assert.deepEqual(courseLabels("CS260-F26", "CS260-F26"), { code: "CS 260", title: "CS 260" });
  assert.equal(courseLabels("Principles of Finance").code, "Principles of Finance", "a short enough name is kept whole");
  assert.equal(courseLabels("Principles of Managerial Economics").code, "Principles of Manager…");
});

test("timezones: bad values fall back and dates land on local midnight", () => {
  assert.equal(safeTimezone(":UTC"), "UTC");
  assert.equal(safeTimezone("Not/AZone"), "UTC");
  assert.equal(zonedEndOfDay(2026, 1, 15, "America/Denver").toISOString(), "2026-01-16T06:59:59.000Z");
  assert.equal(zonedStartOfDay(2026, 7, 15, "America/Denver").toISOString(), "2026-07-15T06:00:00.000Z");
});

test("security and software testing is not an exam", () => {
  assert.equal(classify({ title: "Pen Test Project" }), "project");
  assert.equal(classify({ title: "Penetration Test Report" }), "assignment");
  assert.equal(classify({ title: "Unit 3 Test" }), "exam");
  assert.equal(classify({ title: "Test 2" }), "exam");
});
