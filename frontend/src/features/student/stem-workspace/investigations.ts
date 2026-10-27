import type { Lab } from '../../../types';

export type ModelKind =
  | 'circuit'
  | 'filter'
  | 'plant'
  | 'pendulum'
  | 'hydroponics'
  | 'photoelectric';
export interface Investigation {
  model: ModelKind;
  question: string;
  context: string;
  learn: string;
  prediction: string;
  variable: string;
  measure: string;
  controls: string;
  steps: string[];
  explain: string;
  transfer: string;
  safety: string;
  limitation: string;
}
const packs: Record<string, Investigation> = {
  'js7-lab3': {
    model: 'circuit',
    question: 'What makes a bulb light up?',
    context:
      'A torch stops working during a power cut. Can you use a circuit model to explain why?',
    learn:
      'Current needs a closed conducting path. For a fixed resistance, increasing voltage increases current: I = V ÷ R. A break anywhere in this series circuit stops the current.',
    prediction:
      'What will happen to current when you double the voltage without changing resistance?',
    variable: 'Battery voltage (V)',
    measure: 'Current (A) and bulb state',
    controls: 'Resistance and switch position',
    steps: [
      'Close the switch. Set resistance to 10 Ω and voltage to 2 V. Record a trial.',
      'Keep resistance at 10 Ω. Test 4 V and 6 V; record each result.',
      'Open the switch and record another trial. Compare with the closed circuit.',
    ],
    explain:
      'Use two recorded currents to explain the effect of voltage. Why did opening the switch change the result?',
    transfer:
      'How would you check a torch that has a good battery but will not light?',
    safety:
      'This is a browser model. For a physical extension, use only a teacher-approved low-voltage kit. Never use mains electricity or short a battery.',
    limitation:
      'Ideal wires and a fixed-resistance bulb are assumed. Real filament resistance changes with temperature; the glow is illustrative, not a brightness measurement.',
  },
  'js7-lab2': {
    model: 'filter',
    question: 'Does clearer water mean safe water?',
    context:
      'After rain, water collected near a school garden looks muddy. Investigate what filtration can and cannot remove.',
    learn:
      'Settling allows heavier particles to sink. A filter traps some suspended particles. Dissolved chemicals and microbes may remain even when water looks clear.',
    prediction:
      'Which treatment do you think will remove the most visible particles? Will that prove the water is drinkable?',
    variable: 'Treatment method',
    measure: 'Illustrative suspended-particle count',
    controls: 'Starting sample: 100 visible particles; same volume',
    steps: [
      'Record the untreated sample as your baseline.',
      'Test settling and cloth filtration separately using the same starting sample.',
      'Test sand filtration. Compare the results, then explain why appearance is insufficient evidence of safety.',
    ],
    explain:
      'Compare your treatments using recorded particle counts. What important information is missing from this model?',
    transfer:
      'What would you tell someone who thinks clear stream water must be safe to drink?',
    safety:
      'Do not drink experimental water. Use clean containers and teacher supervision for physical filtration. Follow local public-health advice for safe drinking water.',
    limitation:
      'Particle counts are invented teaching values, not measured treatment efficiencies. The model does not test pathogens or dissolved contaminants.',
  },
  'js7-lab1': {
    model: 'plant',
    question: 'How could light affect seedling growth?',
    context:
      'Your school wants to choose a place for a small vegetable garden. Plan a fair comparison of light conditions.',
    learn:
      'Plants use light for photosynthesis. A fair test changes one factor while keeping others as similar as possible. A simplified model helps practise comparing data; actual plants vary.',
    prediction:
      'How will changing daily light affect the model’s growth index? What else must stay the same?',
    variable: 'Hours of light per day',
    measure: 'Model growth index after 7 days (arbitrary units)',
    controls: 'Water setting, seed type, soil, starting size and time',
    steps: [
      'Keep water at “Adequate”. Test 2, 6 and 10 hours of light; record each trial.',
      'Keep light at 6 hours. Compare too little, adequate and too much water.',
      'Separate the light comparison from the water comparison. Identify a fair pair of trials.',
    ],
    explain:
      'Which two trials isolate the effect of light? Use the index values, and explain why this does not predict an exact seedling height.',
    transfer:
      'Plan a real seven-day investigation with similar seedlings. Explain how you would measure growth and use repeats.',
    safety:
      'Wash hands after handling soil. Do not taste plants or fertilisers. Ask an adult before using gardening tools.',
    limitation:
      'This is an illustrative index, not centimetres or a biological prediction. Species, temperature, nutrients and real variation are omitted.',
  },
  'ss-phy-10-2': {
    model: 'pendulum',
    question: 'What controls a pendulum’s period?',
    context:
      'A hanging object swings back and forth. Investigate why changing its length changes its rhythm.',
    learn:
      'The period is the time for one complete back-and-forth swing. For a small angle, T = 2π√(L/g), with L in metres and g = 9.81 m/s². Mass cancels from this ideal model.',
    prediction:
      'If you make the length four times larger, how will the period change?',
    variable: 'Pendulum length (m)',
    measure: 'Period (s)',
    controls: 'Small release angle and gravitational acceleration',
    steps: [
      'Set length to 0.25 m. Record the calculated period.',
      'Repeat at 0.50 m and 1.00 m. Compare 0.25 m with 1.00 m.',
      'Change mass while keeping length fixed. Record a trial and explain the result.',
    ],
    explain:
      'Does quadrupling length double or quadruple the period? Support your answer with recorded values. Explain the mass comparison.',
    transfer:
      'Describe how to time ten oscillations in a supervised experiment and calculate the average period.',
    safety:
      'For a physical extension, use a securely supported small bob with a clear swing area. Never swing objects near faces.',
    limitation:
      'Small-angle, frictionless model. Air resistance, large angles and measurement error are omitted. The 3D motion illustrates the ideal model, not a measured physical experiment.',
  },
  'ss-agr-10-2': {
    model: 'hydroponics',
    question: 'Why does a hydroponic grower monitor pH?',
    context:
      'A small school growing project uses nutrient solution instead of soil. Explore how pH may affect nutrient availability.',
    learn:
      'pH describes how acidic or alkaline a solution is. Plants need dissolved nutrients, oxygen and suitable conditions. A useful pH range depends on the crop and growing system.',
    prediction:
      'What do you expect to happen to this model’s availability index as pH moves far from 6?',
    variable: 'Nutrient-solution pH',
    measure: 'Illustrative nutrient-availability index (%)',
    controls:
      'One notional crop; same nutrients, light, oxygen and temperature',
    steps: [
      'Test pH 4, 6 and 8. Record each model result.',
      'Test 5.5 and 6.5. Compare nearby and extreme settings.',
      'Use your results to propose a monitoring plan. State what this model cannot tell a real grower.',
    ],
    explain:
      'Which settings gave the highest index in this model? Why should a farmer check crop-specific advice instead of treating this curve as a universal rule?',
    transfer:
      'Design a daily record sheet for a school growing project: pH, observations, date and any teacher-approved adjustment.',
    safety:
      'Use the browser model for this activity. Do not handle nutrient concentrates or pH-adjusting chemicals without a trained adult and product-specific instructions.',
    limitation:
      'The curve is an invented teaching approximation, not a crop recommendation or yield prediction. Different nutrients and crops behave differently.',
  },
  'ss-phy-10-8': {
    model: 'photoelectric',
    question: 'Can brighter light always release electrons?',
    context:
      'Some sensors use light to release electrons from a surface. Compare photon energy with the energy needed to escape.',
    learn:
      'A photon has energy E = hf. An electron can escape only when hf is at least the work function φ. The maximum kinetic energy is hf − φ. Increasing intensity supplies more photons; it does not increase each photon’s energy.',
    prediction:
      'If photon energy is below the work function, will increasing intensity make electrons escape?',
    variable: 'Light frequency (×10¹⁴ Hz)',
    measure: 'Maximum electron kinetic energy (eV) and emission state',
    controls: 'Surface work function: 2.0 eV',
    steps: [
      'Set frequency to 4 ×10¹⁴ Hz. Record a trial, then increase intensity and record again.',
      'Set frequency to 6 and then 8 ×10¹⁴ Hz. Record each result.',
      'Estimate the threshold frequency using φ/h. Compare it with the model transition.',
    ],
    explain:
      'Explain why increasing intensity below the threshold does not cause emission. Use E = hf and one above-threshold trial.',
    transfer:
      'How does the photoelectric effect challenge the idea that brightness alone determines the energy delivered to one electron?',
    safety:
      'This is a browser-only model. Do not experiment with ultraviolet sources, exposed electrical equipment or lasers.',
    limitation:
      'Ideal single-photon model with a fixed 2.0 eV work function. Intensity is relative; emission rate, surface effects and current are not calculated.',
  },
};
export function investigationFor(
  lab: Pick<Lab, 'key'>,
): Investigation | undefined {
  return packs[lab.key];
}
export function modelResult(
  kind: ModelKind,
  value: number,
  secondary: number,
): { value: number; unit: string; label: string } {
  switch (kind) {
    case 'circuit':
      return {
        value: secondary === 0 ? 0 : value / secondary,
        unit: 'A',
        label: 'Current',
      };
    case 'filter':
      return {
        value: [100, 65, 40, 15][value] ?? 100,
        unit: 'particles',
        label: 'Suspended particles',
      };
    case 'plant':
      return {
        value: Math.round(
          Math.min(value, 10) *
            7 *
            (secondary === 1 ? 1 : secondary === 0 ? 0.3 : 0.5),
        ),
        unit: 'units',
        label: 'Growth index',
      };
    case 'pendulum':
      return {
        value: 2 * Math.PI * Math.sqrt(value / 9.81),
        unit: 's',
        label: 'Period',
      };
    case 'hydroponics':
      return {
        value: Math.round(100 * Math.exp(-0.5 * ((value - 6) / 1.2) ** 2)),
        unit: '%',
        label: 'Availability index',
      };
    case 'photoelectric':
      return {
        value: Math.max(0, 0.4135667696 * value - 2),
        unit: 'eV',
        label: 'Maximum kinetic energy',
      };
  }
}
export interface Trial {
  setting: string;
  result: string;
}
export interface LabDraft {
  prediction: string;
  observations: string;
  conclusion: string;
  transfer: string;
  checked: number[];
  answers: Record<number, string>;
  reflections: Record<number, string>;
  trials: Trial[];
}
export function emptyDraft(): LabDraft {
  return {
    prediction: '',
    observations: '',
    conclusion: '',
    transfer: '',
    checked: [],
    answers: {},
    reflections: {},
    trials: [],
  };
}
export function notebookKey(userId: number, labId: number) {
  return `stem-notebook-v1:${userId}:${labId}`;
}
export function notebookReady(
  draft: LabDraft,
  stepCount: number,
  questionIds: number[],
  reflectionIds: number[],
  interactive: boolean,
) {
  return (
    stepCount > 0 &&
    draft.prediction.trim().length > 0 &&
    draft.observations.trim().length > 0 &&
    draft.conclusion.trim().length > 0 &&
    Array.from({ length: stepCount }, (_, i) => i).every((i) =>
      draft.checked.includes(i),
    ) &&
    (!interactive || draft.trials.length >= 3) &&
    questionIds.every((id) => Boolean(draft.answers[id]?.trim())) &&
    reflectionIds.every((id) => Boolean(draft.reflections[id]?.trim()))
  );
}
