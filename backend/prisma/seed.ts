import {
  AssignmentType,
  PrismaClient,
  QuestionType,
  Role,
  SkillContentStatus,
  SkillLevel,
  SubscriptionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LAB_CATALOG } from './seed-labs-data';
import { STEM_CATEGORY_CATALOG } from './seed-stem-taxonomy-data';
import { CSL_ACTIVITY_CATALOG } from './seed-csl-data';
import { PATHWAY_CATALOG } from './seed-pathways-data';
import { SUPPORT_INSTITUTION_CATALOG } from './seed-support-institutions-data';
import { CBC_SKILL_CATALOG } from './seed-skills-data';
import { seedMbaleAcademicResults } from './seed-mbale-results';

// Senior School lab keys are formatted "ss-<subject>-10-<n>" — the source
// curriculum table didn't distinguish which of Grades 10/11/12 each lab
// belongs to (see comment in seed-labs-data.ts). Rather than leaving all 36
// of them stacked on Grade 10 (and Grade 11/12 students seeing an empty
// catalog), spread each subject's labs evenly across Grades 10/11/12 by
// cycling on the trailing lab number. Non-senior keys are left untouched.
function resolveLabGrade(lab: { key: string; grade: string }): string {
  const match = /^ss-[a-z]+-10-(\d+)$/.exec(lab.key);
  if (!match) return lab.grade;

  const n = Number(match[1]);
  const gradeByIndex = ['Grade 10', 'Grade 11', 'Grade 12'];
  return gradeByIndex[(n - 1) % gradeByIndex.length];
}

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

  // Optional school-tenant smoke-test account. Production requires an
  // explicit flag and secret PIN so a usable credential is never committed
  // to source control. This is a regular school learner: independent-student
  // Till/payment checks do not apply.
  const seedMbaleDemo = process.env.SEED_MBALE_DEMO === 'true';
  if (seedMbaleDemo) {
    const mbaleStudentPin = process.env.SEED_MBALE_STUDENT_PIN?.trim();
    const mbaleTeacherPassword = process.env.SEED_MBALE_TEACHER_PASSWORD?.trim();
    if (!mbaleStudentPin || !/^\d{4,8}$/.test(mbaleStudentPin)) {
      throw new Error('SEED_MBALE_STUDENT_PIN must contain 4 to 8 digits when SEED_MBALE_DEMO=true');
    }
    if (!mbaleTeacherPassword || mbaleTeacherPassword.length < 8) {
      throw new Error('SEED_MBALE_TEACHER_PASSWORD must contain at least 8 characters when SEED_MBALE_DEMO=true');
    }

    const mbaleSchool = await prisma.school.upsert({
      where: { code: 'MBALE' },
      update: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      create: {
        name: 'Mbale School',
        code: 'MBALE',
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });

    const mbalePinHash = await bcrypt.hash(mbaleStudentPin, 12);
    const mbaleTeacherPasswordHash = await bcrypt.hash(mbaleTeacherPassword, 12);
    const mbaleMathTeacher = await prisma.user.upsert({
      where: {
        schoolId_email: {
          schoolId: mbaleSchool.id,
          email: 'math@mbale.school',
        },
      },
      update: {
        name: 'Ken Mathematics Teacher',
        role: Role.TEACHER,
        passwordHash: mbaleTeacherPasswordHash,
        subject: 'Mathematics',
        assignedClass: 'Grade 7 A',
        isActive: true,
      },
      create: {
        schoolId: mbaleSchool.id,
        name: 'Ken Mathematics Teacher',
        role: Role.TEACHER,
        email: 'math@mbale.school',
        passwordHash: mbaleTeacherPasswordHash,
        subject: 'Mathematics',
        assignedClass: 'Grade 7 A',
        isActive: true,
      },
    });

    const mbaleStudent = await prisma.user.upsert({
      where: {
        schoolId_admissionNumber: {
          schoolId: mbaleSchool.id,
          admissionNumber: 'MBA001',
        },
      },
      update: {
        name: 'Mbale Test Student',
        grade: 'Grade 7',
        passwordHash: mbalePinHash,
        isActive: true,
        subscriptionExpiresAt: null,
      },
      create: {
        schoolId: mbaleSchool.id,
        name: 'Mbale Test Student',
        role: Role.STUDENT,
        admissionNumber: 'MBA001',
        grade: 'Grade 7',
        passwordHash: mbalePinHash,
        isActive: true,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: mbaleStudent.id },
      update: {
        admissionNumber: 'MBA001',
        grade: 'Grade 7',
        className: 'Grade 7',
        stream: 'A',
      },
      create: {
        userId: mbaleStudent.id,
        admissionNumber: 'MBA001',
        grade: 'Grade 7',
        className: 'Grade 7',
        stream: 'A',
      },
    });

    const mbaleAssignment = await prisma.assignment.findFirst({
      where: {
        schoolId: mbaleSchool.id,
        title: 'Mbale Mathematics Readiness Check',
      },
    });
    if (!mbaleAssignment) {
      await prisma.assignment.create({
        data: {
          schoolId: mbaleSchool.id,
          title: 'Mbale Mathematics Readiness Check',
          description: 'A short mobile-ready assessment for verifying the school learner experience.',
          subject: 'Mathematics',
          grade: 'Grade 7',
          type: AssignmentType.AUTO_MARKED,
          maxPoints: 20,
          isPublished: true,
          createdById: mbaleMathTeacher.id,
          questions: {
            create: [
              {
                questionText: 'What is 1/2 + 1/4?',
                questionType: QuestionType.MULTIPLE_CHOICE,
                options: ['1/4', '2/4', '3/4', '1'],
                correctAnswer: '3/4',
                points: 5,
                order: 0,
              },
              {
                questionText: 'A triangle has three sides.',
                questionType: QuestionType.TRUE_FALSE,
                options: ['True', 'False'],
                correctAnswer: 'True',
                points: 5,
                order: 1,
              },
              {
                questionText: 'Calculate 3 x 4.',
                questionType: QuestionType.NUMERIC,
                correctAnswer: '12',
                config: { numeric: { acceptedValue: 12, tolerance: 0 } },
                points: 5,
                order: 2,
              },
              {
                questionText: 'Which number is a prime number?',
                questionType: QuestionType.MULTIPLE_CHOICE,
                options: ['9', '12', '13', '15'],
                correctAnswer: '13',
                points: 5,
                order: 3,
              },
            ],
          },
        },
      });
    } else if (mbaleAssignment.createdById !== mbaleMathTeacher.id) {
      await prisma.assignment.update({
        where: { id: mbaleAssignment.id },
        data: { createdById: mbaleMathTeacher.id },
      });
    }

    await seedMbaleAcademicResults(prisma, {
      schoolId: mbaleSchool.id,
      studentId: mbaleStudent.id,
      teacherId: mbaleMathTeacher.id,
    });
  }

  // STEM category/subject taxonomy — platform-wide, upserted by key. These
  // were previously never seeded (no create endpoint existed either), which
  // is why the STEM Labs page showed 0 categories/subjects for every grade
  // regardless of how much lab content existed. Subject names intentionally
  // match the `subject` strings already used in LAB_CATALOG below, so
  // existing labs become browsable as soon as this runs.
  let stemCategoriesCreated = 0;
  let stemSubjectsCreated = 0;
  for (const category of STEM_CATEGORY_CATALOG) {
    const existingCategory = await prisma.stemCategory.findUnique({ where: { key: category.key } });
    const savedCategory = await prisma.stemCategory.upsert({
      where: { key: category.key },
      update: {},
      create: {
        key: category.key,
        name: category.name,
        description: category.description,
      },
    });
    if (!existingCategory) stemCategoriesCreated++;

    for (const subject of category.subjects) {
      const existingSubject = await prisma.stemSubject.findUnique({ where: { key: subject.key } });
      await prisma.stemSubject.upsert({
        where: { key: subject.key },
        update: {},
        create: {
          categoryId: savedCategory.id,
          key: subject.key,
          name: subject.name,
          description: subject.description,
        },
      });
      if (!existingSubject) stemSubjectsCreated++;
    }
  }

  // STEM Labs catalog — platform-wide, not tied to demoSchool. Upserted by
  // key so re-running the seed never duplicates labs or their questions
  // (`update` only re-syncs `grade`, so a reseed can correct grade
  // assignment drift — see resolveLabGrade above — without touching any
  // other field a Platform Admin may have edited via STEM Studio since).
  let labsCreated = 0;
  for (const lab of LAB_CATALOG) {
    const existingLab = await prisma.lab.findUnique({ where: { key: lab.key } });
    const grade = resolveLabGrade(lab);
    await prisma.lab.upsert({
      where: { key: lab.key },
      update: { grade },
      create: {
        key: lab.key,
        title: lab.title,
        subject: lab.subject,
        grade,
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
  if (seedMbaleDemo) {
    console.log('Mbale school login: /school/MBALE/login');
    console.log('Mbale test learner: MBA001 (PIN supplied via SEED_MBALE_STUDENT_PIN)');
    console.log('Mbale Mathematics teacher: math@mbale.school (password supplied via SEED_MBALE_TEACHER_PASSWORD)');
  }

  const skillProvider = await prisma.skillProvider.upsert({
    where: { name: 'Assignment Hub Learning Studio' },
    update: { verified: true, status: SkillContentStatus.PUBLISHED },
    create: {
      name: 'Assignment Hub Learning Studio',
      description: 'Platform-owned practical skills for CBC learners.',
      verified: true,
      status: SkillContentStatus.PUBLISHED,
    },
  });
  let skillCoursesCreated = 0;
  for (const [categoryIndex, entry] of CBC_SKILL_CATALOG.entries()) {
    const category = await prisma.skillCategory.upsert({
      where: { name: entry.category },
      update: {
        description: entry.description,
        displayOrder: categoryIndex,
        status: SkillContentStatus.PUBLISHED,
      },
      create: {
        name: entry.category,
        description: entry.description,
        displayOrder: categoryIndex,
        status: SkillContentStatus.PUBLISHED,
      },
    });
    for (const course of entry.courses) {
      const existing = await prisma.skillCourse.findFirst({
        where: { providerId: skillProvider.id, title: course.title },
      });
      const data = {
        categoryId: category.id,
        providerId: skillProvider.id,
        title: course.title,
        shortDescription: course.shortDescription,
        fullDescription: course.shortDescription,
        durationWeeks: course.durationWeeks,
        level: SkillLevel.BEGINNER,
        costKES: 0,
        certificateAvailable: false,
        learningOutcomes: [...course.outcomes],
        courseStructure: course.outcomes.map((outcome, index) => ({
          order: index + 1,
          title: outcome,
          type: 'PRACTICAL',
        })),
        status: SkillContentStatus.PUBLISHED,
      };
      if (existing) {
        await prisma.skillCourse.update({ where: { id: existing.id }, data });
      } else {
        await prisma.skillCourse.create({ data });
        skillCoursesCreated++;
      }
    }
  }
  console.log(
    `STEM taxonomy: ${stemCategoriesCreated} new categories / ${STEM_CATEGORY_CATALOG.length} total, ${stemSubjectsCreated} new subjects`,
  );
  console.log(`STEM Labs catalog: ${labsCreated} new / ${LAB_CATALOG.length} total (upserted by key, grades resynced)`);
  console.log('Pilot lab with video + quiz: "demo-volcano-1" (Grade 7) — try it as the demo student');
  console.log(`CSL activity catalog: ${cslCreated} new / ${CSL_ACTIVITY_CATALOG.length} total (upserted by key)`);
  console.log('Required Grade 7 CSL activity: "grade7-environmental-cleaning" — try submitting evidence as the demo student');
  console.log(
    `Career Pathways catalog: ${pathwaysCreated} new pathways / ${PATHWAY_CATALOG.length} total, ${tracksCreated} new tracks (upserted by key)`,
  );
  console.log(
    `Support Institution catalog: ${institutionsCreated} new / ${SUPPORT_INSTITUTION_CATALOG.length} total (upserted by key)`,
  );
  console.log(`CBC skills catalog: ${skillCoursesCreated} new platform courses`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
