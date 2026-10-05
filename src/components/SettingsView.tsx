"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Info, RotateCcw, Sparkles } from "lucide-react";
import { encodeSetup } from "@/lib/workspace";
import { ASSIGNMENT_TYPES, type AssignmentType } from "@/lib/types";
import { duration, typeIconClass, typeMeta } from "@/lib/ui";
import { useApp } from "./context";
import { FeedAdder, FeedList, ProviderHelp } from "./Feeds";
import { HoursForm, WeeklyEditor } from "./ScheduleSettings";
import { ClassTimesEditor } from "./ClassTimes";
import { resetEverything } from "./store";

function Section({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint ? <p className="mt-0.5 text-sm text-muted leading-relaxed">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const ESTIMATE_OPTIONS = [15, 20, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];

export function SettingsView() {
  const { ws, update } = useApp();
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const copySetup = async () => {
    const link = `${window.location.origin}/app#setup=${encodeSetup(ws)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", link);
    }
  };

  const setTypeEstimate = (type: AssignmentType, minutes: number) =>
    update((w) => ({ ...w, prefs: { ...w.prefs, estimates: { ...w.prefs.estimates, [type]: minutes } } }));

  return (
    <div className="max-w-3xl space-y-4">
      <Section
        title="Calendars"
        hint={
          ws.demo
            ? "You're looking at sample calendars."
            : "Prio re-reads these when you open it, when you come back to the tab, and every 30 minutes while it's open."
        }
      >
        {ws.demo ? (
          <div className="space-y-3">
            <FeedList />
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                resetEverything();
              }}
            >
              <Sparkles size={15} />
              Start with my own calendars
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <FeedList manage />
            <FeedAdder />
            <button type="button" className="text-xs text-muted underline underline-offset-2 hover:text-fg" onClick={() => setHelpOpen((o) => !o)}>
              {helpOpen ? "Hide help" : "Where do I find a calendar link?"}
            </button>
            {helpOpen ? <ProviderHelp /> : null}
            <p className="text-xs text-muted leading-relaxed">
              <b className="font-medium text-fg">School</b> calendars bring in classes and assignments. <b className="font-medium text-fg">Personal</b> calendars
              only tell Prio when you&apos;re busy; their events never turn into homework.
            </p>
          </div>
        )}
      </Section>

      <Section title="Class times" hint="When each class meets. Class calendars rarely include this, so add it here and Prio plans around it.">
        <ClassTimesEditor />
      </Section>

      <Section title="Your schedule" hint="Prio plans work inside these hours and around everything on your calendars.">
        <HoursForm advanced />
      </Section>

      <Section title="Other weekly busy times" hint="Things that happen every week but aren't on a calendar you added, like a job or practice.">
        <WeeklyEditor />
      </Section>

      <Section title="How long things take" hint="Starting estimates for each kind of work. Change any single item by opening it.">
        <div className="divide-y divide-line">
          {ASSIGNMENT_TYPES.map((t) => {
            const meta = typeMeta(t);
            return (
              <div key={t} className="flex items-center gap-3 py-2">
                <meta.icon size={16} className={typeIconClass(t)} />
                <span className="text-sm font-medium flex-1">{meta.plural}</span>
                <select
                  className="input input-sm"
                  aria-label={`Time for ${meta.plural.toLowerCase()}`}
                  value={ws.prefs.estimates[t]}
                  onChange={(e) => setTypeEstimate(t, Number(e.target.value))}
                >
                  {[...new Set([...ESTIMATE_OPTIONS, ws.prefs.estimates[t]])]
                    .sort((a, b) => a - b)
                    .map((m) => (
                      <option key={m} value={m}>
                        {duration(m)}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">Exams also get study time before them, planned like any other work.</p>
      </Section>

      {!ws.demo ? (
        <Section
          title="Use Prio on another device"
          hint="Copy a setup link and open it on your phone or laptop to bring your calendars, classes and choices across. It holds your private calendar links, so only send it to yourself."
        >
          <button type="button" className="btn" onClick={copySetup}>
            <Copy size={15} />
            {copied ? "Copied" : "Copy setup link"}
          </button>
        </Section>
      ) : null}

      <Section title="About Prio" hint="The home page explains how Prio plans your time and where to find the link for each calendar.">
        <Link href="/about" className="btn">
          <Info size={15} />
          Open the home page
        </Link>
      </Section>

      <Section title="Start over" hint="Removes your calendars and everything you've set from this browser. Nothing is stored anywhere else.">
        <button
          type="button"
          className="btn text-danger"
          onClick={() => {
            if (window.confirm("Remove all calendars and settings from this browser?")) resetEverything();
          }}
        >
          <RotateCcw size={15} />
          Remove everything
        </button>
      </Section>
    </div>
  );
}
