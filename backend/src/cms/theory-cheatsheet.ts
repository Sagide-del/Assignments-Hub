/** A deliberately limited, inert TikZ concept-map dialect. No TeX is executed. */
export interface ConceptNode {
  id: string;
  x: number;
  y: number;
  label: string;
}
export interface ConceptMap {
  nodes: ConceptNode[];
  edges: { from: string; to: string }[];
}
export interface TheoryCheatsheet {
  key_concepts: string[];
  key_formulas: string[];
  common_mistakes: string[];
  concept_diagram: { type: "TIKZ_CODE"; latex_code: string };
}
export const CHEATSHEET_PROMPT = `Replace theory_text with theory_cheatsheet: {"key_concepts":["3–8 concise teaching points"],"key_formulas":["JSON-escaped LaTeX; [] when unnecessary"],"common_mistakes":["3–6 specific mistakes and their corrections"],"concept_diagram":{"type":"TIKZ_CODE","latex_code":"..."}}. The concept diagram MUST use ONLY this inert TikZ dialect: \\begin{tikzpicture} then 2–8 nodes like \\node (n1) at (1,2) {Plain text label}; and 1–12 edges like \\draw[->] (n1) -- (n2); then \\end{tikzpicture}. Coordinates must be 0–10 horizontally and 0–6 vertically. Separate node centres by at least 3 horizontally or 1.5 vertically. Labels must be short plain text (at most 60 characters), without TeX macros, nested braces or HTML. No styles, packages, loops, URLs, file access or other commands. Use the map to explain relationships in this topic, not to decorate it. Do not output theory_text. This concept-map contract is separate from question illustration payloads.`;
const obj = (v: unknown): Record<string, any> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("Expected a cheat-sheet object");
  return v as Record<string, any>;
};
function keys(o: Record<string, any>, expected: string[]) {
  if (Object.keys(o).sort().join(",") !== expected.sort().join(","))
    throw Error("Unexpected cheat-sheet fields");
}
function list(v: unknown, min: number, max: number, limit: number) {
  if (!Array.isArray(v) || v.length < min || v.length > max)
    throw Error("Invalid cheat-sheet list");
  const values = v.map((x) => {
    if (typeof x !== "string" || !x.trim() || x.length > limit)
      throw Error("Invalid cheat-sheet text");
    return x.trim();
  });
  if (new Set(values.map((x) => x.toLowerCase())).size !== values.length)
    throw Error("Duplicate cheat-sheet points");
  return values;
}
export function parseConceptMap(code: string): ConceptMap {
  if (typeof code !== "string" || code.length > 6000)
    throw Error("Invalid concept map");
  const wrapped = code
    .trim()
    .match(/^\\begin\{tikzpicture\}([\s\S]*)\\end\{tikzpicture\}$/);
  if (!wrapped) throw Error("Expected a TikZ concept map");
  const nodes: ConceptNode[] = [],
    edges: { from: string; to: string }[] = [];
  let rest = wrapped[1].replace(
    /\\node\s*\(([a-zA-Z][\w-]{0,19})\)\s*at\s*\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\)\s*\{([^{}\\<>\n]{1,60})\}\s*;/g,
    (_, id, x, y, label) => {
      nodes.push({ id, x: Number(x), y: Number(y), label: label.trim() });
      return "";
    },
  );
  rest = rest.replace(
    /\\draw\s*\[\s*->\s*\]\s*\(([a-zA-Z][\w-]{0,19})\)\s*--\s*\(([a-zA-Z][\w-]{0,19})\)\s*;/g,
    (_, from, to) => {
      edges.push({ from, to });
      return "";
    },
  );
  if (
    rest.trim() ||
    nodes.length < 2 ||
    nodes.length > 8 ||
    edges.length < 1 ||
    edges.length > 12 ||
    new Set(nodes.map((n) => n.id)).size !== nodes.length
  )
    throw Error("Unsupported or unsafe TikZ");
  if (nodes.some((n) => n.x > 10 || n.y > 6 || !n.label))
    throw Error("Invalid concept-map position");
  if (
    edges.some(
      (e) =>
        e.from === e.to ||
        !nodes.some((n) => n.id === e.from) ||
        !nodes.some((n) => n.id === e.to),
    )
  )
    throw Error("Invalid concept-map edge");
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      if (
        Math.abs(nodes[i].x - nodes[j].x) < 2.6 &&
        Math.abs(nodes[i].y - nodes[j].y) < 1.3
      )
        throw Error("Overlapping concept-map labels");
  return { nodes, edges };
}
export function validateTheoryCheatsheet(value: unknown): TheoryCheatsheet {
  const v = obj(value);
  keys(v, [
    "key_concepts",
    "key_formulas",
    "common_mistakes",
    "concept_diagram",
  ]);
  const d = obj(v.concept_diagram);
  keys(d, ["type", "latex_code"]);
  if (d.type !== "TIKZ_CODE") throw Error("Expected TIKZ_CODE");
  parseConceptMap(d.latex_code);
  return {
    key_concepts: list(v.key_concepts, 3, 8, 600),
    key_formulas: list(v.key_formulas, 0, 8, 1000),
    common_mistakes: list(v.common_mistakes, 3, 6, 600),
    concept_diagram: { type: "TIKZ_CODE", latex_code: d.latex_code.trim() },
  };
}
