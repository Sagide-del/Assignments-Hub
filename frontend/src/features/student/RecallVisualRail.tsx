import {
  BatteryMedium,
  Dna,
  GitBranch,
  HeartPulse,
  Lightbulb,
  Network,
  RefreshCw,
  Shield,
  Sun,
  ToggleRight,
  UserRound,
  Wind,
  Droplets,
  CircleDot,
} from "lucide-react";
import type { RecallVisual } from "../../api/content-library.api";
export function RecallVisualRail({
  visual,
  reveal,
}: {
  visual: RecallVisual;
  reveal: boolean;
}) {
  if (visual.kind !== "diagram") return null;
  const items =
    visual.template === "heart"
      ? [
          { Icon: UserRound, label: "Body", color: "#64748b" },
          { Icon: HeartPulse, label: "Right heart", color: "#2563eb" },
          { Icon: Wind, label: "Lungs", color: "#0f766e" },
          { Icon: HeartPulse, label: "Left heart", color: "#dc2626" },
          { Icon: UserRound, label: "Body", color: "#64748b" },
        ]
      : visual.template === "plant-cell"
        ? [
            { Icon: Shield, label: "Support", color: "#15803d" },
            { Icon: Dna, label: "Control", color: "#7c3aed" },
            { Icon: Droplets, label: "Storage", color: "#0284c7" },
            { Icon: Sun, label: "Light", color: "#a16207" },
          ]
        : visual.template === "lungs"
          ? [
              { Icon: Wind, label: "Trachea", color: "#0f766e" },
              { Icon: GitBranch, label: "Bronchi", color: "#0891b2" },
              { Icon: Network, label: "Bronchioles", color: "#2563eb" },
              { Icon: CircleDot, label: "Alveoli", color: "#be123c" },
            ]
          : [
              { Icon: BatteryMedium, label: "Energy", color: "#64748b" },
              { Icon: ToggleRight, label: "Switch", color: "#486100" },
              { Icon: Lightbulb, label: "Light", color: "#a16207" },
              { Icon: RefreshCw, label: "Loop", color: "#0f766e" },
            ];
  return (
    <aside
      className="recall-visual-rail"
      aria-label={
        visual.template === "heart"
          ? "Trace blood circulation"
          : visual.template === "lungs"
            ? "Trace the airways"
            : "Visual memory cues"
      }
    >
      {items.map(({ Icon, label, color }, i) => (
        <div key={`${label}-${i}`} className="recall-pictogram">
          <span className="recall-pictogram-icon" style={{ color }}>
            <Icon size={28} strokeWidth={1.6} />
          </span>
          <span className="recall-pictogram-label">
            {reveal ? label : String(i + 1).padStart(2, "0")}
          </span>
          {i < items.length - 1 && visual.template !== "plant-cell" && (
            <span className="recall-pictogram-arrow" aria-hidden="true">
              ↓
            </span>
          )}
        </div>
      ))}
    </aside>
  );
}
