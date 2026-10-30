import {
  Droplets,
  DropletOff,
  CloudRain,
  Sun,
  Cloud,
  Sprout,
  Wheat,
  Leaf,
  Layers,
  GitBranch,
  Bug,
  AlertTriangle,
  FlaskConical,
  ShoppingBasket,
  Shovel,
  Thermometer,
  Wind,
  Zap,
  TrendingUp,
  TrendingDown,
  Coins,
  Clock3,
  UsersRound,
  BookOpen,
  Languages,
  Calculator,
  MapPin,
  Recycle,
  ShieldCheck,
  Microscope,
  Bean,
  Lightbulb,
  HeartPulse,
  CircleDot,
  CircuitBoard,
} from "lucide-react";
import { recallSymbol, type RecallSymbol } from "./recall-symbols";
const icons = {
  water: Droplets,
  drought: DropletOff,
  rain: CloudRain,
  sun: Sun,
  cloud: Cloud,
  plant: Sprout,
  crop: Wheat,
  weed: Leaf,
  soil: Layers,
  roots: GitBranch,
  insect: Bug,
  disease: AlertTriangle,
  nutrients: FlaskConical,
  harvest: ShoppingBasket,
  tools: Shovel,
  temperature: Thermometer,
  wind: Wind,
  energy: Zap,
  growth: TrendingUp,
  decline: TrendingDown,
  money: Coins,
  time: Clock3,
  people: UsersRound,
  book: BookOpen,
  language: Languages,
  numbers: Calculator,
  location: MapPin,
  cycle: Recycle,
  protection: ShieldCheck,
  microscope: Microscope,
  seed: Bean,
  idea: Lightbulb,
  light: Lightbulb,
  heart: HeartPulse,
  lungs: Wind,
  cell: CircleDot,
  circuit: CircuitBoard,
  mulch: Layers,
};
const colors: Partial<Record<RecallSymbol, string>> = {
  water: "#0284c7",
  drought: "#b45309",
  rain: "#0284c7",
  sun: "#ca8a04",
  weed: "#4d7c0f",
  plant: "#15803d",
  crop: "#15803d",
  soil: "#92400e",
  insect: "#be123c",
  disease: "#be123c",
  harvest: "#a16207",
  nutrients: "#7c3aed",
  roots: "#92400e",
  decline: "#dc2626",
  growth: "#15803d",
};
export function RecallConceptGlyph({
  label,
  detail = "",
  icon,
  x,
  y,
  size = 36,
}: {
  label: string;
  detail?: string;
  icon?: string;
  x?: number;
  y?: number;
  size?: number;
}) {
  const symbol = recallSymbol(label, detail, icon),
    Icon = icons[symbol];
  return (
    <Icon
      x={x}
      y={y}
      width={size}
      height={size}
      strokeWidth={1.6}
      color={colors[symbol] ?? "#486100"}
      aria-hidden="true"
      data-recall-symbol={symbol}
    />
  );
}
