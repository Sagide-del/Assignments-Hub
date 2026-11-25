import { skillProgram } from "./focused-learning.service";
import { skillWorkbookHtml } from "./skill-workbook.service";
import programs from "./content/focused-programs.json";
describe("Curated skill design", () => {
  it("has an intentional focus, a project and meaningful transfer tasks for every course", () => {
    for (const p of programs) {
      expect(p.focus).toBeTruthy();
      expect(p.project.length).toBeGreaterThan(20);
      expect(new Set(p.lessons.map((l) => l.key)).size).toBe(p.lessons.length);
      for (const l of p.lessons) {
        expect(l.transfer.length).toBeGreaterThan(60);
        expect(l.practice.length).toBeGreaterThanOrEqual(3);
        expect(l.check.answer).toBeLessThan(l.check.options.length);
      }
    }
  });
  it("has two distinct six-session music courses and printable offline exercises", () => {
    for (const title of [
      "Music Production Foundations",
      "Songwriting & Arrangement",
    ]) {
      const p = skillProgram(title)!;
      expect(p.focus).toBe("MUSIC");
      expect(p.lessons).toHaveLength(6);
      expect(skillWorkbookHtml(title, "data:image/png;base64,AA")).toContain(
        "Project review",
      );
    }
  });
});
