import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStemCategoryDto } from './dto/create-stem-category.dto';
import { CreateStemSubjectDto } from './dto/create-stem-subject.dto';
import { UpdateStemCategoryDto } from './dto/update-stem-category.dto';
import { UpdateStemSubjectDto } from './dto/update-stem-subject.dto';

@Injectable()
export class StemService {
  constructor(private readonly prisma: PrismaService) {}

  findCategories() {
    return this.prisma.stemCategory.findMany({
      include: {
        subjects: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: { labs: true },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  findSubjects() {
    return this.prisma.stemSubject.findMany({
      include: {
        category: true,
        _count: {
          select: { labs: true },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(dto: CreateStemCategoryDto) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const key = this.generateUniqueKey(dto.name, attempt);
      try {
        return await this.prisma.stemCategory.create({
          data: {
            key,
            name: dto.name,
            description: dto.description,
            order: dto.order ?? 0,
            isActive: dto.isActive ?? true,
          },
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) throw error;
      }
    }
    throw new ConflictException('A STEM category with this name already exists');
  }

  async updateCategory(id: number, dto: UpdateStemCategoryDto) {
    const existing = await this.prisma.stemCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('STEM category not found');

    return this.prisma.stemCategory.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        order: dto.order,
        isActive: dto.isActive,
      },
    });
  }

  async createSubject(dto: CreateStemSubjectDto) {
    const category = await this.prisma.stemCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('STEM category not found');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const key = this.generateUniqueKey(dto.name, attempt);
      try {
        return await this.prisma.stemSubject.create({
          data: {
            categoryId: dto.categoryId,
            key,
            name: dto.name,
            description: dto.description,
            order: dto.order ?? 0,
            isActive: dto.isActive ?? true,
          },
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) throw error;
      }
    }
    throw new ConflictException('A STEM subject with this name already exists');
  }

  async updateSubject(id: number, dto: UpdateStemSubjectDto) {
    const existing = await this.prisma.stemSubject.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('STEM subject not found');

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.stemCategory.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('STEM category not found');
    }

    return this.prisma.stemSubject.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        order: dto.order,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Slugifies `name` into a unique `key` for the given model. On the first
   * attempt this is a plain kebab-case slug; on retry (after a unique
   * constraint collision) a short numeric suffix is appended.
   */
  private generateUniqueKey(name: string, attempt: number) {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'category';

    if (attempt === 0) return base;

    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}-${suffix}`;
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
