/**
 * Timezone arithmetic without a timezone library.
 *
 * Feeds are parsed on the server, whose clock is UTC, but all-day entries mean a
 * date on the student's own calendar. The browser sends its IANA zone with each
 * request and these helpers turn a local wall-clock time in that zone into an
 * instant.
 */

export const FALLBACK_TIMEZONE = "UTC";

const validated = new Map<string, boolean>();

function isValidTimezone(tz: string): boolean {
  const cached = validated.get(tz);
  if (cached !== undefined) return cached;
  let ok = false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(0);
    ok = true;
  } catch {
    ok = false;
  }
  validated.set(tz, ok);
  return ok;
}

/**
 * An IANA zone Intl will accept, or the fallback. POSIX values such as ":UTC",
 * which AWS Lambda puts in TZ, are not IANA names and are rejected by Intl.
 */
export function safeTimezone(tz: string | undefined | null): string {
  const trimmed = (tz ?? "").trim().replace(/^:+/, "");
  if (!trimmed) return FALLBACK_TIMEZONE;
  return isValidTimezone(trimmed) ? trimmed : FALLBACK_TIMEZONE;
}

/** Offset (local minus UTC) in milliseconds for `tz` at the given instant. */
export function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(tz),
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** The instant at which the wall-clock time y-m-d h:mi:s occurs in `tz`. */
export function zonedTime(y: number, m: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  let offset = tzOffsetMs(new Date(guess), tz);
  let result = guess - offset;
  // Re-check once in case the guess and the answer sit on opposite sides of a DST change.
  const offset2 = tzOffsetMs(new Date(result), tz);
  if (offset2 !== offset) {
    offset = offset2;
    result = guess - offset;
  }
  return new Date(result);
}

/** The instant at which y-m-d 23:59:59 occurs in `tz`. */
export function zonedEndOfDay(y: number, m: number, d: number, tz: string): Date {
  return zonedTime(y, m, d, 23, 59, 59, tz);
}

/** The instant at which y-m-d begins in `tz`. */
export function zonedStartOfDay(y: number, m: number, d: number, tz: string): Date {
  return zonedTime(y, m, d, 0, 0, 0, tz);
}
