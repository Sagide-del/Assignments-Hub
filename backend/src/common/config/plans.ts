// Current business prices. Historical invoices/subscriptions retain snapshots.
export const INDIVIDUAL_MONTHLY_KES = 300;
export const SCHOOL_ANNUAL_PER_LEARNER_KES = 200;
export type SchoolType = "DAY" | "BOARDING";
export interface PlanTier {
  name: string;
  minStudents: number;
  maxStudents: number | null;
  priceDayPerStudent: number;
  priceBoardingPerStudent: number;
  bestFor: string;
}
// Compatibility shape for existing clients; no size bands or monthly tiers.
export const PLAN_TIERS: PlanTier[] = [
  {
    name: "School Annual",
    minStudents: 0,
    maxStudents: null,
    priceDayPerStudent: 200,
    priceBoardingPerStudent: 200,
    bestFor: "All schools · KES 200 per learner per year",
  },
];
export const PLAN_NAMES = PLAN_TIERS.map((tier) => tier.name);
export const getTierByName = (name: string) =>
  PLAN_TIERS.find((tier) => tier.name === name);
export const resolveTier = (_studentCount: number) => PLAN_TIERS[0];
export const getTierRatePerStudent = (
  _tier: PlanTier,
  _schoolType: SchoolType,
) => SCHOOL_ANNUAL_PER_LEARNER_KES;
export interface ComputedPricing {
  tier: PlanTier;
  studentCount: number;
  schoolType: SchoolType;
  ratePerStudent: number;
  amountKES: number;
  interval: "ANNUAL";
}
export function computeAnnualPriceKES(
  studentCount: number,
  schoolType: SchoolType,
): ComputedPricing {
  if (
    !Number.isSafeInteger(studentCount) ||
    studentCount < 0 ||
    studentCount > Math.floor(2147483647 / SCHOOL_ANNUAL_PER_LEARNER_KES)
  )
    throw Error("Invalid learner count");
  return {
    tier: PLAN_TIERS[0],
    studentCount,
    schoolType,
    ratePerStudent: SCHOOL_ANNUAL_PER_LEARNER_KES,
    amountKES: studentCount * SCHOOL_ANNUAL_PER_LEARNER_KES,
    interval: "ANNUAL",
  };
}
