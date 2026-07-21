import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { CreateLabMediaBatchDto } from './dto/create-lab-media-batch.dto';
import { CreateLabReflectionsBatchDto } from './dto/create-lab-reflections-batch.dto';
import { CreateLabStepsBatchDto } from './dto/create-lab-steps-batch.dto';
import { UpdateLabDto } from './dto/update-lab.dto';

@Injectable()
export class LabsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly labCmsInclude = {
    category: true,
    stemSubject: {
      include: {
        category: true,
      },
    },
    media: {
      orderBy: { order: 'asc' as const },
    },
    steps: {
      orderBy: { order: 'asc' as const },
    },
    reflectionPrompts: {
      orderBy: { order: 'asc' as const },
    },
    completionReportTemplate: true,
    questions: {
      orderBy: { order: 'asc' as const },
    },
  };

  async create(dto: CreateLabDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.lab.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException('A lab with this key already exists');

    return this.prisma.lab.create({
      data: {
        key: dto.key,
        title: dto.title,
        categoryId: dto.categoryId ?? dto.category,
        stemSubjectId: dto.stemSubjectId ?? dto.stemSubject,
        subject: dto.subject,
        grade: dto.grade,
        topicArea: dto.topicArea,
        pathway: dto.pathway,
        topic: dto.topic,
        competency: dto.competency,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        type: dto.type,
        status: dto.status,
        resourceUrl: dto.resourceUrl,
        introVideoUrl: dto.introVideoUrl,
        animationUrl: dto.animationUrl,
        voiceAudioUrl: dto.voiceAudioUrl,
        isPublished: dto.isPublished ?? true,
        guidanceSteps: dto.guidanceSteps?.length ? (dto.guidanceSteps as any) : undefined,
        createdById: actor.id,
        questions: dto.questions?.length
          ? {
              create: dto.questions.map((q, index) => ({
                questionText: q.questionText,
                questionType: q.questionType ?? QuestionType.MULTIPLE_CHOICE,
                options: q.options?.length ? (q.options as any) : undefined,
                correctAnswer: q.correctAnswer,
                points: q.points ?? 10,
                order: q.order ?? index,
              })),
            }
          : undefined,
        media: dto.media?.length
          ? {
              create: dto.media.map((item, index) => ({
                type: item.type,
                title: item.title,
                caption: item.caption,
                url: item.url,
                order: item.order ?? index,
              })),
            }
          : undefined,
        steps: dto.steps?.length
          ? {
              create: dto.steps.map((item, index) => ({
                title: item.title,
                instruction: item.instruction,
                mediaUrl: item.mediaUrl,
                interactionType: item.interactionType,
                expectedOutcome: item.expectedOutcome,
                order: item.order ?? index,
              })),
            }
          : undefined,
        reflectionPrompts: dto.reflectionPrompts?.length
          ? {
              create: dto.reflectionPrompts.map((item, index) => ({
                prompt: item.prompt,
                order: item.order ?? index,
              })),
            }
          : undefined,
        completionReportTemplate: dto.completionReportTemplate
          ? {
              create: {
                title: dto.completionReportTemplate.title,
                summary: dto.completionReportTemplate.summary,
                outcomesJson: dto.completionReportTemplate.outcomesJson as any,
              },
            }
          : undefined,
      },
      include: this.labCmsInclude,
    });
  }

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

  async findOne(id: number, actor?: AuthenticatedUser) {
    const lab = await this.prisma.lab.findUnique({
      where: { id },
      include: this.labCmsInclude,
    });
    if (!lab) throw new NotFoundException('Lab not found');

    return actor?.role === Role.STUDENT ? this.stripAnswersForStudent(lab) : lab;
  }

  async findOneCms(id: number) {
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateLabDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.media !== undefined) {
        await tx.labMedia.deleteMany({ where: { labId: id } });
      }
      if (dto.steps !== undefined) {
        await tx.labStep.deleteMany({ where: { labId: id } });
      }
      if (dto.reflectionPrompts !== undefined) {
        await tx.labReflectionPrompt.deleteMany({ where: { labId: id } });
      }

      await tx.lab.update({
        where: { id },
        data: {
          title: dto.title,
          categoryId: dto.categoryId ?? dto.category,
          stemSubjectId: dto.stemSubjectId ?? dto.stemSubject,
          subject: dto.subject,
          grade: dto.grade,
          topicArea: dto.topicArea,
          pathway: dto.pathway,
          topic: dto.topic,
          competency: dto.competency,
          description: dto.description,
          durationMinutes: dto.durationMinutes,
          type: dto.type,
          status: dto.status,
          resourceUrl: dto.resourceUrl,
          introVideoUrl: dto.introVideoUrl,
          animationUrl: dto.animationUrl,
          voiceAudioUrl: dto.voiceAudioUrl,
          isPublished: dto.isPublished,
          guidanceSteps: dto.guidanceSteps as any,
          media: dto.media?.length
            ? {
                create: dto.media.map((item, index) => ({
                  type: item.type,
                  title: item.title,
                  caption: item.caption,
                  url: item.url,
                  order: item.order ?? index,
                })),
              }
            : undefined,
          steps: dto.steps?.length
            ? {
                create: dto.steps.map((item, index) => ({
                  title: item.title,
                  instruction: item.instruction,
                  mediaUrl: item.mediaUrl,
                  interactionType: item.interactionType,
                  expectedOutcome: item.expectedOutcome,
                  order: item.order ?? index,
                })),
              }
            : undefined,
          reflectionPrompts: dto.reflectionPrompts?.length
            ? {
                create: dto.reflectionPrompts.map((item, index) => ({
                  prompt: item.prompt,
                  order: item.order ?? index,
                })),
              }
            : undefined,
          completionReportTemplate:
            dto.completionReportTemplate !== undefined
              ? {
                  upsert: {
                    create: {
                      title: dto.completionReportTemplate?.title,
                      summary: dto.completionReportTemplate?.summary,
                      outcomesJson: dto.completionReportTemplate?.outcomesJson as any,
                    },
                    update: {
                      title: dto.completionReportTemplate?.title,
                      summary: dto.completionReportTemplate?.summary,
                      outcomesJson: dto.completionReportTemplate?.outcomesJson as any,
                    },
                  },
                }
              : undefined,
        },
      });

      return tx.lab.findUniqueOrThrow({
        where: { id },
        include: this.labCmsInclude,
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.lab.delete({ where: { id } });
    return { deleted: true };
  }

  async addMedia(id: number, dto: CreateLabMediaBatchDto) {
    await this.findOne(id);

    await this.prisma.labMedia.createMany({
      data: dto.media.map((item, index) => ({
        labId: id,
        type: item.type,
        title: item.title,
        caption: item.caption,
        url: item.url,
        order: item.order ?? index,
      })),
    });

    return this.findOne(id);
  }

  async addSteps(id: number, dto: CreateLabStepsBatchDto) {
    await this.findOne(id);

    await this.prisma.labStep.createMany({
      data: dto.steps.map((item, index) => ({
        labId: id,
        title: item.title,
        instruction: item.instruction,
        mediaUrl: item.mediaUrl,
        interactionType: item.interactionType,
        expectedOutcome: item.expectedOutcome,
        order: item.order ?? index,
      })),
    });

    return this.findOne(id);
  }

  async addReflections(id: number, dto: CreateLabReflectionsBatchDto) {
    await this.findOne(id);

    await this.prisma.labReflectionPrompt.createMany({
      data: dto.reflectionPrompts.map((item, index) => ({
        labId: id,
        prompt: item.prompt,
        order: item.order ?? index,
      })),
    });

    return this.findOne(id);
  }

  private stripAnswersForStudent<T extends { questions: { correctAnswer: string | null }[] }>(lab: T): T {
    return {
      ...lab,
      questions: lab.questions.map(({ correctAnswer, ...rest }) => rest) as any,
    };
  }
}
