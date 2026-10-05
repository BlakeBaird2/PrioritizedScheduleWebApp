/**
 * Illustrations for the home page, drawn with the app's own styles so they look
 * like the real thing in either theme. They all show the same sample Tuesday:
 * three classes from Canvas, a shift from a work calendar and plans from a
 * personal one, with the free time between them filled soonest-due first.
 *
 * These render on the server and send no code to the browser.
 */
import { ArrowDown, ArrowRight, Briefcase, Check, GraduationCap, Heart, Link as LinkIcon, MapPin } from "lucide-react";
import { COURSE_COLORS } from "@/lib/model";
import { CALENDAR_KINDS, type CalendarKindId } from "./calendarGuide";

const kindColor = (id: CalendarKindId) => CALENDAR_KINDS.find((k) => k.id === id)!.color;

const SCHOOL = kindColor("school");
const WORK = kindColor("work");
const LIFE = kindColor("personal");
const CS = COURSE_COLORS[0];
const BUS = COURSE_COLORS[2];
const WRTG = COURSE_COLORS[3];

/** Sets --c, the colour the app's event, task and class styles are drawn in. */
function tint(color: string, extra?: Record<string, string>): React.CSSProperties {
  return { "--c": color, ...extra } as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// The hero: three calendars in, one planned day out
// ---------------------------------------------------------------------------

const SOURCES = [
  {
    kind: "School",
    app: "Canvas",
    icon: GraduationCap,
    color: SCHOOL,
    items: [
      { title: "Lab 5", when: "due tonight", color: CS },
      { title: "Reading: Chapter 6", when: "due Wed", color: BUS },
      { title: "Essay 1 draft", when: "due Fri", color: WRTG },
      { title: "CS 142 lecture", when: "Tue 10 AM", color: CS },
    ],
  },
  {
    kind: "Work",
    app: "Outlook",
    icon: Briefcase,
    color: WORK,
    items: [
      { title: "Shift at the bookstore", when: "Tue 1 PM", color: WORK },
      { title: "Team meeting", when: "Thu 9 AM", color: WORK },
    ],
  },
  {
    kind: "Personal",
    app: "Google Calendar",
    icon: Heart,
    color: LIFE,
    items: [
      { title: "Gym", when: "Tue 7 AM", color: LIFE },
      { title: "Dinner with roommates", when: "Tue 6:30 PM", color: LIFE },
    ],
  },
];

interface Planned {
  title: string;
  course: string;
  due: string;
  part?: string;
  length: string;
  color: string;
}

type DayRow =
  | { kind: "event"; start: string; end: string; title: string; detail: string; place?: string; color: string }
  | { kind: "free"; start: string; end: string; length: string; work: Planned[] };

const TUESDAY: DayRow[] = [
  {
    kind: "free",
    start: "8:10 AM",
    end: "9:50 AM",
    length: "1h 40m",
    work: [{ title: "Lab 5", course: "CS 142", due: "due tonight", length: "1h 30m", color: CS }],
  },
  { kind: "event", start: "10 AM", end: "10:50 AM", title: "CS 142", detail: "Class", place: "TMCB 1170", color: CS },
  {
    kind: "free",
    start: "11 AM",
    end: "12:50 PM",
    length: "1h 50m",
    work: [
      { title: "Reading: Chapter 6", course: "BUS 301", due: "due tomorrow", length: "30m", color: BUS },
      { title: "Essay 1 draft", course: "WRTG 150", due: "due Fri", part: "part 1 of 2", length: "1h 20m", color: WRTG },
    ],
  },
  { kind: "event", start: "1 PM", end: "5 PM", title: "Shift at the bookstore", detail: "Work · Outlook", color: WORK },
  {
    kind: "free",
    start: "5:10 PM",
    end: "6:20 PM",
    length: "1h 10m",
    work: [{ title: "Essay 1 draft", course: "WRTG 150", due: "due Fri", part: "part 2 of 2", length: "40m", color: WRTG }],
  },
  { kind: "event", start: "6:30 PM", end: "7:30 PM", title: "Dinner with roommates", detail: "Personal · Google Calendar", color: LIFE },
];

/** Each piece of planned work settles into place a moment after the one before. */
const SETTLE_ORDER = new Map(TUESDAY.flatMap((row) => (row.kind === "free" ? row.work : [])).map((w, i) => [w, i]));
const settleDelay = (w: Planned) => ({ "--delay": `${450 + 160 * (SETTLE_ORDER.get(w) ?? 0)}ms` });

/** One planned day from the sample calendars, the way Prio's Plan screen shows it. */
export function PlanPreview() {
  return (
    <figure className="rounded-[1.75rem] border border-line bg-surface-2/70 p-3 sm:p-6 lg:p-8 shadow-[var(--shadow)]">
      <figcaption className="sr-only">
        An example. Prio reads a Canvas calendar with three classes and their assignments, a work calendar with a shift, and a personal calendar with
        the gym and dinner plans. It then plans Tuesday: Lab 5, due that night, before the 10 AM lecture; the chapter 6 reading and the first part of an
        essay before the 1 PM shift; and the rest of the essay before dinner.
      </figcaption>
      <div aria-hidden className="pointer-events-none select-none grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.3fr)] lg:items-center lg:gap-8">
        <div>
          <div className="section-title mb-2.5 px-1">Your calendars</div>
          <Sources />
        </div>
        <Connector />
        <PlannedDay />
      </div>
    </figure>
  );
}

function Sources() {
  return (
    <div className="space-y-3">
      {SOURCES.map((s) => (
        <div key={s.kind} className="rounded-xl border border-line bg-surface p-3 sm:p-3.5" style={tint(s.color)}>
          <div className="flex items-center gap-2.5">
            <span className="course-tint grid h-8 w-8 shrink-0 place-items-center rounded-lg">
              <s.icon size={16} className="course-text" />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold">{s.kind}</div>
              <div className="text-xs text-muted">{s.app}</div>
            </div>
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {s.items.map((item) => (
              <li key={item.title} className="flex items-center gap-2 text-xs" style={tint(item.color)}>
                <span className="course-dot" />
                <span className="min-w-0 truncate font-medium">{item.title}</span>
                <span className="ml-auto shrink-0 text-muted">{item.when}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white shadow-[0_8px_24px_-8px_var(--accent)]">
        <ArrowDown size={19} strokeWidth={2.25} className="lg:hidden" />
        <ArrowRight size={19} strokeWidth={2.25} className="hidden lg:block" />
      </span>
      <span className="text-xs font-medium text-muted lg:max-w-[6.5rem]">Prio finds the gaps and fills them</span>
    </div>
  );
}

function PlannedDay() {
  return (
    <div className="card p-3 sm:p-5">
      <div className="flex items-end justify-between gap-3 px-1 sm:px-0">
        <div>
          <div className="section-title">Your plan</div>
          <div className="mt-0.5 text-base font-semibold">Tuesday</div>
        </div>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">4h of work planned</span>
      </div>
      <ol className="mt-3.5 space-y-2">
        {TUESDAY.map((row) => (
          <li key={row.start} className="flex gap-2 sm:gap-3">
            <div className="w-14 sm:w-[4.5rem] shrink-0 pt-2 text-right">
              <div className="text-xs font-medium tabular-nums">{row.start}</div>
              <div className="text-[11px] text-faint tabular-nums">{row.end}</div>
            </div>
            <div className="min-w-0 flex-1">
              {row.kind === "event" ? (
                <div className="event-block px-3 py-2" style={tint(row.color)}>
                  <div className="event-title truncate text-sm font-semibold">{row.title}</div>
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                    <span className="truncate">{row.detail}</span>
                    {row.place ? (
                      <span className="inline-flex items-center gap-0.5 truncate">
                        <MapPin size={11} className="shrink-0" />
                        {row.place}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-ok/30 bg-ok/[0.06] p-1.5 sm:p-2.5">
                  <div className="px-1 pt-0.5 text-sm font-semibold text-ok">Free · {row.length}</div>
                  <ul className="mt-2 space-y-1.5">
                    {row.work.map((w) => (
                      <li
                        key={`${w.title}:${w.part ?? ""}`}
                        className="task-card landing-settle flex items-center gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3"
                        style={tint(w.color, settleDelay(w))}
                      >
                        <span className="check" style={{ width: "1.125rem", height: "1.125rem" }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium leading-snug">{w.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                            <span className="course-text inline-flex items-center gap-1.5 font-medium">
                              <span className="course-dot" />
                              {w.course}
                            </span>
                            <span>{w.due}</span>
                            {w.part ? <span className="text-faint">{w.part}</span> : null}
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums">{w.length}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The three steps of "How it works"
// ---------------------------------------------------------------------------

/** Step 1: a link pasted in, and what Prio found in it. */
export function LinkArt() {
  return (
    <div className="w-full max-w-[18rem] space-y-2.5">
      <div className="flex gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted">
          <LinkIcon size={12} className="shrink-0 text-faint" />
          <span className="truncate">https://school.instructure.com/feeds/calendars/user_8Kd2…</span>
        </div>
        <span className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white">Add</span>
      </div>
      {["Added Canvas: 3 classes · 24 due", "Added Outlook: 9 events used as busy time"].map((line) => (
        <p key={line} className="flex items-center gap-1.5 text-xs text-ok">
          <Check size={13} strokeWidth={2.75} className="shrink-0" />
          <span className="truncate">{line}</span>
        </p>
      ))}
    </div>
  );
}

const DAY_MINUTES = 14 * 60; // 8 AM to 10 PM
const at = (minutes: number) => `${(minutes / DAY_MINUTES) * 100}%`;

/** Minutes after 8 AM. Busy time keeps 10 minutes of breathing room either side. */
const SEGMENTS: { from: number; to: number; busy?: string }[] = [
  { from: 10, to: 110 },
  { from: 120, to: 170, busy: CS },
  { from: 180, to: 290 },
  { from: 300, to: 540, busy: WORK },
  { from: 550, to: 620 },
  { from: 630, to: 690, busy: LIFE },
  { from: 700, to: DAY_MINUTES },
];

/** Step 2: a day with everything busy blocked out, and the gaps left over. */
export function GapsArt() {
  return (
    <div className="w-full max-w-[18rem]">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">Tuesday</span>
        <span className="font-medium text-ok">7h free in 4 gaps</span>
      </div>
      <div className="relative mt-2.5 h-11 rounded-lg border border-line bg-surface">
        {SEGMENTS.map((s) => (
          <span
            key={s.from}
            className={`absolute inset-y-1 rounded-[5px] ${s.busy ? "course-bar opacity-85" : "border border-dashed border-ok/60 bg-ok/10"}`}
            style={{ left: at(s.from), width: at(s.to - s.from), ...(s.busy ? tint(s.busy) : null) }}
          />
        ))}
      </div>
      <div className="relative mt-1.5 h-3 text-[10px] text-faint tabular-nums">
        <span className="absolute left-0">8 AM</span>
        <span className="absolute -translate-x-1/2" style={{ left: at(240) }}>
          12 PM
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: at(480) }}>
          4 PM
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: at(720) }}>
          8 PM
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex gap-0.5">
            {[CS, WORK, LIFE].map((c) => (
              <span key={c} className="h-2.5 w-1.5 rounded-[2px]" style={{ background: c }} />
            ))}
          </span>
          Class, shift, dinner
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-[3px] border border-dashed border-ok/60 bg-ok/10" />
          Free
        </span>
      </div>
    </div>
  );
}

/** Step 3: the work, in the order it gets planned. */
export function OrderArt() {
  const rows = [
    { title: "Lab 5", due: "due tonight", color: CS },
    { title: "Reading: Chapter 6", due: "due Wed", color: BUS },
    { title: "Essay 1 draft", due: "due Fri", color: WRTG },
  ];
  return (
    <ol className="w-full max-w-[18rem] space-y-1.5">
      {rows.map((r, i) => (
        <li key={r.title} className="task-card flex items-center gap-2.5 px-2.5 py-2" style={tint(r.color)}>
          <span className="w-3 text-xs font-semibold text-muted tabular-nums">{i + 1}</span>
          <span className="course-dot" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{r.title}</span>
          <span className="shrink-0 text-[11px] text-muted">{r.due}</span>
        </li>
      ))}
    </ol>
  );
}
