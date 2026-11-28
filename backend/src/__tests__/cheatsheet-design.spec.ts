import { ConfigService } from "@nestjs/config";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import {
  librarySheetHtml,
  LibraryPdfService,
} from "../student/library-pdf.service";
import { resolveCheatsheetVisual } from "../cms/cheatsheet-visuals";
const sheet = () => ({
  key_concepts: [
    "Apply equal operations to both sides.",
    "Collect like terms before solving.",
    "Substitute the answer into the original equation.",
  ],
  key_formulas: ["2x+3=11\\implies x=4"],
  common_mistakes: [
    "Keep negative signs when collecting terms.",
    "Apply each operation to both sides.",
    "Check by substitution, not by guessing.",
  ],
  concept_diagram: {
    type: "TIKZ_CODE",
    latex_code:
      "\\begin{tikzpicture}\\node (a) at (1,3) {Equation};\\node (b) at (5,3) {Solve};\\draw[->] (a) -- (b);\\end{tikzpicture}",
  },
});
const moduleData = (topic = "Algebra") => ({
  topic,
  subject: "Mathematics",
  grade: 10,
  batch_number: 1,
  theory_cheatsheet: sheet(),
});
describe("Visual cheat-sheet standard", () => {
  it("uses exact curated matches and preserves diagrams for other topics", () => {
    expect(resolveCheatsheetVisual("Sports Skills")?.key).toBe("sports-skills");
    expect(resolveCheatsheetVisual("HEART")?.key).toBe("heart");
    expect(resolveCheatsheetVisual("Heart of a story")).toBeNull();
    expect(resolveCheatsheetVisual("../../etc/passwd")).toBeNull();
    const html = librarySheetHtml(
      moduleData(),
      sheet(),
      "data:image/png;base64,AA",
      "",
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Check your understanding");
    for (const point of sheet().key_concepts) expect(html).toContain(point);
  });
  it("adds explanatory image labels and escapes module metadata", () => {
    const html = librarySheetHtml(
      { ...moduleData("Sports Skills"), subject: '<img onerror="bad">' },
      sheet(),
      "data:image/png;base64,AA",
      "",
      "data:image/webp;base64,AA",
    );
    expect(html).toContain("Locomotor · run, jump, hop");
    expect(html).toContain("Realistic illustrations");
    expect(html).not.toContain('<img onerror="bad">');
    expect(html).toContain("filter:grayscale(1)");
  });
  it("bundles every curated illustration for offline PDFs", () => {
    for (const topic of [
      "Sports Skills",
      "Lungs",
      "Heart",
      "Plant Cell",
      "Electric Circuits",
    ]) {
      const visual = resolveCheatsheetVisual(topic)!;
      expect(
        readFileSync(
          join(
            __dirname,
            "..",
            "study-hub",
            "assets",
            "cheatsheet-illustrations",
            visual.key + ".webp",
          ),
        ).length,
      ).toBeGreaterThan(1000);
    }
  });
});
const browserTests = process.env.LIBRARY_CHROMIUM_EXECUTABLE
  ? describe
  : describe.skip;
browserTests("One-page PDF contract", () => {
  const service = () =>
    new LibraryPdfService(
      new ConfigService({
        LIBRARY_CHROMIUM_EXECUTABLE: process.env.LIBRARY_CHROMIUM_EXECUTABLE,
      }),
    );
  it("renders exactly one page and retains teaching text", async () => {
    const bytes = await service().render(moduleData());
    const info = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "-e",
          "const {PDFParse}=require('pdf-parse');(async()=>{const p=new PDFParse({data:require('fs').readFileSync(0)});const r=await p.getText();console.log(JSON.stringify({total:r.total,text:r.text}));await p.destroy();})().catch(e=>{console.error(e);process.exit(1)});",
        ],
        { input: bytes, encoding: "utf8" },
      ),
    );
    expect(info.total).toBe(1);
    expect(info.text).toContain("Apply equal operations");
  }, 30000);
  it("rejects oversized legacy content without dropping points", async () => {
    const data = moduleData();
    data.theory_cheatsheet.key_concepts = Array.from(
      { length: 8 },
      (_, i) =>
        `${i}. ` +
        "Explain this topic with a detailed example and careful reasoning. ".repeat(
          8,
        ),
    );
    data.theory_cheatsheet.common_mistakes = Array.from(
      { length: 6 },
      (_, i) =>
        `${i}. ` +
        "Avoid this error by checking the method against the original task. ".repeat(
          8,
        ),
    );
    await expect(service().render(data)).rejects.toThrow(
      "shorter teaching points",
    );
  }, 30000);
});
