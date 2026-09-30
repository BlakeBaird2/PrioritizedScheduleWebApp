"use client";

import type { Workspace } from "@/lib/types";
import { plural } from "@/lib/ui";

export function ImportDialog({ incoming, onConfirm, onCancel }: { incoming: Workspace; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 fade-in" aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="import-title" className="fixed z-50 inset-x-4 top-[20vh] mx-auto max-w-md card p-5 fade-in">
        <h2 id="import-title" className="text-base font-semibold">
          Replace this browser&apos;s setup?
        </h2>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">
          The link you opened has {plural(incoming.feeds.length, "calendar")} and its own settings. Importing replaces the calendars and settings already in
          this browser.
        </p>
        <ul className="mt-3 text-sm space-y-1">
          {incoming.feeds.map((f) => (
            <li key={f.id} className="truncate">
              · {f.name} <span className="text-muted">({f.role})</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel}>
            Keep what&apos;s here
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Import
          </button>
        </div>
      </div>
    </>
  );
}
