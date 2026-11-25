import { subjectKey } from "../student/student-scope.policy";
import { recallRecords } from "../study-hub/recall-history";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { RecoveryService } from "./recovery.service";
import PDFDocument = require("pdfkit");
import { join } from "path";

export type EngagementEvent = {
  at: string;
  kind: string;
  title: string;
  subject: string | null;
  score: number | null;
};
const nairobi = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
@Injectable()
export class EngagementReportService {
  constructor(
    private readonly db: PrismaService,
    private readonly recovery: RecoveryService,
  ) {}
  async data(actor: AuthenticatedUser, days = 30) {
    if (actor.role !== Role.STUDENT) throw new ForbiddenException();
    if (![7, 30, 90].includes(days))
      throw new BadRequestException("Choose 7, 30 or 90 days.");
    const to = new Date(),
      today = to.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }),
      from = new Date(
        new Date(`${today}T00:00:00+03:00`).getTime() - (days - 1) * 86400000,
      ),
      period = { gte: from, lte: to },
      owned = { studentId: actor.id, schoolId: actor.schoolId };
    const [
      student,
      logins,
      presence,
      coach,
      submissions,
      labs,
      skills,
      recovery,
      weeks,
      mocks,
      music,
      sports,
      arrangements,
    ] = await Promise.all([
      this.db.user.findFirstOrThrow({
        where: { id: actor.id, schoolId: actor.schoolId, role: "STUDENT" },
        select: {
          name: true,
          grade: true,
          admissionNumber: true,
          school: { select: { name: true } },
        },
      }),
      this.db.auditLog.findMany({
        where: {
          userId: actor.id,
          schoolId: actor.schoolId,
          action: "auth.login",
          createdAt: period,
        },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      this.db.userPresenceSession.findMany({
        where: {
          userId: actor.id,
          schoolId: actor.schoolId,
          lastSeenAt: { gte: from },
          startedAt: { lte: to },
        },
        select: { startedAt: true, lastSeenAt: true },
      }),
      this.db.learningCoachSession.findMany({
        where: { ...owned, completedAt: period },
        select: {
          completedAt: true,
          score: true,
          plan: { select: { subject: true, topic: true } },
        },
      }),
      this.db.submission.findMany({
        where: {
          studentId: actor.id,
          completedAt: period,
          status: { not: "DRAFT" },
          assignment: { schoolId: actor.schoolId },
        },
        select: {
          completedAt: true,
          resultsReleasedAt: true,
          score: true,
          assignment: {
            select: { title: true, subject: true, maxPoints: true },
          },
        },
      }),
      this.db.labSession.findMany({
        where: { ...owned, completedAt: period },
        select: {
          labKey: true,
          completedAt: true,
          quizCompletedAt: true,
          score: true,
          maxScore: true,
        },
      }),
      this.db.skillLessonProgress.findMany({
        where: {
          completedAt: period,
          enrollment: {
            studentId: actor.id,
            student: { schoolId: actor.schoolId },
          },
        },
        select: {
          completedAt: true,
          lessonKey: true,
          enrollment: { select: { course: { select: { title: true } } } },
        },
      }),
      this.recovery.load(actor),
      this.db.study_Timetable.findMany({
        where: {
          student_id: actor.id,
          school_id: actor.schoolId,
          week_start: { lte: to },
        },
        select: { plan_json: true },
      }),
      this.db.kjseaMockAttempt.findMany({
        where: {
          ...owned,
          status: "SUBMITTED",
          completedAt: period,
          NOT: { questions: { array_contains: [{ manualSelfReview: true }] } },
        },
        select: {
          subject: true,
          score: true,
          coverage: true,
          completedAt: true,
        },
      }),
      this.db.music_Studio_Project.findMany({
        where: {
          student_id: actor.id,
          student: { schoolId: actor.schoolId },
          updated_at: period,
        },
        select: { title: true, updated_at: true },
      }),
      this.db.sports_Lab_Progress.findMany({
        where: {
          student_id: actor.id,
          student: { schoolId: actor.schoolId },
          completed_at: period,
        },
        select: { simulation: true, completed_at: true },
      }),
      this.db.music_Project.findMany({
        where: {
          student_id: actor.id,
          student: { schoolId: actor.schoolId },
          updated_at: period,
        },
        select: { title: true, updated_at: true },
      }),
    ]);
    const events: EngagementEvent[] = [];
    const add = (
      at: Date | string,
      kind: string,
      title: string,
      subject: string | null = null,
      score: number | null = null,
    ) =>
      events.push({
        at: new Date(at).toISOString(),
        kind,
        title,
        subject,
        score:
          score === null || !Number.isFinite(score) || score < 0 || score > 100
            ? null
            : Math.round(score),
      });
    logins.forEach((l) => add(l.createdAt, "Login", "Signed in"));
    coach.forEach((s) =>
      add(s.completedAt!, "Coach quiz", s.plan.topic, s.plan.subject, s.score),
    );
    submissions.forEach((s) =>
      add(
        s.completedAt!,
        "Assignment",
        s.assignment.title,
        s.assignment.subject,
        s.resultsReleasedAt && s.score !== null && s.assignment.maxPoints > 0
          ? (s.score / s.assignment.maxPoints) * 100
          : null,
      ),
    );
    const labNames = labs.length
      ? await this.db.lab.findMany({
          where: { key: { in: labs.map((l) => l.labKey) } },
          select: { key: true, subject: true, title: true },
        })
      : [];
    labs.forEach((l) =>
      add(
        l.completedAt!,
        "Lab",
        labNames.find((m) => m.key === l.labKey)?.title ?? l.labKey,
        labNames.find((m) => m.key === l.labKey)?.subject ?? null,
        l.quizCompletedAt && l.maxScore && l.score !== null
          ? (100 * l.score) / l.maxScore
          : null,
      ),
    );
    skills.forEach((s) =>
      add(
        s.completedAt!,
        "Skill lesson",
        `${s.enrollment.course.title}: ${s.lessonKey}`,
      ),
    );
    let timetableCompleted = 0,
      timetableTotal = 0;
    for (const w of weeks) {
      const p = w.plan_json as any;
      if (!p || !Array.isArray(p.days)) continue;
      for (const day of p.days) {
        const date = new Date(`${day.date}T00:00:00+03:00`);
        if (date < from || date > to) continue;
        for (const b of day.blocks ?? [])
          if (b.activity_type === "STUDY") {
            timetableTotal++;
            if ((p.completed_block_ids ?? []).includes(b.id))
              timetableCompleted++;
          }
      }
      for (const r of recallRecords(p)) {
        if (new Date(r.completed_at) < from || new Date(r.completed_at) > to)
          continue;
        add(
          r.completed_at,
          "Timetable recall",
          r.topic,
          r.subject,
          (100 * r.score) / r.total,
        );
      }
    }
    mocks.forEach((m) => {
      const c = m.coverage as any;
      add(
        m.completedAt!,
        "Mock quiz",
        m.subject,
        m.subject,
        m.score !== null && c?.totalMarks > 0
          ? (100 * m.score) / c.totalMarks
          : null,
      );
    });
    music.forEach((m) =>
      add(
        m.updated_at,
        "Music project (latest save)",
        m.title,
        "Music and Dance",
      ),
    );
    arrangements.forEach((m) =>
      add(
        m.updated_at,
        "Music arrangement (latest save)",
        m.title,
        "Music and Dance",
      ),
    );
    sports.forEach((s) =>
      add(s.completed_at!, "Sports lab", s.simulation, "Physical Education"),
    );
    events.sort((a, b) => b.at.localeCompare(a.at));
    const activeDays = new Set<string>();
    for (const e of events)
      activeDays.add(
        new Date(e.at).toLocaleDateString("en-CA", {
          timeZone: "Africa/Nairobi",
        }),
      );
    presence.forEach((p) =>
      activeDays.add(
        p.lastSeenAt.toLocaleDateString("en-CA", {
          timeZone: "Africa/Nairobi",
        }),
      ),
    );
    const scored = events.filter((e) => e.score !== null),
      subjectNames = [
        ...new Map(
          events
            .map((e) => e.subject)
            .filter((x): x is string => !!x)
            .map((s) => [subjectKey(s), s]),
        ).values(),
      ];
    const subjectScores = subjectNames
      .map((subject) => {
        const rows = scored.filter(
          (e) => subjectKey(e.subject) === subjectKey(subject),
        );
        return {
          subject,
          count: events.filter(
            (e) => subjectKey(e.subject) === subjectKey(subject),
          ).length,
          average: rows.length
            ? Math.round(rows.reduce((n, e) => n + e.score!, 0) / rows.length)
            : null,
        };
      })
      .sort((a, b) => b.count - a.count);
    const daily = Array.from({ length: days }, (_, i) => {
      const date = new Date(from.getTime() + i * 86400000).toLocaleDateString(
        "en-CA",
        { timeZone: "Africa/Nairobi" },
      );
      return {
        date,
        count: events.filter(
          (e) =>
            e.kind !== "Login" &&
            new Date(e.at).toLocaleDateString("en-CA", {
              timeZone: "Africa/Nairobi",
            }) === date,
        ).length,
      };
    });
    return {
      student,
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        days,
        timezone: "Africa/Nairobi",
      },
      summary: {
        logins: logins.length,
        lastLogin: logins[0]?.createdAt.toISOString() ?? null,
        activeDays: activeDays.size,
        subjects: subjectNames.length,
        activities: events.filter((e) => e.kind !== "Login").length,
        average: scored.length
          ? Math.round(scored.reduce((n, e) => n + e.score!, 0) / scored.length)
          : null,
        timetableCompleted,
        timetableTotal,
      },
      subjectScores,
      daily,
      events,
      priorities: recovery.queue.slice(0, 3),
      notes:
        "Login counts are successful recorded sign-ins, not time spent studying. Scores include completed auto-marked practice and released assignment results only. Timetable completion is learner-reported. Music saves and sports progress show the latest stored record, not every edit. Latest events shown in the PDF; full recorded timeline available in Study Hub.",
    };
  }
  async pdf(actor: AuthenticatedUser, days = 30) {
    return renderEngagementPdf(await this.data(actor, days));
  }
}
export type EngagementReport = Awaited<
  ReturnType<EngagementReportService["data"]>
>;
export function renderEngagementPdf(r: EngagementReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        bufferPages: true,
        info: {
          Title: "Assignment Hub | Parent Learning Snapshot",
          Author: "Assignment Hub Kenya",
        },
      }),
      chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.registerFont(
      "Body",
      join(
        __dirname,
        "..",
        "study-hub",
        "assets",
        "report-open-sans-regular.ttf",
      ),
    );
    doc.registerFont(
      "Strong",
      join(
        __dirname,
        "..",
        "study-hub",
        "assets",
        "report-open-sans-semibold.ttf",
      ),
    );
    const C = {
      ink: "#143e32",
      muted: "#6b7773",
      lime: "#b5e61d",
      green: "#399b7d",
      purple: "#8970c7",
      amber: "#dfa944",
      red: "#dd7680",
      line: "#e6ece8",
    };
    const text = (
      value: unknown,
      x: number,
      y: number,
      size = 10,
      color = C.ink,
      width = 531,
      bold = false,
    ) => {
      doc
        .font(bold ? "Strong" : "Body")
        .fontSize(size)
        .fillColor(color);
      let str = String(value ?? "");
      if (doc.widthOfString(str) > width) {
        while (str.length && doc.widthOfString(str + "…") > width)
          str = str.slice(0, -1);
        str += "…";
      }
      doc.text(str, x, y, { lineBreak: false });
    };
    const paragraph = (
      value: string,
      x: number,
      y: number,
      width: number,
      size = 9,
      color = C.muted,
      lines = 2,
    ) =>
      doc
        .font("Body")
        .fontSize(size)
        .fillColor(color)
        .text(value, x, y, {
          width,
          height: size * 1.65 * lines,
          ellipsis: true,
          lineGap: 2,
        });
    // Crop the existing wordmark in PDF coordinates. No white image canvas or remote assets.
    doc.save().rect(32, 24, 155, 39).clip();
    doc.image(
      join(__dirname, "..", "study-hub", "assets", "assignment-hub.png"),
      24.54,
      -20.29,
      { width: 168.75 },
    );
    doc.restore();
    text("PARENT LEARNING REPORT", 343, 27, 8, C.muted, 220, true);
    text("A clear view of your child’s progress", 343, 43, 8, C.muted, 220);
    doc.moveTo(32, 76).lineTo(563, 76).strokeColor(C.line).stroke();
    text("Learning snapshot", 32, 88, 26, C.ink, 531, true);
    text(r.student.name, 32, 130, 16, C.ink, 531, true);
    text(
      [r.student.grade, r.student.admissionNumber, r.student.school.name]
        .filter(Boolean)
        .join("  ·  "),
      32,
      156,
      9,
      C.muted,
      531,
    );
    const shortDate = (s: string) =>
      new Date(s).toLocaleDateString("en-GB", {
        timeZone: "Africa/Nairobi",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    doc.roundedRect(32, 181, 531, 48, 8).fill("#eff5ef");
    text(
      `${r.summary.activities} activities across ${r.summary.subjects} subjects`,
      45,
      190,
      12,
      C.ink,
      505,
      true,
    );
    text(
      `${shortDate(r.period.from)} – ${shortDate(r.period.to)}  ·  Last sign-in: ${r.summary.lastLogin ? nairobi(r.summary.lastLogin) + " EAT" : "none recorded"}`,
      45,
      210,
      8,
      C.muted,
      505,
    );
    const metrics = [
      ["Days active", r.summary.activeDays],
      ["Successful sign-ins", r.summary.logins],
      [
        "Practice average",
        r.summary.average === null ? "Not scored" : r.summary.average + "%",
      ],
      [
        "Timetable check-offs",
        r.summary.timetableCompleted + "/" + r.summary.timetableTotal,
      ],
    ];
    metrics.forEach(([label, value], i) => {
      const x = 32 + i * 136;
      text(value, x, 249, 21, i === 2 ? C.purple : C.ink, 125, true);
      text(label, x, 281, 8, C.muted, 130);
    });
    doc.moveTo(32, 307).lineTo(563, 307).strokeColor(C.line).stroke();
    text("What your child worked on", 32, 323, 11, C.ink, 255, true);
    text("Activities, not time spent", 32, 342, 8, C.muted, 255);
    text("How subjects are progressing", 308, 323, 11, C.ink, 255, true);
    text("Based on scores in this reporting period", 308, 342, 8, C.muted, 255);
    type Slice = { label: string; value: number; color: string };
    const donut = (
      cx: number,
      cy: number,
      slices: Slice[],
      total: number,
      label: string,
    ) => {
      doc.circle(cx, cy, 40).fill("#edf1ee");
      if (total > 0) {
        let angle = -Math.PI / 2;
        for (const s of slices) {
          if (!s.value) continue;
          const end = angle + (s.value / total) * Math.PI * 2,
            steps = Math.max(2, Math.ceil((end - angle) * 16));
          doc
            .moveTo(cx, cy)
            .lineTo(cx + 40 * Math.cos(angle), cy + 40 * Math.sin(angle));
          for (let n = 1; n <= steps; n++) {
            const a = angle + ((end - angle) * n) / steps;
            doc.lineTo(cx + 40 * Math.cos(a), cy + 40 * Math.sin(a));
          }
          doc.closePath().fill(s.color);
          angle = end;
        }
      }
      doc.circle(cx, cy, 28).fill("#ffffff");
      doc.font("Strong").fontSize(20);
      const v = String(total);
      text(v, cx - doc.widthOfString(v) / 2, cy - 17, 20, C.ink, 65, true);
      doc.font("Body").fontSize(7);
      text(label, cx - doc.widthOfString(label) / 2, cy + 10, 7, C.muted, 65);
    };
    const counts = new Map<string, number>();
    for (const e of r.events) {
      if (e.kind === "Login") continue;
      const label =
        e.kind === "Assignment"
          ? "Assignments"
          : ["Coach quiz", "Timetable recall", "Mock quiz"].includes(e.kind)
            ? "Quizzes"
            : e.kind === "Lab" || e.kind === "Sports lab"
              ? "Labs"
              : e.kind === "Skill lesson"
                ? "Skill lessons"
                : "Creative work";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const palette = [C.green, C.purple, C.amber, "#6aa7c3", C.red];
    const activity = [...counts].map(([label, value], i) => ({
      label,
      value,
      color: palette[i % palette.length],
    }));
    const status: Slice[] = [
      {
        label: "Needs support",
        value: r.subjectScores.filter(
          (s) => s.average !== null && s.average < 50,
        ).length,
        color: C.red,
      },
      {
        label: "Building",
        value: r.subjectScores.filter(
          (s) => s.average !== null && s.average >= 50 && s.average < 80,
        ).length,
        color: C.amber,
      },
      {
        label: "Strong",
        value: r.subjectScores.filter(
          (s) => s.average !== null && s.average >= 80,
        ).length,
        color: C.green,
      },
      {
        label: "Not yet scored",
        value: r.subjectScores.filter((s) => s.average === null).length,
        color: "#bec7c1",
      },
    ];
    donut(85, 407, activity, r.summary.activities, "activities");
    donut(361, 407, status, r.subjectScores.length, "subjects");
    const legend = (slices: Slice[], x: number) =>
      slices
        .filter((s) => s.value > 0)
        .slice(0, 5)
        .forEach((s, i) => {
          doc.circle(x, 378 + i * 18, 3.5).fill(s.color);
          text(s.label, x + 10, 371 + i * 18, 8, C.muted, 104);
          text(String(s.value), x + 119, 371 + i * 18, 8, C.ink, 22, true);
        });
    legend(activity, 144);
    legend(status, 420);
    if (!activity.length)
      text("No activities recorded", 140, 390, 8, C.muted, 140);
    if (!r.subjectScores.length)
      text("No subjects scored yet", 414, 390, 8, C.muted, 145);
    text(
      "Needs support: below 50% · Building: 50–79% · Strong: 80%+",
      308,
      458,
      7,
      C.muted,
      255,
    );
    text("SUBJECT CHECK-IN", 32, 486, 9, C.muted, 340, true);
    text("Average", 432, 486, 8, C.muted, 62);
    text("Activities", 510, 486, 8, C.muted, 53);
    const shown = [...r.subjectScores]
      .sort((a, b) => (a.average ?? 101) - (b.average ?? 101))
      .slice(0, 4);
    shown.forEach((s, i) => {
      const y = 509 + i * 23;
      text(s.subject, 32, y, 10, C.ink, 310, true);
      doc.roundedRect(356, y + 5, 58, 5, 2).fill("#edf1ee");
      if (s.average !== null)
        doc
          .roundedRect(356, y + 5, Math.max(1, (58 * s.average) / 100), 5, 2)
          .fill(s.average < 50 ? C.red : s.average < 80 ? C.amber : C.green);
      text(
        s.average === null ? "—" : s.average + "%",
        434,
        y,
        10,
        C.ink,
        61,
        true,
      );
      text(s.count, 529, y, 9, C.muted, 34);
    });
    if (!shown.length)
      text(
        "Complete a short quiz to build your first check-in.",
        32,
        513,
        10,
        C.muted,
      );
    doc.roundedRect(32, 614, 531, 75, 8).fill("#f0edf8");
    text("Your next step together", 45, 625, 12, "#604b89", 500, true);
    const first = r.priorities[0];
    const action = first
      ? first.current !== null && first.current < 50
        ? `Focus on ${first.subject}: revisit a worked example together, then try a short quiz.`
        : first.current !== null && first.current < 80
          ? `Build confidence in ${first.subject}: practise one topic, discuss mistakes and try again on a new day.`
          : `Keep ${first.subject} strong: return for a short spaced review and explain an answer aloud.`
      : "Confirm report-card scores or try a short Coach quiz. Use the results to choose one manageable learning goal.";
    paragraph(action, 45, 649, 504, 10, C.ink, 2);
    text("LATEST RECORDED ACTIVITIES", 32, 708, 9, C.muted, 531, true);
    r.events.slice(0, 3).forEach((e, i) => {
      const y = 730 + i * 19;
      text(nairobi(e.at), 32, y, 8, C.muted, 106);
      text(`${e.kind}: ${e.title}`, 145, y, 8, C.ink, 355);
      text(e.score === null ? "—" : `${e.score}%`, 524, y, 8, C.ink, 39, true);
    });
    if (!r.events.length)
      text("No recorded activities in this period.", 32, 732, 9, C.muted);
    paragraph(
      "Practice scores are not school grades. Sign-ins do not measure study duration; timetable check-offs are self-reported. All times EAT. Up to 4 subjects and 3 events shown here; full details are in Study Hub.",
      32,
      793,
      531,
      7,
      C.muted,
      2,
    );
    text("assignmenthub.co.ke", 32, 825, 7, C.muted);
    text("1 / 1", 539, 825, 7, C.muted, 26);
    if (doc.bufferedPageRange().count !== 1) {
      reject(new Error("Report must fit exactly one page."));
      doc.end();
      return;
    }
    doc.end();
  });
}
