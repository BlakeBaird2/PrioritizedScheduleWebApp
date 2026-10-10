"use client";

import { useState } from "react";
import { Compass, Copy, Info, LayoutTemplate, Moon, RefreshCw, RotateCcw, Sparkles, Sun } from "lucide-react";
import { encodeSetup } from "@/lib/workspace";
import { ASSIGNMENT_TYPES, type AssignmentType } from "@/lib/types";
import { duration, typeIconClass, typeMeta } from "@/lib/ui";
import { useApp } from "./context";
import { FeedAdder, FeedList, ProviderHelp } from "./Feeds";
import { HoursForm, WeeklyEditor } from "./ScheduleSettings";
import { ClassTimesEditor } from "./ClassTimes";
import { resetEverything, useTheme } from "./store";
import { startTour } from "./AppTour";
import { Button, ButtonLink, Card, CardHeader, SegmentedControl, TextButton } from "./ui";

function Section({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader level={3} title={title} hint={hint} />
      <div className="mt-4">{children}</div>
    </Card>
  );
}

/** Settings come in three groups, each with its own heading, so the long page can be scanned. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-2xl font-bold pt-2">{title}</h2>
      {children}
    </section>
  );
}

const ESTIMATE_OPTIONS = [15, 20, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];

export function SettingsView() {
  const { ws, update, sync, syncing } = useApp();
  const { theme, toggle } = useTheme();
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
    <div className="max-w-3xl space-y-6">
      <h1 className="sr-only">Settings</h1>
      <Group title="What SmartScheduler reads">
        <Section
          title="Calendars"
          hint={
            ws.demo
              ? "You're looking at sample calendars."
              : "SmartScheduler re-reads these when you open it, when you come back to the tab, and every 30 minutes while it's open."
          }
        >
          {ws.demo ? (
            <div className="space-y-3">
              <FeedList />
              <Button variant="primary" icon={Sparkles} onClick={resetEverything}>
                Start with my own calendars
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <FeedList manage />
              <FeedAdder />
              <div className="flex items-center gap-3 flex-wrap">
                <Button size="sm" icon={RefreshCw} onClick={() => void sync()} disabled={syncing} className={syncing ? "is-syncing" : ""}>
                  {syncing ? "Refreshing…" : "Refresh now"}
                </Button>
                <TextButton className="text-sm text-muted" onClick={() => setHelpOpen((o) => !o)} aria-expanded={helpOpen}>
                  {helpOpen ? "Hide help" : "Where do I find a calendar link?"}
                </TextButton>
              </div>
              {helpOpen ? <ProviderHelp /> : null}
              <p className="text-xs text-muted leading-relaxed">
                <b className="font-medium text-fg">School</b> calendars bring in classes and assignments. <b className="font-medium text-fg">Personal</b>{" "}
                calendars only tell SmartScheduler when you&apos;re busy; their events never turn into homework.
              </p>
            </div>
          )}
        </Section>

        <Section title="Class times" hint="When each class meets. Class calendars rarely include this, so add it here and SmartScheduler plans around it.">
          <ClassTimesEditor />
        </Section>
      </Group>

      <Group title="How your time is planned">
        <Section title="Your schedule" hint="SmartScheduler plans work inside these hours and around everything on your calendars.">
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
      </Group>

      <Group title="This browser">
        {!ws.demo ? (
          <Section
            title="Use SmartScheduler on another device"
            hint="Copy a setup link and open it on your phone or laptop to bring your calendars, classes and choices across. It holds your private calendar links, so only send it to yourself."
          >
            <Button icon={Copy} onClick={copySetup} aria-live="polite">
              {copied ? "Copied to clipboard" : "Copy setup link"}
            </Button>
          </Section>
        ) : null}

        <Section title="Appearance" hint="Light or dark. Everything else stays the same.">
          <SegmentedControl
            label="Theme"
            value={theme}
            onChange={(t) => (t !== theme ? toggle() : undefined)}
            options={[
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
            ]}
          />
        </Section>

        <Section title="About SmartScheduler" hint="A four-step walkthrough of the app, how SmartScheduler plans your time, and the parts the app is built from.">
          <div className="flex gap-2 flex-wrap">
            <Button icon={Compass} onClick={startTour}>
              Show the walkthrough
            </Button>
            <ButtonLink href="/about" icon={Info}>
              How it works
            </ButtonLink>
            <ButtonLink href="/design" icon={LayoutTemplate}>
              Design library
            </ButtonLink>
          </div>
        </Section>

        <Section title="Start over" hint="Removes your calendars and everything you've set from this browser. Nothing is stored anywhere else.">
          <Button
            variant="danger"
            icon={RotateCcw}
            onClick={() => {
              if (window.confirm("Remove all calendars and settings from this browser? This can't be undone.")) resetEverything();
            }}
          >
            Remove everything
          </Button>
        </Section>
      </Group>
    </div>
  );
}
