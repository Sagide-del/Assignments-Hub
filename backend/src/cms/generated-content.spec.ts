import {
  cmsGenerationTokens,
  validateCmsGeneratedContent,
} from "./generated-content";
const valid = () => ({
  theory_text: Array.from({ length: 300 }, () => "flight").join(" "),
  equations: ["L=\\frac{1}{2}\\rho v^2SC_L"],
  illustration_prompt: "A labelled lift versus airspeed graph.",
  questions: Array.from({ length: 30 }, (_, i) => ({
    question_text: `Question ${i + 1}`,
    options: ["Lift", "Weight", "Thrust", "Drag"],
    correct_answer: "Lift",
    explanation: "Lift is the upward aerodynamic force.",
  })),
});
describe("Strict CMS generated module contract", () => {
  it("accepts parsed and serialized JSON and preserves escaped LaTeX and answers", () => {
    expect(validateCmsGeneratedContent(valid())).toEqual(valid());
    expect(validateCmsGeneratedContent(JSON.stringify(valid()))).toEqual(
      valid(),
    );
  });
  it("requires exactly 300 whitespace-separated theory words and 30 distinct questions", () => {
    for (const count of [0, 299, 301])
      expect(() =>
        validateCmsGeneratedContent({
          ...valid(),
          theory_text: Array.from({ length: count }, () => "flight").join(" "),
        }),
      ).toThrow();
    for (const count of [0, 29, 31])
      expect(() =>
        validateCmsGeneratedContent({
          ...valid(),
          questions: Array.from({ length: count }, (_, i) => ({
            ...valid().questions[0],
            question_text: `Q${i}`,
          })),
        }),
      ).toThrow();
    const duplicate = valid();
    duplicate.questions[29].question_text = "  QUESTION   1 ";
    expect(() => validateCmsGeneratedContent(duplicate)).toThrow("Duplicate");
  });
  it("rejects missing or extra keys, malformed equations, empty explanations and nonmatching answer keys", () => {
    const missing = valid() as any;
    delete missing.illustration_prompt;
    expect(() => validateCmsGeneratedContent(missing)).toThrow();
    expect(() =>
      validateCmsGeneratedContent({ ...valid(), unrequested_field: "value" }),
    ).toThrow();
    expect(() =>
      validateCmsGeneratedContent({ ...valid(), equations: [123] }),
    ).toThrow();
    for (const edit of [
      { explanation: "" },
      { correct_answer: "A" },
      { options: ["a", "b", "c"] },
      { options: ["Lift", " lift ", "Thrust", "Drag"] },
      { unrequested_field: "value" },
    ]) {
      const content = valid();
      Object.assign(content.questions[0], edit);
      expect(() => validateCmsGeneratedContent(content)).toThrow();
    }
  });
  it("allows an empty equations array when the topic needs no equation", () => {
    expect(
      validateCmsGeneratedContent({ ...valid(), equations: [] } as unknown)
        .equations,
    ).toEqual([]);
  });
  it("stores provider totals, falls back to complete component counts and rejects unknown or unsafe accounting", () => {
    expect(
      cmsGenerationTokens({
        totalTokens: 1234,
        promptTokens: 234,
        completionTokens: 1000,
      }),
    ).toBe(1234);
    expect(
      cmsGenerationTokens({
        totalTokens: null,
        promptTokens: 200,
        completionTokens: 1000,
      }),
    ).toBe(1200);
    for (const usage of [
      { totalTokens: null, promptTokens: null, completionTokens: null },
      { totalTokens: -1, promptTokens: -1, completionTokens: 0 },
      { totalTokens: 1.5, promptTokens: null, completionTokens: null },
      { totalTokens: null, promptTokens: 2147483647, completionTokens: 1 },
    ])
      expect(() => cmsGenerationTokens(usage)).toThrow();
  });
});
