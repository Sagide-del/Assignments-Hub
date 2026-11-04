export interface DiagramIllustration {
  type: "SVG_BLUEPRINT";
  blueprint: {
    apparatus_type: string;
    parameters: {
      arrangement?: "series" | "parallel";
      components?: string[];
      showLabels?: boolean;
      switch_closed?: boolean;
    };
  };
}
export function validateIllustration(
  value: unknown,
): DiagramIllustration | null {
  if (value === null || value === undefined) return null;
  const obj = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== "object" || Array.isArray(v))
      throw Error("Invalid diagram blueprint");
    return v as Record<string, unknown>;
  };
  const exact = (o: Record<string, unknown>, keys: string[]) => {
    if (Object.keys(o).some((k) => !keys.includes(k)))
      throw Error("Unexpected diagram field");
  };
  const i = obj(value);
  exact(i, ["type", "blueprint"]);
  if (i.type !== "SVG_BLUEPRINT")
    throw Error("Unsupported illustration format");
  const b = obj(i.blueprint);
  exact(b, ["apparatus_type", "parameters"]);
  if (
    typeof b.apparatus_type !== "string" ||
    !/^[a-z][a-z0-9_-]{0,47}$/.test(b.apparatus_type)
  )
    throw Error("Invalid apparatus type");
  const kind = b.apparatus_type.replace(/-/g, "_");
  const p = obj(b.parameters);
  if (p.showLabels !== undefined && typeof p.showLabels !== "boolean")
    throw Error("Invalid label flag");
  if (kind === "circuit") {
    exact(p, ["arrangement", "components", "showLabels", "switch_closed"]);
    if (
      !["series", "parallel"].includes(String(p.arrangement)) ||
      !Array.isArray(p.components) ||
      p.components.length < 2 ||
      p.components.length > 8 ||
      p.components.some(
        (c) => !["battery", "switch", "bulb", "wire"].includes(String(c)),
      )
    )
      throw Error("Invalid circuit parameters");
    const count = (c: string) =>
      (p.components as unknown[]).filter((v) => v === c).length;
    if (
      count("battery") !== 1 ||
      count("switch") > 1 ||
      count("bulb") < 1 ||
      count("bulb") > 4 ||
      (p.arrangement === "parallel" && count("bulb") < 2)
    )
      throw Error("Invalid circuit topology");
    if (p.switch_closed !== undefined && typeof p.switch_closed !== "boolean")
      throw Error("Invalid switch state");
  } else if (kind === "fractional_distillation") exact(p, ["showLabels"]);
  else exact(p, []);
  return {
    type: "SVG_BLUEPRINT",
    blueprint: {
      apparatus_type: kind,
      parameters: p as DiagramIllustration["blueprint"]["parameters"],
    },
  };
}
