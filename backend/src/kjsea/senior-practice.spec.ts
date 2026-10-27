import { seniorSubjects, seniorPaper } from "./senior-practice";
describe("Original Grade 11 subject practice", () => {
  it("generates complete, distinct, reproducible sets with valid choices and worked explanations", () => {
    const subjects = seniorSubjects("Grade 11");
    expect(subjects).toHaveLength(11);
    expect(seniorSubjects("Grade 9")).toEqual([]);
    expect(seniorSubjects("Grade 12")).toEqual([]);
    for (const subject of subjects) {
      for (let seed = 1; seed <= 80; seed++) {
        const paper = seniorPaper(subject.subject, seed);
        expect(paper).toHaveLength(subject.questionCount);
        expect(new Set(paper.map((q) => q.prompt)).size).toBe(paper.length);
        expect(new Set(paper.map((q) => q.topicId)).size).toBe(
          subject.topicCount,
        );
        for (const q of paper) {
          expect(q.sourceGrade).toBe("Grade 11");
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(
            q.options.every((o) => o.trim() && !/NaN|Infinity/.test(o)),
          ).toBe(true);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(4);
          if (subject.varied) expect(q.explanation).toMatch(/[=÷×/]/);
          else expect(q.explanation.length).toBeGreaterThan(50);
        }
      }
      expect(seniorPaper(subject.subject, 64)).toEqual(
        seniorPaper(subject.subject, 64),
      );
      expect(seniorPaper(subject.subject, 64)).not.toEqual(
        seniorPaper(subject.subject, 65),
      );
    }
  });
  it("checks numerical answer keys independently using the values in question text", () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const subject of ["Mathematics", "Physics", "Chemistry"]) {
        for (const q of seniorPaper(subject, seed)) {
          const answer = Number.parseFloat(q.options[q.correctIndex]);
          const numbers = (q.prompt.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
          if (q.topic === "Newton’s second law")
            expect(answer).toBe(numbers[0] * numbers[1]);
          if (q.topic === "Kinetic energy")
            expect(answer).toBe(0.5 * numbers[0] * numbers[1] ** 2);
          if (q.topic === "Electrical resistance")
            expect(answer).toBeCloseTo(numbers[1] / numbers[0], 3);
          if (q.topic === "Molar concentration")
            expect(answer).toBeCloseTo(numbers[0] / numbers[1], 3);
          if (q.topic === "Percentage yield")
            expect(answer).toBeCloseTo((numbers[1] / numbers[0]) * 100, 3);
          if (q.topic === "Matrices")
            expect(answer).toBe(
              numbers[0] * numbers[3] - numbers[1] * numbers[2],
            );
          if (q.topic === "Compound interest")
            expect(answer).toBeCloseTo(
              numbers[0] * (1 + numbers[1] / 100) ** 2,
              3,
            );
        }
      }
    }
  });
  it("rejects unsupported subjects rather than substituting junior mathematics", () => {
    expect(() => seniorPaper("Not a subject", 1)).toThrow(
      "Unsupported senior practice subject",
    );
  });
});
