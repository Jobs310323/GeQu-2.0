# GeQu — Product Principles

GeQu is a **personal cognitive operating system**: a place to capture what is happening, understand
it, decide what matters, act, reflect, and adapt. It is not a todo app, a habit tracker, a journal,
a health tracker or a finance tracker — it contains all of those, but none of them is the point.

## The loop

```
CAPTURE  →  UNDERSTAND  →  PLAN  →  ACT  →  REFLECT  →  ADAPT
    ↑                                                      │
    └──────────────────────────────────────────────────────┘
```

Every screen should be identifiable as one station on this loop. A screen that serves no station
is a screen that needs a reason to exist.

## The governing principle

> The user should not have to think about the structure of the application.
> The application should think about the structure of the user's life.

## Decision test

A change ships only if it does at least one of these:

- reduces cognitive load
- reduces friction
- increases reliability
- improves discoverability
- improves accessibility
- raises perceived quality
- improves performance
- improves data integrity
- creates a clear architectural boundary
- strengthens the core loop

If it does none of them, it does not ship — however good the idea is in isolation.

## Product commitments

**1. Today is the product.** The first screen answers four questions and no more:
*How am I doing? What matters today? What should I do next? What did I learn about myself?*
Everything else is one deliberate step away.

**2. Progressive disclosure over completeness.** Show what matters now, not everything that
exists. A dashboard that displays every metric the system holds has told the user nothing.

**3. Capture must be instant.** ⌘K from anywhere. If capturing a thought costs more than a few
seconds, the thought is lost, and with it the data the rest of the product depends on.

**4. Honesty about evidence.** Psychometric and health output states what was measured, over what
period, against which baseline, with what confidence. Associations are named as associations.
Below the minimum sample size, the insight is *suppressed*, not hedged.
We never present an illustrative mapping as a clinical result.

**5. Personal baselines, not population norms.** The comparison that matters is the user against
themselves: *your baseline, your recent average, your trend, your variability.*

**6. The user's data is the user's.** Export it, delete it — really delete it, on the server too.
Sensitive categories (journal, health, ADHD, psychometrics, finance) get explicit handling, never
default handling. Nothing sensitive leaves the device without consent, and never in an analytics
or error payload.

**7. Offline is a normal state, not an error.** Open, read, capture, edit and complete offline.
Sync when the connection returns, resolve conflicts on a stated policy, and show the state without
nagging.

**8. Reward the behaviour, not the presence.** Gamification reinforces completion, consistency,
meaningful reflection and healthy routine. It never rewards time spent in the app.

**9. Accessible by construction.** WCAG 2.2 AA is a floor, not a milestone. Keyboard-complete,
screen-reader-meaningful, motion-respectful, and never colour-only.

**10. English and Russian are peers.** English is a first-class locale authored as the source, not
a translation of the Russian afterwards. Dates, numbers, currency and timezones are locale-correct.

## Definition of done

A feature is not done until it has: types · tests · loading state · error state · empty state ·
responsive layout · accessibility · an analytics event where one is warranted · offline behaviour
where applicable · documentation.

## What we optimise for

Not feature count. **Low cognitive load · high personal relevance · high trust · fast feedback ·
meaningful insight · reliability · visual consistency.**

The objective is not to make GeQu *look* premium.
The objective is to make GeQu feel inevitable once a user understands it.

## The question before any new feature

> Does this make the user's life easier to manage, understand, or improve?

If not, it does not get built.
