/**
 * The home page: what Prio does, how it works, and where to find each calendar
 * link. It renders on the server so it shows up at once; only the link guide's
 * tabs run in the browser. Anyone who already has calendars set up skips it (see
 * the root layout) and goes straight to the app at /app.
 */
import Link from "next/link";
import { ArrowRight, Bell, Check, CircleAlert, GraduationCap, Lock, Plus, RefreshCw, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { CALENDAR_KINDS } from "./calendarGuide";
import { GapsArt, LinkArt, OrderArt, PlanPreview } from "./LandingArt";
import { LinkGuide } from "./LinkGuide";

const WRAP = "max-w-6xl mx-auto px-4 sm:px-6";

export function Landing() {
  return (
    <div data-landing className="flex min-h-dvh flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <WorksWith />
        <HowItWorks />
        <Features />
        <GetYourLinks />
        <Faq />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}

/** A full page load rather than next/link, so the app sees #demo as it starts. */
function SampleLink({ className, children = "Try it with sample data" }: { className: string; children?: React.ReactNode }) {
  return (
    <a href="/app#demo" className={className}>
      <Sparkles size={16} />
      {children}
    </a>
  );
}

function StartLink({ children = "Get started" }: { children?: React.ReactNode }) {
  return (
    <Link href="/app" className="btn-primary btn-lg">
      {children}
      <ArrowRight size={18} />
    </Link>
  );
}

function SectionIntro({ id, eyebrow, title, lead }: { id: string; eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-accent">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-4 text-lg leading-relaxed text-muted text-pretty">{lead}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-md">
      <div className={`${WRAP} flex h-14 items-center gap-8`}>
        <Link href="/" className="wordmark text-xl select-none" aria-label="Prio home page">
          Prio<span className="text-accent">.</span>
        </Link>
        <nav aria-label="On this page" className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-fg">
            How it works
          </a>
          <a href="#links" className="transition-colors hover:text-fg">
            Get your links
          </a>
          <a href="#faq" className="transition-colors hover:text-fg">
            FAQ
          </a>
        </nav>
        <Link href="/app" className="btn-primary ml-auto">
          Get started
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div aria-hidden className="landing-glow absolute inset-x-0 top-0 -z-10 h-[44rem]" />
      <div className={`${WRAP} pt-14 text-center sm:pt-20 lg:pt-24`}>
        <p className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-muted shadow-sm sm:text-[0.8125rem]">
          {CALENDAR_KINDS.map((k) => (
            <span key={k.id} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
              {k.label}
            </span>
          ))}
          <ArrowRight size={13} className="text-faint" aria-hidden />
          <span className="text-fg">One plan</span>
        </p>
        <h1 id="hero-title" className="mx-auto mt-6 max-w-4xl text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
          <span className="block text-balance">Every calendar in one place.</span>
          <span className="block text-balance text-accent">Every gap filled with what&apos;s due soonest.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted text-pretty sm:text-xl">
          Prio brings your assignments and classes from Canvas, your shifts from work and your plans from Google, Outlook or Apple into one calendar. Then it
          finds the free time between them and fills each gap with whatever&apos;s due soonest.
        </p>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <StartLink />
          <SampleLink className="btn btn-lg" />
        </div>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
          {["Free", "No account or sign-up", "Saved only in your browser"].map((point) => (
            <li key={point} className="inline-flex items-center gap-1.5">
              <Check size={15} strokeWidth={2.5} className="text-ok" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={`${WRAP} mt-14 pb-16 sm:mt-16 sm:pb-24`}>
        <PlanPreview />
      </div>
    </section>
  );
}

const APPS = ["Canvas", "Learning Suite", "Google Calendar", "Outlook", "Apple Calendar"];

function WorksWith() {
  return (
    <section aria-label="Works with" className="border-y border-line bg-surface/60">
      <div className={`${WRAP} flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6`}>
        <span className="text-sm text-muted">Works with</span>
        {APPS.map((name) => (
          <span key={name} className="text-[0.9375rem] font-semibold tracking-tight text-fg/75">
            {name}
          </span>
        ))}
        <span className="text-sm text-muted">and any iCal link</span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-14 py-20 sm:py-28">
      <div className={WRAP}>
        <SectionIntro
          id="how-title"
          eyebrow="How it works"
          title="Paste your links. Prio does the rest."
          lead="Setting up takes a couple of minutes. After that, your plan keeps itself up to date."
        />
        <ol className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-3">
          <Step n={1} title="Add your calendar links" art={<LinkArt />}>
            Paste a private link from Canvas, Learning Suite, Google, Outlook or Apple. School calendars bring in your classes and assignments. Work and
            personal calendars tell Prio when you&apos;re busy.
          </Step>
          <Step n={2} title="Prio finds your free time" art={<GapsArt />}>
            Classes, shifts and plans are blocked out, with a little breathing room around each. What&apos;s left inside the hours you choose is your free
            time.
          </Step>
          <Step n={3} title="Each gap gets what's due soonest" art={<OrderArt />}>
            Free time fills with the most urgent work that fits. Big projects are split across gaps, and exams get study time before them.
          </Step>
        </ol>
      </div>
    </section>
  );
}

function Step({ n, title, art, children }: { n: number; title: string; art: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="card flex flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none flex h-44 items-center justify-center border-b border-line bg-surface-2/60 px-5 select-none">
        {art}
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent tabular-nums">{n}</span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Target,
    title: "What to do right now",
    text: "Open Prio and the first thing you see is the one task to work on now, with a Done button.",
  },
  {
    icon: CircleAlert,
    title: "Warnings while there's still time",
    text: "If something won't fit before it's due, Prio tells you early, while you can still make room for it.",
  },
  {
    icon: Bell,
    title: "Changes flagged",
    text: "When a due date moves or new work appears on a class calendar, the bell tells you exactly what changed.",
  },
  {
    icon: RefreshCw,
    title: "Always up to date",
    text: "Calendar links are live. Prio re-reads them whenever you open it, and every 30 minutes while it's open.",
  },
  {
    icon: GraduationCap,
    title: "Study time for exams",
    text: "Exams on your class calendar get study time planned before them, the same as any other work.",
  },
  {
    icon: SlidersHorizontal,
    title: "Your day, your rules",
    text: "Pick your working hours, a daily limit and whether weekends count. Add anything a calendar doesn't know about.",
  },
];

function Features() {
  return (
    <section aria-labelledby="features-title" className="border-y border-line bg-surface/60 py-20 sm:py-28">
      <div className={WRAP}>
        <SectionIntro
          id="features-title"
          eyebrow="Why Prio"
          title="Always know what to work on next"
          lead="No more checking three apps to work out when you'll get anything done. Prio keeps one plan, and keeps it current."
        />
        <div className="mt-12 grid gap-x-10 gap-y-10 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                <f.icon size={19} />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function GetYourLinks() {
  return (
    <section id="links" aria-labelledby="links-title" className="scroll-mt-14 py-20 sm:py-28">
      <div className={WRAP}>
        <SectionIntro
          id="links-title"
          eyebrow="Get started"
          title="Where to find your calendar links"
          lead="Every calendar app can share a private link to your calendar, usually called iCal, ICS or webcal. Copy one from each app you use and paste them into Prio. They stay up to date on their own."
        />
        <div className="mt-10 sm:mt-12">
          <LinkGuide />
        </div>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <StartLink>Paste your links into Prio</StartLink>
          <SampleLink className="btn btn-lg">No links handy? Try sample data</SampleLink>
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          <Lock size={13} className="mr-1.5 inline -translate-y-px" />
          Your links stay private, saved only in your browser.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

const FAQ = [
  {
    q: "Is Prio free? Do I need an account?",
    a: "It's free, and there's no account or sign-up. Open it, paste your calendar links and you have a plan.",
  },
  {
    q: "Where is my information kept?",
    a: "In your browser. Your calendar links, classes, done marks and settings are saved on your device. When a calendar is refreshed, the server reads it, hands it straight back and keeps nothing.",
  },
  {
    q: "Can Prio tell when I've turned something in?",
    a: "No. Calendar links say when work is due, not whether you've handed it in, so you tick things off as you finish them. When you first add a school calendar, anything already past due is marked done for you.",
  },
  {
    q: "My class calendar doesn't say when class meets. Is that a problem?",
    a: "Most don't, so Prio asks. Add each class's days and times once during setup, and Prio shows them on your calendar and plans around them.",
  },
  {
    q: "What if my job isn't on any calendar?",
    a: "Add your shifts as a weekly busy time during setup, the same way you'd add practice or a commute. Prio plans around them like anything else.",
  },
  {
    q: "How does Prio decide what comes first?",
    a: "Whatever's due soonest goes first. If the most urgent thing is too long for a short gap, the next thing that fits goes there instead, so short gaps still get used. You can change how long anything takes and the plan updates.",
  },
  {
    q: "Can I use it on my phone and my laptop?",
    a: "Yes. In Settings, copy your setup link and open it on the other device. Your calendars, classes and choices come across.",
  },
];

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-14 border-t border-line py-20 sm:py-28">
      <div className={`${WRAP} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16`}>
        <div>
          <p className="text-sm font-semibold text-accent">FAQ</p>
          <h2 id="faq-title" className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Questions, answered
          </h2>
          <div className="card mt-8 p-5">
            <div className="flex items-center gap-2 font-semibold">
              <Lock size={16} className="text-accent" />
              Private by design
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              No account and no database. Your calendar links and everything you set up stay in your browser, and you can remove them all at any time.
            </p>
          </div>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus size={18} className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="pr-8 pb-5 leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="pb-20 sm:pb-28">
      <div className={WRAP}>
        <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-line bg-surface px-6 py-14 text-center shadow-[var(--shadow)] sm:px-12 sm:py-20">
          <div aria-hidden className="landing-glow absolute inset-0 -z-10" />
          <h2 id="closing-title" className="mx-auto max-w-2xl text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
            Stop juggling calendars. Start knowing what&apos;s next.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted text-pretty">
            Paste your first calendar link and see your week planned in a couple of minutes.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <StartLink />
            <SampleLink className="btn btn-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className={`${WRAP} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <div className="wordmark text-lg select-none">
            Prio<span className="text-accent">.</span>
          </div>
          <p className="mt-1 text-sm text-muted">One calendar for school, work and life, with a plan for every gap.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <a href="#how-it-works" className="hover:text-fg">
            How it works
          </a>
          <a href="#links" className="hover:text-fg">
            Get your links
          </a>
          <a href="#faq" className="hover:text-fg">
            FAQ
          </a>
          <Link href="/app" className="hover:text-fg">
            Open Prio
          </Link>
        </nav>
      </div>
    </footer>
  );
}
