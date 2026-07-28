import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { normalizeGrade } from '../common/utils/grade.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMnemonicCardDto } from './dto/create-mnemonic-card.dto';
import { UpdateMnemonicCardDto } from './dto/update-mnemonic-card.dto';

@Injectable()
export class MnemonicCardsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    actor: AuthenticatedUser,
    filters: { subject?: string; topic?: string } = {},
  ) {
    const isPlatformAdmin = actor.role === Role.PLATFORM_ADMIN;
    return this.prisma.mnemonicCard.findMany({
      where: {
        ...(!isPlatformAdmin
          ? {
              isPublished: true,
              ...(actor.grade
                ? { OR: [{ grade: null }, { grade: actor.grade }] }
                : {}),
            }
          : {}),
        ...(filters.subject
          ? { subject: { contains: filters.subject, mode: 'insensitive' as const } }
          : {}),
        ...(filters.topic
          ? { topic: { contains: filters.topic, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: [
        { displayOrder: 'asc' },
        { subject: 'asc' },
        { topic: 'asc' },
        { title: 'asc' },
      ],
    });
  }

  getSummary() {
    return this.prisma.$transaction(async (transaction) => {
      const [total, published] = await Promise.all([
        transaction.mnemonicCard.count(),
        transaction.mnemonicCard.count({ where: { isPublished: true } }),
      ]);
      const subjects = await transaction.mnemonicCard.groupBy({ by: ['subject'] });
      return { total, published, drafts: total - published, subjects: subjects.length };
    });
  }

  create(dto: CreateMnemonicCardDto) {
    return this.prisma.mnemonicCard.create({
      data: {
        ...dto,
        grade: dto.grade ? normalizeGrade(dto.grade) ?? dto.grade : null,
        description: dto.description?.trim() || null,
      },
    });
  }

  async update(id: number, dto: UpdateMnemonicCardDto) {
    await this.assertExists(id);
    return this.prisma.mnemonicCard.update({
      where: { id },
      data: {
        ...dto,
        grade:
          dto.grade !== undefined
            ? dto.grade
              ? normalizeGrade(dto.grade) ?? dto.grade
              : null
            : undefined,
        description:
          dto.description !== undefined ? dto.description?.trim() || null : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.assertExists(id);
    await this.prisma.mnemonicCard.delete({ where: { id } });
    return { id };
  }

  private async assertExists(id: number) {
    const card = await this.prisma.mnemonicCard.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!card) throw new NotFoundException('Mnemonic card not found');
  }
}
