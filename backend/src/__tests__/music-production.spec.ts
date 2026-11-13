import arrangements from "../student/music-production/arrangements.json";
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  newMix,
  newPlayAlong,
  validMix,
  changeMeter,
  stepsFor,
} from "../student/music-production/model";
import { ProductionDto } from "../student/music-production/production.dto";
import { MusicProductionService } from "../student/music-production/production.service";
import catalog from "../student/music-production/songs.json";
const actor: any = { id: 10, schoolId: 2, role: "STUDENT" };
const draft = () => ({
  title: "Original mix",
  bpm: 90,
  time_signature: "6/8" as const,
  song_id: null,
  tracks_json: newMix(),
});
describe("Music production", () => {
  test("validates six bounded tracks, notes, activity progress and each meter", () => {
    for (const meter of ["4/4", "6/8", "12/8"] as const)
      expect(validMix(newMix(meter), meter)).toBe(true);
    for (const mix of [
      { ...newMix(), tracks: [] },
      { ...newMix(), melody: [{ bar: 4, step: 0, midi: 60, length: 2 }] },
      {
        ...newMix(),
        melody: [
          { bar: 0, step: 0, midi: 60, length: 2 },
          { bar: 0, step: 1, midi: 62, length: 2 },
        ],
      },
      { ...newMix(), reflection: "x".repeat(2001) },
      {
        ...newMix(),
        tracks: newMix().tracks.map((t) => ({ ...t, volume: NaN })),
      },
    ])
      expect(validMix(mix, "6/8")).toBe(false);
    const changed = changeMeter(newMix(), "6/8", "12/8");
    expect(changed.tracks[0].pattern).toHaveLength(24);
    expect(validMix(changed, "12/8")).toBe(true);
  });
  test("DTO rejects invalid tempo, titles and meter", async () => {
    expect(
      await validate(plainToInstance(ProductionDto, draft())),
    ).toHaveLength(0);
    for (const bad of [{ bpm: 0 }, { title: " " }, { time_signature: "7/9" }])
      expect(
        (await validate(plainToInstance(ProductionDto, { ...draft(), ...bad })))
          .length,
      ).toBeGreaterThan(0);
  });
  test("song catalog has original exercises, supplied SATB study and reference-only commercial songs", () => {
    expect(catalog.songs).toHaveLength(18);
    expect(new Set(catalog.songs.map((s) => s.id)).size).toBe(18);
    const study = catalog.songs.find((s) => s.slug === "mwana-supplied-study")!;
    expect(study.bpm).toBe(90);
    expect(study.time_signature).toBe("6/8");
    expect(study.notation_json.parts?.map((p) => p.name)).toEqual([
      "Soprano",
      "Alto",
      "Tenor",
      "Bass",
      "Organ",
      "Acoustic Guitar",
      "Acoustic Bass",
      "Drumset 1",
      "Drumset 2",
    ]);
    for (const s of catalog.songs.filter(
      (s) => s.content_kind !== "LISTENING_REFERENCE",
    )) {
      const mix = newMix(s.time_signature as any);
      mix.melody = s.notation_json.melody!.map((n) => ({
        bar: n.bar,
        step: n.step,
        midi: 60,
        length: n.length,
      }));
      expect(validMix(mix, s.time_signature as any)).toBe(true);
      expect(s.audio_url).toBeNull();
    }
    for (const ref of catalog.songs.filter(
      (s) => s.content_kind === "LISTENING_REFERENCE",
    )) {
      expect(ref.notation_json).toEqual({});
      expect(ref.audio_url).toBeNull();
      expect(ref.lyrics_json).toBeNull();
      expect(ref.reference_url).toMatch(/^https:\/\/www.youtube.com\/results/);
    }
  });
  test("scopes ownership and prevents editing submitted snapshots or loading reference recordings", async () => {
    const db: any = {
      music_Project: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      music_Song: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ content_kind: "LISTENING_REFERENCE" }),
      },
    };
    const labs: any = {
      getLabConfig: async () => ({ category: "ARTS_MUSIC" }),
    };
    const service = new MusicProductionService(db, labs);
    await expect(service.get("other", actor)).rejects.toMatchObject({
      status: 404,
    });
    expect(db.music_Project.findFirst).toHaveBeenLastCalledWith({
      where: { id: "other", student_id: 10 },
    });
    db.music_Project.findFirst.mockResolvedValue({
      id: "submitted",
      status: "SUBMITTED",
    });
    await expect(
      service.save(draft(), actor, "submitted"),
    ).rejects.toMatchObject({ status: 409 });
    expect(db.music_Project.updateMany).not.toHaveBeenCalled();
    await expect(
      service.save({ ...draft(), song_id: "ref" }, actor),
    ).rejects.toMatchObject({ status: 400 });
    const nonMusic = new MusicProductionService(db, {
      getLabConfig: async () => ({ category: "STEM_PURE" }),
    } as any);
    await expect(nonMusic.projects(actor)).rejects.toMatchObject({
      status: 403,
    });
  });
  test("recorded backing saves only bounded settings and cannot use another song or tempo", async () => {
    const create = jest.fn().mockImplementation(({ data }) => data),
      db: any = {
        music_Song: {
          findUnique: jest.fn().mockResolvedValue({
            slug: "ode-to-joy-theme",
            content_kind: "PUBLIC_DOMAIN_STUDY",
          }),
        },
        music_Project: { create },
      };
    const service = new MusicProductionService(db, {
      getLabConfig: async () => ({ category: "ARTS_MUSIC" }),
    } as any);
    const payload: any = {
      ...draft(),
      bpm: 100,
      time_signature: "4/4",
      song_id: "ode",
      tracks_json: {
        ...newMix("4/4"),
        play_along: {
          ...newPlayAlong(),
          untrusted_url: "https://invalid.example",
        },
      },
    };
    await service.save(payload, actor);
    expect(
      create.mock.calls[0][0].data.tracks_json.play_along.untrusted_url,
    ).toBeUndefined();
    expect(
      create.mock.calls[0][0].data.tracks_json.play_along.stems,
    ).toHaveLength(5);
    await expect(
      service.save({ ...payload, bpm: 120 }, actor),
    ).rejects.toMatchObject({ status: 400 });
    db.music_Song.findUnique.mockResolvedValue({
      slug: "other",
      content_kind: "ORIGINAL_EXERCISE",
    });
    await expect(service.save(payload, actor)).rejects.toMatchObject({
      status: 400,
    });
  });
  test("all recorded pieces persist only with their own catalog song, tempo and meter", async () => {
    const song = jest.fn(),
      create = jest.fn().mockImplementation(({ data }) => data),
      db: any = { music_Song: { findUnique: song }, music_Project: { create } };
    const service = new MusicProductionService(db, {
      getLabConfig: async () => ({ category: "ARTS_MUSIC" }),
    } as any);
    for (const a of arrangements) {
      song.mockResolvedValue({ slug: a.song_slug, content_kind: "ORIGINAL" });
      const payload: any = {
        ...draft(),
        song_id: a.song_slug,
        bpm: a.bpm,
        time_signature: a.time_signature,
        tracks_json: {
          ...newMix(a.time_signature as any),
          play_along: newPlayAlong(a.id),
        },
      };
      await service.save(payload, actor);
      expect(
        create.mock.calls.at(-1)[0].data.tracks_json.play_along.arrangement_id,
      ).toBe(a.id);
      await expect(
        service.save({ ...payload, bpm: a.bpm + 1 }, actor),
      ).rejects.toMatchObject({ status: 400 });
    }
  });
  test("reference patterns vary across musical exercises rather than repeating one generic beat", () => {
    const patterns = new Set(
      catalog.songs
        .filter((s) => s.content_kind !== "LISTENING_REFERENCE")
        .map((s) => JSON.stringify(s.isukuti_pattern)),
    );
    expect(patterns.size).toBeGreaterThanOrEqual(7);
    expect(stepsFor("6/8")).toBe(12);
  });
});
const real = process.env.CMS_TEST_DATABASE_URL ? test : test.skip;
real(
  "production migration, ownership, immutable submissions and paired teacher Music scope in PostgreSQL",
  async () => {
    const url = process.env.CMS_TEST_DATABASE_URL!;
    expect(["localhost", "127.0.0.1"]).toContain(new URL(url).hostname);
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      expect(await db.music_Song.count()).toBeGreaterThanOrEqual(18);
      await expect(
        db.$transaction(
          async (tx) => {
            const school = await tx.school.create({
                data: {
                  name: "Music production fixture",
                  code: `MP-A-${Date.now()}`,
                },
              }),
              other = await tx.school.create({
                data: {
                  name: "Other music fixture",
                  code: `MP-B-${Date.now()}`,
                },
              });
            const stream1 = await tx.stream.create({
                data: { school_id: school.id, name: "M1", grade: "Grade 10" },
              }),
              stream2 = await tx.stream.create({
                data: { school_id: school.id, name: "M2", grade: "Grade 10" },
              });
            const student = await tx.user.create({
                data: {
                  schoolId: school.id,
                  name: "Music student",
                  role: "STUDENT",
                  grade: "Grade 10",
                  studentProfile: { create: { stream: "M1" } },
                },
              }),
              s2 = await tx.user.create({
                data: {
                  schoolId: school.id,
                  name: "Other stream student",
                  role: "STUDENT",
                  grade: "Grade 10",
                  studentProfile: { create: { stream: "M2" } },
                },
              }),
              s3 = await tx.user.create({
                data: {
                  schoolId: other.id,
                  name: "Other school student",
                  role: "STUDENT",
                  grade: "Grade 10",
                  studentProfile: { create: { stream: "M1" } },
                },
              });
            const teacher = await tx.user.create({
              data: {
                schoolId: school.id,
                name: "Music teacher",
                role: "TEACHER",
              },
            });
            await tx.teacherAssignment.createMany({
              data: [
                {
                  teacher_id: teacher.id,
                  school_id: school.id,
                  stream_id: stream1.id,
                  subject: "Music & Dance",
                },
                {
                  teacher_id: teacher.id,
                  school_id: school.id,
                  stream_id: stream2.id,
                  subject: "Physics",
                },
              ],
            });
            const service = new MusicProductionService(
                tx as any,
                {
                  getLabConfig: async () => ({ category: "ARTS_MUSIC" }),
                } as any,
              ),
              a = { ...actor, id: student.id, schoolId: school.id };
            const own = await service.save(draft(), a);
            expect(own.tracks_json).toEqual(draft().tracks_json);
            await expect(
              service.get(own.id, { ...a, id: s2.id }),
            ).rejects.toMatchObject({ status: 404 });
            expect((await service.submit(own.id, a)).status).toBe("SUBMITTED");
            await expect(
              service.save(draft(), a, own.id),
            ).rejects.toMatchObject({ status: 409 });
            const makeOther = async (student_id: number) =>
              tx.music_Project.create({
                data: {
                  student_id,
                  title: "Other submission",
                  bpm: 90,
                  time_signature: "6/8",
                  tracks_json: draft().tracks_json as any,
                  status: "SUBMITTED",
                  submitted_at: new Date(),
                },
              });
            const wrongStream = await makeOther(s2.id),
              wrongSchool = await makeOther(s3.id),
              t: any = { id: teacher.id, schoolId: school.id, role: "TEACHER" };
            expect((await service.submissions(t)).map((p) => p.id)).toEqual([
              own.id,
            ]);
            for (const id of [wrongStream.id, wrongSchool.id])
              await expect(
                service.review(id, { score: 80, comment: "Review" }, t),
              ).rejects.toMatchObject({ status: 403 });
            await service.review(
              own.id,
              {
                score: 82,
                comment: "Clear rhythmic contrast and thoughtful balance.",
              },
              t,
            );
            const assessed = await service.get(own.id, a);
            expect(assessed.status).toBe("ASSESSED");
            expect(assessed.score).toBe(82);
            throw Error("ROLLBACK_PRODUCTION_TEST");
          },
          { timeout: 30000 },
        ),
      ).rejects.toThrow("ROLLBACK_PRODUCTION_TEST");
    } finally {
      await db.$disconnect();
    }
  },
  40000,
);
