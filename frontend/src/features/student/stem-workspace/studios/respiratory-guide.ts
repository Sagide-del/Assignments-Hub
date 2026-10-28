import type { RespiratoryStructure } from "../../../../../../backend/src/labs/respiratory-engine";
export const RESPIRATORY_GUIDE: Record<
  RespiratoryStructure,
  { name: string; short: string; description: string; observe: string }
> = {
  "right-lung": {
    name: "Right lung",
    short: "Three lobes",
    description:
      "The right lung has superior, middle and inferior lobes. Two fissures separate them. It is generally wider and shorter than the left lung.",
    observe:
      "Rotate the model to follow the horizontal and oblique fissures. Anatomical right appears on your left in the front view.",
  },
  "left-lung": {
    name: "Left lung",
    short: "Two lobes · cardiac notch",
    description:
      "The left lung has superior and inferior lobes. Its medial outline makes space for the heart; the anterior border has a cardiac notch.",
    observe:
      "Compare its outline and lobe count with the right lung. The two lungs are not mirror images.",
  },
  trachea: {
    name: "Trachea",
    short: "Main conducting airway",
    description:
      "The trachea carries air toward the lungs. Cartilage supports the airway. It divides into the right and left main bronchi at the carina.",
    observe:
      "Trace air down the trachea to the point where it divides. Gas exchange does not occur in the trachea.",
  },
  bronchi: {
    name: "Bronchial tree",
    short: "Branches into each lung",
    description:
      "The main bronchi divide into lobar and segmental bronchi. Smaller bronchioles carry air toward the respiratory zone. This atlas shows the larger conducting branches.",
    observe:
      "Use the airway view to see how the branching tubes enter the lung lobes. The right main bronchus is generally shorter, wider and more vertical.",
  },
  diaphragm: {
    name: "Diaphragm",
    short: "Muscle below the lungs",
    description:
      "During inspiration the diaphragm contracts, becomes flatter and moves down. Thoracic volume increases and air enters as alveolar pressure falls below atmospheric pressure. During quiet expiration it relaxes and elastic recoil helps air leave.",
    observe:
      "Play a breath and watch the diaphragm descend as the lungs expand. The lungs do not contain skeletal muscles that actively pull themselves open.",
  },
  alveoli: {
    name: "Alveoli",
    short: "Microscopic gas-exchange surfaces",
    description:
      "Alveoli have very thin walls next to capillaries. Oxygen diffuses from alveolar air into blood and carbon dioxide diffuses from blood into the airspace, following partial-pressure gradients.",
    observe:
      "This enlarged schematic shows the gas-exchange idea. It is separate from the atlas organ model and is not drawn to anatomical scale.",
  },
};
