# Submission notes — Flows, Goal & Submission (Hannah)

Concise notes for the 60-point Flows / Goal / Submission portion of the Low-Fidelity Prototype rubric. Evidence is limited to what exists in this repository and Git history. Items marked `[TODO]` need a human fill-in before final hand-in.

## Core design feature from discovery research

**Core design feature (from the product):** A prioritized plan that finds free gaps between classes/events and fills them with unfinished work due soonest — so a student always has a concrete answer to “what should I work on in this free block?”

**User need:** Students juggle class calendars, personal busy time, and assignment due dates across tools. The need is knowing **what productive work fits in the next free gap** and marking it done.

**Research evidence in-repo:**

- Product rationale in `README.md` (plan algorithm, Canvas feed trade-offs, local-only data).
- Design principles / library review in `DESIGN_REVIEW.md` and `/design`.
- `FIVE_SECOND_TEST.md` exists as a template but **participant responses are empty**.
- `[TODO: paste discovery research findings, interview themes, or class research citations your team actually collected. Do not invent quotes or stats.]`

Until that TODO is filled, discovery claims are **incomplete documentation**, not fabricated results.

## User goal

**Goal (one sentence):** In a free stretch of time (for example, 45 minutes between class and work), find something productive to work on and mark it done.

The app supports that by surfacing free gaps, ranking unfinished work by soonest deadline, opening task details (including “Why this task?”), and marking Done with shared local task state across Plan, Calendar, Upcoming, and Classes.

## Multiple routes

At least three working paths to the same goal (implemented on `Hannah-branch`):

1. **Plan → free gap → task → Done**  
   Plan “right now” / day schedule → open a free gap → pick planned work → review (optional Why) → Mark done → completion panel.

2. **Calendar → free gap or planned work → task → Done**  
   Calendar week or day → click a free-gap band or a planned-work block → review → Mark done.

3. **Upcoming or Classes → task → Done**  
   Upcoming list **or** a Classes column → open a task → review → Mark done.

Shared `done` state lives in browser workspace storage, so completing a task in one view updates the others.

**Automated testing:** lint, typecheck, unit tests, and production build were run in this environment. **Manual route walkthroughs in a browser (desktop + phone, including public URL incognito) remain for the submitter.**

## Team ownership

| Member | Role on this project |
| --- | --- |
| **Blake Baird** | Core SmartScheduler application: planner, feeds, sync, Plan/Calendar/Upcoming/Classes, design library, walkthrough (primary Git author of the product). |
| **Grace Farnsworth** | Low-fidelity visual design / entry hierarchy contributions. Git author `gracefarns` — `[TODO: confirm preferred display name]`. |
| **Hannah Galindo** | Flows, Goal & Submission: goal pop-up sequencing, skippable onboarding, goal routes, gap/why/completion panels, Help + Settings sub-pages, README contribution section, screen inventory, these notes, build checks. |

All three must have genuine commits on GitHub for the course rule. Do not manufacture commits for others. Hannah’s functional work is on `Hannah-branch` and must be pushed/committed by Hannah.

## Tangential features

| Feature | How it is represented | Why simplified |
| --- | --- | --- |
| Accounts / cloud sync | None — localStorage only; optional `#setup=` link | Course prototype; no backend accounts |
| Canvas submission status | Manual Done ticks | Calendar feeds cannot report hand-ins (README) |
| Live calendar fetch errors | Banner + last good snapshot; honest toast copy | Depends on user links / network |
| Copy setup to another device | Clipboard / prompt of a `#setup=` link | Client-only |
| Illustrations | Wire sketches / placeholders | Low-fidelity prototype style |
| Five-second test results | Template only until filled | Must not invent participant data |
| App views in the URL | Client view state on `/app` only | Existing architecture; refresh returns to Plan preference |

## Screen inventory

See [`SCREEN_INVENTORY.md`](SCREEN_INVENTORY.md) for the full list (**28** meaningful screens/states), including two entry points and return paths for each newly added destination.

## Public URL

- **Provider:** Vercel (documented in README); Docker also supported.
- **Env vars:** none required for public deploy.
- **Public URL:** `[TODO: verify after deploy — paste real URL; test in incognito on phone and laptop]`
- Remaining manual steps if credentials are unavailable:
  1. Commit and push `Hannah-branch` to GitHub.
  2. Import the repo at https://vercel.com/new and Deploy.
  3. Confirm the production URL loads `/` and `/app#demo` without login.
  4. Incognito check on phone + laptop; paste the URL into README and this file.

## Checks

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Results from the agent session are reported in the final audit response.
