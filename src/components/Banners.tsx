"use client";

import { CircleAlert, Sparkles } from "lucide-react";
import { useApp } from "./context";
import { resetEverything } from "./store";

export function Banners() {
  const { ws, snapshot, setView } = useApp();
  const broken = ws.feeds.filter((f) => f.enabled && snapshot.feeds[f.id]?.error);

  return (
    <>
      {ws.demo ? (
        <div className="mt-4 border border-dashed border-line-strong bg-surface-2 px-3.5 py-2.5 text-[0.9375rem] flex items-center gap-3 flex-wrap">
          <Sparkles size={16} className="shrink-0" />
          <span className="flex-1 min-w-0">
            <b className="font-semibold">Sample data.</b>{" "}
            <span className="text-muted">Everything here is made up. Press Done on the top task to see the plan move.</span>
          </span>
          <button type="button" className="btn" onClick={resetEverything}>
            Use my own calendars
          </button>
        </div>
      ) : null}
      {broken.length > 0 ? (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-sm flex gap-3">
          <CircleAlert size={16} className="text-warn shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <b className="font-semibold">
              {broken.length === 1 ? `${broken[0].name} couldn't be read` : `${broken.length} calendars couldn't be read`}
            </b>
            <span className="text-muted">
              {" "}
              {broken.length === 1 ? snapshot.feeds[broken[0].id]?.error : "Their last good copies are still shown."}{" "}
              <button type="button" className="underline underline-offset-2 hover:text-fg" onClick={() => setView("settings")}>
                Check calendars
              </button>
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
