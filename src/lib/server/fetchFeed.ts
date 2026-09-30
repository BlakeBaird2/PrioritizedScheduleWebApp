/**
 * Fetch a calendar link on behalf of a visitor, safely.
 *
 * Anyone can paste any link, so this is a request the server makes to an address
 * a stranger chose. Without care that is a server-side request forgery hole: a
 * link to 169.254.169.254 or localhost would reach infrastructure that is
 * otherwise unreachable. So every hop, redirects included, must resolve only to
 * public addresses, the body is capped, and only valid iCalendar text is accepted.
 * Callers get parsed calendar data back, never the raw response, so this cannot be
 * used as a general-purpose proxy.
 */
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_FEED_BYTES = 15 * 1024 * 1024;
const TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 4;

export class FeedFetchError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "FeedFetchError";
    this.status = status;
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inRange(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const PRIVATE_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, including cloud metadata services
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved and broadcast
];

/** Whether an IP address is anything other than an ordinary public internet address. */
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return PRIVATE_V4.some(([base, bits]) => inRange(ip, base, bits));
  if (family === 6) {
    const lower = ip.toLowerCase();
    // IPv4-mapped addresses carry an IPv4 address that must be checked as one.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (lower === "::" || lower === "::1") return true;
    if (/^f[cd]/.test(lower)) return true; // unique local fc00::/7
    if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
    if (/^ff/.test(lower)) return true; // multicast
    return false;
  }
  return true; // not an IP at all: refuse rather than guess
}

type Lookup = (hostname: string) => Promise<{ address: string }[]>;

const defaultLookup: Lookup = (hostname) => dnsLookup(hostname, { all: true, verbatim: true });

/** Only for running against fixture feeds on this machine. Never set in production. */
function allowPrivateHosts(): boolean {
  return process.env.FEED_ALLOW_PRIVATE_HOSTS === "1";
}

export async function assertPublicUrl(url: URL, lookup: Lookup = defaultLookup): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FeedFetchError("Only web links can be added.");
  }
  if (allowPrivateHosts()) return;

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FeedFetchError("That link points at a private address.");
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new FeedFetchError("That link points at a private address.");
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host);
  } catch {
    throw new FeedFetchError("That website could not be found. Check the link and try again.");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new FeedFetchError("That link points at a private address.");
  }
}

async function readCapped(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_FEED_BYTES) {
    throw new FeedFetchError("That calendar is too large to import.", 413);
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FEED_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new FeedFetchError("That calendar is too large to import.", 413);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

export interface FetchOptions {
  lookup?: Lookup;
  fetchImpl?: typeof fetch;
}

/** Fetch a calendar feed and return its text, or throw a FeedFetchError with a readable message. */
export async function fetchFeedText(rawUrl: string, options: FetchOptions = {}): Promise<string> {
  const doFetch = options.fetchImpl ?? fetch;
  let url = new URL(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicUrl(url, options.lookup);
      let res: Response;
      try {
        res = await doFetch(url.toString(), {
          redirect: "manual",
          signal: controller.signal,
          cache: "no-store",
          headers: {
            Accept: "text/calendar, text/plain;q=0.9, */*;q=0.5",
            "User-Agent": "PrioritizedSchedule/1.0 (+calendar import)",
          },
        });
      } catch (e) {
        if (controller.signal.aborted) throw new FeedFetchError("That calendar took too long to respond.", 504);
        throw new FeedFetchError(`That calendar could not be reached: ${e instanceof Error ? e.message : String(e)}`, 502);
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new FeedFetchError("That calendar redirected nowhere.", 502);
        url = new URL(location, url);
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        throw new FeedFetchError(
          "That calendar is private. Make sure you copied its subscription link (the one meant for sharing or other apps), not the page address.",
          502,
        );
      }
      if (res.status === 404) throw new FeedFetchError("That calendar no longer exists. It may have been reset; copy a fresh link.", 502);
      if (!res.ok) throw new FeedFetchError(`That calendar responded with an error (${res.status}).`, 502);

      const text = await readCapped(res);
      if (!/BEGIN:VCALENDAR/i.test(text.slice(0, 4096))) {
        throw new FeedFetchError(
          "That link opened a web page, not a calendar feed. Look for a link labeled iCal, ICS, subscribe or calendar feed.",
          422,
        );
      }
      return text;
    }
    throw new FeedFetchError("That calendar redirected too many times.", 502);
  } finally {
    clearTimeout(timer);
  }
}
