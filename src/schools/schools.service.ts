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
    const existing = await this.prisma.school.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('A school with this code already exists');

    return this.prisma.school.create({ data: dto });
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
}
