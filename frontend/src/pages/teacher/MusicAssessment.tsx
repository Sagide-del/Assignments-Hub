import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Music2, Play, Square, Save } from "lucide-react";
import { api } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";
import MusicNotation from "../../components/MusicNotation";
import { scoreFor } from "../../features/student/music-production/score";
import { ProductionAudio } from "../../features/student/music-production/production-audio";
import type { ProductionDraft } from "../../../../backend/src/student/music-production/model";
interface Submission extends ProductionDraft {
  id: string;
  status: string;
  score: number | null;
  review_comment: string | null;
  student: { name: string; admissionNumber: string; grade: string };
}
function Review({ mix, onSaved }: { mix: Submission; onSaved: () => void }) {
  const audio = useRef<ProductionAudio | null>(null),
    [score, setScore] = useState(mix.score ?? 0),
    [comment, setComment] = useState(mix.review_comment ?? ""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      audio.current?.dispose();
    },
    [],
  );
  async function save() {
    setBusy(true);
    try {
      await api.patch(`/music-production/teacher/submissions/${mix.id}`, {
        score,
        comment,
      });
      setMessage("Assessment saved.");
      onSaved();
    } catch {
      setMessage("Assessment could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold">{mix.title}</h2>
        <button
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          onClick={() => {
            audio.current ??= new ProductionAudio();
            void audio.current
              .play(mix)
              .catch(() => setMessage("Audio could not start."));
          }}
        >
          <Play size={15} />
          Listen
        </button>
        <button
          className="rounded-lg border border-slate-200 p-2"
          aria-label="Stop submission"
          onClick={() => audio.current?.stop()}
        >
          <Square size={15} />
        </button>
      </div>
      <MusicNotation
        notation_json={scoreFor(mix)}
        timeSignature={mix.time_signature}
        bpm={mix.bpm}
      />
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Learner reflection</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {mix.tracks_json.reflection || "No reflection supplied."}
        </p>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Music assessment</h3>
        <p className="mt-1 text-xs text-slate-500">
          Consider rhythm, melodic shape, balance, musical choices and
          reflection.
        </p>
        <label className="mt-4 block text-xs">
          Score /100
          <input
            aria-label="Music assessment score"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="ml-3 w-20 rounded-lg border border-slate-200 p-2"
          />
        </label>
        <label className="mt-4 block text-xs">
          Feedback
          <textarea
            aria-label="Music assessment feedback"
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
          />
        </label>
        <button
          disabled={
            busy ||
            comment.trim().length < 3 ||
            !Number.isFinite(score) ||
            score < 0 ||
            score > 100
          }
          onClick={() => void save()}
          className="mt-3 flex items-center gap-2 rounded-lg bg-[#101820] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          <Save size={15} />
          Save assessment
        </button>
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      </section>
    </div>
  );
}
export default function MusicAssessment() {
  const user = useAuthStore((s) => s.user),
    [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["teacher-music-submissions", user?.id, user?.schoolId],
    queryFn: () =>
      api
        .get<Submission[]>("/music-production/teacher/submissions")
        .then((r) => r.data),
  });
  const mix = query.data?.find((p) => p.id === selected);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Music2 size={25} />
        Music submissions
      </h1>
      {query.isLoading ? (
        <p>Loading submissions…</p>
      ) : query.isError ? (
        <p
          role="alert"
          className="rounded-xl border border-slate-200 bg-white p-5 text-sm"
        >
          Submissions are unavailable. Check that you have an assigned Music
          class.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      ) : !query.data?.length ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No submitted mixes from your Music classes yet.
        </p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`rounded-lg border p-4 text-left ${p.id === selected ? "border-[#a9bd75] bg-[#f1f5e8]" : "border-slate-200 bg-white"}`}
              >
                <strong className="text-sm">{p.student.name}</strong>
                <p className="mt-1 text-xs text-slate-500">
                  {p.student.grade} · {p.student.admissionNumber} · {p.status}
                </p>
                <p className="mt-2 text-xs">{p.title}</p>
              </button>
            ))}
          </div>
          {mix && (
            <Review
              key={mix.id}
              mix={mix}
              onSaved={() => void query.refetch()}
            />
          )}
        </>
      )}
    </div>
  );
}
