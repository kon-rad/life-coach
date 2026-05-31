# Weekly + Daily Tasks — Phase D (Landing + Design Prompts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the marketing landing page and the design-prompt source to the new operating model: **weekly planning + retrospective on Sunday, two daily standups (midday check-in, evening debrief), 3 weekly tasks, 3 daily tasks, automatic weekly retrospective reports.** Remove the "one goal / two daily calls / project" framing.

**Architecture:** Edit the existing Next.js components (`landing/components/*`) — copy and the phone mock only; no structural/route changes. Update `design/design-prompt.md` prose to match.

**Tech Stack:** Next.js (App Router), React/TSX with inline styles, `landing/lib/theme.ts`. Build check: `cd landing && npm run build`.

**Prereqs:** none (independent of A/B/C), but should reflect the same model as those phases.

---

## Task 1: Rewrite the "How It Works" loop

**Files:**
- Modify: `landing/components/HowItWorks.tsx`

- [ ] **Step 1: Replace the `steps` array**

Replace the existing 3 `steps` with the new four-beat model (keep the existing `icon` kinds `mic`/`check`/`score`, reuse `mic` for the weekly):

```tsx
const steps = [
  {
    num: '01', title: 'Weekly planning', time: 'Sunday · 5 min',
    body: 'Each Sunday evening you retro the week and set your 3 tasks for the week ahead. Everything else ladders up to these.',
    icon: 'mic',
  },
  {
    num: '02', title: 'Midday check-in', time: 'Daily · 3 min',
    body: 'A quick standup: progress, roadblocks, and a recommit to today’s 3 tasks.',
    icon: 'mic',
  },
  {
    num: '03', title: 'Evening debrief', time: 'Daily · 5 min',
    body: 'Report what got done, then plan tomorrow’s 3 tasks — the path to this week’s goals.',
    icon: 'check',
  },
  {
    num: '04', title: 'Automatic retrospective', time: 'Every week',
    body: 'At the end of each week you get a written report: what went well, what to improve, and one way to be 1% better.',
    icon: 'score',
  },
];
```

- [ ] **Step 2: Update the section heading**

Change the `<h2>` text from `Your daily routine, simplified.` to `Your week, run like a sprint.` and the `<Tag>` from `The loop` to `The system`. If the grid hard-codes 3 columns and now shows 4 cards, confirm the layout wraps gracefully (it uses auto-fit/flex in `Container`; if it's a fixed `repeat(3,...)`, change to `repeat(auto-fit, minmax(240px, 1fr))`).

- [ ] **Step 3: Build**

Run: `cd landing && npm run build 2>&1 | tail -8`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add landing/components/HowItWorks.tsx
git commit -m "feat(landing): how-it-works reflects weekly+daily sprint model"
```

---

## Task 2: Rewrite the Hero copy

**Files:**
- Modify: `landing/components/Hero.tsx`

- [ ] **Step 1: Replace the headline**

Change the `<h1>` three spans from:
```
One goal. Two calls. / Three actions. / Every day.
```
to:
```tsx
<span style={{ display: 'block' }}>Plan the week.</span>
<span style={{ display: 'block' }}>Win the day.</span>
<span style={{ display: 'block', color: 'rgba(245,245,247,0.45)' }}>Every week.</span>
```

- [ ] **Step 2: Update the subhead paragraph**

Replace the hero sub-paragraph text with copy describing: a weekly planning + retrospective call that sets 3 weekly tasks, two short daily standups (midday + evening) that keep you on track, all private by design. Keep existing styles.

- [ ] **Step 3: Build**

Run: `cd landing && npm run build 2>&1 | tail -8`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add landing/components/Hero.tsx
git commit -m "feat(landing): hero copy for weekly+daily model"
```

---

## Task 3: Update phone mock + remaining section copy

**Files:**
- Modify: `landing/components/PhoneMock.tsx`
- Modify: `landing/components/Showcase.tsx`
- Modify: `landing/components/WhoItsFor.tsx`

- [ ] **Step 1: Inspect current content**

Run: `grep -n "goal\|project\|micro-action\|morning\|evening\|daily" landing/components/PhoneMock.tsx landing/components/Showcase.tsx landing/components/WhoItsFor.tsx`

- [ ] **Step 2: Update `PhoneMock.tsx`**

In the `MockHome` / `MockCall` exports, replace any "goal"/"project" and "micro-actions" labels with the new model: a "This week" block with 3 week tasks + a "Today" block with 3 day tasks and checkboxes. Replace "Morning call"/"Evening call" wording with "Midday check-in"/"Evening debrief". Keep the existing visual styling/components.

- [ ] **Step 3: Update `Showcase.tsx` and `WhoItsFor.tsx`**

Replace any "one goal", "project", "micro-action", "morning/evening call" copy with weekly-tasks / daily-tasks / midday-check-in / evening-debrief / weekly-retrospective language. Do not change layout or styles — copy only.

- [ ] **Step 4: Build**

Run: `cd landing && npm run build 2>&1 | tail -8`
Expected: succeeds.

- [ ] **Step 5: Grep for stale framing**

Run: `grep -rni "one goal\|micro-action\|two calls\|morning call" landing/components`
Expected: no marketing copy still using the old model (ignore icon names).

- [ ] **Step 6: Commit**

```bash
git add landing/components/PhoneMock.tsx landing/components/Showcase.tsx landing/components/WhoItsFor.tsx
git commit -m "feat(landing): phone mock + section copy for weekly+daily model"
```

---

## Task 4: Update the design-prompt source

**Files:**
- Modify: `design/design-prompt.md`

- [ ] **Step 1: Rewrite "What the App Does"**

Replace the numbered loop with:
```markdown
## What the App Does

Soularc runs your week like a sprint. Each week you:
1. Have a **weekly planning + retrospective call** (Sunday evening) that reviews the past
   week and sets your **3 tasks for the week ahead**.
2. Each day, take two short voice standups:
   - a **midday check-in** (progress, roadblocks, recommit to today's 3 tasks)
   - an **evening debrief** (what got done, then plan tomorrow's 3 tasks)
3. Check tasks off as you complete them — weekly tasks and daily tasks.
4. Receive an **automatic weekly retrospective report** (what went well, what to improve,
   how to be 1% better).

The hierarchy is simple: **Week (3 tasks) → Day (3 tasks)**. There is no separate "project".
```

- [ ] **Step 2: Update screen inventory**

Anywhere the doc lists app screens/tabs, rename the "Project" tab to **"Tasks"** (week cards: current week expanded at top with 3 week-task checkboxes and a list of days, today expanded, each with 3 day-task checkboxes), and add **"Weekly Retrospective Reports"** under Profile. Update reminder settings to mention midday/evening/weekly-planning configurable times. Keep the tone/feel and references sections as-is.

- [ ] **Step 3: Grep for stale terms**

Run: `grep -ni "micro-action\|one goal\|morning voice call\|evening voice call\|project" design/design-prompt.md`
Expected: only intentional mentions remain (e.g. explaining the removal); fix the rest.

- [ ] **Step 4: Commit**

```bash
git add design/design-prompt.md
git commit -m "docs(design): design prompt reflects weekly+daily model"
```

---

## Self-review notes (spec → tasks)

- Landing reflects new value prop (weekly planning + 2 daily standups + auto retrospective) → Tasks 1–3.
- Phone mock shows week tasks + day tasks → Task 3.
- Design prompt updated (Tasks tab, retrospectives, reminder config) → Task 4.

## Notes
- Copy-only changes; no routes, theme tokens, or component APIs change.
- `WaitlistForm`, `PrivacySection`, `Footer`, `TopNav` are unaffected.
