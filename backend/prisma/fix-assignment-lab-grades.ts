// One-time data fix: normalizes any existing Assignment.grade / Lab.grade
// value that was stored as a bare number ("12") or oddly-cased/spaced text
// ("grade12", "GRADE 9") instead of the canonical "Grade 12" format that
// AssignmentsService.findAll / LabsService.findAll match against exactly
// with `grade: actor.grade`. A mismatch here is why a teacher can publish
// an assignment and it never shows up for any student, even though the
// assignment really was created successfully.
//
// This only matters going forward for NEWLY created/edited assignments and
// labs because assignments.service.ts and labs.service.ts now normalize the
// grade on create/update/from-json — this script is purely to repair rows
// that were already created before that fix shipped.
//
// Safe to run more than once — already-normalized rows are left untouched.
// Run with: npm run fix:assignment-grades (from backend/)

import { PrismaClient } from '@prisma/client';
import { normalizeGrade } from '../src/common/utils/grade.util';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.assignment.findMany({
    select: { id: true, title: true, schoolId: true, grade: true },
  });

  let fixedAssignments = 0;
  for (const assignment of assignments) {
    const normalized = normalizeGrade(assignment.grade);
    if (!normalized || normalized === assignment.grade) continue;

    await prisma.assignment.update({ where: { id: assignment.id }, data: { grade: normalized } });
    fixedAssignments += 1;
    console.log(
      `Fixed assignment #${assignment.id} "${assignment.title}" (school ${assignment.schoolId}): "${assignment.grade}" -> "${normalized}"`,
    );
  }
  console.log(`Assignments: ${fixedAssignments} of ${assignments.length} had their grade normalized.`);

  const labs = await prisma.lab.findMany({
    select: { id: true, title: true, grade: true },
  });

  let fixedLabs = 0;
  for (const lab of labs) {
    const normalized = normalizeGrade(lab.grade);
    if (!normalized || normalized === lab.grade) continue;

    await prisma.lab.update({ where: { id: lab.id }, data: { grade: normalized } });
    fixedLabs += 1;
    console.log(`Fixed lab #${lab.id} "${lab.title}": "${lab.grade}" -> "${normalized}"`);
  }
  console.log(`Labs: ${fixedLabs} of ${labs.length} had their grade normalized.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
