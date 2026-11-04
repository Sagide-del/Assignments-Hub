import {
  Beaker,
  BunsenBurner,
  Condenser,
  RoundBottomFlask,
  Thermometer,
} from "./primitives";
export function FractionalDistillation({
  showLabels = true,
}: {
  showLabels?: boolean;
}) {
  return (
    <svg
      data-diagram="fractional_distillation"
      role="img"
      aria-label="Fractional distillation apparatus"
      viewBox="0 0 760 490"
      className="h-auto w-full"
      style={{
        fontFamily: "Arial, Times New Roman, serif",
        fontSize: 12,
        background: "white",
      }}
    >
      <title>
        Fractional distillation: heated flask, fractionating column,
        thermometer, downward sloping condenser and open receiving beaker
      </title>
      <g stroke="#111" strokeWidth={2} fill="white">
        <RoundBottomFlask x={170} y={330} />
        <path
          d="M160 260V135H180V260 M160 235H180 M160 217H180 M160 199H180 M160 181H180"
          fill="none"
        />
        <Thermometer x={170} y={132} />
        <path d="M180 140L272 174 M180 150L268 184" fill="none" />
        <Condenser x={270} y={180} />
        <path d="M495 257L565 285V305 M495 267L555 292V305" fill="none" />
        <Beaker x={570} y={350} />
        <BunsenBurner x={170} y={414} />
        <path d="M123 365H218 M132 365L117 428 M208 365L223 428" fill="none" />
      </g>
      {showLabels && (
        <g fill="#111" stroke="none">
          <text x={38} y={75}>
            Thermometer
          </text>
          <path d="M125 78L165 90" stroke="#111" fill="none" />
          <text x={28} y={198}>
            Fractionating
          </text>
          <text x={28} y={215}>
            column
          </text>
          <path d="M115 201H155" stroke="#111" fill="none" />
          <text x={36} y={306}>
            Mixture
          </text>
          <path d="M84 305L137 322" stroke="#111" fill="none" />
          <text x={33} y={455}>
            Heat source
          </text>
          <path d="M105 450L157 434" stroke="#111" fill="none" />
          <text x={352} y={154}>
            Water-cooled condenser
          </text>
          <path d="M425 160L410 210" stroke="#111" fill="none" />
          <text x={220} y={104}>
            Water out · upper end
          </text>
          <path d="M293 110L321 149" stroke="#111" fill="none" />
          <text x={430} y={320}>
            Water in · lower end
          </text>
          <path d="M461 306L448 284" stroke="#111" fill="none" />
          <text x={620} y={350}>
            Distillate
          </text>
          <path d="M615 347L597 355" stroke="#111" fill="none" />
        </g>
      )}
    </svg>
  );
}
