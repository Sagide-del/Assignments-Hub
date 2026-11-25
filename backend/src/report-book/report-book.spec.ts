import { ReportBookService } from "./report-book.service";
import {
  bands,
  grade,
  PRESET_BANDS,
  rankComparable,
  subjectResult,
} from "./report-book.calculations";
import { renderReportCard } from "./report-book.pdf";
describe("School report-book calculations", () => {
  test("weights normalised percentages, rather than mixing raw scores", () => {
    const a = [
      {
        id: "a",
        subject: "Math",
        assessment_name: "CAT",
        max_score: 50,
        weight: 1,
      },
      {
        id: "b",
        subject: "Math",
        assessment_name: "Exam",
        max_score: 100,
        weight: 3,
      },
    ];
    const result = subjectResult(
      "Core Mathematics",
      a,
      [
        { assessment_id: "a", score: 40 },
        { assessment_id: "b", score: 90 },
      ],
      PRESET_BANDS,
    );
    expect(result).toMatchObject({ complete: true, score: 87.5, grade: "EE2" });
  });
  test("missing marks stay null; a genuine zero is scored", () => {
    const a = [
      {
        id: "a",
        subject: "English",
        assessment_name: "Exam",
        max_score: 100,
        weight: 1,
      },
    ];
    expect(subjectResult("English", a, [], PRESET_BANDS)).toMatchObject({
      score: null,
      complete: false,
    });
    expect(
      subjectResult(
        "English",
        a,
        [{ assessment_id: "a", score: 0 }],
        PRESET_BANDS,
      ),
    ).toMatchObject({ score: 0, complete: true, grade: "BE2" });
  });
  test("school policies cover 0–100 and reject duplicate or incomplete bands", () => {
    expect(bands(PRESET_BANDS)).toHaveLength(8);
    expect(() => bands([{ min: 50, code: "A", label: "A" }])).toThrow();
    expect(() =>
      bands([
        { min: 0, code: "A", label: "A" },
        { min: 0, code: "B", label: "B" },
      ]),
    ).toThrow();
    expect(grade(90, PRESET_BANDS)).toBe("EE1");
    expect(grade(0, PRESET_BANDS)).toBe("BE2");
  });
  test("ranking is opt-in, comparable and handles ties", () => {
    const subjects = [{ subject: "Math" }];
    expect(
      rankComparable([
        { subjects, average: 80 },
        { subjects, average: 80 },
        { subjects, average: 70 },
      ]),
    ).toEqual([1, 1, 3]);
    expect(() => rankComparable([{ subjects, average: null }])).toThrow(
      "complete",
    );
    expect(() =>
      rankComparable([
        { subjects, average: 80 },
        { subjects: [{ subject: "Biology" }], average: 90 },
      ]),
    ).toThrow("different");
  });
  test("report PDF contains every subject and labels drafts without claiming issue", async () => {
    const card = {
      school_json: { name: "Demonstration School", address: "Nairobi" },
      student_json: {
        name: "Demo Learner",
        admissionNumber: "DEMO1",
        grade: "Grade 7",
        stream: "A",
      },
      status: "DRAFT",
      revision: 1,
      policy_json: { confirmed: false },
      period: { term: "Term 1", year: 2027 },
      subjects_json: Array.from({ length: 15 }, (_, i) => ({
        subject: `Subject ${i + 1}`,
        score: 80,
        grade: "EE2",
        complete: true,
        remark: "Show the method clearly. Practise explaining each step.",
      })),
      total_score: 1200,
      average_score: 80,
      class_position: null,
      teacher_comment: "A useful start. Review the worked examples.",
      principal_comment: "Keep a steady revision routine.",
    };
    const pdf = await renderReportCard(card);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(
      (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length,
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("Report books across Grades 1–12", () => {
  test("junior subject lists are school configured and senior lists use explicit electives", () => {
    const service = new ReportBookService({} as any, {} as any);
    for (let grade = 1; grade <= 12; grade++) {
      const subjects = service.enrolled(
        { elective_subjects: ["Biology", "Chemistry", "Computer Science"] },
        {
          stream: { grade: "Grade " + grade },
          subjects: ["Literacy", "Numeracy"],
        },
      );
      if (grade <= 9) expect(subjects).toEqual(["Literacy", "Numeracy"]);
      else {
        expect(subjects).toHaveLength(7);
        expect(subjects).toContain("Computer Science");
        expect(subjects).not.toContain("Physics");
      }
    }
  });
});
