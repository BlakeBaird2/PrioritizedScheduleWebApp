import type { AssignmentType } from "./types";

export interface ClassifyInput {
  title: string;
  groupName?: string | null;
  submissionTypes?: string[] | null;
  isQuiz?: boolean;
  description?: string | null;
}

const EXAM_RE = /\b(exams?|midterms?|finals?)\b/i;
const FINAL_NOT_EXAM_RE = /\bfinal\s+(draft|project|paper|essay|presentation|report|portfolio|reflection|submission|version|deliverable|proposal|writeup|write-up|copy|review|revision|design|demo|video|poster|lab|homework|hw|assignment|check)/i;
const TEST_RE = /\btests?\b/i;
// "unit test"/"test cases" are software testing, but "Unit 3 Test" is an exam,
// so only exclude when the qualifier sits directly next to the word "test".
const TEST_NOT_EXAM_RE =
  /\b(unit\s+tests?|integration\s+tests?|test\s*cases?|testing|test[- ]driven|tdd|test\s+suite|write\s+tests?|a\/b\s+tests?|beta\s+tests?|speed\s+tests?|typing\s+tests?|pen(?:etration)?\s*tests?|load\s+tests?|stress\s+tests?)\b/i;
const QUIZ_RE = /\bquiz(?:zes)?\b/i;
const READING_RE = /\b(read(?:ing|ings)?|chapters?|ch\.?\s*\d|chap\.?\s*\d|textbook|pages?\s*\d|pp\.?\s*\d|article|excerpt)\b/i;
const PROJECT_RE = /\b(projects?|milestones?|deliverables?|capstone|prototype|proposal|sprint)\b/i;
const NOISE_EVENT_RE = /^(lecture|class|class (meeting|session)|office hours?|lab section|section|recitation|discussion section)\b/i;

function isFinalExamPhrase(text: string): boolean {
  // "Final Project" is not an exam, but "Final Exam" and a bare "Final" are.
  if (!/\bfinals?\b/i.test(text)) return false;
  return !FINAL_NOT_EXAM_RE.test(text);
}

export function looksLikeExam(text: string): boolean {
  if (/\b(exams?|midterms?)\b/i.test(text)) return true;
  if (isFinalExamPhrase(text)) return true;
  // A bare "test" is an exam, unless the title is plainly a project ("Test Plan Project").
  if (TEST_RE.test(text) && !TEST_NOT_EXAM_RE.test(text) && !PROJECT_RE.test(text)) return true;
  return false;
}

export function classify(input: ClassifyInput): AssignmentType {
  const title = input.title || "";
  const group = input.groupName || "";
  const subs = (input.submissionTypes ?? []).map((s) => s.toLowerCase());
  const titleAndGroup = `${title} ${group}`;

  // Exams win over everything: an "Exam 2 (online quiz)" is still an exam.
  if (looksLikeExam(title) || (group && looksLikeExam(group) && !QUIZ_RE.test(title))) {
    if (!EXAM_RE.test(title) && !TEST_RE.test(title) && QUIZ_RE.test(title)) {
      // group says exam but title says quiz -> quiz
      return "quiz";
    }
    return "exam";
  }

  if (input.isQuiz || subs.includes("online_quiz") || QUIZ_RE.test(titleAndGroup)) return "quiz";
  if (READING_RE.test(title) || /\bread/i.test(group)) return "reading";
  if (PROJECT_RE.test(title) || /\bproject/i.test(group)) return "project";
  return "assignment";
}

/** Calendar-only events that are just class meetings and should not appear as work. */
export function isNoiseEvent(title: string): boolean {
  const t = title.trim();
  if (!t) return true;
  if (NOISE_EVENT_RE.test(t) && !looksLikeExam(t) && !QUIZ_RE.test(t)) return true;
  return false;
}
