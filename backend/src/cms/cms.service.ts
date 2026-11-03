import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDraftDto } from "./dto/create-draft.dto";
import { PublishDto, PublishTargetType } from "./dto/publish.dto";

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  createDraft(dto: CreateDraftDto) {
    return this.prisma.masterModule.create({
      data: {
        level: dto.level,
        grade: dto.grade,
        pathway: dto.pathway,
        track: dto.track,
        subject: dto.subject,
        topic: dto.topic,
        content_json: dto.content_json as Prisma.InputJsonObject,
        status: ContentStatus.DRAFT,
      },
    });
  }

  getDrafts() {
    return this.prisma.masterModule.findMany({
      where: { status: { in: [ContentStatus.DRAFT, ContentStatus.APPROVED] } },
      orderBy: { created_at: "desc" },
    });
  }

  private async lockedModule(tx: Prisma.TransactionClient, id: string) {
    // Serialise approval/publication, including retries across API instances.
    await tx.$queryRaw`SELECT id FROM "MasterModule" WHERE id = ${id} FOR UPDATE`;
    const module = await tx.masterModule.findUnique({ where: { id } });
    if (!module) throw new NotFoundException("Master module not found.");
    return module;
  }

  approveModule(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const module = await this.lockedModule(tx, id);
      if (module.status === ContentStatus.APPROVED) return module;
      if (module.status !== ContentStatus.DRAFT)
        throw new ConflictException("Only draft modules can be approved.");
      return tx.masterModule.update({
        where: { id },
        data: { status: ContentStatus.APPROVED },
      });
    });
  }

  async publishModule(dto: PublishDto) {
    const schoolTarget = dto.target_type === PublishTargetType.SCHOOL;
    if (schoolTarget && !dto.target_id)
      throw new BadRequestException("A school target_id is required.");
    if (
      !schoolTarget &&
      (dto.target_id !== undefined || dto.stream_ids !== undefined)
    )
      throw new BadRequestException(
        "Store publication does not accept school or stream targets.",
      );
    const schoolId = schoolTarget ? Number(dto.target_id) : null;
    if (
      schoolTarget &&
      (!Number.isSafeInteger(schoolId) ||
        schoolId! < 1 ||
        schoolId! > 2147483647)
    )
      throw new BadRequestException("Choose a valid school ID.");

    return this.prisma.$transaction(
      async (tx) => {
        const module = await this.lockedModule(tx, dto.module_id);
        const status = schoolTarget
          ? ContentStatus.PUBLISHED_SCHOOL
          : ContentStatus.PUBLISHED_STORE;
        const sameDestination =
          module.status === status &&
          module.tenant_id === (schoolTarget ? dto.target_id : null);
        if (module.status !== ContentStatus.APPROVED && !sameDestination)
          throw new ConflictException(
            "Approve this module before publishing. Published modules cannot be reassigned to another audience.",
          );
        if (
          schoolTarget &&
          !(await tx.school.findUnique({
            where: { id: schoolId! },
            select: { id: true },
          }))
        )
          throw new NotFoundException("Target school not found.");

        const published = await tx.masterModule.update({
          where: { id: dto.module_id },
          data: { status, tenant_id: schoolTarget ? dto.target_id : null },
        });
        if (schoolTarget && dto.stream_ids !== undefined) {
          const streams = [...new Set(dto.stream_ids)];
          await tx.moduleAssignment.deleteMany({
            where: { module_id: module.id, stream_id: { notIn: streams } },
          });
          const existing = await tx.moduleAssignment.findMany({
            where: { module_id: module.id },
            select: { stream_id: true },
          });
          const assigned = new Set(existing.map((item) => item.stream_id));
          const missing = streams.filter((stream) => !assigned.has(stream));
          if (missing.length)
            await tx.moduleAssignment.createMany({
              data: missing.map((stream_id) => ({
                module_id: module.id,
                stream_id,
              })),
            });
        }
        return {
          ...published,
          assignments: await tx.moduleAssignment.findMany({
            where: { module_id: module.id },
            orderBy: { stream_id: "asc" },
          }),
        };
      },
      { timeout: 15000 },
    );
  }

  getPublicStore() {
    // Catalogue only. Full JSON may contain exam keys or private asset URLs.
    return this.prisma.masterModule.findMany({
      where: { status: ContentStatus.PUBLISHED_STORE, tenant_id: null },
      select: {
        id: true,
        level: true,
        grade: true,
        pathway: true,
        track: true,
        subject: true,
        topic: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
    });
  }
}
