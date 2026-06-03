# Soularc — Pricing, API Costs & Margin Plan

> Status: proposed model (v1). Owner: founder. Last updated: 2026-05-31.
> Billing channel: **Apple In-App Purchase, Small Business Program (15% fee)**.
> Positioning: **two tiers** (Standard + Premium).

## 1. What the subscription buys

The subscription pays for **AI voice coaching calls** (VAPI), plus the **Together AI LLM**
(`meta-llama/Llama-3.3-70B-Instruct-Turbo`) that powers in-app text chat and builds/answers
each call. Two products:

- **Daily check-ins** — short morning + evening voice calls.
- **Weekly planning** — one longer voice call to set the week's 3 weekly tasks.

Cost is dominated by **voice minutes**. Everything else (LLM, infra) is small. So the entire
model is built around a **weekly included-minutes pool** that we meter per call and reset
each week (the ISO-week window in §9).

## 2. Cost inputs (assumptions)

| Input | Value | Notes |
|-------|-------|-------|
| VAPI voice (all-in) | **$0.08 / min** | Bundled orchestration + STT + TTS + voice LLM. The single biggest cost. |
| Together AI LLM (text chat + call prompt prep) | **~$1.50 / user / mo** | Llama-3.3-70B-Turbo, moderate chat usage, prompt caching on. Scales with chat volume. |
| Infra (DO droplet, Firebase, push) amortized | **~$0.30 / user / mo** | Shared droplet `68.183.142.183`; near-zero per user at scale. |
| Apple IAP fee | **15%** | Small Business Program (<$1M/yr). Becomes 30% above $1M — see §8. |

Non-voice COGS floor ≈ **$1.80 / user / mo** before the Apple fee.

## 3. Recommended call length caps

Caps bound the worst case and keep COGS predictable. Recommended:

| Call | Cap | Typical actual |
|------|-----|----------------|
| Morning check-in | **7 min** | ~5 min |
| Evening check-in | **7 min** | ~5 min |
| Weekly planning | **15 min** | ~11 min |

Rationale: 10-min daily caps push max VAPI cost too high for any sub under ~$50. 7-min daily
caps keep a 2-call/day plan viable at a mid price. Weekly stays at 15 min — it's infrequent
and the planning conversation benefits from the length.

> The app must **hard-stop a call at its cap** and **count minutes against the weekly quota** (§9).

## 4. Minutes by tier

Metering is **weekly** in code (`weeklyVoiceQuotaSeconds`, see §9), so the quota is set per week;
monthly figures below are just `weekly × 4.33` (weeks/month = 52 ÷ 12 = **4.33**). Per-tier
weekly quotas: **Standard 65 min/week** (`3900`s), **Premium 115 min/week** (`6900`s).

### Standard — 1 daily check-in + weekly planning
- Daily: 7 min × 30 = 210 min
- Weekly: 15 min × 4.33 = 65 min
- **Max at full caps ≈ 275 min** → included pool **280 min/mo**

### Premium — 2 daily check-ins + weekly planning
- Daily: (7 + 7) × 30 = 420 min
- Weekly: 15 min × 4.33 = 65 min
- **Max at full caps ≈ 485 min** → included pool **500 min/mo**

## 5. COGS per tier

VAPI cost = minutes × $0.08. Non-voice floor = $1.80. (Apple fee applied to revenue in §7.)

### Standard (pool 280 min)

| Usage level | Minutes | VAPI | + non-voice | COGS |
|-------------|---------|------|-------------|------|
| Light | 120 | $9.60 | $1.80 | **$11.40** |
| Typical (~55% pool) | 155 | $12.40 | $1.80 | **$14.20** |
| Power (full caps) | 280 | $22.40 | $1.80 | **$24.20** |

### Premium (pool 500 min)

| Usage level | Minutes | VAPI | + non-voice | COGS |
|-------------|---------|------|-------------|------|
| Light | 200 | $16.00 | $1.80 | **$17.80** |
| Typical (~55% pool) | 275 | $22.00 | $1.80 | **$23.80** |
| Power (full caps) | 485 | $38.80 | $1.80 | **$40.60** |

> **Breakage is the margin engine.** Most subscribers will not max every call every day;
> blended consumption of ~50–60% of the pool is the realistic planning assumption.

## 5.1 Weekly planning call — isolated cost (Standard & Premium)

The weekly planning call is **identical in both tiers** — each includes one planning call per
week (4.33/mo). So its raw cost is the same whether the user is on Standard or Premium; only
its *share* of the tier's COGS differs.

**Cost components of one weekly call:**

| Component | Cost | Source |
|-----------|------|--------|
| Voice (VAPI @ $0.08/min) | $0.08 × minutes | dominant cost; voice LLM/STT/TTS bundled |
| End-of-call retrospective LLM | ~$0.004 | `generateRetrospective`, Llama-3.3-70B-Turbo, `max_tokens: 700`, ~4K in + 700 out @ $0.88/1M |
| Call prompt assembly | ~$0.00 | template injection (`assistantOverrides.variableValues`), no extra LLM |

The LLM portion is a rounding error — **the weekly call cost is essentially its voice minutes.**

**Per weekly call:**

| Length | Voice | + LLM | Total/call |
|--------|-------|-------|------------|
| Cap (15 min) | $1.20 | $0.004 | **$1.20** |
| Typical (~11 min) | $0.88 | $0.004 | **$0.89** |
| Light (~8 min) | $0.64 | $0.004 | **$0.64** |

**Per month (4.33 calls) — same figure for Standard and Premium:**

| Usage | Minutes/mo | Cost/mo |
|-------|-----------|---------|
| Cap (15 min each) | 65 | **$5.24** |
| Typical (~11 min) | 47.6 | **$3.85** |
| Light (~8 min) | 34.6 | **$2.80** |

**Share of each tier's COGS (at full caps):**

| Tier | Weekly voice | Daily voice | Weekly as % of voice COGS | Weekly as % of total COGS |
|------|--------------|-------------|---------------------------|----------------------------|
| Standard | $5.20 | $16.80 (210 min) | **24%** | ~21% (of $24.20) |
| Premium | $5.20 | $33.60 (420 min) | **13%** | ~13% (of $40.60) |

**Takeaway:** the weekly planning feature costs us **at most ~$5.24/user/month** and realistically
~$3.85. It is fully covered by both tiers with large headroom — even a Standard user who maxes
*only* the weekly call (and skips dailies) costs ~$5.24 against $25.49 net revenue. Lengthening
the weekly cap is cheap: every extra minute on the weekly call adds just $0.08 × 4.33 = **$0.35/mo**.

### Optional: a "Planner" weekly-only entry tier

Because the weekly call is so cheap in isolation, a low-priced entry product is viable:

| Plan | Included | Max COGS/wk | Suggested price | Max-user margin | Typical margin |
|------|----------|-------------|-----------------|-----------------|----------------|
| **Planner** (weekly planning only) | 1 planning call/wk (~15 min) + chat | ~$1.62 ($1.20 voice + $0.42 non-voice) | **$2.99/wk** | net $2.54 → +$0.92 (36%) | ~+$1.24 (49%) |

Break-even after Apple 15% is $1.62 ÷ 0.85 = **$1.91/wk**, so $2.99/wk keeps the "never lose
money" property. Treat as an optional funnel/entry tier — it can cannibalize Standard, so launch
only if you want a sub-$3/wk anchor. Not part of the core two-tier recommendation.

## 6. Recommended pricing — full plan matrix

Two tiers × two billing periods = four products. Same included quota within a tier (Standard
65 min/week, Premium 115 min/week); only the billing cadence and price change. **No monthly
plan** — the lineup is deliberately "try cheap weekly" or "commit yearly."

| Tier | Weekly | Yearly |
|------|--------|--------|
| **Standard** (1 daily + weekly) | **$8.99/wk** | **$299.99/yr** |
| **Premium** (2 daily + weekly) | **$14.99/wk** | **$499.99/yr** |

### The pricing ladder

Price *per unit of time* falls sharply as commitment rises — a low-commitment weekly on-ramp
and a discounted yearly that pulls cash forward:

| Tier | Weekly → $/mo equiv | Yearly → $/mo equiv | Yearly vs weekly |
|------|---------------------|----------------------|-------------------|
| Standard | $8.99 → **$38.93/mo** | $299.99 → **$25.00/mo** | **−36%** |
| Premium | $14.99 → **$64.91/mo** | $499.99 → **$41.67/mo** | **−36%** |

- **Weekly** is the flexible, low-commitment entry (cancel anytime, great as a paid trial /
  on-ramp) and carries the **highest margin** — it's the "never lose money even at max usage" plan.
- **Yearly** is ~36% cheaper than paying weekly all year (the "2 months free vs a notional
  monthly" feel) to pull cash forward, lift LTV, and cut churn.

> **Weekly never loses money — even on a user who maxes every call cap** (see §7.2). Break-even
> after Apple's 15% is ~90 min/wk Standard and ~154 min/wk Premium, both above the 65/115 min
> weekly caps.
>
> **Yearly relies on breakage:** the discount drops effective monthly revenue *below* the
> max-usage COGS line, so a theoretical every-cap-every-day annual subscriber runs a small
> monthly loss. Covered by **breakage** (annual users consume far below cap on average) and
> bounded by the **weekly hard cap** (no one can exceed 65/115 min per week). To make yearly
> *also* max-safe, shrink the discount to ~5% (Standard ~$341.99/yr, Premium ~$574.99/yr) —
> not recommended; the breakage math makes the discounted annual the better bet.

### Alternatives

- **Aggressive-growth yearly:** Premium **$399.99/yr** ($33.33/mo, −33%) converts better but
  loses ~$12/mo on a max-usage annual user. Use only if annual conversion is the priority.
- **Higher-margin weekly:** nudge weekly up (e.g. Standard $9.99/wk) for a fatter buffer to
  absorb LLM-cost growth or cap creep.
- **Planner entry tier (weekly-only product):** ~$2.99/wk — see §5.1.

## 7. Margin analysis (all four plans, Apple 15%)

Net revenue = price × 0.85. "Max" = every call hits its cap (the weekly hard cap is the true
ceiling on consumption). Costs are stated on the matching billing period.

### 7.1 Weekly (best margin — priced at a flexibility premium)

Per-week COGS: non-voice $0.42/wk; voice = minutes × $0.08. Standard quota 65 min/wk, Premium
115 min/wk; "typical" ≈ 55% of quota.

| Plan | Net rev | Typical COGS | Typical margin | Max COGS | Max margin |
|------|---------|--------------|----------------|----------|------------|
| **Standard $8.99/wk** | $7.64 | $3.30 (36 min) | **$4.34 (57%)** | $5.62 (65 min) | **+$2.02 (26%)** ✓ |
| **Premium $14.99/wk** | $12.74 | $5.46 (63 min) | **$7.28 (57%)** | $9.62 (115 min) | **+$3.12 (24%)** ✓ |

### 7.2 Yearly (relies on breakage; max-usage edge case runs a small loss)

Shown per-month for comparability (yearly ÷ 12).

| Plan | $/mo equiv | Net/mo | Typical margin | Max (full caps) |
|------|-----------|--------|----------------|------------------|
| **Standard $299.99/yr** | $25.00 | $21.24 | **$7.04 (33%)** | **−$2.96** ⚠ |
| **Premium $499.99/yr** | $41.67 | $35.41 | **$11.61 (33%)** | **−$5.19** ⚠ |

⚠ Max-usage annual subscribers lose money *per month* — acceptable because (a) almost no annual
user maxes the weekly cap every week, and (b) the weekly hard cap bounds the downside. The
blended annual cohort lands ~33% margin. To eliminate the edge case, use the ~5%-discount
"max-safe yearly" noted in §6 (not recommended; breakage makes the discounted annual better).

**Design property:** weekly is profitable in *every* usage scenario including absolute max
(Standard +26%, Premium +24% at max); yearly is profitable on the realistic breakage base.
Typical-usage gross margin is **~57% weekly / ~33% yearly** across both tiers. The §9 soft cap
protects margin and creates a Standard→Premium upgrade nudge, but is no longer *required* to
avoid losses on weekly.

### Break-even minutes (the hard ceiling the weekly pool must respect)

Metering is weekly, so the meaningful break-even is **per week** (net weekly revenue ÷ $0.08):

| Plan | Net rev/wk | minus non-voice | ÷ $0.08 = break-even min/wk | Weekly pool |
|------|-----------|------------------|------------------------------|-------------|
| Standard $8.99/wk | $7.64 | $7.22 | **90 min/wk** | 65 (under ceiling ✓) |
| Premium $14.99/wk | $12.74 | $12.32 | **154 min/wk** | 115 (under ceiling ✓) |

✓ **Both weekly pools sit under their break-even minutes.** A Standard user can burn the full
65-min weekly pool and we're still profitable (break-even is 90 min). Guardrail unchanged:
**never raise a tier's caps or pool without re-checking it stays under the break-even line**
(e.g. if the LLM cost grows, the line moves down). Yearly is the exception — see §7.2.

## 8. Sensitivity: crossing $1M/yr (Apple 30%)

Once revenue exceeds $1M/yr, Apple's cut jumps to 30%. On the **weekly** plans (per week):

| Plan | Net @ 30% | Typical-usage margin | Power-user (max) result |
|------|-----------|----------------------|--------------------------|
| Standard $8.99/wk | $6.29 | $2.99 (48%) | +$0.67 (11%) |
| Premium $14.99/wk | $10.49 | $5.03 (48%) | +$0.87 (8%) |

Weekly stays positive even at 30% and max usage. **Yearly** is where 30% bites — the
already-discounted annual goes further underwater on power users (still covered by breakage).
Mitigations when you approach the threshold: raise prices ~5–10%, trim pools, add metered
overage (§9 policy B), or move part of billing to web/Stripe (~3%). **No action needed at
launch** — revisit pricing before crossing $1M ARR.

## 9. Metering & enforcement (existing code + what's missing)

The pricing only holds if minutes are tracked and capped. **The metering is already keyed
*weekly* in code, not monthly** — so we express quotas per week (and the pool figures in §4/§6
are just `weekly × 4.33`). This matches the weekly+daily product rhythm.

### Already built (verified in code)

- ✅ **Per-call duration tracking.** `routes/webhooks.ts:115` reads VAPI's `message.durationMs`,
  converts to `durationSeconds`, and persists it on the conversation doc.
- ✅ **Weekly usage aggregation.** `routes/user.ts` `getVoiceUsageThisWeek()` sums
  `durationSeconds` across all conversations since the ISO week start.
- ✅ **Per-user quota field.** `weeklyVoiceQuotaSeconds` exists on the user doc, defaulting to
  `WEEKLY_VOICE_QUOTA_SECONDS = 3600` (60 min/week).

### Bugs / gaps to fix before launch

1. 🐞 **Naming/unit bug (`routes/user.ts:239-241` ← `routes/webhooks.ts:174`).**
   The field `voiceMinutesUsedThisWeek` actually accumulates **seconds** (webhooks.ts adds
   `durationSeconds` into it), and `weeklyQuota` is also seconds, so the subtraction
   `max(0, weeklyQuota − voiceMinutesUsedThisWeek)` is correct in units — **but the result is
   returned as `voiceMinutesRemainingThisWeek`**, a value in seconds wearing a "minutes" name.
   The client shows it ~60× too large. Fix: rename to `*Seconds`, and divide by 60 only at the
   display layer (`remainingMinutes = ceil(remainingSeconds / 60)`).
2. ❌ **Quota too low for the tiers.** 30 min/week ≈ 130 min/month — below both tiers. Set
   `weeklyVoiceQuotaSeconds` from the subscription tier (RevenueCat entitlement):
   - **Standard → 65 min/week** = `3900` (1 daily 7-min × 7 + weekly 15 ≈ 64) → ~281 min/mo
   - **Premium → 115 min/week** = `6900` (2 daily 7-min × 7 + weekly 15 ≈ 113) → ~498 min/mo
3. ❌ **Per-call hard cap.** Pass `maxDurationSeconds` to VAPI per call type in
   `routes/vapi.ts`: **420s** daily (midday/evening), **900s** weekly. The call ends at the cap.
4. ❌ **Pre-call gate.** In `/vapi/init-call`, before building the prompt, check
   `usedSeconds < quotaSeconds`. Under quota → allow; over → apply the overage policy below.
5. ❌ **Soft warnings.** Notify at 80% and 100% of the weekly quota
   ("You've used 56 of 65 minutes this week").
6. ⚠️ **Tier → quota sync.** On RevenueCat webhook (`/webhooks/revenuecat`), set
   `weeklyVoiceQuotaSeconds` to match the active entitlement (Standard/Premium), and reset to 0
   / the free default on lapse. The weekly window already auto-resets via `isoWeekStart`, so no
   separate monthly reset job is needed.

### Privacy

Usage counters are operational metadata (duration only, no content) — they can live
unencrypted for fast quota checks; transcripts stay AES-256-GCM encrypted as today.

### Overage policy (pick one)

- **A. Soft cap (recommended for v1):** once the pool is exhausted, daily check-ins are
  shortened/disabled until renewal; weekly planning still allowed. Prompt Standard users to
  upgrade to Premium. Simple, no surprise bills. *(Apple IAP has no native metered billing, so
  this is the natural fit.)* With the §6 pricing, even an un-capped overage stays profitable
  up to the break-even minute line, so this is now an **upgrade-nudge + margin-protection**
  lever rather than a loss-prevention necessity.
- **B. Metered overage:** sell extra-minute consumable IAPs (e.g. **+60 min for $5.99**,
  ≈ $0.10/min → ~20% margin after Apple). More revenue but more UX and review complexity.

## 10. Open decisions

- [ ] **Fix the quota unit bug** in `routes/user.ts:237-241` (§9 #1) — blocks any accurate metering.
- [ ] **Wire RevenueCat entitlement → `weeklyVoiceQuotaSeconds`** (Standard 3900 / Premium 6900).
- [ ] **Add per-call `maxDurationSeconds`** (420s daily / 900s weekly) and the pre-call gate.
- [ ] Confirm RevenueCat product IDs + Apple subscription groups match these two tiers.
- [ ] Measure real chat token usage to firm up the $1.50 LLM figure.
- [ ] Choose overage policy A vs B.
- [ ] Decide free trial (e.g. 7-day, or 100 trial minutes) and model its CAC/conversion cost.
- [ ] Validate the 7-min daily cap against real call transcripts before launch.
- [ ] Set the calendar reminder to revisit pricing before crossing $1M ARR (Apple → 30%).

## Summary

Four products — two tiers × {weekly, yearly}:

| Tier | Weekly | Yearly | Quota |
|------|--------|--------|-------|
| **Standard** (1 daily + weekly planning) | $8.99/wk | $299.99/yr | 65 min/wk |
| **Premium** (2 daily + weekly planning) | $14.99/wk | $499.99/yr | 115 min/wk |

- **No monthly plan** — the lineup is "try cheap weekly" or "commit yearly" (yearly ≈ −36% vs weekly).
- Daily calls capped at **7 min**, weekly planning at **15 min**, metered against the **weekly**
  quota (`weeklyVoiceQuotaSeconds`, already in code — see §9).
- On Apple IAP (15%), typical-usage gross margin is **~57% weekly / ~33% yearly**.
- **Weekly never loses money — even for a user who maxes every cap every day.** Yearly relies on
  breakage and is profitable on the realistic base (the max-usage annual edge case runs a small
  loss, bounded by the weekly hard cap).
- The model **only works if minutes are metered and capped** — fix the §9 quota bug, set
  per-tier quotas (Standard `3900`s / Premium `6900`s), add per-call caps + the pre-call gate.
