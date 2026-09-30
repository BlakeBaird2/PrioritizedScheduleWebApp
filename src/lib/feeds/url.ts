import type { FeedRole, Provider } from "../types";
import { stableHash } from "../text";

export class FeedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedUrlError";
  }
}

/**
 * Turn whatever the user pasted into a fetchable https URL.
 *
 * Apple and others hand out webcal:// links, which are plain https under another
 * name. Stray whitespace and a missing scheme are common when copying from a
 * phone. Anything that is not http(s) is refused.
 */
export function normalizeFeedUrl(raw: string): string {
  let value = (raw ?? "").trim();
  if (!value) throw new FeedUrlError("Paste a calendar link to add it.");
  if (value.length > 4096) throw new FeedUrlError("That link is too long to be a calendar link.");

  value = value.replace(/^webcals?:\/\//i, "https://");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new FeedUrlError("That doesn't look like a link. Copy the whole address, starting with https:// or webcal://.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FeedUrlError("Only web links (https:// or webcal://) can be added.");
  }
  if (!url.hostname.includes(".")) throw new FeedUrlError("That link is missing its website address.");
  url.hash = "";
  return url.toString();
}

/** Which service a link belongs to. Used for defaults and help, never for access. */
export function detectProvider(url: string, prodId?: string | null): Provider {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    /* fall through to the product id */
  }
  const prod = (prodId ?? "").toLowerCase();

  if (host.endsWith("instructure.com") || path.includes("/feeds/calendars/") || prod.includes("instructure")) return "canvas";
  if (host === "learningsuite.byu.edu" || host.endsWith(".learningsuite.byu.edu")) return "learningsuite";
  if (host === "calendar.google.com" || prod.includes("google")) return "google";
  if (host.startsWith("outlook.") || host.endsWith(".outlook.com") || prod.includes("microsoft")) return "outlook";
  if (host.endsWith("icloud.com") || prod.includes("apple")) return "icloud";
  return "other";
}

export const PROVIDER_LABEL: Record<Provider, string> = {
  canvas: "Canvas",
  learningsuite: "Learning Suite",
  google: "Google Calendar",
  outlook: "Outlook",
  icloud: "Apple Calendar",
  other: "Calendar",
};

/** Course platforms carry homework; personal calendars only carry busy time. */
export function defaultRole(provider: Provider): FeedRole | null {
  if (provider === "canvas" || provider === "learningsuite") return "school";
  if (provider === "google" || provider === "outlook" || provider === "icloud") return "personal";
  return null;
}

/**
 * A stable id for a feed, taken from its URL.
 *
 * The same link must get the same id on every device and every time it is
 * re-added, because assignment ids, completion marks and time estimates all hang
 * off it.
 */
export function feedIdFor(url: string): string {
  return `f${stableHash(url)}${stableHash(`${url}#2`)}`;
}
