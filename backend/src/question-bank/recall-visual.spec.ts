import { validateRecall } from "./content-tools";
import { validateRecallVisual } from "./recall-visual";
const card = {
  cue: "Describe how blood moves through the heart.",
  mnemonic: "Right to lungs, left to body.",
  explanation:
    "The right side pumps blood towards the lungs, while the left side pumps blood to the body.",
  facts: [
    { label: "Right ventricle", meaning: "Pumps blood to the lungs." },
    { label: "Left ventricle", meaning: "Pumps blood to the body." },
  ],
  checks: [
    {
      question: "Where does the right ventricle pump blood?",
      answer: "To the lungs.",
    },
    {
      question: "Where does the left ventricle pump blood?",
      answer: "To the body.",
    },
  ],
};
describe("Stored recall illustrations", () => {
  it("preserves legacy text cards and their source evidence without regeneration", () => {
    const result = validateRecall(card, [7]);
    expect(result.visual).toBeUndefined();
    expect(result.sourceIds).toEqual([7]);
  });
  it("stores an authored diagram reference while discarding arbitrary image/SVG input", () => {
    const result = validateRecall(
      {
        ...card,
        visual: {
          kind: "diagram",
          template: "heart",
          title: "Heart chambers",
          url: "https://untrusted.test/heart.png",
          svg: "<script>bad</script>",
        },
      },
      [7],
    );
    expect(result.visual).toEqual({
      kind: "diagram",
      template: "heart",
      title: "Heart chambers",
    });
  });
  it("preserves ordered steps and accurate editable labels", () => {
    const visual = {
      kind: "process",
      title: "Follow the blood",
      labels: [
        {
          label: "Right ventricle",
          detail: "Blood is pumped towards the lungs.",
        },
        { label: "Lungs", detail: "Oxygen enters the blood." },
      ],
    };
    expect(validateRecall({ ...card, visual }, [7]).visual).toEqual(visual);
  });
  it.each([
    {
      kind: "diagram",
      title: "Heart",
      template: "https://untrusted.test/heart.png",
    },
    { kind: "svg", title: "Unsafe" },
    { kind: "process", title: "Steps", labels: [] },
    { kind: "fraction", title: "Parts", numerator: 3, denominator: 0 },
    { kind: "fraction", title: "Parts", numerator: 5, denominator: 4 },
    { kind: "fraction", title: "Parts", numerator: 1.5, denominator: 4 },
  ])(
    "rejects unsupported or misleading visual data %# before publication",
    (visual) => {
      expect(() => validateRecall({ ...card, visual }, [7])).toThrow();
    },
  );
  it("renders fraction parts from validated numbers rather than a decorative stock drawing", () => {
    expect(
      validateRecallVisual({
        kind: "fraction",
        title: "Three quarters",
        numerator: 3,
        denominator: 4,
      }),
    ).toEqual({
      kind: "fraction",
      title: "Three quarters",
      numerator: 3,
      denominator: 4,
    });
  });
});
