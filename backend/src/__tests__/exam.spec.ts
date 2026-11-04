import { validateIllustration } from "../cms/diagram-blueprint";
import { projectedScore } from "../sba/calculations";
import { validateCmsGeneratedContent } from "../cms/generated-content";
const circuit = {
  type: "SVG_BLUEPRINT",
  blueprint: {
    apparatus_type: "circuit",
    parameters: {
      arrangement: "parallel",
      components: ["battery", "switch", "bulb", "bulb"],
    },
  },
};
describe("Exam SVG blueprints and generated explanations", () => {
  it("accepts a structured circuit and no illustration", () => {
    expect(validateIllustration(circuit)).toMatchObject(circuit);
    expect(validateIllustration(null)).toBeNull();
    expect(validateIllustration(undefined)).toBeNull();
  });
  it("rejects arbitrary SVG, scripts, answer labels and invalid topology", () => {
    for (const value of [
      { type: "SVG", svg: "<script/>" },
      {
        ...circuit,
        blueprint: {
          ...circuit.blueprint,
          parameters: {
            ...circuit.blueprint.parameters,
            svg: '<svg onload="alert(1)"/>',
          },
        },
      },
      { ...circuit, blueprint: { apparatus_type: "<img>", parameters: {} } },
      {
        ...circuit,
        blueprint: {
          ...circuit.blueprint,
          parameters: {
            arrangement: "parallel",
            components: ["battery", "bulb"],
          },
        },
      },
    ])
      expect(() => validateIllustration(value)).toThrow();
  });
  it("retains explanations and the validated blueprint in generated content", () => {
    const output = validateCmsGeneratedContent(
      {
        theory_text: Array(300).fill("theory").join(" "),
        equations: [],
        illustration_prompt: "A circuit.",
        questions: [
          {
            question_text: "Which circuit is parallel?",
            options: ["A", "B", "C", "D"],
            correct_answer: "A",
            explanation:
              "The bulbs have separate branches. Each branch connects across the supply.",
            illustration: circuit,
          },
        ],
      },
      1,
    );
    expect(output.questions[0].illustration).toEqual(circuit);
    expect(output.questions[0].explanation).toContain("separate branches");
  });
  it("preserves legacy four-field questions without inventing illustrations", () => {
    const output = validateCmsGeneratedContent(
      {
        theory_text: Array(300).fill("word").join(" "),
        equations: [],
        illustration_prompt: "No diagram needed.",
        questions: [
          {
            question_text: "What is one?",
            options: ["1", "2", "3", "4"],
            correct_answer: "1",
            explanation: "One is the first positive integer.",
          },
        ],
      },
      1,
    );
    expect(output.questions[0].illustration).toBeUndefined();
  });
  it("calculates the specified projection without treating missing evidence as zero", () => {
    expect(projectedScore(60, 80, 90)).toBe(84);
    expect(projectedScore(0, 0, 0)).toBe(0);
    expect(projectedScore(60, null, 90)).toBeNull();
  });
});
