// Canonical subscription pricing catalog — single source of truth for tier
// bands and per-student pricing. Shared by PaymentService (to compute the
// amount actually charged server-side — never trust a client-supplied plan
// or amount for a real payment) and ReportsService (revenue estimates).
//
// Pricing model (as of 2026-07): a school's tier is NOT manually chosen. It
// is resolved automatically from the school's live registered student count
// (see resolveTier below), and priced per-student at a rate that depends on
// both the tier and whether the school is a Day School or Boarding School
// (see SchoolType in schema.prisma). Keep this in sync with the pricing
// table shown in frontend/school-admin-dashboard's Subscription tab and the
// public pricing table (GET /payment/tiers).
export type SchoolType = 'DAY' | 'BOARDING';

export interface PlanTier {
  name: string;
  // Inclusive student-count band this tier applies to. maxStudents === null
  // means "and up" (Enterprise, no ceiling).
  minStudents: number;
  maxStudents: number | null;
  priceDayPerStudent: number; // KES / student / month, Day School
  priceBoardingPerStudent: number; // KES / student / month, Boarding School
  // Human-readable band shown in the pricing table UI. Kept separate from
  // minStudents/maxStudents because the source pricing table's bands
  // overlap slightly at the edges (Free "<50" vs Starter "1-200") — that's
  // marketing copy, not a strict boundary. The enforced, non-overlapping
  // boundaries actually used for tier resolution are minStudents/maxStudents
  // below: Free covers 0-49, Starter picks up from 50.
  bestFor: string;
}

export const PLAN_TIERS: PlanTier[] = [
  { name: 'Free', minStudents: 0, maxStudents: 49, priceDayPerStudent: 0, priceBoardingPerStudent: 0, bestFor: '<50 students' },
  { name: 'Starter', minStudents: 50, maxStudents: 200, priceDayPerStudent: 120, priceBoardingPerStudent: 120, bestFor: '1-200 students' },
  { name: 'Standard', minStudents: 201, maxStudents: 500, priceDayPerStudent: 110, priceBoardingPerStudent: 94, bestFor: '200-500 students' },
  { name: 'Premium', minStudents: 501, maxStudents: 1500, priceDayPerStudent: 90, priceBoardingPerStudent: 77, bestFor: '500-1,500 students' },
  { name: 'Enterprise', minStudents: 1501, maxStudents: null, priceDayPerStudent: 70, priceBoardingPerStudent: 60, bestFor: '1,500+ students' },
];

export const PLAN_NAMES = PLAN_TIERS.map((t) => t.name);

export function getTierByName(name: string): PlanTier | undefined {
  return PLAN_TIERS.find((t) => t.name === name);
}

/** Finds the tier whose student-count band contains `studentCount`. Falls back to Enterprise for anything above the last band (defensive — the last tier's maxStudents is already null so this only matters if bands are ever misconfigured). */
export function resolveTier(studentCount: number): PlanTier {
  const count = Math.max(0, Math.floor(studentCount) || 0);
  return (
    PLAN_TIERS.find((t) => count >= t.minStudents && (t.maxStudents === null || count <= t.maxStudents)) ??
    PLAN_TIERS[PLAN_TIERS.length - 1]
  );
}

export function getTierRatePerStudent(tier: PlanTier, schoolType: SchoolType): number {
  return schoolType === 'BOARDING' ? tier.priceBoardingPerStudent : tier.priceDayPerStudent;
}

export interface ComputedPricing {
  tier: PlanTier;
  studentCount: number;
  schoolType: SchoolType;
  ratePerStudent: number;
  amountKES: number; // monthly total = studentCount * ratePerStudent
}

/** The single function everything else should call to price a school — resolves the tier from student count, looks up the right day/boarding rate, and multiplies out the monthly total. */
export function computeMonthlyPriceKES(studentCount: number, schoolType: SchoolType): ComputedPricing {
  const count = Math.max(0, Math.floor(studentCount) || 0);
  const tier = resolveTier(count);
  const ratePerStudent = getTierRatePerStudent(tier, schoolType);
  return {
    tier,
    studentCount: count,
    schoolType,
    ratePerStudent,
    amountKES: Math.round(ratePerStudent * count),
  };
}
