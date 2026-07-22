import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSchoolDto) {
    const suppliedCode = dto.code?.trim().toUpperCase();

    for (let attempt = 0; attempt < 20; attempt++) {
      const code = suppliedCode ?? this.generateSchoolCode(dto.name);
      try {
        return await this.prisma.school.create({ data: { ...dto, code } });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) throw error;
        if (suppliedCode) throw new ConflictException('A school with this code already exists');
      }
    }

    throw new ConflictException('Could not generate a unique school code');
  }

  /** Platform admins only — used for the platform-wide schools directory. */
  findAll() {
    return this.prisma.school.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number, user: AuthenticatedUser) {
    this.assertCanAccess(id, user);

    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async update(id: number, dto: UpdateSchoolDto, user: AuthenticatedUser) {
    this.assertCanAccess(id, user);

    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    return this.prisma.school.update({ where: { id }, data: dto });
  }

  private assertCanAccess(schoolId: number, user: AuthenticatedUser) {
    if (user.role === Role.PLATFORM_ADMIN) return;
    if (user.schoolId !== schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }
  }

  private generateSchoolCode(name: string) {
    const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    const initials = words.map((word) => word[0]).join('');
    const fallback = words.join('').slice(0, 4);
    const prefix = (initials.length >= 2 ? initials : fallback).slice(0, 6).padEnd(2, 'S');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${suffix}`;
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
