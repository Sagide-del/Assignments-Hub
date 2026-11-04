import { resultScope, assertStudentScope } from "../teacher-scope/scope";
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateSbaEvidenceDto } from './dto/create-sba-evidence.dto';
import { ReviewSbaEvidenceDto } from './dto/review-sba-evidence.dto';

@Injectable()
export class SbaEvidenceService {
  constructor(private readonly prisma: PrismaService, private readonly uploads: UploadsService) {}

  async list(actor: AuthenticatedUser) {
    const where = actor.role === Role.STUDENT ? { studentId: actor.id } : { schoolId: actor.schoolId };
    return this.prisma.studentSbaEvidence.findMany({
      where: { AND: [where, await resultScope(this.prisma, actor)] },
      include: { student: { select: { id: true, name: true, grade: true } }, reviewedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateSbaEvidenceDto, file: Express.Multer.File | undefined, actor: AuthenticatedUser) {
    const stored = file ? await this.uploads.uploadPrivate(file, 'sba-evidence') : null;
    return this.prisma.studentSbaEvidence.create({
      data: {
        schoolId: actor.schoolId, studentId: actor.id,
        subject: dto.subject.trim(), title: dto.title.trim(), description: dto.description?.trim() || null,
        assetKey: stored?.assetKey, fileName: stored?.filename, fileSize: stored?.size,
      },
    });
  }

  async review(id: number, dto: ReviewSbaEvidenceDto, actor: AuthenticatedUser) {
    const evidence = await this.prisma.studentSbaEvidence.findUnique({ where: { id } });
    if (!evidence) throw new NotFoundException('SBA evidence was not found');
    if (actor.role !== Role.PLATFORM_ADMIN && evidence.schoolId !== actor.schoolId) throw new ForbiddenException('You cannot review evidence from another school');
    await assertStudentScope(this.prisma, actor, evidence.studentId, evidence.subject);
    return this.prisma.studentSbaEvidence.update({
      where: { id }, data: { status: dto.status, feedback: dto.feedback?.trim() || null, reviewedById: actor.id, reviewedAt: new Date() },
    });
  }
}
