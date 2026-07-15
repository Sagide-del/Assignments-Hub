import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCslActivityDto } from './dto/create-csl-activity.dto';
import { UpdateCslActivityDto } from './dto/update-csl-activity.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';

// Mirrors LabsService — same grade-scoping and publish-visibility rules,
// just without nested quiz questions.
@Injectable()
export class CslActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCslActivityDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.cslActivity.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException('A CSL activity with this key already exists');

    return this.prisma.cslActivity.create({
      data: {
        key: dto.key,
        title: dto.title,
        description: dto.description,
        grade: dto.grade,
        competency: dto.competency,
        isRequired: dto.isRequired ?? true,
        targetHours: dto.targetHours,
        isPublished: dto.isPublished ?? true,
        createdById: actor.id,
      },
    });
  }

  /**
   * Students only see published activities for their own grade. Teachers/
   * school admins see every published activity (optionally filtered by
   * `grade`) so they know what their students are working on. Platform
   * admins see everything, including unpublished drafts.
   */
  findAll(actor: AuthenticatedUser, grade?: string) {
    const isStudent = actor.role === Role.STUDENT;
    const isPlatformAdmin = actor.role === Role.PLATFORM_ADMIN;

    const where = {
      ...(isPlatformAdmin ? {} : { isPublished: true }),
      ...(isStudent ? { grade: actor.grade ?? '__none__' } : grade ? { grade } : {}),
    };

    return this.prisma.cslActivity.findMany({
      where,
      orderBy: [{ grade: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: number) {
    const activity = await this.prisma.cslActivity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('CSL activity not found');
    return activity;
  }

  async update(id: number, dto: UpdateCslActivityDto) {
    await this.findOne(id);
    return this.prisma.cslActivity.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        grade: dto.grade,
        competency: dto.competency,
        isRequired: dto.isRequired,
        targetHours: dto.targetHours,
        isPublished: dto.isPublished,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.cslActivity.delete({ where: { id } });
    return { deleted: true };
  }
}
