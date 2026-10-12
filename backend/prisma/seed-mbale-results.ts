import { AcademicResultBatchStatus, PrismaClient } from '@prisma/client';

interface MbaleAcademicFixtureTarget {
  schoolId: number;
  studentId: number;
  teacherId: number;
}

const RESULTS = [
  { subject: 'Mathematics', score: 32, gradeLabel: 'D' },
  { subject: 'Integrated Science', score: 44, gradeLabel: 'C-' },
  { subject: 'English', score: 68, gradeLabel: 'B' },
  { subject: 'Social Studies', score: 72, gradeLabel: 'B+' },
];

const TIMETABLE = [
  { day: 'Monday', startTime: '18:30', durationMinutes: 45, breakMinutes: 10, subject: 'Mathematics', topic: 'Numbers', subtopic: 'Fractions and equivalent fractions', learningTechnique: 'Worked examples', activity: 'Review examples, then complete five practice questions' },
  { day: 'Tuesday', startTime: '18:30', durationMinutes: 45, breakMinutes: 10, subject: 'Integrated Science', topic: 'Living things', subtopic: 'Cells and organization', learningTechnique: 'Active recall', activity: 'Study a diagram, close it, then label it from memory' },
  { day: 'Wednesday', startTime: '18:30', durationMinutes: 45, breakMinutes: 10, subject: 'Mathematics', topic: 'Algebra', subtopic: 'Simple expressions', learningTechnique: 'Error correction', activity: 'Retry incorrect questions and write the corrected steps' },
  { day: 'Thursday', startTime: '18:30', durationMinutes: 45, breakMinutes: 10, subject: 'Integrated Science', topic: 'Matter', subtopic: 'States and changes of state', learningTechnique: 'Spaced practice', activity: 'Use short recall rounds followed by practice questions' },
  { day: 'Friday', startTime: '18:00', durationMinutes: 45, breakMinutes: 10, subject: 'Mathematics', topic: 'Geometry', subtopic: 'Angles and triangles', learningTechnique: 'Worked examples', activity: 'Draw and solve three labelled angle problems' },
  { day: 'Saturday', startTime: '10:00', durationMinutes: 60, breakMinutes: 15, subject: 'Mathematics', topic: 'Weekly review', subtopic: 'Mixed diagnostic practice', learningTechnique: 'Retrieval practice', activity: 'Complete a timed mixed practice and review every error' },
];

const RECOMMENDATIONS = [
  { subject: 'Mathematics', currentPercentage: 32, action: 'Build fluency with worked examples before timed independent practice.', weeklySessions: 4 },
  { subject: 'Integrated Science', currentPercentage: 44, action: 'Use diagrams and active recall to strengthen key concepts.', weeklySessions: 2 },
];

export async function seedMbaleAcademicResults(prisma: PrismaClient, target: MbaleAcademicFixtureTarget) {
  let batch = await prisma.academicResultBatch.findFirst({
    where: {
      schoolId: target.schoolId,
      name: 'Mbale Grade 7 Diagnostic Results',
      academicYear: 2026,
      term: 'Term 3',
    },
  });
  if (!batch) {
    batch = await prisma.academicResultBatch.create({
      data: {
        schoolId: target.schoolId,
        uploadedById: target.teacherId,
        name: 'Mbale Grade 7 Diagnostic Results',
        academicYear: 2026,
        term: 'Term 3',
        grade: 'Grade 7',
        className: 'Grade 7',
        stream: 'A',
        fileName: 'seed-mbale-grade-7-results.xlsx',
        status: AcademicResultBatchStatus.COMPLETED,
        rowCount: RESULTS.length,
        completedAt: new Date(),
      },
    });
  }

  for (const result of RESULTS) {
    await prisma.studentAcademicResult.upsert({
      where: { batchId_studentId_subject: { batchId: batch.id, studentId: target.studentId, subject: result.subject } },
      update: { score: result.score, maxScore: 100, percentage: result.score, gradeLabel: result.gradeLabel },
      create: { schoolId: target.schoolId, batchId: batch.id, studentId: target.studentId, subject: result.subject, score: result.score, maxScore: 100, percentage: result.score, gradeLabel: result.gradeLabel },
    });
  }

  await prisma.studentStudyPlan.upsert({
    where: { studentId_periodKey: { studentId: target.studentId, periodKey: '2026-term-3' } },
    update: { generatedFromBatchId: batch.id, generatedById: target.teacherId, weakSubjects: weakSubjects(), timetable: TIMETABLE, recommendations: RECOMMENDATIONS },
    create: { schoolId: target.schoolId, studentId: target.studentId, generatedFromBatchId: batch.id, generatedById: target.teacherId, periodKey: '2026-term-3', weakSubjects: weakSubjects(), timetable: TIMETABLE, recommendations: RECOMMENDATIONS },
  });
}

function weakSubjects() {
  return [
    { subject: 'Mathematics', percentage: 32, priority: 'MEDIUM' },
    { subject: 'Integrated Science', percentage: 44, priority: 'MEDIUM' },
  ];
}

async function run() {
  const prisma = new PrismaClient();
  try {
    const school = await prisma.school.findUnique({ where: { code: 'MBALE' } });
    if (!school) throw new Error('Mbale School (code MBALE) was not found');
    const student = await prisma.user.findUnique({ where: { schoolId_admissionNumber: { schoolId: school.id, admissionNumber: 'MBA001' } } });
    if (!student) throw new Error('Mbale test learner MBA001 was not found');
    const teacher = await prisma.user.findUnique({ where: { schoolId_email: { schoolId: school.id, email: 'math@mbale.school' } } });
    if (!teacher) throw new Error('Mbale Mathematics teacher was not found');
    await seedMbaleAcademicResults(prisma, { schoolId: school.id, studentId: student.id, teacherId: teacher.id });
    console.log('Mbale diagnostic results and study plan are ready for MBA001.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
