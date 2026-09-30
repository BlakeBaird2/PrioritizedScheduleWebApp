/**
 * Working out what to call a class.
 *
 * Sources are inconsistent: a course code can be a clean "CS 260" or carry a term
 * and section like "F2026-IS-551-002", and a name can be anything from
 * "Web Programming" to "Fall 2026 CS 260 001 Web Programming".
 * Pull a course code out of whichever field has one, and reduce the name to the
 * human title. Anything still wrong can be renamed in the app.
 */

export interface CourseLabels {
  /** Short form for tight spaces, e.g. "CS 260". */
  code: string;
  /** Human title for places with room, e.g. "Web Programming". */
  title: string;
}

// Two to five letters, an optional single-letter subject suffix ("REL A"), then
// three digits with an optional trailing letter. Separators may be spaces or dashes.
const CODE_RE = /\b([A-Za-z]{2,5})(?:[\s-]+([A-Za-z]))?[\s-]*(\d{3}[A-Za-z]?)\b/;

const TERM_RE = /\b(fall|winter|spring|summer|autumn|fa|wi|sp|su)\s*'?\d{2,4}\b/gi;
// A bare term marker such as "F26" or "W2027", which Canvas tacks onto course codes.
const TERM_TOKEN_RE = /\b(?:f|w|sp|su|fa|wi)\s*'?\d{2,4}\b/gi;
const SECTION_RE = /\b(?:all\s+sections|section|sec\.?|sect\.?)\s*\d*\b/gi;

function normalizeCode(match: RegExpMatchArray): string {
  const subject = match[1].toUpperCase();
  const suffix = match[2] ? ` ${match[2].toUpperCase()}` : "";
  return `${subject}${suffix} ${match[3].toUpperCase()}`;
}

/** The course code inside a string, normalized to "CS 260", or null. */
export function findCourseCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(CODE_RE);
  return match ? normalizeCode(match) : null;
}

function stripNoise(value: string, code: string | null): string {
  let s = value.replace(/\s+/g, " ").trim();
  s = s.replace(TERM_RE, " ");
  s = s.replace(SECTION_RE, " ");
  if (code) {
    // Remove the code however it was written, plus any section digits right after it.
    const [subject, ...rest] = code.split(" ");
    const digits = rest.pop() ?? "";
    const suffix = rest.length ? `[\\s-]+${rest[0]}` : "";
    const pattern = new RegExp(`\\b${subject}${suffix}[\\s-]*${digits}\\b(?:[\\s-]*\\d{1,3}\\b)?`, "ig");
    s = s.replace(pattern, " ");
  }
  s = s.replace(TERM_TOKEN_RE, " ");
  s = s.replace(/\((?:\s*)\)/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  // Drop separators left behind at either end.
  s = s.replace(/^[\s\-–—:,.|]+/, "").replace(/[\s\-–—:,.|]+$/, "");
  return s.trim();
}

/** A fallback short label when no course code exists anywhere. */
export function shorten(title: string, max = 22): string {
  const s = title.trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s || "Class";
}

/**
 * @param rawName the course name as the source reports it
 * @param rawCode the source's own course code, when it has one
 */
export function courseLabels(rawName: string | null | undefined, rawCode?: string | null): CourseLabels {
  const name = (rawName ?? "").replace(/\s+/g, " ").trim();
  const codeField = (rawCode ?? "").replace(/\s+/g, " ").trim();

  const code = findCourseCode(codeField) ?? findCourseCode(name);
  let title = stripNoise(name, code);
  // A name that was only the code leaves nothing behind; try the code field's words.
  if (!title) title = stripNoise(codeField, code);
  if (!title) title = code ?? (name || codeField || "Class");

  return { code: code ?? shorten(title), title };
}
