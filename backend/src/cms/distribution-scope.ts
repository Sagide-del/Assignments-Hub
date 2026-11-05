import { Prisma } from "@prisma/client";
export function distributionScope(
  schoolId: number,
  labels: string[],
): Prisma.MasterModuleWhereInput {
  return {
    status: "APPROVED",
    distributions: {
      some: {
        OR: [
          { audience: "PUBLIC_STORE", school_id: null },
          {
            audience: "SCHOOL",
            school_id: String(schoolId),
            OR: [{ stream_id: null }, { stream_id: { in: labels } }],
          },
        ],
      },
    },
  };
}
export function visibleDistributions(
  rows: any[],
  schoolId: number,
  labels: (string | null)[],
) {
  return rows.filter(
    (d) =>
      d.audience === "PUBLIC_STORE" ||
      (d.audience === "SCHOOL" &&
        d.school_id === String(schoolId) &&
        (!d.stream_id || labels.includes(d.stream_id))),
  );
}
