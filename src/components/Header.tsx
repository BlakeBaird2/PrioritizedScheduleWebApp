"use client";

import { CalendarRange, LayoutGrid, ListChecks, Moon, Plus, RefreshCw, Settings, Sun, Target } from "lucide-react";
import { timeAgo } from "@/lib/ui";
import { useApp, type View } from "./context";
import { ChangesPopover } from "./ChangesPopover";
import { PrototypeBadge } from "./Prototype";
import { useTheme } from "./store";

const TABS: { id: View; label: string; icon: typeof ListChecks }[] = [
  { id: "plan", label: "Plan", icon: Target },
  { id: "calendar", label: "Calendar", icon: CalendarRange },
  { id: "upcoming", label: "Upcoming", icon: ListChecks },
  { id: "classes", label: "Classes", icon: LayoutGrid },
];

export function Header() {
  const { view, setView, snapshot, now, syncing, sync, openAddTask } = useApp();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-bg border-b border-line-strong">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2 sm:gap-3">
        <button type="button" onClick={() => setView("plan")} className="wordmark text-xl select-none" aria-label="SmartScheduler, go to your plan">
          SmartScheduler<span className="text-accent">.</span>
        </button>
        <PrototypeBadge />

        <nav className="seg ml-2 hidden md:inline-flex" aria-label="View">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={view === t.id} onClick={() => setView(t.id)}>
              <t.icon size={15} strokeWidth={2} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden xl:block text-xs text-muted mr-1 tabular-nums" title={snapshot.at ? new Date(snapshot.at).toLocaleString() : undefined}>
            {syncing ? "Syncing…" : snapshot.at ? `Synced ${timeAgo(snapshot.at, now)}` : "Not synced yet"}
          </div>
          <button type="button" className="btn btn-icon" onClick={() => void sync()} disabled={syncing} title="Refresh calendars" aria-label="Refresh calendars">
            <RefreshCw size={16} className={syncing ? "spin" : undefined} />
          </button>
          <button type="button" className="btn btn-icon" onClick={openAddTask} title="Add a task" aria-label="Add a task">
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden lg:inline pr-0.5">Add task</span>
          </button>
          <ChangesPopover />
          <button type="button" className="btn btn-icon" onClick={toggle} title="Switch theme" aria-label="Switch theme">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => setView("settings")}
            title="Settings"
            aria-label="Settings"
            aria-pressed={view === "settings"}
            style={view === "settings" ? { background: "var(--surface-2)", borderColor: "var(--line-strong)" } : undefined}
          >
            <Settings size={16} />
            <span className="hidden lg:inline pr-0.5">Settings</span>
          </button>
        </div>
      </div>
      <nav className="md:hidden px-4 pb-2" aria-label="View">
        <div className="seg w-full">
          {TABS.map((t) => (
            <button key={t.id} type="button" className="flex-1 justify-center !px-1.5" aria-pressed={view === t.id} onClick={() => setView(t.id)}>
              <t.icon size={15} strokeWidth={2} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
