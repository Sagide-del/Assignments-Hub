export interface DiagramLabel {
  name: string;
  x: number;
  y: number;
  ax: number;
  ay: number;
  side: "left" | "right";
}
interface DiagramArtwork {
  src: string;
  viewBox: string;
  image: { x: number; y: number; width: number; height: number };
  caption: string;
  labels: DiagramLabel[];
}
export const RECALL_DIAGRAMS: Record<
  "heart" | "lungs" | "plant-cell" | "circuit",
  DiagramArtwork
> = {
  heart: {
    src: "/recall-illustrations/heart-cutaway.png",
    viewBox: "0 0 1000 650",
    image: { x: 40, y: 0, width: 920, height: 613 },
    caption: "Cutaway view · anatomical right appears on the left",
    labels: [
      { name: "Vena cava", x: 20, y: 120, ax: 357, ay: 108, side: "left" },
      { name: "Right atrium", x: 20, y: 300, ax: 346, ay: 269, side: "left" },
      {
        name: "Right ventricle",
        x: 20,
        y: 500,
        ax: 411,
        ay: 431,
        side: "left",
      },
      { name: "Aorta", x: 805, y: 120, ax: 519, ay: 90, side: "right" },
      { name: "Left atrium", x: 805, y: 300, ax: 639, ay: 245, side: "right" },
      {
        name: "Left ventricle",
        x: 805,
        y: 500,
        ax: 609,
        ay: 455,
        side: "right",
      },
    ],
  },
  lungs: {
    src: "/recall-illustrations/lungs-atlas.png",
    viewBox: "0 0 1000 650",
    image: { x: 40, y: 0, width: 920, height: 613 },
    caption: "Front view · the right lung appears on the left",
    labels: [
      { name: "Trachea", x: 20, y: 90, ax: 500, ay: 90, side: "left" },
      { name: "Right lung", x: 20, y: 300, ax: 352, ay: 299, side: "left" },
      { name: "Diaphragm", x: 20, y: 530, ax: 459, ay: 479, side: "left" },
      { name: "Left lung", x: 805, y: 180, ax: 699, ay: 239, side: "right" },
      { name: "Bronchi", x: 805, y: 330, ax: 500, ay: 180, side: "right" },
      { name: "Bronchioles", x: 805, y: 500, ax: 722, ay: 299, side: "right" },
    ],
  },
  "plant-cell": {
    src: "/recall-illustrations/plant-cell-atlas.png",
    viewBox: "0 0 1000 560",
    image: { x: 215, y: 80, width: 570, height: 380 },
    caption: "Cutaway model · structures are not drawn to scale",
    labels: [
      { name: "Cell wall", x: 20, y: 110, ax: 271, ay: 99, side: "left" },
      { name: "Nucleus", x: 20, y: 290, ax: 338, ay: 247, side: "left" },
      { name: "Cytoplasm", x: 20, y: 475, ax: 363, ay: 347, side: "left" },
      {
        name: "Cell membrane",
        x: 805,
        y: 180,
        ax: 744,
        ay: 273,
        side: "right",
      },
      { name: "Vacuole", x: 805, y: 310, ax: 586, ay: 247, side: "right" },
      { name: "Chloroplast", x: 805, y: 450, ax: 694, ay: 336, side: "right" },
    ],
  },
  circuit: {
    src: "/recall-illustrations/circuit-kit.png",
    viewBox: "0 0 1000 560",
    image: { x: 200, y: 50, width: 600, height: 400 },
    caption: "A closed conducting path connects both battery terminals",
    labels: [
      { name: "Battery", x: 20, y: 190, ax: 285, ay: 270, side: "left" },
      {
        name: "Connecting wire",
        x: 20,
        y: 470,
        ax: 450,
        ay: 395,
        side: "left",
      },
      {
        name: "Closed switch",
        x: 805,
        y: 100,
        ax: 520,
        ay: 120,
        side: "right",
      },
      { name: "Lamp", x: 805, y: 350, ax: 740, ay: 250, side: "right" },
    ],
  },
};
