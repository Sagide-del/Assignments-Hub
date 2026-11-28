import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Beaker, Focus, Waves } from "lucide-react";
import type { Lab, LabSession } from "../../types";
import { juniorDesign } from "../../../../backend/src/labs/junior-science";
export function JuniorScienceCatalogue({
  grade,
  labs,
  sessions,
  loading,
  error,
  retry,
}: {
  grade: number;
  labs: Lab[];
  sessions: LabSession[];
  loading: boolean;
  error: boolean;
  retry: () => unknown;
}) {
  const [showAdditional, setShowAdditional] = useState(false);
  const core = labs.filter(
      (l) =>
        juniorDesign(l.key)?.grade === grade && l.grade === `Grade ${grade}`,
    ),
    other = labs.filter((l) => !core.some((c) => c.id === l.id));
  const completed = new Set(
    sessions.filter((s) => s.completedAt).map((s) => s.labKey),
  );
  return (
    <main className="mx-auto max-w-5xl space-y-6 text-slate-900">
      <header className="border-b pb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
          Grade {grade} · Integrated Science
        </p>
        <h1 className="mt-2 text-3xl font-bold">Your science investigations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Start with a question. Make a prediction, change a variable and use
          your measurements to explain what happened.
        </p>
      </header>
      {loading ? (
        <p role="status">Preparing your investigations…</p>
      ) : error ? (
        <div role="alert">
          We could not load your labs.{" "}
          <button onClick={retry} className="underline">
            Retry
          </button>
        </div>
      ) : core.length ? (
        core.map((lab) => {
          const design = juniorDesign(lab.key)!;
          const Icon =
            design.kind === "filtration"
              ? Beaker
              : design.kind === "microscope"
                ? Focus
                : Waves;
          return (
            <article
              key={lab.id}
              className="grid overflow-hidden rounded-2xl border bg-white md:grid-cols-[230px_1fr]"
            >
              <div className="flex flex-col justify-between bg-slate-950 p-6 text-white">
                <Icon size={48} strokeWidth={1} />
                <div className="mt-6">
                  <p className="text-xs text-teal-200">GUIDED INVESTIGATION</p>
                  <h2 className="mt-2 text-xl font-semibold">{design.topic}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-300">
                    {design.variable}
                    <br />
                    Evidence notebook · knowledge check
                  </p>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold">{design.title}</h3>
                  {completed.has(lab.key) && (
                    <span className="flex items-center gap-1 text-xs text-teal-700">
                      <CheckCircle2 size={15} />
                      Saved
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600">{design.question}</p>
                <ul className="my-5 space-y-2 text-sm">
                  {design.outcomes.map((o) => (
                    <li key={o} className="flex gap-2">
                      <span className="text-teal-700">✓</span>
                      {o}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/student/stem-labs/${lab.id}`}
                  className="inline-flex min-h-11 items-center gap-3 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white"
                >
                  Open investigation
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          );
        })
      ) : (
        <p className="rounded-xl border p-5 text-sm">
          Your teacher has not published a guided investigation for this grade
          yet.
        </p>
      )}
      {other.length > 0 && (
        <section className="border-t pt-4">
          <button
            aria-expanded={showAdditional}
            onClick={() => setShowAdditional(!showAdditional)}
            className="min-h-11 text-sm font-semibold"
          >
            {showAdditional ? "Hide" : "Show"} additional Grade {grade}{" "}
            activities ({other.length})
          </button>
          {showAdditional && (
            <div className="mt-3 divide-y rounded-xl border bg-white">
              {other.map((lab) => (
                <Link
                  key={lab.id}
                  to={`/student/stem-labs/${lab.id}`}
                  className="flex items-center justify-between gap-3 p-4 text-sm"
                >
                  <span>
                    {lab.title}
                    {completed.has(lab.key) && (
                      <span className="ml-2 text-xs text-teal-700">
                        Saved notebook
                      </span>
                    )}
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
