"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildModel } from "@/lib/model";
import { indexPlan, makePlan } from "@/lib/schedule";
import { mergeChanges } from "@/lib/changes";
import { fetchFeedFromApi, syncAll } from "@/lib/sync";
import { feedIdFor, PROVIDER_LABEL } from "@/lib/feeds/url";
import { decodeSetup, nextPersonalColor, pastDueIds, sanitizeWorkspace } from "@/lib/workspace";
import { ASSIGNMENT_TYPES, type AssignmentType, type Change, type FeedResult, type FeedRole, type Snapshot, type Task, type Workspace } from "@/lib/types";
import { DEFAULT_FILTERS, plural, type Filters } from "@/lib/ui";
import { AppContext, type AppContextValue, type CalMode, type Selection, type View } from "./context";
import { KEYS, parseJson, readStored, useStored, writeStored } from "./store";
import { Header } from "./Header";
import { Banners } from "./Banners";
import { Onboarding } from "./Onboarding";
import { PlanView } from "./PlanView";
import { CalendarView } from "./CalendarView";
import { UpcomingView } from "./UpcomingView";
import { ClassesView } from "./ClassesView";
import { SettingsView } from "./SettingsView";
import { DetailPanel } from "./DetailPanel";
import { AddTaskDialog } from "./AddTaskDialog";
import { ImportDialog } from "./ImportDialog";

// ---------------------------------------------------------------------------
// Reading what the browser has stored
// ---------------------------------------------------------------------------

interface UiPrefs {
  view: View;
  calMode: CalMode;
  filters: Filters;
  /** Whether the first-run setup has been finished. */
  setupDone: boolean;
}

const VIEWS: View[] = ["plan", "calendar", "upcoming", "classes", "settings"];
const CAL_MODES: CalMode[] = ["month", "week", "day"];
const DEFAULT_UI: UiPrefs = { view: "plan", calMode: "week", filters: DEFAULT_FILTERS, setupDone: false };

function parseUi(raw: string | null): UiPrefs {
  const p = parseJson<Partial<UiPrefs>>(raw);
  if (!p || typeof p !== "object") return DEFAULT_UI;
  const f = p.filters;
  const types = Array.isArray(f?.types) ? f.types.filter((t): t is AssignmentType => ASSIGNMENT_TYPES.includes(t as AssignmentType)) : [];
  return {
    view: p.view && VIEWS.includes(p.view) ? p.view : DEFAULT_UI.view,
    calMode: p.calMode && CAL_MODES.includes(p.calMode) ? p.calMode : DEFAULT_UI.calMode,
    filters: {
      courses: Array.isArray(f?.courses) ? f.courses.filter((c): c is string => typeof c === "string") : null,
      types: types.length ? types : null,
      showCompleted: Boolean(f?.showCompleted),
    },
    setupDone: p.setupDone === true,
  };
}

function writeUi(patch: Partial<UiPrefs>) {
  writeStored(KEYS.ui, JSON.stringify({ ...parseUi(readStored(KEYS.ui)), ...patch }));
}

const EMPTY_SNAPSHOT: Snapshot = { feeds: {}, at: null };

/** A stored snapshot from an older version, or a damaged one, is dropped rather than trusted. */
function parseSnapshot(raw: string | null): Snapshot {
  const s = parseJson<Snapshot>(raw);
  if (!s || typeof s !== "object" || typeof s.feeds !== "object" || s.feeds === null) return EMPTY_SNAPSHOT;
  const feeds: Snapshot["feeds"] = {};
  for (const [id, state] of Object.entries(s.feeds)) {
    const r = state?.result;
    const valid = r === null || (r && Array.isArray(r.courses) && Array.isArray(r.tasks) && Array.isArray(r.events));
    if (state && valid) feeds[id] = { result: r ?? null, error: state.error ?? null, syncedAt: state.syncedAt ?? null };
  }
  return { feeds, at: typeof s.at === "string" ? s.at : null };
}

function parseChanges(raw: string | null): Change[] {
  const c = parseJson<Change[]>(raw);
  return Array.isArray(c) ? c.filter((x) => x && typeof x.id === "string" && typeof x.taskId === "string") : [];
}

const readWorkspace = () => sanitizeWorkspace(parseJson(readStored(KEYS.workspace)));
const readSnapshot = () => parseSnapshot(readStored(KEYS.snapshot));

function writeJson(key: string, value: unknown): boolean {
  return writeStored(key, JSON.stringify(value));
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// ---------------------------------------------------------------------------
// Moving a setup over from another device
// ---------------------------------------------------------------------------

type Incoming = { pending: Workspace | null; message: string | null };

function applyImport(ws: Workspace) {
  writeJson(KEYS.workspace, ws);
  writeStored(KEYS.snapshot, null);
  writeStored(KEYS.changes, null);
  writeUi({ setupDone: true, view: "plan" });
}

/**
 * A setup link carries the workspace in the URL fragment (#setup=...). It is read
 * once when the page opens and then removed from the address bar. If this browser
 * already has calendars of its own, the user is asked before anything is replaced.
 */
function takeSetupFromUrl(): Incoming {
  if (typeof window === "undefined" || !window.location.hash.startsWith("#setup=")) return { pending: null, message: null };
  const imported = decodeSetup(window.location.hash.slice("#setup=".length));
  history.replaceState(null, "", window.location.pathname + window.location.search);
  if (!imported) return { pending: null, message: "That setup link is incomplete. Copy it again from your other device." };
  const current = readWorkspace();
  if (current.feeds.length === 0 || current.demo) {
    applyImport(imported);
    return { pending: null, message: `Setup imported · ${plural(imported.feeds.length, "calendar")}` };
  }
  return { pending: imported, message: null };
}

// ---------------------------------------------------------------------------

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}

const MINUTE = 60_000;

export function App() {
  const [incoming, setIncoming] = useState<Incoming>(takeSetupFromUrl);
  const wsRaw = useStored(KEYS.workspace);
  const snapRaw = useStored(KEYS.snapshot);
  const changesRaw = useStored(KEYS.changes);
  const uiRaw = useStored(KEYS.ui);

  const ws = useMemo(() => sanitizeWorkspace(parseJson(wsRaw)), [wsRaw]);
  const snapshot = useMemo(() => parseSnapshot(snapRaw), [snapRaw]);
  const changes = useMemo(() => parseChanges(changesRaw), [changesRaw]);
  const ui = useMemo(() => parseUi(uiRaw), [uiRaw]);
  const [timezone] = useState(browserTimezone);

  const now = useNow();
  // The plan only needs to move when the minute changes.
  const minute = Math.floor(now.getTime() / MINUTE);
  const model = useMemo(() => buildModel(ws, snapshot, new Date(minute * MINUTE)), [ws, snapshot, minute]);
  const plan = useMemo(() => makePlan(model, ws.prefs, new Date(minute * MINUTE)), [model, ws.prefs, minute]);
  const index = useMemo(() => indexPlan(plan), [plan]);

  const [calCursor, setCalCursor] = useState(() => new Date());
  const [planDay, setPlanDay] = useState(0);
  const [selected, setSelected] = useState<Selection>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const [toastMsg, setToastMsg] = useState<string | null>(incoming.message);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((message: string) => {
    setToastMsg(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3600);
  }, []);
  useEffect(() => {
    if (!incoming.message) return;
    const t = setTimeout(() => setToastMsg(null), 3600);
    return () => clearTimeout(t);
  }, [incoming.message]);

  const update = useCallback(
    (fn: (w: Workspace) => Workspace) => {
      if (!writeJson(KEYS.workspace, fn(readWorkspace()))) toast("This browser would not save that change. Is site storage turned off?");
    },
    [toast],
  );

  /** Mark work as done without touching anything the user already marked. */
  const markDone = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const at = new Date().toISOString();
      update((w) => ({ ...w, done: { ...Object.fromEntries(ids.map((id) => [id, at])), ...w.done } }));
    },
    [update],
  );

  const saveSnapshot = useCallback(
    (s: Snapshot) => {
      if (!writeJson(KEYS.snapshot, s)) toast("Browser storage is full, so calendars will be re-read next time you open Prio.");
    },
    [toast],
  );

  // -------------------------------------------------------------------------
  // Syncing
  // -------------------------------------------------------------------------

  const runSync = useCallback(
    async (quiet: boolean) => {
      if (syncingRef.current) return;
      const before = readWorkspace();
      if (!before.feeds.some((f) => f.enabled)) return;
      syncingRef.current = true;
      setSyncing(true);
      try {
        const at = new Date();
        const firstRead = readSnapshot().at === null;
        const outcome = await syncAll(before, readSnapshot(), fetchFeedFromApi, timezone, at);

        // Calendars may have been added, removed or switched while this ran.
        // Keep fresh results only for calendars that are still set up the same way.
        const after = readWorkspace();
        const latest = readSnapshot();
        const feeds: Snapshot["feeds"] = {};
        for (const f of after.feeds) {
          const was = before.feeds.find((b) => b.id === f.id);
          const fresh = outcome.snapshot.feeds[f.id];
          feeds[f.id] = fresh && was && was.role === f.role && was.enabled === f.enabled ? fresh : latest.feeds[f.id];
          if (!feeds[f.id]) delete feeds[f.id];
        }
        saveSnapshot({ feeds, at: outcome.snapshot.at });

        // Sample data starts the way a real semester looks: older work handed in,
        // yesterday's still to do.
        if (firstRead && after.demo) {
          const cutoff = new Date(at.getTime() - 86_400_000);
          markDone(after.feeds.flatMap((f) => (feeds[f.id]?.result ? pastDueIds(f.id, feeds[f.id]!.result!, cutoff) : [])));
        }

        if (outcome.changes.length) writeJson(KEYS.changes, mergeChanges(outcome.changes, parseChanges(readStored(KEYS.changes)), at));

        if (outcome.failed > 0) toast(outcome.failed === 1 ? "One calendar couldn't be read. Its last copy is still shown." : `${outcome.failed} calendars couldn't be read. Their last copies are still shown.`);
        else if (outcome.changes.length) toast(`${plural(outcome.changes.length, "change")} from your classes · see the bell`);
        else if (!quiet) toast("Everything is up to date");
      } catch (e) {
        if (!quiet) toast(e instanceof Error ? e.message : "Sync failed");
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [timezone, toast, saveSnapshot, markDone],
  );

  const sync = useCallback(() => runSync(false), [runSync]);
  const ready = ui.setupDone && ws.feeds.length > 0;

  // Keep calendars fresh without anyone thinking about it: when the page opens,
  // when the tab comes back into view, and every half hour while it is open.
  useEffect(() => {
    if (!ready) return;
    const olderThan = (ms: number) => {
      const at = readSnapshot().at;
      return !at || Date.now() - Date.parse(at) > ms;
    };
    const kick = setTimeout(() => {
      if (olderThan(5 * MINUTE)) void runSync(true);
    }, 0);
    const onVisible = () => {
      if (document.visibilityState === "visible" && olderThan(10 * MINUTE)) void runSync(true);
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && olderThan(29 * MINUTE)) void runSync(true);
    }, MINUTE);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearTimeout(kick);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [ready, runSync]);

  // -------------------------------------------------------------------------
  // Calendars
  // -------------------------------------------------------------------------

  const addFeed = useCallback(
    (result: FeedResult): number => {
      const url = result.url;
      const id = feedIdFor(url);
      const known = readWorkspace().feeds.some((f) => f.id === id);
      update((w) => {
        if (w.feeds.some((f) => f.id === id)) return w;
        const name = result.provider === "canvas" ? "Canvas" : result.calendarName?.trim() || PROVIDER_LABEL[result.provider];
        return {
          ...w,
          feeds: [
            ...w.feeds,
            { id, url, name: name.slice(0, 60), role: result.role, provider: result.provider, color: nextPersonalColor(w.feeds), enabled: true },
          ],
        };
      });
      const snap = readSnapshot();
      saveSnapshot({ ...snap, feeds: { ...snap.feeds, [id]: { result, error: null, syncedAt: result.fetchedAt } } });
      if (known || result.role !== "school") return 0;
      const past = pastDueIds(id, result, new Date());
      markDone(past);
      return past.length;
    },
    [update, saveSnapshot, markDone],
  );

  const removeFeed = useCallback(
    (id: string) => {
      update((w) => ({ ...w, feeds: w.feeds.filter((f) => f.id !== id) }));
      const snap = readSnapshot();
      const feeds = { ...snap.feeds };
      delete feeds[id];
      saveSnapshot({ ...snap, feeds });
    },
    [update, saveSnapshot],
  );

  const setFeedRole = useCallback(
    async (id: string, role: FeedRole) => {
      const feed = readWorkspace().feeds.find((f) => f.id === id);
      if (!feed || feed.role === role) return;
      update((w) => ({ ...w, feeds: w.feeds.map((f) => (f.id === id ? { ...f, role } : f)) }));
      setSyncing(true);
      try {
        const result = await fetchFeedFromApi(feed.url, role, timezone);
        const snap = readSnapshot();
        saveSnapshot({ ...snap, feeds: { ...snap.feeds, [id]: { result, error: null, syncedAt: result.fetchedAt } } });
        if (role === "school" && !snap.feeds[id]?.result?.tasks.length) markDone(pastDueIds(id, result, new Date()));
      } catch (e) {
        toast(e instanceof Error ? e.message : "That calendar could not be re-read.");
      } finally {
        setSyncing(syncingRef.current);
      }
    },
    [update, saveSnapshot, timezone, toast, markDone],
  );

  // -------------------------------------------------------------------------
  // Work
  // -------------------------------------------------------------------------

  const toggleDone = useCallback(
    (task: Task) => {
      update((w) => {
        const done = { ...w.done };
        if (done[task.id]) delete done[task.id];
        else done[task.id] = new Date().toISOString();
        return { ...w, done };
      });
    },
    [update],
  );

  const setEstimate = useCallback(
    (taskId: string, minutes: number | null) => {
      update((w) => {
        const estimates = { ...w.estimates };
        if (minutes === null) delete estimates[taskId];
        else estimates[taskId] = Math.max(5, Math.min(24 * 60, Math.round(minutes)));
        return { ...w, estimates };
      });
    },
    [update],
  );

  const setView = useCallback((v: View) => writeUi({ view: v }), []);
  const setCalMode = useCallback((m: CalMode) => writeUi({ calMode: m }), []);
  const setFilters = useCallback((f: Filters | ((prev: Filters) => Filters)) => {
    const prev = parseUi(readStored(KEYS.ui)).filters;
    writeUi({ filters: typeof f === "function" ? f(prev) : f });
  }, []);

  const reveal = useCallback(
    (taskId: string) => {
      const task = model.tasks.find((t) => t.id === taskId);
      if (!task) return;
      if (task.dueAt) {
        setCalCursor(new Date(task.dueAt));
        writeUi({ view: "calendar", calMode: "day" });
      }
      setSelected({ kind: "task", id: taskId });
    },
    [model.tasks],
  );

  const clearChanges = useCallback(() => writeStored(KEYS.changes, null), []);

  // A plan day past the horizon (after midnight rolls over) falls back to today.
  const safePlanDay = planDay < plan.days.length ? planDay : 0;

  const ctx: AppContextValue = {
    ws,
    snapshot,
    model,
    plan,
    index,
    changes,
    now,
    timezone,
    update,
    toggleDone,
    setEstimate,
    addFeed,
    removeFeed,
    setFeedRole,
    syncing,
    sync,
    view: ui.view,
    setView,
    calMode: ui.calMode,
    setCalMode,
    calCursor,
    setCalCursor,
    planDay: safePlanDay,
    setPlanDay,
    filters: ui.filters,
    setFilters,
    selected,
    select: setSelected,
    reveal,
    openAddTask: () => setAddOpen(true),
    clearChanges,
    toast,
  };

  const finishSetup = useCallback(() => writeUi({ setupDone: true, view: "plan" }), []);

  return (
    <AppContext.Provider value={ctx}>
      {!ready ? (
        <Onboarding onFinish={finishSetup} />
      ) : (
        <div className="min-h-dvh flex flex-col">
          <Header />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-24">
            <Banners />
            <div className="mt-4 fade-in" key={ui.view}>
              {ui.view === "plan" && <PlanView />}
              {ui.view === "calendar" && <CalendarView />}
              {ui.view === "upcoming" && <UpcomingView />}
              {ui.view === "classes" && <ClassesView />}
              {ui.view === "settings" && <SettingsView />}
            </div>
          </main>
          {selected ? <DetailPanel selection={selected} onClose={() => setSelected(null)} /> : null}
          {addOpen ? <AddTaskDialog onClose={() => setAddOpen(false)} /> : null}
        </div>
      )}
      {incoming.pending ? (
        <ImportDialog
          incoming={incoming.pending}
          onCancel={() => setIncoming({ pending: null, message: null })}
          onConfirm={() => {
            applyImport(incoming.pending!);
            setIncoming({ pending: null, message: null });
            toast(`Setup imported · ${plural(incoming.pending!.feeds.length, "calendar")}`);
          }}
        />
      ) : null}
      {toastMsg ? (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)] rounded-full bg-fg text-bg text-sm font-medium px-4 py-2 shadow-lg fade-in text-center"
        >
          {toastMsg}
        </div>
      ) : null}
    </AppContext.Provider>
  );
}
