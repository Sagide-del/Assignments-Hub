import { PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LAB_CATALOG } from './seed-labs-data';
import { CSL_ACTIVITY_CATALOG } from './seed-csl-data';
import { PATHWAY_CATALOG } from './seed-pathways-data';
import { SUPPORT_INSTITUTION_CATALOG } from './seed-support-institutions-data';

const prisma = new PrismaClient();

async function main() {
  const platformAdminEmail =
    process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'admin@assignmentshub.co.ke';
  const platformAdminPassword =
    process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'ChangeMe123!';

  // Platform admins are not tied to a single school. We give them a home
  // "platform" school record so the schema's NOT NULL school_id still holds,
  // but TenantGuard grants PLATFORM_ADMIN cross-tenant access regardless.
  const platformSchool = await prisma.school.upsert({
    where: { code: 'PLATFORM' },
    update: {},
    create: {
      name: 'Platform',
      code: 'PLATFORM',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });

  const passwordHash = await bcrypt.hash(platformAdminPassword, 12);

  const platformAdmin = await prisma.user.upsert({
    where: {
      schoolId_email: { schoolId: platformSchool.id, email: platformAdminEmail },
    },
    update: {},
    create: {
      schoolId: platformSchool.id,
      name: 'Platform Administrator',
      role: Role.PLATFORM_ADMIN,
      email: platformAdminEmail,
      passwordHash,
    },
  });

  // Demo school with a school admin, teacher and student for local testing.
  const demoSchool = await prisma.school.upsert({
    where: { code: 'DEMO01' },
    update: {},
    create: {
      name: 'Demo Junior School',
      code: 'DEMO01',
      subscriptionStatus: SubscriptionStatus.TRIAL,
    },
  });

  const demoAdminPasswordHash = await bcrypt.hash('DemoAdmin123!', 12);
  await prisma.user.upsert({
    where: { schoolId_email: { schoolId: demoSchool.id, email: 'admin@demo.school' } },
    update: {},
    create: {
      schoolId: demoSchool.id,
      name: 'Demo School Admin',
      role: Role.SCHOOL_ADMIN,
      email: 'admin@demo.school',
      passwordHash: demoAdminPasswordHash,
    },
  });

  const demoTeacherPasswordHash = await bcrypt.hash('DemoTeacher123!', 12);
  await prisma.user.upsert({
    where: { schoolId_email: { schoolId: demoSchool.id, email: 'teacher@demo.school' } },
    update: {},
    create: {
      schoolId: demoSchool.id,
      name: 'Demo Teacher',
      role: Role.TEACHER,
      email: 'teacher@demo.school',
      passwordHash: demoTeacherPasswordHash,
    },
  });

  await prisma.user.upsert({
    where: { schoolId_admissionNumber: { schoolId: demoSchool.id, admissionNumber: 'ADM001' } },
    update: {},
    create: {
      schoolId: demoSchool.id,
      name: 'Demo Student',
      role: Role.STUDENT,
      admissionNumber: 'ADM001',
      grade: 'Grade 7',
    },
  });

  const existingAssignment = await prisma.assignment.findFirst({
    where: { schoolId: demoSchool.id, title: 'Fractions Worksheet 1' },
  });
  if (!existingAssignment) {
    await prisma.assignment.create({
      data: {
        schoolId: demoSchool.id,
        title: 'Fractions Worksheet 1',
        subject: 'Mathematics',
        grade: 'Grade 7',
        type: 'TEACHER_MARKED',
      },
    });
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: { schoolId: demoSchool.id },
  });
  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        schoolId: demoSchool.id,
        plan: 'Junior School — Trial',
        status: SubscriptionStatus.TRIAL,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      },
    });
  }

  // STEM Labs catalog — platform-wide, not tied to demoSchool. Upserted by
  // key so re-running the seed never duplicates labs or their questions
  // (the `update: {}` below is intentionally a no-op on rerun).
  let labsCreated = 0;
  for (const lab of LAB_CATALOG) {
    const existingLab = await prisma.lab.findUnique({ where: { key: lab.key } });
    await prisma.lab.upsert({
      where: { key: lab.key },
      update: {},
      create: {
        key: lab.key,
        title: lab.title,
        subject: lab.subject,
        grade: lab.grade,
        topicArea: lab.topicArea,
        pathway: lab.pathway,
        competency: lab.competency,
        description: lab.description,
        durationMinutes: lab.durationMinutes,
        resourceUrl: lab.resourceUrl,
        guidanceSteps: lab.guidanceSteps as any,
        createdById: platformAdmin.id,
        questions: lab.questions?.length
          ? {
              create: lab.questions.map((q, index) => ({
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options as any,
                correctAnswer: q.correctAnswer,
                points: q.points ?? 10,
                order: q.order ?? index,
              })),
            }
          : undefined,
      },
    });
    if (!existingLab) labsCreated++;
  }

  // CSL activity catalog — platform-wide, upserted by key (same idempotent
  // pattern as the labs catalog above).
  let cslCreated = 0;
  for (const activity of CSL_ACTIVITY_CATALOG) {
    const existingActivity = await prisma.cslActivity.findUnique({ where: { key: activity.key } });
    await prisma.cslActivity.upsert({
      where: { key: activity.key },
      update: {},
      create: {
        key: activity.key,
        title: activity.title,
        description: activity.description,
        grade: activity.grade,
        competency: activity.competency,
        isRequired: activity.isRequired,
        targetHours: activity.targetHours,
        createdById: platformAdmin.id,
      },
    });
    if (!existingActivity) cslCreated++;
  }

  // Career Pathways catalog — platform-wide, upserted by key (pathway) and
  // by [pathwayId, key] (track), same idempotent pattern as labs/CSL above.
  let pathwaysCreated = 0;
  let tracksCreated = 0;
  for (const pathway of PATHWAY_CATALOG) {
    const existingPathway = await prisma.pathway.findUnique({ where: { key: pathway.key } });
    const pathwayRecord = await prisma.pathway.upsert({
      where: { key: pathway.key },
      update: {},
      create: {
        key: pathway.key,
        name: pathway.name,
        description: pathway.description,
        icon: pathway.icon,
        colorHex: pathway.colorHex,
        order: pathway.order,
      },
    });
    if (!existingPathway) pathwaysCreated++;

    for (const track of pathway.tracks) {
      const existingTrack = await prisma.track.findUnique({
        where: { pathwayId_key: { pathwayId: pathwayRecord.id, key: track.key } },
      });
      await prisma.track.upsert({
        where: { pathwayId_key: { pathwayId: pathwayRecord.id, key: track.key } },
        update: {},
        create: {
          pathwayId: pathwayRecord.id,
          key: track.key,
          name: track.name,
          description: track.description,
          icon: track.icon,
          order: track.order,
          requiredSubjects: track.requiredSubjects as any,
          minMeanGrade: track.minMeanGrade,
          careers: track.careers as any,
          skills: track.skills as any,
          jobOutlook: track.jobOutlook,
          jobGrowthRate: track.jobGrowthRate,
          universitiesKenya: track.universitiesKenya as any,
          universitiesIntl: track.universitiesIntl as any,
          degreeDurationYears: track.degreeDurationYears,
          interestTags: track.interestTags as any,
          nextSteps: track.nextSteps as any,
          extracurriculars: track.extracurriculars as any,
          certifications: track.certifications as any,
          workExperience: track.workExperience as any,
        },
      });
      if (!existingTrack) tracksCreated++;
    }
  }

  let institutionsCreated = 0;
  for (const inst of SUPPORT_INSTITUTION_CATALOG) {
    const existingInst = await prisma.supportInstitution.findUnique({ where: { key: inst.key } });
    await prisma.supportInstitution.upsert({
      where: { key: inst.key },
      update: {},
      create: {
        key: inst.key,
        name: inst.name,
        type: inst.type as any,
        categories: inst.categories as any,
        county: inst.county,
        town: inst.town,
        boardingType: inst.boardingType,
        ageRange: inst.ageRange,
        description: inst.description,
        servicesOffered: inst.servicesOffered as any,
        contactPhone: inst.contactPhone,
        contactEmail: inst.contactEmail,
        website: inst.website,
        sourceNote: inst.sourceNote,
        order: inst.order,
      },
    });
    if (!existingInst) institutionsCreated++;
  }

  console.log('Seed complete.');
  console.log(`Platform admin: ${platformAdminEmail} / ${platformAdminPassword}`);
  console.log('Demo school code: DEMO01');
  console.log('Demo school admin: admin@demo.school / DemoAdmin123!');
  console.log('Demo teacher: teacher@demo.school / DemoTeacher123!');
  console.log('Demo student: admission number ADM001 (Grade 7)');
  console.log('Demo assignment: "Fractions Worksheet 1" (Grade 7, Mathematics)');
  console.log(`STEM Labs catalog: ${labsCreated} new / ${LAB_CATALOG.length} total (upserted by key)`);
  console.log('Pilot lab with video + quiz: "demo-volcano-1" (Grade 7) — try it as the demo student');
  console.log(`CSL activity catalog: ${cslCreated} new / ${CSL_ACTIVITY_CATALOG.length} total (upserted by key)`);
  console.log('Required Grade 7 CSL activity: "grade7-environmental-cleaning" — try submitting evidence as the demo student');
  console.log(
    `Career Pathways catalog: ${pathwaysCreated} new pathways / ${PATHWAY_CATALOG.length} total, ${tracksCreated} new tracks (upserted by key)`,
  );
  console.log(
    `Support Institution catalog: ${institutionsCreated} new / ${SUPPORT_INSTITUTION_CATALOG.length} total (upserted by key)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
