import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';

const SAFE_SELECT = {
  id: true,
  schoolId: true,
  name: true,
  role: true,
  email: true,
  admissionNumber: true,
  grade: true,
  parentPhone: true,
  subject: true,
  assignedClass: true,
  studentProfile: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    const targetSchoolId = this.resolveTargetSchoolId(dto, actor);
    this.assertCanAssignRole(dto.role, actor);

    if (dto.role === Role.STUDENT) {
      const existing = await this.prisma.user.findUnique({
        where: {
          schoolId_admissionNumber: {
            schoolId: targetSchoolId,
            admissionNumber: dto.admissionNumber!,
          },
        },
      });
      if (existing) throw new ConflictException('Admission number already in use at this school');

      return this.prisma.user.create({
        data: {
          schoolId: targetSchoolId,
          name: dto.name,
          role: dto.role,
          admissionNumber: dto.admissionNumber,
          grade: dto.grade,
          parentPhone: dto.parentPhone,
          studentProfile: {
            create: {
              admissionNumber: dto.admissionNumber,
              grade: dto.grade,
              className: dto.studentClass,
              stream: dto.stream,
              pathway: dto.pathway,
              parentName: dto.parentName,
              parentPhone: dto.parentPhone,
              parentEmail: dto.parentEmail,
            },
          },
        },
        select: SAFE_SELECT,
      });
    }

    const existing = await this.prisma.user.findUnique({
      where: { schoolId_email: { schoolId: targetSchoolId, email: dto.email! } },
    });
    if (existing) throw new ConflictException('Email already in use at this school');

    const passwordHash = await bcrypt.hash(dto.password!, 12);

    return this.prisma.user.create({
      data: {
        schoolId: targetSchoolId,
        name: dto.name,
        role: dto.role,
        email: dto.email,
        passwordHash,
        subject: dto.role === Role.TEACHER ? dto.subject : undefined,
        assignedClass: dto.role === Role.TEACHER ? dto.assignedClass : undefined,
      },
      select: SAFE_SELECT,
    });
  }

  findAll(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;

    return this.prisma.user.findMany({
      where: targetSchoolId ? { schoolId: targetSchoolId } : undefined,
      select: SAFE_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException('User not found');
    this.assertSameTenant(user.schoolId, actor);

    // Students may only view their own profile, not classmates'.
    if (actor.role === Role.STUDENT && actor.id !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return user;
  }

  async update(id: number, dto: UpdateUserDto, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    this.assertSameTenant(user.schoolId, actor);

    // Only PLATFORM_ADMIN and SCHOOL_ADMIN may edit other accounts;
    // everyone else may only edit themselves (e.g. change own password).
    if (actor.role === Role.TEACHER || actor.role === Role.STUDENT) {
      if (actor.id !== id) {
        throw new ForbiddenException('You can only update your own account');
      }
      if (dto.isActive !== undefined) {
        throw new ForbiddenException('You cannot change your own active status');
      }
    }

    const data: {
      name?: string;
      isActive?: boolean;
      passwordHash?: string;
      grade?: string;
      parentPhone?: string;
      subject?: string;
      assignedClass?: string;
    } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) data.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.grade !== undefined && user.role === Role.STUDENT) data.grade = dto.grade;
    if (dto.parentPhone !== undefined && user.role === Role.STUDENT) data.parentPhone = dto.parentPhone;
    if (dto.subject !== undefined && user.role === Role.TEACHER) data.subject = dto.subject;
    if (dto.assignedClass !== undefined && user.role === Role.TEACHER) data.assignedClass = dto.assignedClass;

    const profileChanged =
      dto.grade !== undefined ||
      dto.parentPhone !== undefined ||
      dto.studentClass !== undefined ||
      dto.stream !== undefined ||
      dto.pathway !== undefined ||
      dto.parentName !== undefined ||
      dto.parentEmail !== undefined;

    if (user.role === Role.STUDENT && profileChanged) {
      return this.prisma.$transaction(async (transaction) => {
        await transaction.studentProfile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            admissionNumber: user.admissionNumber,
            grade: dto.grade ?? user.grade,
            className: dto.studentClass,
            stream: dto.stream,
            pathway: dto.pathway,
            parentName: dto.parentName,
            parentPhone: dto.parentPhone ?? user.parentPhone,
            parentEmail: dto.parentEmail,
          },
          update: {
            grade: dto.grade,
            className: dto.studentClass,
            stream: dto.stream,
            pathway: dto.pathway,
            parentName: dto.parentName,
            parentPhone: dto.parentPhone,
            parentEmail: dto.parentEmail,
          },
        });

        return transaction.user.update({ where: { id }, data, select: SAFE_SELECT });
      });
    }

    return this.prisma.user.update({ where: { id }, data, select: SAFE_SELECT });
  }

  private resolveTargetSchoolId(dto: CreateUserDto, actor: AuthenticatedUser): number {
    if (actor.role === Role.PLATFORM_ADMIN) {
      return dto.schoolId ?? actor.schoolId;
    }
    // Non-platform-admins can only ever create users in their own school,
    // regardless of what schoolId they pass in the body.
    return actor.schoolId;
  }

  private assertCanAssignRole(role: Role, actor: AuthenticatedUser) {
    if (actor.role === Role.PLATFORM_ADMIN) return;

    if (actor.role === Role.SCHOOL_ADMIN) {
      if (role === Role.TEACHER || role === Role.STUDENT) return;
      throw new ForbiddenException('School admins can only create teachers and students');
    }

    throw new ForbiddenException('You do not have permission to create users');
  }

  private assertSameTenant(schoolId: number, actor: AuthenticatedUser) {
    if (actor.role === Role.PLATFORM_ADMIN) return;
    if (actor.schoolId !== schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }
  }
}
