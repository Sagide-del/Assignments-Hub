// One-time data fix: normalizes any existing STUDENT.grade value that was
// stored as a bare number ("12") instead of the canonical "Grade 12" format
// that lab/assignment catalogs match against exactly (see
// backend/src/common/utils/grade.util.ts and LabsService.findAll). This only
// matters going forward for NEW students because users.service.ts and
// users-import.service.ts now normalize on create/update/import — this
// script is purely to repair rows that were already imported before that
// fix shipped (e.g. Excel imports where the Grade column just had "9",
// "10", "11", "12" instead of "Grade 9" etc.).
//
// Safe to run more than once — already-normalized rows are left untouched.
// Run with: npm run fix:grades (from backend/)

import { PrismaClient, Role } from '@prisma/client';
import { normalizeGrade } from '../src/common/utils/grade.util';

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT, grade: { not: null } },
    select: { id: true, name: true, schoolId: true, grade: true },
  });

  let fixed = 0;
  for (const student of students) {
    const normalized = normalizeGrade(student.grade);
    if (!normalized || normalized === student.grade) continue;

    await prisma.$transaction([
      prisma.user.update({ where: { id: student.id }, data: { grade: normalized } }),
      prisma.studentProfile.updateMany({ where: { userId: student.id }, data: { grade: normalized } }),
    ]);

    fixed += 1;
    console.log(`Fixed user #${student.id} "${student.name}" (school ${student.schoolId}): "${student.grade}" -> "${normalized}"`);
  }

  console.log(`Done. ${fixed} of ${students.length} students had their grade normalized.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
