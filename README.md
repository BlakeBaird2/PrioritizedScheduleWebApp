# Prio.

Your classes, your job and the rest of your life on one calendar, and a plan for
exactly what to work on in every free gap.

Paste in calendar links from Canvas, Learning Suite, Google, Outlook or Apple.
Prio finds your classes and assignments on its own, works out when you are free,
and fills that time with the work that is due soonest.

No accounts, no database, no API keys, no environment variables. Anyone can open
it and start.

## What it does

- **Plan** — the home screen, built to answer three questions at a glance:
  *what should I work on right now* (one task, with a Done button), *what does
  the rest of my day look like* (your events, and each stretch of free time
  with the work planned into it), and *what's due this week* (each item says
  when it's planned, or that it won't fit in time).
- **Calendar** — month, week and day. Week and day are time grids showing your
  classes, your personal events and your planned work side by side.
- **Upcoming** — everything due, by day, with where it sits in the plan.
- **Classes** — one card per class, created automatically from your calendars,
  with when it meets. Rename, recolour or hide any of them.
- **Class times** — class calendars list what's due, rarely when class is. Add
  each class's days and times once (during setup, in Settings, or from the
  prompt on the Plan screen) and they show on your calendar in the class's
  colour and block that time in the plan. Classes whose calendar already has
  meetings say so. Click any meeting to mark a single day off, like a holiday.
- **Change alerts** — each refresh is compared with the last. When a due date
  moves, or work is added or removed, the bell says so. Click to jump to it.
- **Your own tasks** — add work no calendar knows about with the + button.

## How the plan is made

Two steps, kept simple on purpose so you can always tell why it says what it says.

1. **Find the gaps.** Each day has working hours (8 AM–10 PM by default).
   Everything busy on your calendars, plus any weekly busy times you add, is cut
   out, class times included, with a little breathing room either side (10
   minutes by default). What's
   left, if it's at least 20 minutes long, is free time.
2. **Fill them, soonest deadline first.** Going through the gaps in order, each
   gets the most urgent unfinished work that fits. If the most urgent thing is
   too long for a short gap, the next thing that fits goes there instead, so
   short gaps still get used. Longer work is split across gaps in pieces of at
   least 25 minutes; quizzes are never split. Nothing is scheduled after its
   own due time, and there's a daily limit (4 hours by default) that only work
   due within a day can go past.

Every kind of work has a starting estimate (reading 30m, assignment 1h,
project 2h, exam 3h of study). Open any item to change how long it needs, which
is also how you tell Prio you are part-way through. Exams on a class calendar
automatically get a "Study for …" task before them.

The code is in [`src/lib/planner.ts`](src/lib/planner.ts), with tests in
[`src/lib/__tests__/planner.test.ts`](src/lib/__tests__/planner.test.ts).

## Adding calendars

Every calendar app can give you a private link to a calendar (called iCal, ICS or
webcal). Prio reads that link, so it always sees the latest version.

| Where | How to get the link | Notes |
| --- | --- | --- |
| **Canvas** | Calendar → **Calendar Feed** (bottom of the right-hand column) | One link covers every class. Each assignment links back to Canvas. |
| **Learning Suite** | A course's Schedule → its calendar (iCal) link | One link per class. |
| **Google Calendar** | Settings → pick the calendar → Integrate calendar → **Secret address in iCal format** | School and work Google accounts sometimes have this switched off by an administrator. |
| **Outlook** | Outlook on the web → Settings → Calendar → Shared calendars → **Publish a calendar** → copy the ICS link | "Can view when I'm busy" is enough if you'd rather not share titles. |
| **Apple (iCloud)** | Calendar sharing → turn on **Public Calendar** → copy the link | Anyone with this link can read the calendar, so keep it to yourself. |
| **Anything else** | Any iCal, ICS or webcal link | Work rosters, sports schedules, clubs. |

Each calendar is either **School** (its entries become classes and assignments)
or **Personal** (its entries only mark you as busy and never turn into homework).
Prio picks one when you add a link and you can switch it at any time.

**Staying up to date.** These links are live. Prio re-reads every calendar when
you open it, when you come back to the tab, and every 30 minutes while it's open.
Google and Apple reflect changes within minutes; Outlook can take a few hours to
republish.

**If a link won't add,** the message says why and what to copy instead. The
common one: Google's "public address" only works for calendars shared with
everyone, so use the "Secret address in iCal format". Canvas can also label a
class with an unhelpful code like "All Sections"; Prio looks for the real code in
section names, and you can tap any class under its calendar to rename it.

**What a calendar link can't tell Prio.** Feeds say when work is due, not whether
you handed it in. When you first add a school calendar, anything already past due
is assumed done (you can untick it). After that, tick things off as you finish
them.

## Your data

- Calendar links, classes, done marks and settings are stored **in your browser**
  (localStorage). There are no accounts and no database.
- The server has one job: fetch a calendar link you send it, turn it into
  classes, work and busy time, and send that back. It stores nothing and logs
  nothing about the calendar.
- **Using more than one device:** Settings → *Copy setup link*. Opening that link
  on your phone or laptop brings your calendars, classes and choices across. The
  setup travels in the part of the URL after `#`, which browsers never send to a
  server. It contains your private calendar links, so only send it to yourself.

Because the server fetches any link it's given, it refuses links that point at
private or internal network addresses, checks every redirect, and caps the size
and time of each download (see [`src/lib/server/fetchFeed.ts`](src/lib/server/fetchFeed.ts)).

## Why not the Canvas API?

Canvas's API needs either a personal access token or a developer key issued by
each school. Canvas's API policy doesn't allow an app used by many people to ask
them for personal tokens, and developer keys have to be approved school by
school. The Canvas **Calendar Feed** needs neither and works at every school, so
Prio uses that. The trade-off is that Prio can't see whether something was
submitted, which is why you tick things off yourself.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # parser, planner, workspace and timeline tests
npm run lint
```

No configuration is needed. Pick **Try sample data** on the first screen to see
it working without any calendars.

`npm run dev` accepts links whose site resolves to a private network address
(common on campus Wi-Fi and VPNs). A production build refuses them unless started
with `FEED_ALLOW_PRIVATE_HOSTS=1`, which is only for testing on your own machine.
Never set it on a public deployment.

## Deploy it (free)

**Vercel:** push this repository to GitHub, then at
[vercel.com/new](https://vercel.com/new) import it and click Deploy. There are no
environment variables to fill in and no storage to add. The free Hobby plan is
plenty.

**Docker:**

```bash
docker build -t prio .
docker run -p 3000:3000 prio
```

## Project layout

```
src/app/api/feed/route.ts   the only server endpoint: read one calendar link
src/lib/feeds/              link checks, provider detection, the iCal parser, sample data
src/lib/server/fetchFeed.ts safe fetching of user-supplied links
src/lib/planner.ts          finding gaps and filling them
src/lib/model.ts            merging calendars and your choices into classes, work and events
src/lib/workspace.ts        what the browser stores, checked on the way back in
src/lib/sync.ts             refreshing every calendar
src/lib/changes.ts          spotting moved, added and removed work
src/lib/timeline.ts         a day in order, and "what now"
src/components/             the interface
```
