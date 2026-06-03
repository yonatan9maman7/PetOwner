/**
 * Split-fee marketplace model (aligned with server `PricingService`):
 *
 * - `ServiceRateDto.rate` = provider base price per billing unit (sticker price).
 * - ClientFee      = BasePrice × 10 %  (added on top, paid by customer)
 * - TotalPrice     = BasePrice + ClientFee
 * - ProviderFee    = BasePrice × 4 %   (deducted from provider payout)
 * - ProviderNet    = BasePrice - ProviderFee
 */
import type { BookingPricingBreakdown } from "../types/api";

const CLIENT_FEE_RATE   = 0.10;
const PROVIDER_FEE_RATE = 0.04;

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Safe currency display — avoids crashing when API fields are missing. */
export function formatFixedMoney(value: unknown, digits = 2): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : (0).toFixed(digits);
}

export interface ProviderPricingBreakdown {
  basePrice: number;
  providerFee: number;
  netEarnings: number;
}

/** Provider-side display: sticker price → platform fee + net earnings. */
export function providerBreakdownFromBasePrice(basePriceIn: number): ProviderPricingBreakdown {
  if (!Number.isFinite(basePriceIn) || basePriceIn <= 0) {
    return { basePrice: 0, providerFee: 0, netEarnings: 0 };
  }
  const basePrice   = roundMoney(basePriceIn);
  const providerFee = roundMoney(basePrice * PROVIDER_FEE_RATE);
  const netEarnings = roundMoney(basePrice - providerFee);
  return { basePrice, providerFee, netEarnings };
}

/** Persisted API rate equals the provider's base price directly (no conversion needed). */
export function providerNetFromBasePrice(basePrice: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  return roundMoney(basePrice);
}

/** Customer-side totals from stored provider base price (API rate). */
export function customerBreakdownFromProviderNet(basePrice: number): BookingPricingBreakdown {
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { basePrice: 0, providerPlatformFee: 0, customerServiceFee: 0, finalTotal: 0 };
  }
  const base            = roundMoney(basePrice);
  const customerFee     = roundMoney(base * CLIENT_FEE_RATE);
  const finalTotal      = roundMoney(base + customerFee);
  const providerFee     = roundMoney(base * PROVIDER_FEE_RATE);
  return {
    basePrice: base,
    providerPlatformFee: providerFee,
    customerServiceFee: customerFee,
    finalTotal,
  };
}
