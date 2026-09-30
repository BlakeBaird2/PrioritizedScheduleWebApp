/**
 * Refresh every calendar in the workspace.
 *
 * Runs in the browser. Feeds are read in parallel; a feed that fails keeps its
 * last good copy and reports the error, so one broken link never blanks out the
 * rest. The network call is passed in, which keeps this testable.
 */
import { diffFeed } from "./changes";
import type { Change, FeedResult, FeedRole, Snapshot, Workspace } from "./types";

export type FetchFeed = (url: string, role: FeedRole | "auto", timezone: string) => Promise<FeedResult>;

export interface SyncOutcome {
  snapshot: Snapshot;
  changes: Change[];
  failed: number;
}

export async function syncAll(ws: Workspace, previous: Snapshot, fetchFeed: FetchFeed, timezone: string, now = new Date()): Promise<SyncOutcome> {
  const enabled = ws.feeds.filter((f) => f.enabled);
  const results = await Promise.allSettled(enabled.map((f) => fetchFeed(f.url, f.role, timezone)));

  const feeds: Snapshot["feeds"] = {};
  const changes: Change[] = [];
  let failed = 0;

  enabled.forEach((feed, i) => {
    const before = previous.feeds[feed.id] ?? { result: null, error: null, syncedAt: null };
    const r = results[i];
    if (r.status === "fulfilled") {
      changes.push(...diffFeed(feed.id, before.result, r.value, now));
      feeds[feed.id] = { result: r.value, error: null, syncedAt: now.toISOString() };
    } else {
      failed++;
      feeds[feed.id] = {
        ...before,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason ?? "Could not read this calendar."),
      };
    }
  });

  // Disabled feeds keep their last copy so re-enabling them is instant.
  for (const feed of ws.feeds) if (!feed.enabled && previous.feeds[feed.id]) feeds[feed.id] = previous.feeds[feed.id];

  return { snapshot: { feeds, at: now.toISOString() }, changes, failed };
}

/** The browser's side of /api/feed. */
export const fetchFeedFromApi: FetchFeed = async (url, role, timezone) => {
  const res = await fetch("/api/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, role, tz: timezone }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as (FeedResult & { error?: string }) | null;
  if (!res.ok || !body || body.error) throw new Error(body?.error ?? `That calendar could not be read (${res.status}).`);
  return body;
};
