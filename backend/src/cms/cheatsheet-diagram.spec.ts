import { CmsService } from "./cms.service";
import { CheatsheetDiagramService } from "./cheatsheet-diagram.service";
import {
  cheatsheetDiagramSvg,
  validateCheatsheetDiagram,
} from "./cheatsheet-diagram";
import { validateTheoryCheatsheet } from "./theory-cheatsheet";
import { librarySheetHtml } from "../student/library-pdf.service";
const diagram = () => ({
  version: 1,
  title: "Equal forces",
  caption: "Opposite arrows show balanced forces on a stationary object.",
  shapes: [
    { type: "rect", x: 300, y: 120, width: 140, height: 100, fill: "light" },
    { type: "line", x1: 300, y1: 170, x2: 150, y2: 170, arrow: true },
    { type: "line", x1: 440, y1: 170, x2: 590, y2: 170, arrow: true },
    { type: "text", x: 100, y: 100, text: "5 N left", size: 20 },
    { type: "text", x: 500, y: 100, text: "5 N right", size: 20 },
  ],
});
const sheet = () => ({
  key_concepts: [
    "Equal forces balance.",
    "Opposite forces can cancel.",
    "Zero net force does not mean zero speed.",
  ],
  key_formulas: ["F_{net}=0"],
  common_mistakes: [
    "Distinguish force from speed.",
    "Include the direction.",
    "Use newtons for force.",
  ],
  concept_diagram: {
    type: "TIKZ_CODE",
    latex_code:
      "\\begin{tikzpicture}\\node (a) at (1,3) {Forces};\\node (b) at (5,3) {Balance};\\draw[->] (a) -- (b);\\end{tikzpicture}",
  },
});
const response = (content: unknown) => ({
  content,
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  model: "fixture",
});
describe("Automatic explanatory diagrams", () => {
  it("accepts safe geometry and escapes all labels", () => {
    const d = diagram();
    d.shapes[3] = {
      type: "text",
      x: 100,
      y: 100,
      size: 20,
      text: "<script>alert(1)</script>",
    };
    const svg = cheatsheetDiagramSvg(d);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain('viewBox="0 0 800 360"');
    expect(() =>
      validateCheatsheetDiagram({ ...diagram(), externalUrl: "https://bad" }),
    ).toThrow();
    for (const d of [
      "M 0 0 L 1 500",
      "M 1 2 javascript:alert(1)",
      "M 1..2 3 L 3 4",
      "M 1 2 L 3",
    ])
      expect(() =>
        validateCheatsheetDiagram({
          ...diagram(),
          shapes: [...diagram().shapes, { type: "path", d, fill: "none" }],
        }),
      ).toThrow();
  });
  it("keeps optional visual data across validation and PDF rendering", () => {
    const value = { ...sheet(), visual_diagram: diagram() };
    expect(validateTheoryCheatsheet(value).visual_diagram?.title).toBe(
      "Equal forces",
    );
    const html = librarySheetHtml(
      {
        topic: "Balanced forces",
        subject: "Physics",
        grade: 10,
        batch_number: 1,
      },
      value,
      "data:image/png;base64,AA",
      "",
    );
    expect(html).toContain("5 N left");
    expect(html).toContain("Opposite arrows show balanced forces");
  });
  it("creates a missing diagram through the metered router without rewriting notes", async () => {
    const ai = {
      generateAssignment: jest.fn().mockResolvedValue(response(diagram())),
    };
    const service = new CheatsheetDiagramService(ai as any);
    const original = sheet();
    const result = await service.ensure(
      original,
      "Balanced forces",
      "Physics",
      10,
      { userId: 7, schoolId: 1 },
    );
    expect(result.sheet.visual_diagram?.shapes).toHaveLength(5);
    expect(result.sheet.key_concepts).toEqual(original.key_concepts);
    expect(original).not.toHaveProperty("visual_diagram");
    expect(ai.generateAssignment).toHaveBeenCalledWith(
      expect.stringContaining('"topic":"Balanced forces"'),
      { userId: 7, schoolId: 1 },
    );
    expect(result.tokens).toBe(30);
  });
  it("reuses existing drawings and curated realistic plates with no provider call", async () => {
    const ai = { generateAssignment: jest.fn() };
    const service = new CheatsheetDiagramService(ai as any);
    await service.ensure(
      { ...sheet(), visual_diagram: diagram() },
      "Forces",
      "Physics",
      10,
    );
    await service.ensure(sheet(), "Sports Skills", "Sports Science", 10);
    expect(ai.generateAssignment).not.toHaveBeenCalled();
  });
  it("retries malformed drawings once and rejects repeated failure", async () => {
    const ai = {
      generateAssignment: jest
        .fn()
        .mockResolvedValueOnce(response({ bad: true }))
        .mockResolvedValueOnce(response(diagram())),
    };
    expect(
      (
        await new CheatsheetDiagramService(ai as any).ensure(
          sheet(),
          "Forces",
          "Physics",
          10,
        )
      ).tokens,
    ).toBe(60);
    ai.generateAssignment
      .mockReset()
      .mockResolvedValue(response({ bad: true }));
    await expect(
      new CheatsheetDiagramService(ai as any).ensure(
        sheet(),
        "Forces",
        "Physics",
        10,
      ),
    ).rejects.toThrow("No incomplete cheat sheet was saved");
    expect(ai.generateAssignment).toHaveBeenCalledTimes(2);
  });
  it("persists the automatically created drawing in both CMS projections", async () => {
    const content = {
      theory_cheatsheet: sheet(),
      equations: [],
      illustration_prompt: "Balanced forces",
      asset_url: null,
      questions: Array.from({ length: 30 }, (_, i) => ({
        question_text: `Exercise ${i}`,
        options: ["A", "B", "C", "D"],
        correct_answer: "A",
        explanation: "The forces balance.",
        illustration: null,
      })),
    };
    const ai = {
      generateAssignment: jest
        .fn()
        .mockResolvedValueOnce(response(content))
        .mockResolvedValueOnce(response(diagram())),
    };
    const prisma = {
      masterModule: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((v) => v.data),
      },
    };
    const service = new CmsService(
      prisma as any,
      ai as any,
      undefined,
      new CheatsheetDiagramService(ai as any),
    );
    jest
      .spyOn(service as any, "matchTaxonomy")
      .mockResolvedValue({
        id: "fixture",
        level: "Senior School",
        subject: "Physics",
        pathway: "STEM",
        track: "Pure Sciences",
        source: "fixture",
        verified: false,
      });
    const saved: any = await service.generateAiContent(
      { grade: 10, topic: "Balanced forces" } as any,
      { id: 7, schoolId: 1 } as any,
    );
    expect(saved.theory_cheatsheet.visual_diagram.title).toBe("Equal forces");
    expect(saved.content_json.theory_cheatsheet).toEqual(
      saved.theory_cheatsheet,
    );
    expect(saved.content_json.questions).toEqual(content.questions);
    expect(saved.generation_cost_tokens).toBe(60);
  });
  it("does not disguise credit failures or repeatedly call a broken provider", async () => {
    const ai = {
      generateAssignment: jest
        .fn()
        .mockRejectedValue(new Error("Quota exceeded")),
    };
    await expect(
      new CheatsheetDiagramService(ai as any).ensure(
        sheet(),
        "Forces",
        "Physics",
        10,
      ),
    ).rejects.toThrow("Quota exceeded");
    expect(ai.generateAssignment).toHaveBeenCalledTimes(1);
  });
});
