# Soularc — Pricing Plans & Setup Guide (Weekly + Yearly)

> Selected plan set: **Weekly** and **Yearly** only, for two tiers (**Standard**, **Premium**).
> Billing: **Apple In-App Purchase, Small Business Program (15% fee)**.
> Companion analysis doc: `docs/pricing-and-billing.md`. Last updated: 2026-05-31.

This file is the implementation source of truth for the four shipping products. It covers:
1. The four plans, what each costs us, and the margins.
2. Step-by-step: create the App Store Connect products.
3. Step-by-step: wire them up in RevenueCat.
4. Step-by-step: per-week + per-call minute tracking (what exists, what to build).

---

## 1. The four plans

| Product | Tier | Period | Price | Weekly voice quota | Calls included |
|---------|------|--------|-------|--------------------|----------------|
| `soularc_standard_weekly` | Standard | Weekly | **$8.99/wk** | 65 min/wk (`3900`s) | 1 daily check-in + weekly planning |
| `soularc_standard_yearly` | Standard | Yearly | **$299.99/yr** | 65 min/wk (`3900`s) | 1 daily check-in + weekly planning |
| `soularc_premium_weekly` | Premium | Weekly | **$14.99/wk** | 115 min/wk (`6900`s) | 2 daily check-ins + weekly planning |
| `soularc_premium_yearly` | Premium | Yearly | **$499.99/yr** | 115 min/wk (`6900`s) | 2 daily check-ins + weekly planning |

**Call length caps (enforced per call):** daily check-ins **7 min** (`420`s), weekly planning
**15 min** (`900`s). The weekly quota is the true ceiling on consumption.

---

## 2. What it costs us & the margins

### Cost inputs

| Input | Value |
|-------|-------|
| VAPI voice (all-in) | **$0.08 / min** |
| Together AI LLM (chat + call prep), per user | **~$1.50 / mo** ≈ $0.35/wk |
| Infra (DO droplet, Firebase, push), per user | **~$0.30 / mo** ≈ $0.07/wk |
| Apple IAP fee | **15%** (Small Business Program) |

Non-voice COGS floor: **~$0.42/week** or **~$1.80/month**.

### Weekly plans — COGS & margin (Apple 15%)

Net revenue = price × 0.85. Voice = minutes × $0.08. "Typical" ≈ 55% of quota.

| Plan | Price | Net rev | Typical COGS | Typical margin | Max COGS (full quota) | Max margin |
|------|-------|---------|--------------|----------------|------------------------|------------|
| Standard weekly | $8.99 | $7.64 | $3.30 (36 min) | **$4.34 (57%)** | $5.62 (65 min) | **+$2.02 (26%)** ✓ |
| Premium weekly | $14.99 | $12.74 | $5.46 (63 min) | **$7.28 (57%)** | $9.62 (115 min) | **+$3.12 (24%)** ✓ |

→ **Weekly plans are profitable in every case, even a user who maxes the full quota.**

### Yearly plans — COGS & margin (Apple 15%)

Shown per-month for comparability (yearly ÷ 12). Monthly quota ≈ weekly × 4.33.

| Plan | Price | $/mo equiv | Net/mo | Typical margin | Max margin (full caps) |
|------|-------|-----------|--------|----------------|-------------------------|
| Standard yearly | $299.99 | $25.00 | $21.24 | **$7.04 (33%)** | **−$2.96** ⚠ |
| Premium yearly | $499.99 | $41.67 | $35.41 | **$11.61 (33%)** | **−$5.19** ⚠ |

→ **Yearly plans are profitable on realistic (breakage) usage (~33% margin).** The ⚠ rows are
the theoretical case of a user maxing the weekly cap *every week for a year* — rare, and bounded
by the hard cap. Blended annual margin lands ~33%.

### Why this pairing works

- **Weekly** = low-commitment, high-margin on-ramp (great as a paid trial substitute). Never loses money.
- **Yearly** = cash-forward, low-churn commitment, ~36% cheaper than paying weekly all year; funded by breakage.
- No monthly plan in this set → simpler paywall, pushes users to either "try cheap weekly" or "commit yearly."

### Profit at scale (illustrative, typical usage)

| Mix (1,000 active subs) | Blended monthly gross profit |
|-------------------------|-------------------------------|
| 500 Std weekly + 500 Std yearly | ≈ 500×($4.34×4.33) + 500×$7.04 ≈ **$12,920/mo** |
| 500 Prem weekly + 500 Prem yearly | ≈ 500×($7.28×4.33) + 500×$11.61 ≈ **$21,565/mo** |

(Before VAPI/Together volume discounts, support, and CAC. Directional only.)

---

## 3. Step-by-step: App Store Connect products

> Prereq: paid Apple Developer account; **enroll in the App Store Small Business Program**
> (App Store Connect → Agreements → Small Business Program) to get the 15% rate — this is the
> single biggest margin lever. Banking/tax agreements must be active or products stay "Missing Metadata."

### 3.1 Create two subscription groups

Auto-renewable subscriptions in the **same group** are mutually exclusive (a user holds one at a
time) and can upgrade/downgrade between each other. We want Standard and Premium to be separate
*tiers* a user picks between, and weekly/yearly to be *durations within a tier*.

App Store Connect → your app → **Subscriptions** → create groups:

1. **Group: `Soularc Standard`** (reference name) — will hold both Standard durations.
2. **Group: `Soularc Premium`** — will hold both Premium durations.

> Putting each tier in its own group lets a user move freely weekly↔yearly within a tier. Apple
> also allows cross-group upgrades (Standard→Premium) via the same subscription; RevenueCat
> handles proration. If you'd rather have ALL four in one group (so only one sub ever active),
> that also works — but two groups maps more cleanly to "two tiers."

### 3.2 Create the four subscription products

In each group, **+ Create Subscription**. Use these exact Product IDs (they must match RevenueCat
and the proxy mapping in §5):

| Group | Product ID | Reference Name | Duration | Price |
|-------|-----------|----------------|----------|-------|
| Soularc Standard | `soularc_standard_weekly` | Standard Weekly | 1 Week | $8.99 |
| Soularc Standard | `soularc_standard_yearly` | Standard Yearly | 1 Year | $299.99 |
| Soularc Premium | `soularc_premium_weekly` | Premium Weekly | 1 Week | $14.99 |
| Soularc Premium | `soularc_premium_yearly` | Premium Yearly | 1 Year | $499.99 |

For each product set:
- **Subscription Duration** (1 week / 1 year).
- **Price** — pick the price point closest to the above for your base currency; Apple auto-fills
  other storefronts (review/adjust if needed).
- **Localization** (display name + description), e.g. "Standard — Weekly", "Premium — Yearly".
  Required, or the product can't be submitted.
- **Review Information** — screenshot + notes for Apple review.

### 3.3 (Optional) Introductory offers / free trial

If you want a trial instead of relying on weekly-as-trial: on each product → **Introductory
Offers** → e.g. 7-day free trial (one per group per user). Decide before launch; see open
decisions in `pricing-and-billing.md` §10.

### 3.4 Submit

Each subscription must be **submitted for review** (can be attached to your next app version, or
submitted standalone after first approval). Until approved they show in sandbox only.

### 3.5 Sandbox testing

Settings → App Store → Sandbox Account on a test device. Sandbox renewals are accelerated
(1 week ≈ a few minutes; 1 year ≈ 1 hour) — useful for testing renewal → quota-reset behavior.

---

## 4. Step-by-step: RevenueCat products

RevenueCat dashboard. The iOS app already integrates the SDK
(`ios-app/LiveCoach/Services/SubscriptionService.swift`) and uses **entitlements** + the
**current offering's packages**.

### 4.1 App + API key (already done)

`Constants.revenueCatAPIKey = "appl_xYEYFjQZulmgDcCyasbOYJDUsxO"` is set. Confirm the RevenueCat
project's App Store Connect shared secret is configured (Project → App Store → "In-app purchase
key" / shared secret) so RevenueCat can validate receipts.

### 4.2 Import the four products

RevenueCat → **Products** → **+ New** → import from App Store Connect (or add by Product ID).
Add all four: `soularc_standard_weekly`, `soularc_standard_yearly`, `soularc_premium_weekly`,
`soularc_premium_yearly`.

### 4.3 Create two entitlements

RevenueCat → **Entitlements**:

| Entitlement ID | Attach products |
|----------------|-----------------|
| `premium` | `soularc_premium_weekly`, `soularc_premium_yearly` |
| `standard` | `soularc_standard_weekly`, `soularc_standard_yearly` |

> The app currently only checks `Constants.Entitlements.premium`. **Add a `standard`
> entitlement constant** (see §5.4) so the app can tell the tiers apart. A Premium subscriber
> should be treated as also satisfying Standard features — handle that in code (premium ⊇ standard),
> not by attaching products to both entitlements.

### 4.4 Create the offering & packages

RevenueCat → **Offerings** → create offering `default` (mark as current). Add **packages**:

| Package identifier | Product | Notes |
|--------------------|---------|-------|
| `$rc_weekly` | `soularc_premium_weekly` | RevenueCat's standard weekly package slot |
| `$rc_annual` | `soularc_premium_yearly` | standard annual slot |
| `standard_weekly` (custom) | `soularc_standard_weekly` | custom package id |
| `standard_annual` (custom) | `soularc_standard_yearly` | custom package id |

> ✅ **Paywall code status.** `SubscriptionView.swift` renders all four products
> (Standard/Premium × weekly/yearly), matched by `storeProduct.productIdentifier` via
> `Constants.Products`. There is no monthly product.

### 4.5 Webhook → proxy (set tier-based quota)

RevenueCat → **Integrations → Webhooks**:
- URL: `https://api.soularc.xyz/webhooks/revenuecat`
- Authorization header: the value of `REVENUECAT_WEBHOOK_SECRET` (proxy checks
  `Authorization: Bearer <secret>` — see `proxy/src/routes/webhooks.ts:17`).

The proxy webhook currently only flips `subscriptionStatus` premium/free
(`webhooks.ts:271`). It must be extended to **set `weeklyVoiceQuotaSeconds` from the purchased
product** — see §5.3.

---

## 5. Step-by-step: time tracking (per week + per call minute)

### 5.0 What already exists (verified in code)

- ✅ **Per-call duration** captured from VAPI's end-of-call report and stored on the
  conversation doc + accumulated onto the user (`webhooks.ts:104,173-175,228`).
- ✅ **Weekly usage field** `voiceMinutesUsedThisWeek` and quota `weeklyVoiceQuotaSeconds`
  (default `3600`) on the user doc (`user.ts:9,33-34,120-121`).
- ✅ **iOS mirror** `Constants.weeklyVoiceQuotaSeconds = 3600`.
- ✅ **ISO-week helpers** in `proxy/src/services/weeks.ts` (`weekRange`, `weekId`).

### 5.1 Fix the naming/unit bug (BLOCKER)

`user.ts:239-241`:
```ts
const voiceMinutesUsedThisWeek = userData.voiceMinutesUsedThisWeek ?? 0; // actually SECONDS
const weeklyQuota = userData.weeklyVoiceQuotaSeconds ?? WEEKLY_VOICE_QUOTA_SECONDS; // seconds
const voiceMinutesRemainingThisWeek = Math.max(0, weeklyQuota - voiceMinutesUsedThisWeek);
```
The field named `…Minutes…` actually holds **seconds** (webhooks.ts adds `durationSeconds` into
it). Math is unit-consistent (sec − sec), but the API returns it as `…Minutes…`, so the client
shows a value ~60× too large.

**Fix:** rename storage to `voiceSecondsUsedThisWeek`, and convert only for display:
```ts
const usedSeconds = userData.voiceSecondsUsedThisWeek ?? 0;
const quotaSeconds = userData.weeklyVoiceQuotaSeconds ?? WEEKLY_VOICE_QUOTA_SECONDS;
const remainingSeconds = Math.max(0, quotaSeconds - usedSeconds);
res.json({
  voiceSecondsUsedThisWeek: usedSeconds,
  weeklyVoiceQuotaSeconds: quotaSeconds,
  voiceMinutesRemainingThisWeek: Math.ceil(remainingSeconds / 60), // display only
});
```
Update the matching write site (`webhooks.ts:171-175`) and the iOS model to the new field name.

### 5.2 Per-call accumulation is currently evening-only — make it apply to ALL calls

`webhooks.ts:167-176` only accumulates voice usage inside the `callType === 'evening'` branch.
Midday, weekly, and free calls record `durationSeconds` on the conversation but **don't** add to
the weekly counter. Move the accumulation out of the `evening` branch so **every** end-of-call
report updates the weekly usage:

```ts
// after computing durationSeconds, for every callType:
if (durationSeconds && userId) {
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  const u = snap.data() as { totalVoiceSecondsUsed?: number; voiceSecondsUsedThisWeek?: number } | undefined;
  await userRef.update({
    totalVoiceSecondsUsed: (u?.totalVoiceSecondsUsed ?? 0) + durationSeconds,
    voiceSecondsUsedThisWeek: (u?.voiceSecondsUsedThisWeek ?? 0) + durationSeconds,
  });
}
```

> **Weekly reset:** because usage is keyed to the ISO week, you need a reset at week boundaries.
> Two options: (a) store `voiceSecondsUsedThisWeek` alongside a `usageWeekId`; on each
> accumulate, if the stored `usageWeekId !== weekId(uid, now)`, reset to 0 first. This is
> self-healing and needs no cron. **(Recommended.)** (b) a Monday 00:00 cron that zeroes the
> field for all users. (a) is simpler and race-free per user.

### 5.3 Map product → weekly quota on the RevenueCat webhook

Extend `webhooks.ts` `/revenuecat` so the purchased product sets the tier + quota. RevenueCat's
event includes the product id (`event.product_id`) and entitlement ids; add them to the
`RevenueCatWebhookBody` interface and map:

```ts
const PRODUCT_QUOTA_SECONDS: Record<string, number> = {
  soularc_standard_weekly: 3900,  // 65 min/wk
  soularc_standard_yearly: 3900,
  soularc_premium_weekly: 6900,   // 115 min/wk
  soularc_premium_yearly: 6900,
};
const PRODUCT_TIER: Record<string, 'standard' | 'premium'> = {
  soularc_standard_weekly: 'standard', soularc_standard_yearly: 'standard',
  soularc_premium_weekly: 'premium',  soularc_premium_yearly: 'premium',
};

if (PREMIUM_EVENTS.has(eventType)) {
  const productId = body.event.product_id ?? '';
  const tier = PRODUCT_TIER[productId] ?? 'premium';
  await db.collection('users').doc(appUserId).set({
    subscriptionStatus: tier,                                  // 'standard' | 'premium'
    weeklyVoiceQuotaSeconds: PRODUCT_QUOTA_SECONDS[productId] ?? 3900,
  }, { merge: true });
} else if (FREE_EVENTS.has(eventType)) {
  await db.collection('users').doc(appUserId).set({
    subscriptionStatus: 'free',
    weeklyVoiceQuotaSeconds: 0,           // or a small free-tier allowance
  }, { merge: true });
}
```

> Note: `subscriptionStatus` is currently a binary `'premium' | 'free'` consumed by
> `GET /user/subscription` and the iOS coupon flow. Widening it to include `'standard'` means
> updating that endpoint and the iOS `AppState.isPremium` logic so Standard unlocks Standard
> features and Premium unlocks both (premium ⊇ standard).

### 5.4 Pre-call gate (enforce the quota before starting a call)

In `proxy/src/routes/vapi.ts` `POST /init-call`, before building the prompt, block if the user
is over quota:

```ts
const userSnap = await db.collection('users').doc(uid).get();
const u = userSnap.data() ?? {};
const usedSeconds = u.voiceSecondsUsedThisWeek ?? 0;        // reset-aware via usageWeekId (§5.2)
const quotaSeconds = u.weeklyVoiceQuotaSeconds ?? 0;
if (usedSeconds >= quotaSeconds) {
  res.status(402).json({ error: 'weekly_quota_exhausted',
    remainingSeconds: 0, quotaSeconds });
  return;
}
```

### 5.5 Per-call hard cap (stop the call at its length cap)

Pass `maxDurationSeconds` to VAPI per call type so a single call can't run forever. Include it in
the `/init-call` response metadata and apply it when the iOS app starts the Vapi call (or via
`assistantOverrides`):

```ts
const MAX_CALL_SECONDS: Record<CallType, number> = {
  midday: 420, evening: 420, weekly: 900, free: 420,
};
// return maxDurationSeconds: MAX_CALL_SECONDS[type] in the init-call JSON
```
On iOS, set the Vapi call's max duration / `maxDurationSeconds` from this value when starting the
call (`SubscriptionService`/voice-call start path).

### 5.6 Soft warnings (optional but recommended)

When `remainingSeconds` drops below 20% of quota, surface a banner ("9 of 65 minutes left this
week"). Compute from the `GET /user/stats` response (already returns remaining; fix units first).

### 5.7 iOS changes summary

- Rename usage field to `voiceSecondsUsedThisWeek` in the profile/stats models.
- Add `Constants.Entitlements.standard` and tier-aware gating (premium ⊇ standard).
- ✅ `SubscriptionView.swift` renders **four** packages (Standard/Premium × weekly/yearly),
  matched by product identifier (`Constants.Products`).
- Apply `maxDurationSeconds` when starting a Vapi call.
- Set per-tier `Constants.weeklyVoiceQuotaSeconds` from the server profile, not a hardcoded 3600.

---

## 6. Launch checklist

**App Store Connect**
- [ ] Enroll in Small Business Program (15% fee).
- [ ] Create groups `Soularc Standard`, `Soularc Premium`.
- [ ] Create 4 products with exact IDs + prices (§3.2); add localizations + review info.
- [ ] Submit all 4 for review; verify in sandbox (accelerated renewals).

**RevenueCat**
- [ ] Import 4 products; confirm App Store shared secret.
- [ ] Create entitlements `standard` + `premium` (attach matching products).
- [ ] Create `default` offering with 4 packages; mark current.
- [ ] Configure webhook → `https://api.soularc.xyz/webhooks/revenuecat` with `REVENUECAT_WEBHOOK_SECRET`.

**Proxy (deploy via `proxy/deploy.sh`)** — ✅ code complete & tested; still needs deploy
- [x] §5.1 fix the seconds/minutes naming bug. *(`user.ts` now uses `voiceSecondsUsedThisWeek`; remaining returned in minutes.)*
- [x] §5.2 accumulate usage for ALL call types + week-boundary reset (`usageWeekId`). *(`voiceUsage.ts` + `webhooks.ts`.)*
- [x] §5.3 map product → `weeklyVoiceQuotaSeconds` + tier on RevenueCat webhook. *(`subscriptionTiers.ts` + `webhooks.ts`.)*
- [x] §5.4 pre-call quota gate in `/init-call`. *(returns 402 `weekly_quota_exhausted`.)*
- [x] §5.5 return `maxDurationSeconds` per call type. *(420 daily / 900 weekly.)*
- [x] Widen `subscriptionStatus` / `GET /user/subscription` to `standard|premium|free`. *(chat gating uses `hasPaidPlan`.)*
- [x] **Deploy** the proxy (`cd proxy && ./deploy.sh`). *(Deployed 2026-06-01; `/health` ok, coupon route live.)*
- [x] Set `REVENUECAT_SECRET_API_KEY` in `proxy/.env` (required for coupon grant; validated against RC API). *(2026-06-01.)*

**iOS (`xcodegen generate` only needed if files are added — none were)** — ✅ builds clean
- [x] Rework paywall for 4 packages (§5.7). *(`SubscriptionView` groups Standard/Premium × weekly/yearly.)*
- [x] Add `standard` entitlement + tier-aware gating. *(`Constants.Entitlements.standard`; `SubscriptionService.Tier`; `AppState.apply(tier:)`.)*
- [x] Apply per-call max duration; rename usage field; pull quota from server. *(`VapiManager` sends `maxDurationSeconds`; 402 → `.quotaExhausted`.)*

**Verify end-to-end**
- [ ] Sandbox purchase each plan → confirm `weeklyVoiceQuotaSeconds` set correctly per tier.
- [ ] Make calls → confirm `voiceSecondsUsedThisWeek` increments for midday/evening/weekly/free.
- [ ] Exhaust quota → confirm `/init-call` returns 402.
- [ ] Cross week boundary → confirm usage resets.
- [ ] Cancel/expire → confirm downgrade to free + quota 0.
