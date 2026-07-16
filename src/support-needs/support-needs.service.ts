import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitSupportAssessmentDto } from './dto/submit-support-assessment.dto';
import { CreateSupportInstitutionDto } from './dto/create-support-institution.dto';
import { UpdateSupportInstitutionDto } from './dto/update-support-institution.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';

// Human-readable labels — used both by the recommendation text below and
// available to the frontend via the institution/category browse endpoints
// so labels stay in exactly one place.
const CATEGORY_LABELS: Record<string, string> = {
  VISUAL_IMPAIRMENT: 'Visual impairment',
  HEARING_IMPAIRMENT: 'Hearing impairment',
  PHYSICAL_DISABILITY: 'Physical disability',
  INTELLECTUAL_DEVELOPMENTAL: 'Intellectual / developmental disability',
  AUTISM_SPECTRUM: 'Autism spectrum',
  MULTIPLE_DEAFBLIND: 'Multiple disabilities / deafblindness',
  OTHER_UNSURE: 'Not sure / another need',
};

/**
 * Builds the "recommended action" checklist for a support assessment
 * result. This is intentionally rule-based and transparent (no ML/black
 * box) — every family reading the result should be able to see exactly why
 * each suggestion is there. The single most important rule is the first
 * one: nothing here replaces a real Educational Assessment and Resource
 * Centre (EARC) evaluation, and the tool says so before anything else.
 */
function buildRecommendedActions(input: {
  category: string;
  supportLevel: string;
  hasFormalAssessment: boolean;
}): string[] {
  const actions: string[] = [];

  if (!input.hasFormalAssessment) {
    actions.push(
      'Book a free functional assessment at your nearest Educational Assessment and Resource Centre (EARC) — ask at your Sub-County Education Office. This is the official first step in Kenya and confirms the right placement and support before you commit to a school.',
    );
  } else {
    actions.push(
      'Bring your existing EARC assessment report when you contact or visit any school below — it speeds up admission and makes sure the school understands the support already recommended.',
    );
  }

  actions.push('Gather any existing medical, therapy, or previous school reports to bring to the assessment or a shortlisted institution.');

  const categoryActions: Record<string, string[]> = {
    VISUAL_IMPAIRMENT: [
      'Ask shortlisted schools whether they teach Braille and orientation & mobility skills, and whether textbooks are available in Braille or audio format.',
    ],
    HEARING_IMPAIRMENT: [
      'Ask whether the school uses Kenyan Sign Language (KSL) for instruction, and whether hearing aid/assistive listening support is available on site.',
    ],
    PHYSICAL_DISABILITY: [
      'Check the physical accessibility of the campus (ramps, accessible toilets, dormitory access) and whether physiotherapy is available on site.',
      'Contact the Association for the Physically Disabled of Kenya (APDK) about mobility aids, appliances, and their vocational training programs.',
    ],
    INTELLECTUAL_DEVELOPMENTAL: [
      'Ask about individualized education plans (IEPs), class sizes, and staff-to-student ratios — these matter more than the school\'s name.',
    ],
    AUTISM_SPECTRUM: [
      'Ask about sensory-friendly classroom setups, occupational therapy availability, and how the school handles transitions and routines.',
    ],
    MULTIPLE_DEAFBLIND: [
      'This is a specialized area with very few dedicated schools in Kenya — start with KISE\'s Assessment and Research Centre, which can refer you to the right specialist support.',
    ],
    OTHER_UNSURE: [
      'An EARC assessment (see above) is the best way to find out which category of support actually fits — it\'s free and it\'s exactly what it\'s there for.',
    ],
  };
  actions.push(...(categoryActions[input.category] ?? []));

  if (input.supportLevel === 'SIGNIFICANT_INTENSIVE_SUPPORT') {
    actions.push('Ask any shortlisted school directly about their staff-to-student ratio and on-site therapy/nursing support — for intensive support needs, this matters as much as the school\'s reputation.');
  }

  actions.push('Where possible, visit 2-3 shortlisted institutions in person and talk to current parents about their experience before deciding.');
  actions.push('Ask about bursary and fee support — NG-CDF (National Government Constituency Development Fund) and County bursary schemes often prioritize learners with disabilities.');

  return actions;
}

@Injectable()
export class SupportNeedsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Institution catalog — platform-wide, read by everyone, written only by
  // PLATFORM_ADMIN. Day-to-day content changes are expected to go through
  // prisma/seed-support-institutions-data.ts; these write endpoints exist
  // for one-off corrections (a phone number changes, a new school is found)
  // without a full reseed/redeploy.
  // ==========================================================================

  async findAllInstitutions(filters: { type?: string; category?: string } = {}) {
    const institutions = await this.prisma.supportInstitution.findMany({
      where: { isPublished: true, type: filters.type as any },
      orderBy: { order: 'asc' },
    });
    // categories is a JSON array column — filtering it in JS (rather than
    // via Prisma's `array_contains` JSON filter, whose exact syntax has
    // shifted across Prisma versions) keeps this correct regardless of
    // which Prisma Client version generated the schema.
    if (!filters.category) return institutions;
    return institutions.filter((inst) => ((inst.categories as string[]) ?? []).includes(filters.category as string));
  }

  async createInstitution(dto: CreateSupportInstitutionDto) {
    return this.prisma.supportInstitution.create({
      data: {
        key: dto.key,
        name: dto.name,
        type: dto.type as any,
        categories: dto.categories as any,
        county: dto.county,
        town: dto.town,
        boardingType: dto.boardingType,
        ageRange: dto.ageRange,
        description: dto.description,
        servicesOffered: dto.servicesOffered as any,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        website: dto.website,
        sourceNote: dto.sourceNote,
        order: dto.order ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async updateInstitution(id: number, dto: UpdateSupportInstitutionDto) {
    const existing = await this.prisma.supportInstitution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Institution not found');

    return this.prisma.supportInstitution.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        categories: dto.categories as any,
        county: dto.county,
        town: dto.town,
        boardingType: dto.boardingType,
        ageRange: dto.ageRange,
        description: dto.description,
        servicesOffered: dto.servicesOffered as any,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        website: dto.website,
        sourceNote: dto.sourceNote,
        order: dto.order,
        isPublished: dto.isPublished,
      },
    });
  }

  // ==========================================================================
  // Student assessments — history-preserving (same isActive-flip pattern as
  // StudentPathwaySelection): submitting a new intake deactivates the
  // previous one rather than overwriting it, so a teacher/parent can see
  // how things evolved over time.
  // ==========================================================================

  async submitAssessment(dto: SubmitSupportAssessmentDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.studentSupportAssessment.updateMany({
        where: { studentId: actor.id, isActive: true },
        data: { isActive: false },
      });

      return tx.studentSupportAssessment.create({
        data: {
          schoolId: actor.schoolId,
          studentId: actor.id,
          category: dto.category as any,
          supportLevel: dto.supportLevel as any,
          hasFormalAssessment: dto.hasFormalAssessment,
          currentChallenges: dto.currentChallenges,
          interests: dto.interests as any,
          notes: dto.notes,
        },
      });
    });
  }

  /**
   * Attaches the computed recommendation (actions + matched institutions)
   * to an assessment row — kept as a plain object spread rather than a
   * persisted column so institution catalog updates (a school's contact
   * details change, a new one is added) are reflected immediately on every
   * existing assessment without needing to resubmit anything.
   */
  private async withRecommendation(assessment: any) {
    if (!assessment) return assessment;
    const institutions = await this.prisma.supportInstitution.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
    });
    const matched = institutions.filter((inst) => {
      const categories = (inst.categories as string[]) ?? [];
      return categories.includes(assessment.category);
    });

    return {
      ...assessment,
      categoryLabel: CATEGORY_LABELS[assessment.category] ?? assessment.category,
      recommendation: {
        actions: buildRecommendedActions({
          category: assessment.category,
          supportLevel: assessment.supportLevel,
          hasFormalAssessment: assessment.hasFormalAssessment,
        }),
        institutions: matched,
      },
    };
  }

  /**
   * STUDENT: their own current assessment (with recommendation) + full
   * history. TEACHER/SCHOOL_ADMIN/PLATFORM_ADMIN: same shape for any
   * student in scope — powers both the student's own results view and a
   * teacher/parent-facing summary.
   */
  async getStudentSummary(studentId: number, actor: AuthenticatedUser) {
    if (actor.role === Role.STUDENT && studentId !== actor.id) {
      throw new ForbiddenException('You can only view your own assessment');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true, schoolId: true, school: { select: { name: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (actor.role !== Role.STUDENT && actor.role !== Role.PLATFORM_ADMIN && student.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    const history = await this.prisma.studentSupportAssessment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    const current = history.find((h) => h.isActive) ?? null;

    return {
      student,
      current: current ? await this.withRecommendation(current) : null,
      history,
    };
  }

  /**
   * TEACHER/SCHOOL_ADMIN/PLATFORM_ADMIN listing — current assessments for
   * their school (or a specific school, for PLATFORM_ADMIN), optionally
   * filtered by grade or disability category, for the teacher-dashboard
   * table view.
   */
  findAssessments(actor: AuthenticatedUser, filters: { schoolId?: number; grade?: string; category?: string } = {}) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? filters.schoolId : actor.schoolId;

    return this.prisma.studentSupportAssessment.findMany({
      where: {
        schoolId: targetSchoolId,
        isActive: true,
        category: filters.category as any,
        student: filters.grade ? { grade: filters.grade } : undefined,
      },
      include: {
        student: { select: { id: true, name: true, grade: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================================================
  // Aggregated stats for teacher/admin dashboards.
  // ==========================================================================
  async getStats(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;

    const active = await this.prisma.studentSupportAssessment.findMany({
      where: { schoolId: targetSchoolId, isActive: true },
    });

    const byCategory = new Map<string, { category: string; label: string; count: number }>();
    let awaitingFormalAssessment = 0;

    for (const a of active) {
      const entry = byCategory.get(a.category) ?? {
        category: a.category,
        label: CATEGORY_LABELS[a.category] ?? a.category,
        count: 0,
      };
      entry.count += 1;
      byCategory.set(a.category, entry);
      if (!a.hasFormalAssessment) awaitingFormalAssessment += 1;
    }

    return {
      totalAssessments: active.length,
      awaitingFormalAssessment,
      byCategory: [...byCategory.values()].sort((a, b) => b.count - a.count),
    };
  }
}
