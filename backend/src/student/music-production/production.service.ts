import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StudentLabsService } from "../labs.service";
import { teacherPairs } from "../../teacher-scope/scope";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { ProductionDto, MusicReviewDto } from "./production.dto";
import { ProductionMix, validMix } from "./model";
@Injectable()
export class MusicProductionService {
  constructor(
    private readonly db: PrismaService,
    private readonly labs: StudentLabsService,
  ) {}
  async authorize(a: AuthenticatedUser) {
    if (
      (await this.labs.getLabConfig(a.id, a.schoolId)).category !== "ARTS_MUSIC"
    )
      throw new ForbiddenException(
        "Music Studio is not part of your current curriculum.",
      );
  }
  async songs(a: AuthenticatedUser) {
    await this.authorize(a);
    return this.db.music_Song.findMany({
      orderBy: [{ genre: "asc" }, { title: "asc" }],
    });
  }
  async projects(a: AuthenticatedUser) {
    await this.authorize(a);
    return this.db.music_Project.findMany({
      where: { student_id: a.id },
      orderBy: { updated_at: "desc" },
      take: 50,
    });
  }
  async get(id: string, a: AuthenticatedUser) {
    await this.authorize(a);
    const p = await this.db.music_Project.findFirst({
      where: { id, student_id: a.id },
    });
    if (!p) throw new NotFoundException("Mix not found.");
    return p;
  }
  async save(dto: ProductionDto, a: AuthenticatedUser, id?: string) {
    await this.authorize(a);
    if (!validMix(dto.tracks_json, dto.time_signature))
      throw new BadRequestException(
        "Invalid six-track mix, note sequence or activity data.",
      );
    if (dto.song_id) {
      const song = await this.db.music_Song.findUnique({
        where: { id: dto.song_id },
      });
      if (!song || song.content_kind === "LISTENING_REFERENCE")
        throw new BadRequestException(
          "Choose a playable original exercise or the supplied-note study.",
        );
    }
    const data = {
      title: dto.title.trim(),
      song_id: dto.song_id ?? null,
      bpm: dto.bpm,
      time_signature: dto.time_signature,
      tracks_json: {
        version: 2,
        scale: dto.tracks_json.scale,
        tracks: dto.tracks_json.tracks.map((t) => ({
          id: t.id,
          instrument: t.instrument,
          volume: t.volume,
          muted: t.muted,
          pattern: [...t.pattern],
        })),
        melody: dto.tracks_json.melody.map((n) => ({
          bar: n.bar,
          step: n.step,
          midi: n.midi,
          length: n.length,
        })),
        completed_activities: [...dto.tracks_json.completed_activities],
        reflection: dto.tracks_json.reflection.trim(),
      } as Prisma.InputJsonObject,
    };
    if (!id)
      return this.db.music_Project.create({
        data: { ...data, student_id: a.id },
      });
    const p = await this.get(id, a);
    if (p.status !== "DRAFT")
      throw new ConflictException(
        "Submitted mixes are fixed snapshots. Save a new copy to make changes.",
      );
    const changed = await this.db.music_Project.updateMany({
      where: { id, student_id: a.id, status: "DRAFT" },
      data,
    });
    if (!changed.count)
      throw new ConflictException("This mix changed. Reload before editing.");
    return this.get(id, a);
  }
  async submit(id: string, a: AuthenticatedUser) {
    const p = await this.get(id, a),
      mix = p.tracks_json as unknown as ProductionMix;
    if (
      !validMix(mix, p.time_signature as any) ||
      !mix.tracks.some(
        (t) =>
          !t.muted &&
          t.volume > 0 &&
          (t.id === "melody" ? mix.melody.length : t.pattern.some(Boolean)),
      )
    )
      throw new BadRequestException(
        "Add an audible melody or rhythm before submitting.",
      );
    await this.db.music_Project.updateMany({
      where: { id, student_id: a.id, status: "DRAFT" },
      data: { status: "SUBMITTED", submitted_at: new Date() },
    });
    return this.get(id, a);
  }
  private async teacherWhere(
    a: AuthenticatedUser,
  ): Promise<Prisma.Music_ProjectWhereInput> {
    const pairs = (await teacherPairs(this.db, a)).filter((p) =>
      ["music", "musicanddance"].includes(
        p.subject
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z]/g, ""),
      ),
    );
    if (!pairs.length)
      throw new ForbiddenException("You have no assigned Music classes.");
    return {
      status: { in: ["SUBMITTED", "ASSESSED"] },
      student: {
        is: {
          schoolId: a.schoolId,
          role: "STUDENT",
          isActive: true,
          OR: pairs.map((p) => ({
            grade: p.stream.grade,
            studentProfile: { is: { stream: p.stream.name } },
          })),
        },
      },
    };
  }
  async submissions(a: AuthenticatedUser) {
    return this.db.music_Project.findMany({
      where: await this.teacherWhere(a),
      include: {
        student: { select: { name: true, admissionNumber: true, grade: true } },
      },
      orderBy: { submitted_at: "desc" },
      take: 50,
    });
  }
  async review(id: string, dto: MusicReviewDto, a: AuthenticatedUser) {
    const where = await this.teacherWhere(a);
    const p = await this.db.music_Project.findFirst({
      where: { AND: [{ id }, where] },
    });
    if (!p)
      throw new ForbiddenException(
        "This submission is outside your Music classes.",
      );
    const result = await this.db.music_Project.updateMany({
      where: { AND: [{ id }, where] },
      data: {
        score: dto.score,
        review_comment: dto.comment,
        status: "ASSESSED",
        reviewed_by: a.id,
        reviewed_at: new Date(),
      },
    });
    if (!result.count)
      throw new ConflictException(
        "Submission changed. Reload before reviewing.",
      );
    return { id, score: dto.score, comment: dto.comment, status: "ASSESSED" };
  }
}
