import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { MusicStudioService } from "../student/music/music-studio.service";
import { MusicProjectDto } from "../student/music/music-project.dto";
import { MusicStudioController } from "../student/music/music-studio.controller";
import {
  emptyTracks,
  validProject,
  loopRate,
  beatsPerBar,
  LOOP_IDS,
} from "../student/music/project";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
const actor: any = { id: 10, schoolId: 2, role: "STUDENT" };
const project = () => ({
  title: "My rhythm",
  bpm: 140,
  time_signature: "6/8" as const,
  tracks_json: emptyTracks().map((t, i) => ({
    ...t,
    loop_id: i === 0 ? ("sikuti_lead" as const) : null,
  })),
});
function fixture() {
  const db = {
    music_Studio_Project: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation(async ({ data }) => ({ id: "new", ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const labs = {
    getLabConfig: jest.fn().mockResolvedValue({ category: "ARTS_MUSIC" }),
  };
  return { db, labs, service: new MusicStudioService(db as any, labs as any) };
}
describe("Music Studio", () => {
  test("stores plain four-track composition data under the authenticated student only", async () => {
    const f = fixture(),
      dto = project();
    await f.service.save(dto, actor);
    expect(f.labs.getLabConfig).toHaveBeenCalledWith(10, 2);
    expect(f.db.music_Studio_Project.create).toHaveBeenCalledWith({
      data: { ...dto, student_id: 10 },
    });
    expect(
      JSON.stringify(f.db.music_Studio_Project.create.mock.calls[0][0]),
    ).not.toMatch(/player|audioBuffer/);
    await f.service.list(actor);
    expect(f.db.music_Studio_Project.findMany.mock.calls[0][0].where).toEqual({
      student_id: 10,
    });
  });
  test("cannot read or overwrite another student's project", async () => {
    const f = fixture();
    await expect(f.service.get("other", actor)).rejects.toMatchObject({
      status: 404,
    });
    expect(f.db.music_Studio_Project.findFirst).toHaveBeenCalledWith({
      where: { id: "other", student_id: 10 },
    });
    await expect(
      f.service.save(project(), actor, "other"),
    ).rejects.toMatchObject({ status: 404 });
    expect(f.db.music_Studio_Project.updateMany.mock.calls[0][0].where).toEqual(
      { id: "other", student_id: 10 },
    );
  });
  test("denies music project access outside Music Studio scope", async () => {
    const f = fixture();
    f.labs.getLabConfig.mockResolvedValue({ category: "STEM_PURE" });
    await expect(f.service.list(actor)).rejects.toMatchObject({ status: 403 });
    expect(f.db.music_Studio_Project.findMany).not.toHaveBeenCalled();
  });
  test("accepts supported meters and rejects malformed or unbounded project data", async () => {
    for (const meter of ["4/4", "6/8", "12/8"]) {
      const dto = { ...project(), time_signature: meter };
      expect(validProject(dto)).toBe(true);
      expect(
        await validate(plainToInstance(MusicProjectDto, dto)),
      ).toHaveLength(0);
    }
    for (const mutation of [
      { bpm: 0 },
      { bpm: 180.5 },
      { bpm: Infinity },
      { title: " " },
      { time_signature: "7/3" },
      { tracks_json: [] },
      { tracks_json: [...emptyTracks().slice(0, 3), emptyTracks()[0]] },
      {
        tracks_json: emptyTracks().map((t) => ({
          ...t,
          loop_id: "https://evil.example/sample.wav",
        })),
      },
      { tracks_json: emptyTracks().map((t) => ({ ...t, volume: NaN })) },
    ]) {
      const dto = { ...project(), ...mutation };
      expect(validProject(dto)).toBe(false);
      await expect(
        fixture().service.save(dto as any, actor),
      ).rejects.toMatchObject({ status: 400 });
    }
  });
  test("fits every source meter to a target bar at the selected BPM", () => {
    for (const source of ["4/4", "6/8", "12/8"] as const)
      for (const target of ["4/4", "6/8", "12/8"] as const) {
        const rate = loopRate(
          { bpm: 140, time_signature: source },
          120,
          target,
        );
        expect((beatsPerBar(source) * 60) / 140 / rate).toBeCloseTo(
          (beatsPerBar(target) * 60) / 120,
        );
      }
    expect(LOOP_IDS).toHaveLength(6);
  });
  test("project endpoints require student role", () => {
    for (const method of ["list", "get", "save", "update"] as const)
      expect(
        Reflect.getMetadata(ROLES_KEY, MusicStudioController.prototype[method]),
      ).toEqual(["STUDENT"]);
  });
});
const realDb = process.env.CMS_TEST_DATABASE_URL ? test : test.skip;
realDb(
  "music project migration persists JSON and enforces student FK in PostgreSQL",
  async () => {
    const url = process.env.CMS_TEST_DATABASE_URL!;
    expect(["127.0.0.1", "localhost"]).toContain(new URL(url).hostname);
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      await expect(
        db.music_Studio_Project.findMany({ take: 1 }),
      ).resolves.toEqual(expect.any(Array));
      await expect(
        db.$transaction(async (tx) => {
          const school = await tx.school.create({
            data: {
              name: "Music integration school",
              code: `MUSIC-${Date.now()}`,
            },
          });
          const user = await tx.user.create({
            data: {
              name: "Music learner",
              role: "STUDENT",
              schoolId: school.id,
              grade: "Grade 10",
            },
          });
          const other = await tx.user.create({
            data: {
              name: "Other music learner",
              role: "STUDENT",
              schoolId: school.id,
              grade: "Grade 10",
            },
          });
          const record = await tx.music_Studio_Project.create({
            data: { ...project(), student_id: user.id },
          });
          expect(record.tracks_json).toEqual(project().tracks_json);
          expect(record.bpm).toBe(140);
          await tx.music_Studio_Project.update({
            where: { id: record.id },
            data: { bpm: 150 },
          });
          expect(
            (
              await tx.music_Studio_Project.findUniqueOrThrow({
                where: { id: record.id },
              })
            ).bpm,
          ).toBe(150);
          const service = new MusicStudioService(
            tx as any,
            { getLabConfig: async () => ({ category: "ARTS_MUSIC" }) } as any,
          );
          const otherActor = { ...actor, id: other.id, schoolId: school.id };
          expect(await service.list(otherActor)).toEqual([]);
          await expect(
            service.get(record.id, otherActor),
          ).rejects.toMatchObject({ status: 404 });
          await expect(
            service.save(project(), otherActor, record.id),
          ).rejects.toMatchObject({ status: 404 });
          throw Error("ROLLBACK_MUSIC_TEST");
        }),
      ).rejects.toThrow("ROLLBACK_MUSIC_TEST");
    } finally {
      await db.$disconnect();
    }
  },
);
