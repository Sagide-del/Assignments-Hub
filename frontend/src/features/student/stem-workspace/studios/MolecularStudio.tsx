import { useState } from "react";
import { Link } from "react-router-dom";
import { Atom, Link2, Eraser, ArrowLeft, BookOpen } from "lucide-react";
import type { Lab } from "../../../../types";
import {
  MOLECULES,
  moleculeSpec,
  moleculeInventory,
  atomValence,
  VALENCE,
  molecularComplete,
  molecularReady,
  replayMolecular,
  type Element,
  type MoleculeId,
} from "../../../../../../backend/src/labs/molecular-engine";
import MolecularScene from "./MolecularScene";
import { useStudio, StudioReport, StudioBrief } from "./useStudio";
const button =
  "min-h-11 rounded-lg border px-3 py-2 text-sm disabled:opacity-40";
export default function MolecularStudio({
  lab,
  userId,
}: {
  lab: Lab;
  userId: number;
}) {
  const studio = useStudio({
      lab,
      userId,
      version: "molecular-studio-v1",
      replay: replayMolecular,
    }),
    { state, draft, dispatch } = studio;
  const [tool, setTool] = useState<Element | "bond" | "erase">("C"),
    [first, setFirst] = useState<number | null>(null),
    [order, setOrder] = useState(1),
    [guides, setGuides] = useState(true),
    [notes, setNotes] = useState(""),
    [notebook, setNotebook] = useState(false);
  const spec = moleculeSpec(state.molecule),
    inventory = moleculeInventory(state);
  const slot = (id: number) => {
    if (tool === "erase") {
      dispatch({ type: "remove", slot: id });
      setFirst(null);
    } else if (tool === "bond") {
      if (first === null) {
        setFirst(id);
      } else {
        if (dispatch({ type: "bond", a: first, b: id, order })) setFirst(null);
      }
    } else dispatch({ type: "atom", slot: id, element: tool });
  };
  return (
    <div className="space-y-5 text-slate-800">
      <Link
        to="/student/stem-labs"
        className="inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} />
        Laboratory
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            {lab.grade} · {lab.subject}
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            Molecular construction studio
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Build the atoms. Connect the bonds. Explain the structure.
          </p>
        </div>
        <button className={button} onClick={() => setNotebook(!notebook)}>
          <BookOpen className="mr-2 inline" size={16} />
          {notebook ? "Workspace" : `Notebook · ${state.builds.length}`}
        </button>
      </header>
      {!notebook ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-xl border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <label className="text-sm">
                Structure{" "}
                <select
                  aria-label="Molecule"
                  value={state.molecule}
                  onChange={(e) => {
                    dispatch({
                      type: "choose",
                      molecule: e.target.value as MoleculeId,
                    });
                    setFirst(null);
                    setNotes("");
                  }}
                  className="ml-2 rounded-lg border p-2"
                >
                  {MOLECULES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.formula}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <input
                  type="checkbox"
                  checked={guides}
                  onChange={(e) => setGuides(e.target.checked)}
                />{" "}
                Bond guides
              </label>
            </div>
            <MolecularScene
              state={state}
              guides={guides}
              onSlot={slot}
              onDrop={(id, element) =>
                dispatch({ type: "atom", slot: id, element })
              }
            />
            <div className="flex flex-wrap gap-2 border-t p-4">
              {(["C", "H", "O"] as Element[]).map((e) => (
                <button
                  key={e}
                  draggable
                  onDragStart={(ev) =>
                    ev.dataTransfer.setData(
                      "application/x-assignmenthub-element",
                      e,
                    )
                  }
                  aria-pressed={tool === e}
                  onClick={() => {
                    setTool(e);
                    setFirst(null);
                  }}
                  className={`${button} ${tool === e ? "bg-slate-900 text-white" : ""}`}
                >
                  <Atom size={16} className="mr-2 inline" />
                  {e} ·{" "}
                  {e === "C" ? "Carbon" : e === "H" ? "Hydrogen" : "Oxygen"}
                </button>
              ))}
              <button
                className={`${button} ${tool === "bond" ? "bg-blue-700 text-white" : ""}`}
                onClick={() => {
                  setTool("bond");
                  setFirst(null);
                }}
              >
                <Link2 size={16} className="mr-2 inline" />
                Bond
              </button>
              <select
                aria-label="Bond order"
                className="rounded-lg border px-2"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              >
                <option value={1}>Single</option>
                <option value={2}>Double</option>
                <option value={3}>Triple</option>
              </select>
              <button
                className={button}
                onClick={() => {
                  setTool("erase");
                  setFirst(null);
                }}
              >
                <Eraser size={16} className="mr-2 inline" />
                Remove atom
              </button>
            </div>
            <p className="px-4 pb-4 text-xs text-slate-500">
              Drag to rotate · Scroll to zoom. Select an element, then an empty
              site. In Bond mode, select two placed atoms.{" "}
              {first !== null &&
                `First atom: site ${first + 1}. Select its partner.`}
            </p>
          </section>
          <aside className="space-y-4 rounded-xl border bg-white p-5">
            <div className="text-xs uppercase tracking-widest text-blue-700">
              Construction brief
            </div>
            <h2 className="text-xl font-semibold">
              {spec.name} <span className="text-slate-400">{spec.formula}</span>
            </h2>
            <p className="text-sm leading-6">{spec.lesson}</p>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p>{spec.shape}</p>
              <p className="mt-2">
                Your model: <strong>{inventory.formula}</strong> ·{" "}
                {inventory.mass.toFixed(2)} g mol⁻¹
              </p>
            </div>
            <details open>
              <summary className="text-sm font-semibold">
                Atomic sites & valency
              </summary>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {spec.slots.map((s, i) => (
                  <button
                    key={i}
                    className={`${button} text-xs ${first === i ? "border-blue-600 bg-blue-50" : ""}`}
                    onClick={() => slot(i)}
                    aria-label={`Site ${i + 1} ${s.element}`}
                  >
                    {i + 1} · {state.atoms[i] ?? "○"}
                    <span className="block text-[10px] text-slate-500">
                      {state.atoms[i]
                        ? `${atomValence(state, i)}/${VALENCE[state.atoms[i]]} bonds`
                        : `Add ${s.element}`}
                    </span>
                  </button>
                ))}
              </div>
            </details>
            <p
              className={`text-sm ${molecularComplete(state) ? "text-emerald-700" : "text-slate-500"}`}
            >
              {molecularComplete(state)
                ? "Correct structure. Explain the bonding below."
                : "Match the elements and connectivity; a full valency alone does not establish the correct molecule."}
            </p>
            <textarea
              aria-label="Bonding explanation"
              rows={3}
              className="w-full rounded-lg border p-3 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain the bond types and three-dimensional shape…"
            />
            <button
              className={`${button} w-full bg-blue-700 text-white`}
              disabled={
                !molecularComplete(state) ||
                state.recorded ||
                notes.trim().length < 20
              }
              onClick={() => dispatch({ type: "record", explanation: notes })}
            >
              {state.recorded ? "Structure recorded" : "Record structure"}
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Idealised teaching geometry; not an energy simulation. Build at
              least two different structures for your report.
            </p>
          </aside>
        </div>
      ) : (
        <StudioReport
          lab={lab}
          conclusion={draft.conclusion}
          answers={draft.answers}
          onChange={(conclusion) => studio.update({ conclusion })}
          onAnswers={(answers) => studio.update({ answers })}
          ready={molecularReady(state, draft.conclusion)}
          saved={studio.saved}
          pending={studio.save.isPending}
          error={studio.save.error}
          onSave={() => studio.save.mutate()}
          onExport={studio.exportReport}
          restore={studio.restore}
        >
          <div className="space-y-3">
            {state.builds.map((b, i) => (
              <article key={i} className="rounded-lg bg-slate-50 p-4 text-sm">
                <strong>
                  {moleculeSpec(b.molecule).name} · {b.formula}
                </strong>
                <p className="mt-2">{b.explanation}</p>
              </article>
            ))}
            {!state.builds.length && (
              <p>
                Construct and record two different molecules to compare their
                bonding.
              </p>
            )}
          </div>
        </StudioReport>
      )}
      {studio.message && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          {studio.message}
        </p>
      )}
      {studio.storageError && (
        <p role="alert">
          Browser storage is unavailable. Export your work before leaving.
        </p>
      )}
      <StudioBrief lab={lab} />
    </div>
  );
}
