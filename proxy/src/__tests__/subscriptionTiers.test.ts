import { tierForProduct, quotaSecondsForProduct, FREE_QUOTA_SECONDS } from '../services/subscriptionTiers';

describe('tierForProduct', () => {
  it('maps standard products to the standard tier', () => {
    expect(tierForProduct('soularc_standard_weekly')).toBe('standard');
    expect(tierForProduct('soularc_standard_yearly')).toBe('standard');
  });

  it('maps premium products to the premium tier', () => {
    expect(tierForProduct('soularc_premium_weekly')).toBe('premium');
    expect(tierForProduct('soularc_premium_yearly')).toBe('premium');
  });

  it('defaults unknown products to premium (fail open for paying users)', () => {
    expect(tierForProduct('something_else')).toBe('premium');
    expect(tierForProduct(undefined)).toBe('premium');
  });
});

describe('quotaSecondsForProduct', () => {
  it('grants 65 min/week (3900s) for standard products', () => {
    expect(quotaSecondsForProduct('soularc_standard_weekly')).toBe(3900);
    expect(quotaSecondsForProduct('soularc_standard_yearly')).toBe(3900);
  });

  it('grants 115 min/week (6900s) for premium products', () => {
    expect(quotaSecondsForProduct('soularc_premium_weekly')).toBe(6900);
    expect(quotaSecondsForProduct('soularc_premium_yearly')).toBe(6900);
  });

  it('defaults unknown products to the premium quota', () => {
    expect(quotaSecondsForProduct('mystery')).toBe(6900);
  });
});

describe('FREE_QUOTA_SECONDS', () => {
  it('is zero — no paid plan, no voice quota', () => {
    expect(FREE_QUOTA_SECONDS).toBe(0);
  });
});
