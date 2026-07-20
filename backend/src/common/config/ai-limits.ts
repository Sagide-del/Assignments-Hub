// Monthly AI Assignment Generator quota per subscription tier.
//
// There is no dedicated "AI quota" column anywhere in the schema —
// Subscription.plan just stores the resolved pricing tier name (Free/
// Starter/Standard/Premium/Enterprise, see plans.ts) as a snapshot string,
// and neither Subscription, School, nor plans.ts carries anything about AI
// usage limits. Rather than add a schema column for a single hardcoded
// business rule, this map lives here as plain application config — no Nest
// module, no dependency injection — keyed by that same tier name string,
// and shared by AiUsageService (enforcement) and ReportsService (the AI
// usage analytics report). Same pattern as plans.ts, whose own docblock
// already anticipates being shared by PaymentService and ReportsService.
//
// `null` means unlimited (Enterprise). These numbers are a starting point,
// not derived from existing product config — adjust freely if the actual
// intended limits differ.
export const AI_MONTHLY_LIMITS: Record<string, number | null> = {
  Free: 20,
  Starter: 100,
  Standard: 300,
  Premium: 1000,
  Enterprise: null,
};

// Used when a school has no Subscription row yet (e.g. brand new signup
// before its first payment/trial record is created) or when its latest
// plan name doesn't match a known tier. Deliberately the most conservative
// (Free-tier) limit rather than unlimited, so a missing/unrecognized plan
// can't accidentally bypass enforcement.
export const DEFAULT_AI_MONTHLY_LIMIT = AI_MONTHLY_LIMITS.Free;

/** Resolves a school's monthly AI quota from its current subscription plan name. Returns null for unlimited. */
export function resolveAiMonthlyLimit(planName: string | null | undefined): number | null {
  if (planName && planName in AI_MONTHLY_LIMITS) {
    return AI_MONTHLY_LIMITS[planName];
  }
  return DEFAULT_AI_MONTHLY_LIMIT;
}
