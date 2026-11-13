import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StudentLabsService } from "../labs.service";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { MusicProjectDto } from "./music-project.dto";
import { validProject } from "./project";
@Injectable()
export class MusicStudioService {
  constructor(
    private readonly db: PrismaService,
    private readonly labs: StudentLabsService,
  ) {}
  private async authorize(actor: AuthenticatedUser) {
    const config = await this.labs.getLabConfig(actor.id, actor.schoolId);
    if (config.category !== "ARTS_MUSIC")
      throw new ForbiddenException(
        "Music Studio is not part of your current curriculum.",
      );
  }
  private data(dto: MusicProjectDto) {
    if (!validProject(dto))
      throw new BadRequestException(
        "Use four unique tracks, known loops, 60–180 BPM and a supported meter.",
      );
    return {
      title: dto.title.trim(),
      bpm: dto.bpm,
      time_signature: dto.time_signature,
      tracks_json: dto.tracks_json.map((t) => ({
        id: t.id,
        name: t.name.trim(),
        loop_id: t.loop_id,
        volume: t.volume,
        muted: t.muted,
        solo: t.solo,
      })) as Prisma.InputJsonArray,
    };
  }
  async list(actor: AuthenticatedUser) {
    await this.authorize(actor);
    return this.db.music_Studio_Project.findMany({
      where: { student_id: actor.id },
      orderBy: { updated_at: "desc" },
      take: 50,
    });
  }
  async get(id: string, actor: AuthenticatedUser) {
    await this.authorize(actor);
    const project = await this.db.music_Studio_Project.findFirst({
      where: { id, student_id: actor.id },
    });
    if (!project) throw new NotFoundException("Project not found.");
    return project;
  }
  async save(dto: MusicProjectDto, actor: AuthenticatedUser, id?: string) {
    await this.authorize(actor);
    const data = this.data(dto);
    if (!id)
      return this.db.music_Studio_Project.create({
        data: { ...data, student_id: actor.id },
      });
    const updated = await this.db.music_Studio_Project.updateMany({
      where: { id, student_id: actor.id },
      data,
    });
    if (!updated.count) throw new NotFoundException("Project not found.");
    return this.get(id, actor);
  }
}
