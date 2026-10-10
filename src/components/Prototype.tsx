"use client";

/**
 * Pieces that say "this is an early prototype", shared by every entry screen:
 *
 * - PrototypeNotice: a short notice shown automatically on someone's first visit,
 *   whichever page they arrive on. Dismissing it is remembered in this browser
 *   (localStorage, key KEYS.prototypeNotice), apart from calendars and settings.
 * - PrototypeBadge: the "Prototype" tag in each header. It reopens the notice.
 * - CapabilityHero: the one sentence that says what SmartScheduler does, drawn as the first
 *   and biggest thing on each entry screen.
 * - WirePlaceholder: a grey box standing in for a picture, labelled in words.
 * - DevStateSwitcher: development-only shortcuts to each entry state.
 */
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { KEYS, readStored, useHydrated, useStored, writeStored } from "./store";
import { Button, Dialog } from "./ui";

export const CAPABILITY = "See exactly what to work on in every free gap of your day.";
export const PROTOTYPE_MESSAGE = "This is an early prototype. It looks simple on purpose and some things are placeholders.";

const OPEN_EVENT = "prio:open-prototype-notice";

/** Shows the prototype notice again, from anywhere. */
export function openPrototypeNotice() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function PrototypeNotice() {
  const hydrated = useHydrated();
  const dismissed = useStored(KEYS.prototypeNotice);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const onOpen = () => setReopened(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const open = hydrated && (dismissed === null || reopened);

  const close = () => {
    writeStored(KEYS.prototypeNotice, new Date().toISOString());
    setReopened(false);
  };

  if (!open) return null;

  return (
    <Dialog elevated label="About this prototype" onClose={close} size="md" className="!p-6">
      <span className="proto-badge pointer-events-none" aria-hidden>
        <FlaskConical size={14} />
        Prototype
      </span>
      <h2 className="mt-4 text-2xl font-bold leading-snug">{PROTOTYPE_MESSAGE}</h2>
      <p className="mt-3 text-base text-muted leading-relaxed">
        SmartScheduler still works: add your calendars or try the sample data, and it plans your free time. You can read this again any time from the{" "}
        <b className="text-fg">Prototype</b> tag at the top.
      </p>
      <Button variant="primary" block className="mt-5" onClick={close} data-autofocus>
        Got it
      </Button>
    </Dialog>
  );
}

export function PrototypeBadge({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={`proto-badge ${className}`} onClick={openPrototypeNotice} title="About this prototype" aria-haspopup="dialog">
      <FlaskConical size={14} className="hidden sm:block" aria-hidden />
      Prototype
    </button>
  );
}

const HERO_SIZE = {
  /** Home and about pages. */
  page: "text-[2.5rem] sm:text-6xl lg:text-7xl",
  /** Inside the app, above a screen's own content. */
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
  /** Secondary text under the sentence, kept visibly smaller. */
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

/** A grey stand-in for an illustration or screenshot, with a crossed box like a wireframe. */
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

// ---------------------------------------------------------------------------
// Development only
// ---------------------------------------------------------------------------

/** Everything SmartScheduler keeps in this browser, so "new visitor" really starts blank. */
function clearPrioStorage({ keepNotice }: { keepNotice: boolean }) {
  const theme = readStored(KEYS.theme);
  for (const key of Object.values(KEYS)) {
    if (key === KEYS.theme) continue;
    if (keepNotice && key === KEYS.prototypeNotice) continue;
    writeStored(key, null);
  }
  if (theme) writeStored(KEYS.theme, theme);
}

function markNoticeRead() {
  writeStored(KEYS.prototypeNotice, new Date().toISOString());
}

/**
 * Shortcuts to each entry state, for checking them one after another. Rendered
 * only by `npm run dev` (NODE_ENV is "development"); production builds drop it.
 */
export function DevStateSwitcher() {
  const hydrated = useHydrated();
  if (process.env.NODE_ENV !== "development" || !hydrated) return null;

  const go = (url: string) => {
    window.location.assign(url);
    // Same path with only a new #hash doesn't reload on its own.
    if (new URL(url, window.location.href).pathname === window.location.pathname) window.location.reload();
  };

  const states: { label: string; run: () => void }[] = [
    {
      label: "First visit (blank, notice shows)",
      run: () => {
        clearPrioStorage({ keepNotice: false });
        go("/");
      },
    },
    {
      label: "New user at /app (notice already read)",
      run: () => {
        clearPrioStorage({ keepNotice: true });
        markNoticeRead();
        go("/app");
      },
    },
    {
      label: "Sample data at /app#demo",
      run: () => {
        clearPrioStorage({ keepNotice: true });
        go("/app#demo");
      },
    },
    {
      label: "Returning user at /app (keeps current data)",
      run: () => {
        markNoticeRead();
        go("/app");
      },
    },
    {
      label: "Show the walkthrough again",
      run: () => {
        writeStored(KEYS.tour, null);
        markNoticeRead();
        go("/app");
      },
    },
    {
      label: "Show prototype notice on next load",
      run: () => {
        writeStored(KEYS.prototypeNotice, null);
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
