import type {
  StarchEvent,
  StarchState,
  LeafSample,
} from "../../../../../../backend/src/labs/starch-engine";
export interface StarchGuideStep {
  title: string;
  caption: string;
  events: StarchEvent[];
}
const heat = (count: number): StarchEvent[] =>
  Array.from({ length: count }, () => ({ type: "heat", seconds: 10 }));
export function starchGuide(sample: LeafSample): StarchGuideStep[] {
  return [
    {
      title: "Prepare a fair test",
      caption:
        "We are testing a prepared leaf for starch. Compare a light-grown leaf with a destarched dark control. Keep plant species, leaf age, water and exposure time comparable. This demonstration does not complete your own practical.",
      events: [],
    },
    {
      title: "Protect your eyes",
      caption:
        "Put on eye protection before handling hot water, ethanol or iodine. In a real laboratory, work under your teacher’s supervision.",
      events: [{ type: "ppe" }],
    },
    {
      title: "Heat the water bath",
      caption:
        "Light the Bunsen burner beneath the water bath. Heat the water close to boiling. Heating in this simulation is accelerated; these are not real laboratory timings.",
      events: [{ type: "burner", on: true }, ...heat(2)],
    },
    {
      title: "Prepare the leaf in hot water",
      caption:
        "Use forceps to put the leaf into the hot water. This kills the leaf and disrupts its cells, allowing the reagents to reach the tissue.",
      events: [{ type: "leaf-water" }, ...heat(3)],
    },
    {
      title: "Extinguish the flame",
      caption:
        "Turn the burner off before opening ethanol. Ethanol is highly flammable. Never heat ethanol directly over a flame.",
      events: [{ type: "burner", on: false }],
    },
    {
      title: "Prepare the ethanol tube",
      caption:
        "With the flame off, add ethanol to the test tube. The hot water bath will provide gentle indirect heating.",
      events: [{ type: "ethanol-fill" }],
    },
    {
      title: "Transfer the leaf",
      caption:
        "Use forceps to transfer the boiled leaf into the ethanol tube. The ethanol will dissolve the green chlorophyll.",
      events: [{ type: "leaf-ethanol" }],
    },
    {
      title: "Remove the chlorophyll",
      caption:
        "Use the tube holder to place the ethanol tube in the hot, off-flame water bath. Watch the ethanol become green and the leaf become pale as chlorophyll is extracted.",
      events: [{ type: "tube-bath" }, ...heat(6)],
    },
    {
      title: "Rinse and soften",
      caption:
        "Lift the decolourised leaf out with forceps and rinse it in warm water. This removes ethanol and softens the brittle leaf.",
      events: [{ type: "rinse" }],
    },
    {
      title: "Spread the leaf on a white tile",
      caption:
        "Place the leaf flat on the white tile. A white background makes the iodine colour change easier to observe.",
      events: [{ type: "dish" }],
    },
    {
      title: "Load the iodine dropper",
      caption:
        "Use a separate dropper to draw iodine solution from its bottle. The burner remains off.",
      events: [{ type: "load-iodine" }],
    },
    {
      title: "Apply iodine and observe",
      caption:
        "Apply iodine solution to the prepared leaf and watch the colour change. Blue-black indicates starch; yellow-brown indicates no starch detected.",
      events: [{ type: "iodine" }],
    },
    {
      title: "Interpret your evidence",
      caption:
        sample === "dark"
          ? "This dark-control leaf stays yellow-brown: no starch is detected. Compare it with a light-grown leaf, which turns blue-black."
          : "light" === sample
            ? "This light-grown leaf turns blue-black: starch is present. Compare it with the dark control, which stays yellow-brown."
            : "Only regions that were green turn blue-black. Non-green regions remain yellow-brown. This supports the role of chlorophyll in photosynthesis.",
      events: [],
    },
    {
      title: "Now try the practical yourself",
      caption:
        "The demonstration is complete. Choose another sample to compare, or switch to Self practical to operate the equipment and record your own observations. Watching the demonstration does not add results to your notebook.",
      events: [],
    },
  ];
}
export function starchInstruction(s: StarchState): string {
  if (!s.ppe)
    return "Put on eye protection first. Then select Striker / gas and click the Bunsen burner.";
  if (s.leaf === "plant")
    return s.waterTemperature >= 95
      ? "The bath is hot. Select Forceps, then click the Water bath to transfer the leaf."
      : s.burner
        ? "Watch the water bath heat. When it reaches at least 95 degrees, use forceps to transfer the leaf."
        : "Select Striker / gas, then click the Bunsen burner to light it.";
  if (s.leaf === "water" && s.boilSeconds < 30)
    return "Keep the leaf in the hot water until its preparation reaches 30 simulated seconds.";
  if (s.burner)
    return "The leaf is prepared. Select Striker / gas and click the burner to extinguish it before opening ethanol.";
  if (!s.ethanolFilled)
    return "Select Ethanol bottle, then click the Ethanol tube to fill it. Keep the flame off.";
  if (s.leaf === "water")
    return "Select Forceps, then click the Ethanol tube to transfer the boiled leaf.";
  if (s.leaf === "ethanol" && !s.tubeInBath)
    return "Select Tube holder, then click the Water bath to warm the ethanol tube off-flame.";
  if (s.leaf === "ethanol" && s.extractSeconds < 60)
    return "Watch the leaf become pale and the ethanol become green as chlorophyll is extracted.";
  if (s.leaf === "ethanol")
    return "The leaf is decolourised. Select Forceps, then click the Rinse beaker to soften the leaf in warm water.";
  if (s.leaf === "rinsed")
    return "Select Forceps, then click the White tile to spread the leaf flat.";
  if (!s.iodineApplied)
    return s.iodineLoaded
      ? "The iodine dropper is loaded. Click the White tile to apply iodine to the leaf."
      : "Select Iodine dropper, then click the Iodine bottle to load it.";
  if (s.recorded)
    return "Observation recorded. With the burner off, choose the comparison sample and repeat the practical.";
  return "Observe the iodine colour, select the matching result and explain what it tells you about starch before recording.";
}
