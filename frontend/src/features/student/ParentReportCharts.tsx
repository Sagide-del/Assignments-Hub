import type { EngagementReport } from "../../api/learning-hub.api";
const colors = ["#399b7d", "#8970c7", "#dfa944", "#6aa7c3", "#dd7680"];
function Donut({
  title,
  subtitle,
  slices,
  label,
}: {
  title: string;
  subtitle: string;
  slices: { label: string; value: number; color: string }[];
  label: string;
}) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  let offset = 0;
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-5 flex flex-col items-stretch gap-5 sm:flex-row sm:items-center">
        <svg
          viewBox="0 0 160 160"
          className="h-36 w-36 shrink-0 self-center"
          role="img"
          aria-label={`${title}: ${
            slices
              .filter((s) => s.value)
              .map((s) => `${s.label} ${s.value}`)
              .join(", ") || "No data yet"
          }`}
        >
          <circle
            cx="80"
            cy="80"
            r="57"
            fill="none"
            stroke="#edf1ee"
            strokeWidth="20"
          />
          {slices
            .filter((s) => s.value > 0)
            .map((s) => {
              const value = (s.value / total) * 100,
                start = offset;
              offset += value;
              return (
                <circle
                  key={s.label}
                  cx="80"
                  cy="80"
                  r="57"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="20"
                  pathLength="100"
                  strokeDasharray={`${value} ${100 - value}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 80 80)"
                />
              );
            })}
          <text
            x="80"
            y="79"
            textAnchor="middle"
            fill="#143e32"
            fontSize="28"
            fontWeight="600"
          >
            {total}
          </text>
          <text x="80" y="99" textAnchor="middle" fill="#6b7773" fontSize="11">
            {label}
          </text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-3 text-sm">
          {slices
            .filter((s) => s.value > 0)
            .map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
                <strong>{s.value}</strong>
              </li>
            ))}
          {!total ? (
            <li className="text-slate-500">No data in this period yet.</li>
          ) : null}
        </ul>
      </div>
    </article>
  );
}
export function ParentReportCharts({
  report: r,
}: {
  report: EngagementReport;
}) {
  const counts = new Map<string, number>();
  for (const e of r.events) {
    if (e.kind === "Login") continue;
    const label =
      e.kind === "Assignment"
        ? "Assignments"
        : ["Coach quiz", "Timetable recall", "Mock quiz"].includes(e.kind)
          ? "Quizzes"
          : e.kind === "Lab" || e.kind === "Sports lab"
            ? "Labs"
            : e.kind === "Skill lesson"
              ? "Skill lessons"
              : "Creative work";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const status = [
    {
      label: "Needs support · below 50%",
      value: r.subjectScores.filter((s) => s.average !== null && s.average < 50)
        .length,
      color: "#dd7680",
    },
    {
      label: "Building · 50–79%",
      value: r.subjectScores.filter(
        (s) => s.average !== null && s.average >= 50 && s.average < 80,
      ).length,
      color: "#dfa944",
    },
    {
      label: "Strong · 80%+",
      value: r.subjectScores.filter(
        (s) => s.average !== null && s.average >= 80,
      ).length,
      color: "#399b7d",
    },
    {
      label: "Not yet scored",
      value: r.subjectScores.filter((s) => s.average === null).length,
      color: "#bec7c1",
    },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Donut
        title="What your child worked on"
        subtitle="Recorded activities, not time spent"
        label="activities"
        slices={[...counts].map(([label, value], i) => ({
          label,
          value,
          color: colors[i % colors.length],
        }))}
      />
      <Donut
        title="How subjects are progressing"
        subtitle="Practice scores in this reporting period"
        label="subjects"
        slices={status}
      />
    </div>
  );
}
