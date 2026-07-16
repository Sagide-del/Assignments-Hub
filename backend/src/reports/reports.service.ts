import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { SubmissionStatus, SubscriptionStatus } from '@prisma/client';

// Subscription rows created via PaymentService.activateSubscription() store
// the actual amountKES charged (a snapshot of student count x tier rate at
// the time), so revenue is a straight sum of that — not a plan-name lookup.
// Rows predating this pricing model (or created manually with no payment,
// e.g. the seeded demo trial) have amountKES === null and contribute 0.

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves which school's data to report on, enforcing tenant isolation. */
  private resolveSchoolId(actor: AuthenticatedUser, schoolId?: number): number | undefined {
    if (actor.role === Role.PLATFORM_ADMIN) return schoolId; // undefined = platform-wide
    return actor.schoolId;
  }

  async usersReport(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = this.resolveSchoolId(actor, schoolId);
    const generatedAt = new Date().toISOString();

    if (targetSchoolId) {
      const school = await this.getSchoolOrThrow(targetSchoolId);
      const users = await this.prisma.user.findMany({
        where: { schoolId: targetSchoolId },
        select: { id: true, name: true, role: true, email: true, admissionNumber: true, grade: true, isActive: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
      const teachers = users.filter((u) => u.role === Role.TEACHER);
      const students = users.filter((u) => u.role === Role.STUDENT);
      const admins = users.filter((u) => u.role === Role.SCHOOL_ADMIN);

      return {
        type: 'users',
        generatedAt,
        school: { id: school.id, name: school.name, code: school.code, logoUrl: school.logoUrl },
        counts: { total: users.length, teachers: teachers.length, students: students.length, admins: admins.length },
        users,
      };
    }

    // Platform-wide: one row per school, no per-user PII dump.
    const schools = await this.prisma.school.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    const perSchoolCounts = await Promise.all(
      schools.map(async (school) => {
        const [teachers, students, admins] = await Promise.all([
          this.prisma.user.count({ where: { schoolId: school.id, role: Role.TEACHER } }),
          this.prisma.user.count({ where: { schoolId: school.id, role: Role.STUDENT } }),
          this.prisma.user.count({ where: { schoolId: school.id, role: Role.SCHOOL_ADMIN } }),
        ]);
        return {
          school: { id: school.id, name: school.name, code: school.code },
          counts: { total: school._count.users, teachers, students, admins },
        };
      }),
    );

    return {
      type: 'users',
      generatedAt,
      scope: 'platform',
      schools: perSchoolCounts,
      totals: perSchoolCounts.reduce(
        (acc, s) => ({
          total: acc.total + s.counts.total,
          teachers: acc.teachers + s.counts.teachers,
          students: acc.students + s.counts.students,
          admins: acc.admins + s.counts.admins,
        }),
        { total: 0, teachers: 0, students: 0, admins: 0 },
      ),
    };
  }

  async assignmentsReport(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = this.resolveSchoolId(actor, schoolId);
    const generatedAt = new Date().toISOString();

    const where = targetSchoolId ? { schoolId: targetSchoolId } : undefined;
    const assignments = await this.prisma.assignment.findMany({
      where,
      include: { submissions: { select: { score: true, completedAt: true } }, school: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = assignments.map((a) => {
      const submitted = a.submissions.filter((s) => s.completedAt);
      const graded = a.submissions.filter((s) => s.score != null);
      const avgScore =
        graded.length > 0 ? Math.round((graded.reduce((sum, s) => sum + (s.score ?? 0), 0) / graded.length) * 10) / 10 : null;
      return {
        id: a.id,
        title: a.title,
        subject: a.subject,
        grade: a.grade,
        type: a.type,
        school: targetSchoolId ? undefined : a.school,
        submittedCount: submitted.length,
        gradedCount: graded.length,
        averageScore: avgScore,
        createdAt: a.createdAt,
      };
    });

    return {
      type: 'assignments',
      generatedAt,
      scope: targetSchoolId ? 'school' : 'platform',
      totalAssignments: rows.length,
      totalSubmissions: rows.reduce((sum, r) => sum + r.submittedCount, 0),
      assignments: rows,
    };
  }

  async labsReport(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = this.resolveSchoolId(actor, schoolId);
    const generatedAt = new Date().toISOString();

    const where = targetSchoolId ? { schoolId: targetSchoolId } : undefined;
    const sessions = await this.prisma.labSession.findMany({
      where,
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { completedAt: 'desc' },
    });

    const byLab = new Map<string, number>();
    for (const s of sessions) {
      byLab.set(s.labKey, (byLab.get(s.labKey) ?? 0) + 1);
    }

    // Only sessions with a quiz (maxScore set — see LabSessionsService) count
    // toward the average; labs with no quiz questions have score/maxScore null.
    const quizzed = sessions.filter((s) => s.maxScore != null && s.maxScore > 0);
    const averageQuizPercent =
      quizzed.length > 0
        ? Math.round(
            (quizzed.reduce((sum, s) => sum + (s.score ?? 0) / (s.maxScore as number), 0) / quizzed.length) * 1000,
          ) / 10
        : null;

    return {
      type: 'labs',
      generatedAt,
      scope: targetSchoolId ? 'school' : 'platform',
      totalCompletions: sessions.length,
      quizzedCompletions: quizzed.length,
      averageQuizPercent,
      byLab: Array.from(byLab.entries()).map(([labKey, count]) => ({ labKey, count })),
      recent: sessions.slice(0, 50).map((s) => ({
        student: s.student.name,
        grade: s.student.grade,
        labKey: s.labKey,
        competency: s.competency,
        completedAt: s.completedAt,
        score: s.score,
        maxScore: s.maxScore,
      })),
    };
  }

  async financialReport(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = this.resolveSchoolId(actor, schoolId);
    const generatedAt = new Date().toISOString();

    const where = targetSchoolId ? { schoolId: targetSchoolId } : undefined;
    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: { school: { select: { id: true, name: true, code: true } } },
      orderBy: { startedAt: 'desc' },
    });

    const activeSubs = subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE);
    const estimatedMonthlyRevenueKES = activeSubs.reduce((sum, s) => sum + (s.amountKES ?? 0), 0);

    const schoolsBySubscriptionStatus = subscriptions.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      type: 'financial',
      generatedAt,
      scope: targetSchoolId ? 'school' : 'platform',
      note: 'Revenue sums the amountKES recorded on each active subscription at the time it was activated (student count x tier rate). Older/manually-created rows with no recorded amount contribute 0.',
      estimatedMonthlyRevenueKES,
      activeSubscriptions: activeSubs.length,
      totalSubscriptionRecords: subscriptions.length,
      byStatus: schoolsBySubscriptionStatus,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        school: targetSchoolId ? undefined : s.school,
        plan: s.plan,
        amountKES: s.amountKES,
        studentCount: s.studentCount,
        schoolType: s.schoolType,
        status: s.status,
        startedAt: s.startedAt,
        expiresAt: s.expiresAt,
      })),
    };
  }

  /** The actual "report card" — one student's assignment grades, printable with the school logo. */
  async studentReportCard(actor: AuthenticatedUser, studentId: number) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { school: { select: { id: true, name: true, code: true, logoUrl: true } } },
    });
    if (!student || student.role !== Role.STUDENT) throw new NotFoundException('Student not found');

    this.assertCanViewStudent(student.schoolId, studentId, actor);

    const submissions = await this.prisma.submission.findMany({
      // Excludes DRAFT — an in-progress, not-yet-submitted exam shouldn't
      // appear on a report card or count toward submittedCount below.
      where: { studentId, status: { not: SubmissionStatus.DRAFT } },
      include: { assignment: { select: { title: true, subject: true, grade: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const graded = submissions.filter((s) => s.score != null);
    const average = graded.length > 0 ? Math.round((graded.reduce((sum, s) => sum + (s.score ?? 0), 0) / graded.length) * 10) / 10 : null;

    const labSessions = await this.prisma.labSession.findMany({
      where: { studentId },
      orderBy: { completedAt: 'desc' },
    });

    // LabSession.labKey is a loose reference to Lab.key, not a DB foreign
    // key (see schema.prisma), so titles are resolved with a separate
    // lookup rather than an `include`.
    const labKeys = Array.from(new Set(labSessions.map((s) => s.labKey)));
    const labs = labKeys.length
      ? await this.prisma.lab.findMany({
          where: { key: { in: labKeys } },
          select: { key: true, title: true, subject: true },
        })
      : [];
    const labByKey = new Map(labs.map((l) => [l.key, l]));

    // Only sessions with a quiz (maxScore set — see LabSessionsService.create)
    // count toward the average; a lab with no quiz questions leaves score/
    // maxScore null and isn't held against the student.
    const quizzedLabs = labSessions.filter((s) => s.maxScore != null && s.maxScore > 0);
    const averageLabQuizPercent =
      quizzedLabs.length > 0
        ? Math.round(
            (quizzedLabs.reduce((sum, s) => sum + (s.score ?? 0) / (s.maxScore as number), 0) / quizzedLabs.length) *
              1000,
          ) / 10
        : null;

    // CSL — Community Service Learning. Scored submissions count toward the
    // average the same way lab quizzes do; required activities for the
    // student's grade with no APPROVED submission are surfaced separately
    // so the report card shows what's still outstanding, not just what's
    // been done (see CslActivitiesService/CslSubmissionsService).
    const cslSubmissions = await this.prisma.cslSubmission.findMany({
      where: { studentId },
      include: { cslActivity: { select: { title: true, isRequired: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const scoredCsl = cslSubmissions.filter((s) => s.maxScore != null && s.maxScore > 0);
    const averageCslPercent =
      scoredCsl.length > 0
        ? Math.round(
            (scoredCsl.reduce((sum, s) => sum + (s.score ?? 0) / (s.maxScore as number), 0) / scoredCsl.length) *
              1000,
          ) / 10
        : null;

    const requiredActivities = student.grade
      ? await this.prisma.cslActivity.findMany({
          where: { grade: student.grade, isRequired: true, isPublished: true },
          select: { id: true, title: true },
        })
      : [];
    const approvedActivityIds = new Set(
      cslSubmissions.filter((s) => s.status === 'APPROVED').map((s) => s.cslActivityId),
    );
    const cslOutstanding = requiredActivities
      .filter((a) => !approvedActivityIds.has(a.id))
      .map((a) => a.title);

    return {
      type: 'student-report-card',
      generatedAt: new Date().toISOString(),
      school: student.school,
      student: { id: student.id, name: student.name, grade: student.grade, admissionNumber: student.admissionNumber },
      averageScore: average,
      gradedCount: graded.length,
      submittedCount: submissions.length,
      labsCompleted: labSessions.length,
      averageLabQuizPercent,
      averageCslPercent,
      cslOutstanding,
      submissions: submissions.map((s) => ({
        title: s.assignment.title,
        subject: s.assignment.subject,
        grade: s.assignment.grade,
        type: s.assignment.type,
        score: s.score,
        completedAt: s.completedAt,
      })),
      labs: labSessions.map((s) => ({
        title: labByKey.get(s.labKey)?.title ?? s.labKey,
        subject: labByKey.get(s.labKey)?.subject,
        competency: s.competency,
        score: s.score,
        maxScore: s.maxScore,
        completedAt: s.completedAt,
      })),
      csl: cslSubmissions.map((s) => ({
        title: s.cslActivity.title,
        isRequired: s.cslActivity.isRequired,
        status: s.status,
        score: s.score,
        maxScore: s.maxScore,
        feedback: s.feedback,
        submittedAt: s.createdAt,
        reviewedAt: s.reviewedAt,
      })),
    };
  }

  private async getSchoolOrThrow(id: number) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  private assertCanViewStudent(studentSchoolId: number, studentId: number, actor: AuthenticatedUser) {
    if (actor.role === Role.PLATFORM_ADMIN) return;
    if (actor.role === Role.STUDENT) {
      if (actor.id !== studentId) throw new ForbiddenException('You can only view your own report card');
      return;
    }
    // Teacher / School Admin — must be the same school as the student.
    if (actor.schoolId !== studentSchoolId) {
      throw new ForbiddenException("You cannot access another school's data");
    }
  }
}
