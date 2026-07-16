import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { QuestionType } from '@prisma/client';

@Injectable()
export class LabsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLabDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.lab.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException('A lab with this key already exists');

    return this.prisma.lab.create({
      data: {
        key: dto.key,
        title: dto.title,
        subject: dto.subject,
        grade: dto.grade,
        topicArea: dto.topicArea,
        pathway: dto.pathway,
        competency: dto.competency,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        type: dto.type,
        resourceUrl: dto.resourceUrl,
        isPublished: dto.isPublished ?? true,
        guidanceSteps: dto.guidanceSteps && dto.guidanceSteps.length ? (dto.guidanceSteps as any) : undefined,
        createdById: actor.id,
        // Nested create, same pattern as AssignmentsService.create: the lab
        // and its quiz questions are written in one transaction.
        questions: dto.questions?.length
          ? {
              create: dto.questions.map((q, index) => ({
                questionText: q.questionText,
                questionType: q.questionType ?? QuestionType.MULTIPLE_CHOICE,
                options: q.options && q.options.length ? (q.options as any) : undefined,
                correctAnswer: q.correctAnswer,
                points: q.points ?? 10,
                order: q.order ?? index,
              })),
            }
          : undefined,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  /**
   * Students only see published labs for their own grade. Teachers/school
   * admins see every published lab (optionally filtered by `grade`) so they
   * can browse the whole catalog. Platform admins see everything, including
   * unpublished drafts.
   */
  findAll(actor: AuthenticatedUser, grade?: string) {
    const isStudent = actor.role === Role.STUDENT;
    const isPlatformAdmin = actor.role === Role.PLATFORM_ADMIN;

    const where = {
      ...(isPlatformAdmin ? {} : { isPublished: true }),
      ...(isStudent ? { grade: actor.grade ?? '__none__' } : grade ? { grade } : {}),
    };

    return this.prisma.lab.findMany({
      where,
      include: { _count: { select: { questions: true } } },
      orderBy: [{ grade: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * `actor` is optional so internal callers (update/remove) can fetch a lab
   * without a user in scope. Pass it from the controller whenever a student
   * might see the result — GET /labs/:id is how the frontend loads a lab's
   * quiz questions before the student takes it, so correctAnswer must never
   * reach a student's browser (see stripAnswersForStudent).
   */
  async findOne(id: number, actor?: AuthenticatedUser) {
    const lab = await this.prisma.lab.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!lab) throw new NotFoundException('Lab not found');

    return actor?.role === Role.STUDENT ? this.stripAnswersForStudent(lab) : lab;
  }

  async update(id: number, dto: UpdateLabDto) {
    await this.findOne(id);

    // Deliberately flat/scalar-only, same rule as AssignmentsService.update:
    // editing individual quiz questions after creation isn't supported in
    // this build. `key` and `questions`, if present in the DTO, are ignored
    // rather than spread into Prisma's `data` (which would error on the
    // `questions` array — it isn't valid nested-update syntax).
    return this.prisma.lab.update({
      where: { id },
      data: {
        title: dto.title,
        subject: dto.subject,
        grade: dto.grade,
        topicArea: dto.topicArea,
        pathway: dto.pathway,
        competency: dto.competency,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        type: dto.type,
        resourceUrl: dto.resourceUrl,
        isPublished: dto.isPublished,
        guidanceSteps: dto.guidanceSteps as any,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.lab.delete({ where: { id } });
    return { deleted: true };
  }

  // Removes correctAnswer from every question so students can't read it out
  // of the API response before submitting the quiz — mirrors
  // AssignmentsService.stripAnswersForStudent.
  private stripAnswersForStudent<T extends { questions: { correctAnswer: string | null }[] }>(lab: T): T {
    return {
      ...lab,
      questions: lab.questions.map(({ correctAnswer, ...rest }) => rest) as any,
    };
  }
}
