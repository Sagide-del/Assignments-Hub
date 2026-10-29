import { learningDesign, recallDesign } from "./learning-design";

describe("Original grade-adapted assessment design", () => {
  it("adapts English without copying or forcing a full paper into a single outcome", () => {
    expect(learningDesign("English", "Grade 6")).toContain("short accessible");
    expect(learningDesign("English", "Grade 8")).toContain("cohesion");
    expect(learningDesign("English", "Grade 11", true)).toContain(
      "tone, argument",
    );
    expect(learningDesign("English", "Grade 11", true)).toContain(
      "task-specific rubric",
    );
    expect(learningDesign("English", "Grade 7")).toContain(
      "EVERY relevant questionText",
    );
    expect(learningDesign("English", "Grade 7")).toContain(
      "grammar-only outcome",
    );
  });
  it.each([
    "Mathematics",
    "Kiswahili",
    "Social Studies",
    "Agriculture",
    "CRE",
    "Pre-Technical Studies",
  ])(
    "applies reasoning and recall guidance to %s without mislabelling it English",
    (subject) => {
      const prompt = learningDesign(subject, "Grade 7");
      expect(prompt).toContain("misconceptions");
      expect(prompt).toContain("retrieval cue");
      expect(prompt).toContain("Never claim KICD approval");
      expect(prompt).not.toContain("ENGLISH DESIGN");
    },
  );
  it("supports retrieval, misconception correction, transfer and spaced revisits", () => {
    expect(recallDesign).toContain("three different checks");
    expect(recallDesign).toContain("1, 3, 7 and 14");
    expect(recallDesign).toContain("not guaranteed retention");
  });
});
