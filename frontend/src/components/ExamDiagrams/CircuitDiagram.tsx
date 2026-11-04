import { Battery, LightBulb, Switch, Wire } from "./primitives";
export function CircuitDiagram({
  arrangement,
  components,
  showLabels = true,
  switchClosed = false,
}: {
  arrangement: "series" | "parallel";
  components: string[];
  showLabels?: boolean;
  switchClosed?: boolean;
}) {
  const parts = components.filter((c) => c !== "wire"),
    bulbs = parts.filter((c) => c === "bulb").length;
  const height = arrangement === "parallel" ? 160 + bulbs * 75 : 290;
  const symbol = (part: string, x: number, y: number) =>
    part === "battery" ? (
      <Battery x={x} y={y} />
    ) : part === "switch" ? (
      <Switch x={x} y={y} closed={switchClosed} />
    ) : (
      <LightBulb x={x} y={y} />
    );
  return (
    <svg
      data-diagram="circuit"
      role="img"
      aria-label={`${arrangement} electrical circuit`}
      viewBox={`0 0 720 ${height}`}
      className="h-auto w-full"
      style={{
        fontFamily: "Arial, Times New Roman, serif",
        fontSize: 12,
        background: "white",
      }}
    >
      <title>
        {arrangement === "series" ? "Series circuit" : "Parallel circuit"} with
        a battery and {bulbs} {bulbs === 1 ? "bulb" : "bulbs"}
      </title>
      {arrangement === "series" ? (
        <>
          <Wire x1={70} y1={90} x2={70} y2={220} />
          <Wire x1={650} y1={90} x2={650} y2={220} />
          <Wire x1={70} y1={220} x2={650} y2={220} />
          {parts.map((part, i) => {
            const x = 115 + i * (490 / Math.max(1, parts.length - 1));
            const prev =
              i === 0
                ? 70
                : 115 + (i - 1) * (490 / Math.max(1, parts.length - 1)) + 30;
            return (
              <g key={i}>
                <Wire x1={prev} y1={90} x2={x - 30} y2={90} />
                {symbol(part, x, 90)}
                {i === parts.length - 1 && (
                  <Wire x1={x + 30} y1={90} x2={650} y2={90} />
                )}
                {showLabels && (
                  <text x={x} y={140} textAnchor="middle" fill="#111">
                    {part === "bulb"
                      ? "Bulb"
                      : part === "battery"
                        ? "Battery"
                        : `Switch (${switchClosed ? "closed" : "open"})`}
                  </text>
                )}
              </g>
            );
          })}
        </>
      ) : (
        <>
          <Wire x1={110} y1={70} x2={210} y2={70} />
          <Battery x={240} y={70} />
          {parts.includes("switch") ? (
            <>
              <Wire x1={270} y1={70} x2={400} y2={70} />
              <Switch x={430} y={70} closed={switchClosed} />
              <Wire x1={460} y1={70} x2={610} y2={70} />
            </>
          ) : (
            <Wire x1={270} y1={70} x2={610} y2={70} />
          )}
          <Wire x1={110} y1={70} x2={110} y2={155 + (bulbs - 1) * 75} />
          <Wire x1={610} y1={70} x2={610} y2={155 + (bulbs - 1) * 75} />
          {Array.from({ length: bulbs }, (_, i) => {
            const y = 155 + i * 75;
            return (
              <g key={i}>
                <Wire x1={110} y1={y} x2={330} y2={y} />
                <LightBulb x={360} y={y} />
                <Wire x1={390} y1={y} x2={610} y2={y} />
                {showLabels && (
                  <text x={360} y={y + 35} textAnchor="middle" fill="#111">
                    Bulb {i + 1}
                  </text>
                )}
              </g>
            );
          })}
          {showLabels && (
            <>
              <text x={240} y={115} textAnchor="middle" fill="#111">
                Battery
              </text>
              {parts.includes("switch") && (
                <text x={430} y={115} textAnchor="middle" fill="#111">
                  Switch ({switchClosed ? "closed" : "open"})
                </text>
              )}
            </>
          )}
        </>
      )}
    </svg>
  );
}
