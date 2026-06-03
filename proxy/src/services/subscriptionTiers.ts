/**
 * Single source of truth mapping App Store / RevenueCat product ids to a tier and
 * a weekly voice quota (in seconds). Keep these product ids in sync with App Store
 * Connect, RevenueCat, and docs/pricing-plans-and-setup.md.
 *
 *   Standard → 65 min/week = 3900s    Premium → 115 min/week = 6900s
 */

export type Tier = 'standard' | 'premium';

const STANDARD_QUOTA_SECONDS = 3900; // 65 min/week
const PREMIUM_QUOTA_SECONDS = 6900; // 115 min/week

/** Voice quota for a user with no active paid plan. */
export const FREE_QUOTA_SECONDS = 0;

const PRODUCT_TIER: Record<string, Tier> = {
  soularc_standard_weekly: 'standard',
  soularc_standard_yearly: 'standard',
  soularc_premium_weekly: 'premium',
  soularc_premium_yearly: 'premium',
};

const TIER_QUOTA_SECONDS: Record<Tier, number> = {
  standard: STANDARD_QUOTA_SECONDS,
  premium: PREMIUM_QUOTA_SECONDS,
};

/** Tier for a product id; unknown/missing ids fail open to premium (don't under-grant a payer). */
export function tierForProduct(productId: string | undefined): Tier {
  return (productId && PRODUCT_TIER[productId]) || 'premium';
}

/** Weekly voice quota (seconds) for a product id. */
export function quotaSecondsForProduct(productId: string | undefined): number {
  return TIER_QUOTA_SECONDS[tierForProduct(productId)];
}
