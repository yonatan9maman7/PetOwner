/** Matches server `PricingService`: provider net → gross = net/0.9, fee = 4% of gross, total = gross + fee. */
const PROVIDER_NET_FRACTION_OF_GROSS = 0.9;
const CUSTOMER_FEE_RATE = 0.04;

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function grossFromProviderNet(providerNet: number): number {
  if (!Number.isFinite(providerNet) || providerNet <= 0) return 0;
  return roundMoney(providerNet / PROVIDER_NET_FRACTION_OF_GROSS);
}

export function customerPriceBreakdownFromProviderNet(providerNet: number): {
  gross: number;
  fee: number;
  total: number;
} {
  const gross = grossFromProviderNet(providerNet);
  const fee = roundMoney(gross * CUSTOMER_FEE_RATE);
  const total = roundMoney(gross + fee);
  return { gross, fee, total };
}
