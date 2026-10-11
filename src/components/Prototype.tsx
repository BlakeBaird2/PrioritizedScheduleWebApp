"use client";

/**
 * First-visit notices shared by every entry screen:
 *
 * - EntryNotices: prototype notice first, then the goal-setting pop-up. Each dismissal
 *   is remembered in this browser (localStorage) so returning users are not interrupted.
 * - PrototypeBadge / GoalBadge: reopen each notice from headers and Help/Settings.
 * - CapabilityHero / WirePlaceholder: shared entry-screen pieces.
 * - DevStateSwitcher: development-only shortcuts to each entry state.
 */
import { useEffect, useState } from "react";
import { FlaskConical, Target } from "lucide-react";
import { KEYS, readStored, useHydrated, useStored, writeStored } from "./store";
import { Button, Dialog } from "./ui";

export const CAPABILITY = "See exactly what to work on in every free gap of your day.";
export const PROTOTYPE_MESSAGE = "This is an early prototype. It looks simple on purpose and some things are placeholders.";
export const GOAL_TITLE = "Your goal in this prototype";
export const GOAL_EXAMPLE =
  "You have 45 minutes between class and work. Find something productive to work on and mark it done.";
export const GOAL_BODY =
  "SmartScheduler finds free gaps on your day and fills them with the work that is due soonest. Use Plan, Calendar, Upcoming, or Classes — any path that gets you to a task and a Done mark counts.";

const OPEN_PROTO = "prio:open-prototype-notice";
const OPEN_GOAL = "prio:open-goal-notice";

/** Shows the prototype notice again, from anywhere. */
export function openPrototypeNotice() {
  window.dispatchEvent(new Event(OPEN_PROTO));
}

/** Shows the goal instructions again, from anywhere. */
export function openGoalNotice() {
  window.dispatchEvent(new Event(OPEN_GOAL));
}

/**
 * Prototype notice first; after Got it, the goal pop-up. Reopening either from a
 * badge only shows that dialog. Returning users with both keys set see nothing.
 */
export function EntryNotices() {
  const hydrated = useHydrated();
  const protoDismissed = useStored(KEYS.prototypeNotice);
  const goalDismissed = useStored(KEYS.goalNotice);
  const [forceProto, setForceProto] = useState(false);
  const [forceGoal, setForceGoal] = useState(false);

  useEffect(() => {
    const onProto = () => {
      setForceGoal(false);
      setForceProto(true);
    };
    const onGoal = () => {
      setForceProto(false);
      setForceGoal(true);
    };
    window.addEventListener(OPEN_PROTO, onProto);
    window.addEventListener(OPEN_GOAL, onGoal);
    return () => {
      window.removeEventListener(OPEN_PROTO, onProto);
      window.removeEventListener(OPEN_GOAL, onGoal);
    };
  }, []);

  if (!hydrated) return null;

  const showProto = forceProto || protoDismissed === null;
  const showGoal = !showProto && (forceGoal || goalDismissed === null);

  if (showProto) {
    return (
      <Dialog elevated label="About this prototype" onClose={() => {
        writeStored(KEYS.prototypeNotice, new Date().toISOString());
        setForceProto(false);
      }} size="md" className="!p-6">
        <span className="proto-badge pointer-events-none" aria-hidden>
          <FlaskConical size={14} />
          Prototype
        </span>
        <h2 className="mt-4 text-2xl font-bold leading-snug">{PROTOTYPE_MESSAGE}</h2>
        <p className="mt-3 text-base text-muted leading-relaxed">
          SmartScheduler still works: add your calendars or try the sample data, and it plans your free time. You can read this again any time from the{" "}
          <b className="text-fg">Prototype</b> tag at the top.
        </p>
        <Button
          variant="primary"
          block
          className="mt-5"
          data-autofocus
          onClick={() => {
            writeStored(KEYS.prototypeNotice, new Date().toISOString());
            setForceProto(false);
          }}
        >
          Got it
        </Button>
      </Dialog>
    );
  }

  if (showGoal) {
    return (
      <Dialog elevated label={GOAL_TITLE} onClose={() => {
        writeStored(KEYS.goalNotice, new Date().toISOString());
        setForceGoal(false);
      }} size="md" className="!p-6">
        <span className="proto-badge pointer-events-none" aria-hidden>
          <Target size={14} />
          Goal
        </span>
        <h2 className="mt-4 text-2xl font-bold leading-snug">{GOAL_TITLE}</h2>
        <p className="mt-3 text-base text-fg leading-relaxed">{GOAL_EXAMPLE}</p>
        <p className="mt-3 text-base text-muted leading-relaxed">{GOAL_BODY}</p>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          Reopen these instructions any time from the <b className="text-fg">Goal</b> tag, Help, or Settings.
        </p>
        <Button
          variant="primary"
          block
          className="mt-5"
          data-autofocus
          onClick={() => {
            writeStored(KEYS.goalNotice, new Date().toISOString());
            setForceGoal(false);
          }}
        >
          Got it
        </Button>
      </Dialog>
    );
  }

  return null;
}

/** @deprecated Prefer EntryNotices — kept for older imports. */
export function PrototypeNotice() {
  return <EntryNotices />;
}

export function PrototypeBadge({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={`proto-badge ${className}`} onClick={openPrototypeNotice} title="About this prototype" aria-haspopup="dialog">
      <FlaskConical size={14} className="hidden sm:block" aria-hidden />
      Prototype
    </button>
  );
}

export function GoalBadge({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={`proto-badge ${className}`} onClick={openGoalNotice} title="Your goal in this prototype" aria-haspopup="dialog">
      <Target size={14} className="hidden sm:block" aria-hidden />
      Goal
    </button>
  );
}

const HERO_SIZE = {
  page: "text-[2.5rem] sm:text-6xl lg:text-7xl",
  app: "text-3xl sm:text-[2.6rem]",
} as const;

export function CapabilityHero({
  size = "app",
  id,
  className = "",
  children,
}: {
  size?: keyof typeof HERO_SIZE;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <h1 id={id} className={`capability ${HERO_SIZE[size]}`}>
        {CAPABILITY}
      </h1>
      {children}
    </div>
  );
}

export function WirePlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`wire-placeholder ${className}`} role="img" aria-label={`Placeholder: ${label}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="100" y1="0" x2="0" y2="100" />
      </svg>
      <span>[image: {label}]</span>
    </div>
  );
}

function clearPrioStorage({ keepNotices }: { keepNotices: boolean }) {
  const theme = readStored(KEYS.theme);
  for (const key of Object.values(KEYS)) {
    if (key === KEYS.theme) continue;
    if (keepNotices && (key === KEYS.prototypeNotice || key === KEYS.goalNotice || key === KEYS.tour)) continue;
    writeStored(key, null);
  }
  if (theme) writeStored(KEYS.theme, theme);
}

function markNoticesRead() {
  const now = new Date().toISOString();
  writeStored(KEYS.prototypeNotice, now);
  writeStored(KEYS.goalNotice, now);
}

export function DevStateSwitcher() {
  const hydrated = useHydrated();
  if (process.env.NODE_ENV !== "development" || !hydrated) return null;

  const go = (url: string) => {
    window.location.assign(url);
    if (new URL(url, window.location.href).pathname === window.location.pathname) window.location.reload();
  };

  const states: { label: string; run: () => void }[] = [
    {
      label: "First visit (blank, notices show)",
      run: () => {
        clearPrioStorage({ keepNotices: false });
        go("/");
      },
    },
    {
      label: "New user at /app (notices already read)",
      run: () => {
        clearPrioStorage({ keepNotices: true });
        markNoticesRead();
        go("/app");
      },
    },
    {
      label: "Sample data at /app#demo",
      run: () => {
        clearPrioStorage({ keepNotices: true });
        markNoticesRead();
        go("/app#demo");
      },
    },
    {
      label: "Returning user at /app (keeps current data)",
      run: () => {
        markNoticesRead();
        go("/app");
      },
    },
    {
      label: "Show the walkthrough again",
      run: () => {
        writeStored(KEYS.tour, null);
        markNoticesRead();
        go("/app");
      },
    },
    {
      label: "Show prototype + goal on next load",
      run: () => {
        writeStored(KEYS.prototypeNotice, null);
        writeStored(KEYS.goalNotice, null);
        window.location.reload();
      },
    },
    {
      label: "Show goal notice only",
      run: () => {
        markNoticesRead();
        writeStored(KEYS.goalNotice, null);
        window.location.reload();
      },
    },
  ];

  return (
    <details className="fixed bottom-3 left-3 z-[70] max-w-[calc(100vw-1.5rem)] border border-dashed border-fg bg-surface text-sm">
      <summary className="cursor-pointer select-none px-2 py-1">Dev: entry states</summary>
      <div className="flex flex-col gap-1 p-2 pt-0">
        <p className="text-xs text-muted">Development only. Not shown in production.</p>
        {states.map((s) => (
          <button key={s.label} type="button" className="btn justify-start" onClick={s.run}>
            {s.label}
          </button>
        ))}
      </div>
    </details>
  );
}
