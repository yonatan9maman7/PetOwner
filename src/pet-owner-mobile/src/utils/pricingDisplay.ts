/**
 * Dual-sided commission model (aligned with server `PricingService`):
 * - API `ServiceRateDto.rate` = provider net (after 10% platform fee on base sticker price).
 * - Base sticker price = providerNet / 0.9.
 * - Customer pays base + 4% service fee.
 */
import type { BookingPricingBreakdown } from "../types/api";

const PROVIDER_NET_FRACTION_OF_BASE = 0.9;
const PROVIDER_PLATFORM_FEE_RATE = 0.1;
const CUSTOMER_FEE_RATE = 0.04;

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function basePriceFromProviderNet(providerNet: number): number {
  if (!Number.isFinite(providerNet) || providerNet <= 0) return 0;
  return roundMoney(providerNet / PROVIDER_NET_FRACTION_OF_BASE);
}

export interface ProviderPricingBreakdown {
  basePrice: number;
  platformFee: number;
  netEarnings: number;
}

/** Provider enters sticker base price; platform fee and net earnings for display. */
export function providerBreakdownFromBasePrice(basePriceIn: number): ProviderPricingBreakdown {
  if (!Number.isFinite(basePriceIn) || basePriceIn <= 0) {
    return { basePrice: 0, platformFee: 0, netEarnings: 0 };
  }
  const basePrice = roundMoney(basePriceIn);
  const platformFee = roundMoney(basePrice * PROVIDER_PLATFORM_FEE_RATE);
  const netEarnings = roundMoney(basePrice * PROVIDER_NET_FRACTION_OF_BASE);
  return { basePrice, platformFee, netEarnings };
}

/** Persisted API rate (provider net) from UI base price. */
export function providerNetFromBasePrice(basePrice: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  return roundMoney(basePrice * PROVIDER_NET_FRACTION_OF_BASE);
}

/** Customer totals from stored provider net (API rate). */
export function customerBreakdownFromProviderNet(providerNet: number): BookingPricingBreakdown {
  const basePrice = basePriceFromProviderNet(providerNet);
  if (basePrice <= 0) {
    return { basePrice: 0, providerPlatformFee: 0, customerServiceFee: 0, finalTotal: 0 };
  }
  const providerPlatformFee = roundMoney(basePrice * PROVIDER_PLATFORM_FEE_RATE);
  const customerServiceFee = roundMoney(basePrice * CUSTOMER_FEE_RATE);
  const finalTotal = roundMoney(basePrice + customerServiceFee);
  return { basePrice, providerPlatformFee, customerServiceFee, finalTotal };
}
