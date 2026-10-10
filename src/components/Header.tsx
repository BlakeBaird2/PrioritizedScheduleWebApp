"use client";

import { CalendarRange, LayoutGrid, ListChecks, Plus, RefreshCw, Settings, Target } from "lucide-react";
import { timeAgo } from "@/lib/ui";
import { useApp, type View } from "./context";
import { ChangesPopover } from "./ChangesPopover";
import { PrototypeBadge } from "./Prototype";
import { Button, SegmentedControl, Wordmark } from "./ui";

const TABS: { id: View; label: string; icon: typeof ListChecks }[] = [
  { id: "plan", label: "Plan", icon: Target },
  { id: "calendar", label: "Calendar", icon: CalendarRange },
  { id: "upcoming", label: "Upcoming", icon: ListChecks },
  { id: "classes", label: "Classes", icon: LayoutGrid },
];

/**
 * Laid out the way most web apps are, so nothing has to be learned:
 * name on the left (goes home), the main views next to it, and tools on the right.
 * The tools are in two groups with a divider between them: keeping the calendars
 * current, and things you open (add a task, alerts, settings).
 */
export function Header() {
  const { view, setView, snapshot, now, syncing, sync, openAddTask } = useApp();
  const status = syncing ? "Syncing…" : snapshot.at ? `Synced ${timeAgo(snapshot.at, now)}` : "Not synced yet";

  return (
    <header className="sticky top-0 z-30 bg-bg border-b border-line-strong">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2 sm:gap-3">
        <button type="button" onClick={() => setView("plan")} className="shrink-0" aria-label="SmartScheduler, go to your plan" title="Go to your plan">
          <Wordmark />
        </button>
        <PrototypeBadge />

        <nav className="ml-2 hidden md:block" aria-label="Main" data-tour="nav">
          <SegmentedControl label="Main views" options={TABS} value={view} onChange={setView} />
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1.5" role="group" aria-label="Calendar updates">
            <span
              className="hidden lg:inline text-xs text-muted tabular-nums"
              aria-live="polite"
              title={snapshot.at ? new Date(snapshot.at).toLocaleString() : undefined}
            >
              {status}
            </span>
            <Button
              iconOnly
              icon={RefreshCw}
              label="Refresh calendars now"
              onClick={() => void sync()}
              disabled={syncing}
              className={syncing ? "is-syncing" : ""}
            />
            <span className="mx-1.5 h-6 w-px bg-line-strong" aria-hidden />
          </div>
          <Button icon={Plus} onClick={openAddTask} title="Add a task that isn't on any calendar" aria-label="Add task">
            <span className="hidden sm:inline">Add task</span>
          </Button>
          <ChangesPopover />
          <Button
            icon={Settings}
            onClick={() => setView("settings")}
            aria-label="Settings"
            aria-pressed={view === "settings"}
            className={view === "settings" ? "!bg-surface-2 underline underline-offset-4" : ""}
          >
            <span className="hidden lg:inline">Settings</span>
          </Button>
        </div>
      </div>
      <nav className="md:hidden px-4 pb-2" aria-label="Main" data-tour="nav">
        <SegmentedControl label="Main views" options={TABS} value={view} onChange={setView} stretch />
      </nav>
    </header>
  );
}
