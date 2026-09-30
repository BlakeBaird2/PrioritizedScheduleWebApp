"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Sparkles } from "lucide-react";
import { feedIdFor } from "@/lib/feeds/url";
import { defaultWorkspace, PERSONAL_COLORS } from "@/lib/workspace";
import type { FeedConfig, Workspace } from "@/lib/types";
import { useApp } from "./context";
import { FeedAdder, FeedList, ProviderHelp } from "./Feeds";
import { HoursForm, WeeklyEditor } from "./ScheduleSettings";
import { KEYS, writeStored } from "./store";

function demoWorkspace(): Workspace {
  const feed = (url: string, name: string, role: FeedConfig["role"], provider: FeedConfig["provider"], color: string): FeedConfig => ({
    id: feedIdFor(url),
    url,
    name,
    role,
    provider,
    color,
    enabled: true,
  });
  return {
    ...defaultWorkspace(),
    demo: true,
    feeds: [
      feed("demo:canvas", "Canvas (sample)", "school", "canvas", PERSONAL_COLORS[0]),
      feed("demo:course", "Principles of Accounting (sample)", "school", "other", PERSONAL_COLORS[1]),
      feed("demo:personal", "Personal (sample)", "personal", "google", PERSONAL_COLORS[0]),
    ],
  };
}

export function startDemo() {
  writeStored(KEYS.workspace, JSON.stringify(demoWorkspace()));
  writeStored(KEYS.snapshot, null);
  writeStored(KEYS.changes, null);
  writeStored(KEYS.ui, JSON.stringify({ view: "plan", setupDone: true }));
}

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const { ws } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const hasSchool = ws.feeds.some((f) => f.role === "school");

  return (
    <div className="min-h-dvh px-4 py-10 sm:py-16">
      <div className="max-w-xl mx-auto">
        <div className="wordmark text-3xl select-none">
          Prio<span className="text-accent">.</span>
        </div>
        <p className="mt-2 text-[1.0625rem] text-muted leading-relaxed">
          Your classes, work and life on one calendar, and a plan for exactly what to work on in every free gap.
        </p>

        <div className="mt-6 flex items-center gap-2 text-xs font-medium text-muted" aria-label={`Step ${step} of 2`}>
          <span className={`h-1 w-10 rounded-full ${step >= 1 ? "bg-accent" : "bg-line"}`} />
          <span className={`h-1 w-10 rounded-full ${step >= 2 ? "bg-accent" : "bg-line"}`} />
          <span className="ml-1">Step {step} of 2</span>
        </div>

        {step === 1 ? (
          <section className="card p-5 sm:p-6 mt-3 space-y-5">
            <div>
              <h1 className="text-lg font-semibold">Add your calendars</h1>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                Start with your school calendar from Canvas, Learning Suite or any course site. Prio finds your classes and assignments on its own. Then add
                personal calendars (Google, Outlook, Apple) so it knows when you&apos;re busy.
              </p>
            </div>
            <FeedAdder autoFocus />
            <FeedList />
            <ProviderHelp />
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <button type="button" className="btn-primary" disabled={ws.feeds.length === 0} onClick={() => setStep(2)}>
                Continue
                <ArrowRight size={16} />
              </button>
              {ws.feeds.length > 0 && !hasSchool ? (
                <span className="text-xs text-muted">No school calendar yet. You can still add work by hand.</span>
              ) : null}
              {ws.feeds.length === 0 ? (
                <button type="button" className="btn" onClick={startDemo}>
                  <Sparkles size={15} />
                  Just looking? Try sample data
                </button>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="card p-5 sm:p-6 mt-3 space-y-5">
            <div>
              <h1 className="text-lg font-semibold">When do you like to work?</h1>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                Prio fills the gaps between your events with the work that&apos;s due soonest. Tell it when your day starts and ends.
              </p>
            </div>
            <HoursForm />
            <div>
              <h2 className="text-sm font-semibold">Busy every week, but not on a calendar?</h2>
              <p className="mt-0.5 mb-3 text-xs text-muted leading-relaxed">A job, practice, or commute. Add it so Prio plans around it. You can skip this.</p>
              <WeeklyEditor />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="button" className="btn" onClick={() => setStep(1)}>
                <ArrowLeft size={15} />
                Back
              </button>
              <button type="button" className="btn-primary ml-auto" onClick={onFinish}>
                Build my plan
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        <p className="mt-5 text-xs text-muted leading-relaxed flex gap-2">
          <Lock size={14} className="shrink-0 mt-0.5" />
          <span>
            No account needed. Your calendar links and everything you set here stay in this browser. The server reads a calendar only to hand it back to you,
            and keeps nothing.
          </span>
        </p>
      </div>
    </div>
  );
}
