"use client";

import { createContext, useContext } from "react";
import type { Model } from "@/lib/model";
import type { Plan } from "@/lib/planner";
import type { PlanIndex } from "@/lib/schedule";
import type { Change, FeedResult, FeedRole, Snapshot, Task, Workspace } from "@/lib/types";
import type { Filters } from "@/lib/ui";

export type View = "plan" | "calendar" | "upcoming" | "classes" | "settings";
export type CalMode = "month" | "week" | "day";
export type Selection = { kind: "task" | "event"; id: string } | null;

export interface AppContextValue {
  ws: Workspace;
  snapshot: Snapshot;
  model: Model;
  plan: Plan;
  index: PlanIndex;
  changes: Change[];
  now: Date;
  timezone: string;

  update: (fn: (ws: Workspace) => Workspace) => void;
  toggleDone: (task: Task) => void;
  setEstimate: (taskId: string, minutes: number | null) => void;

  /** Returns how many already-past items were marked done. */
  addFeed: (result: FeedResult) => number;
  removeFeed: (id: string) => void;
  setFeedRole: (id: string, role: FeedRole) => void;
  syncing: boolean;
  sync: () => Promise<void>;

  view: View;
  setView: (v: View) => void;
  calMode: CalMode;
  setCalMode: (m: CalMode) => void;
  calCursor: Date;
  setCalCursor: (d: Date) => void;
  /** Which day of the plan is open, as an offset from today. */
  planDay: number;
  setPlanDay: (i: number) => void;
  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;

  selected: Selection;
  select: (s: Selection) => void;
  /** Open a task on the day it is planned or due. */
  reveal: (taskId: string) => void;
  openAddTask: () => void;
  openClassTimes: () => void;
  /** Whether the "add your class times" suggestion was dismissed. */
  classTimesTipHidden: boolean;
  hideClassTimesTip: () => void;
  clearChanges: () => void;
  toast: (message: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside App");
  return ctx;
}

export function courseStyle(color: string | undefined | null): React.CSSProperties {
  return { "--c": color ?? "#64748b" } as React.CSSProperties;
}
