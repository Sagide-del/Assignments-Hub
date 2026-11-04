import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cmsApi } from "../../../services/cmsApi";
import { apiErrorMessage } from "../../../api/axios";
import { useAuthStore } from "../../../store/auth.store";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, FileQuestion, Sparkles } from "lucide-react";
import { PageHeader } from "../../../components/ui/Saas";

export default function CmsCreatePage() {
  const [grade, setGrade] = useState("11"),
    [pathway, setPathway] = useState(""),
    [track, setTrack] = useState(""),
    [subject, setSubject] = useState(""),
    [topic, setTopic] = useState("");
  const navigate = useNavigate(),
    client = useQueryClient(),
    userId = useAuthStore((state) => state.user?.id),
    busy = useRef(false);
  const senior = Number(grade) >= 10;
  const taxonomy = useQuery({
    queryKey: ["cms", userId, "taxonomy", grade],
    queryFn: () => cmsApi.getTaxonomy(Number(grade)),
    retry: false,
  });
  const rows = taxonomy.data ?? [];
  const pathways = [
    ...new Set(
      rows
        .map((row) => row.pathway)
        .filter((value): value is string => !!value),
    ),
  ];
  const tracks = [
    ...new Set(
      rows
        .filter((row) => row.pathway === pathway)
        .map((row) => row.track)
        .filter((value): value is string => !!value),
    ),
  ];
  const subjects = rows.filter(
    (row) => !senior || (row.pathway === pathway && row.track === track),
  );
  const selected = subjects.find((row) => row.subject === subject);
  const valid = !!selected?.topics.includes(topic);
  const count = Number(grade) <= 6 ? 5 : Number(grade) <= 9 ? 10 : 30,
    words = Number(grade) <= 6 ? 150 : Number(grade) <= 9 ? 200 : 300;
  const generate = useMutation({
    mutationFn: () =>
      cmsApi.createDraft({
        grade: Number(grade),
        subject,
        topic,
        ...(senior ? { pathway, track } : {}),
      }),
    onSettled: () => {
      busy.current = false;
    },
    onSuccess: (module) => {
      client.setQueryData(["cms", userId, "module", module.id], module);
      void client.invalidateQueries({ queryKey: ["cms", userId, "drafts"] });
      navigate(`/platform/cms/review/${encodeURIComponent(module.id)}`);
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy.current && valid) {
      busy.current = true;
      generate.mutate();
    }
  }
  const control =
    "mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50";
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        to="/platform/cms"
        className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Content Library
      </Link>
      <PageHeader title="Create content" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <form
          onSubmit={submit}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <label className="block text-sm font-medium text-slate-700">
            Grade
            <select
              aria-label="Grade"
              className={control}
              disabled={generate.isPending}
              value={grade}
              onChange={(event) => {
                setGrade(event.target.value);
                setPathway("");
                setTrack("");
                setSubject("");
                setTopic("");
                generate.reset();
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => (
                <option key={value} value={value}>
                  Grade {value}
                </option>
              ))}
            </select>
          </label>
          {taxonomy.isPending && (
            <p role="status" className="text-sm text-slate-500">
              Loading curriculum…
            </p>
          )}
          {taxonomy.isError && (
            <div
              role="alert"
              className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
            >
              {apiErrorMessage(
                taxonomy.error,
                "Curriculum could not be loaded.",
              )}
              <button
                type="button"
                onClick={() => taxonomy.refetch()}
                className="ml-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}
          {taxonomy.isSuccess && !rows.length && (
            <p
              role="status"
              className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"
            >
              No taxonomy has been added for Grade {grade}. Add this grade
              before generating.
            </p>
          )}
          {senior && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Pathway
                <select
                  required
                  aria-label="Pathway"
                  className={control}
                  disabled={generate.isPending || !rows.length}
                  value={pathway}
                  onChange={(event) => {
                    setPathway(event.target.value);
                    setTrack("");
                    setSubject("");
                    setTopic("");
                    generate.reset();
                  }}
                >
                  <option value="">Select pathway</option>
                  {pathways.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Track
                <select
                  required
                  aria-label="Track"
                  className={control}
                  disabled={generate.isPending || !pathway}
                  value={track}
                  onChange={(event) => {
                    setTrack(event.target.value);
                    setSubject("");
                    setTopic("");
                    generate.reset();
                  }}
                >
                  <option value="">Select track</option>
                  {tracks.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Subject
            <select
              required
              aria-label="Subject"
              className={control}
              disabled={
                generate.isPending || !subjects.length || (senior && !track)
              }
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setTopic("");
                generate.reset();
              }}
            >
              <option value="">Select subject</option>
              {subjects.map((row) => (
                <option key={row.id} value={row.subject}>
                  {row.subject}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Topic
            <select
              required
              aria-label="Topic"
              className={control}
              disabled={generate.isPending || !selected}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                generate.reset();
              }}
            >
              <option value="">Select topic</option>
              {selected?.topics.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {selected && !selected.verified && (
            <p className="text-xs text-slate-500">
              Supplied taxonomy · official verification pending
            </p>
          )}
          <div className="border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={generate.isPending || !valid}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#101820] px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Sparkles size={16} aria-hidden="true" />
              {generate.isPending ? "Generating draft…" : "Generate with AI"}
            </button>
          </div>
          {generate.isError && (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
            >
              {apiErrorMessage(
                generate.error,
                "Generation failed. Your selections are kept; try again.",
              )}
            </p>
          )}
        </form>
        <aside className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            {count === 5
              ? "Formative practice"
              : count === 10
                ? "CAT practice"
                : "Senior mock practice"}
          </h2>
          <ul className="mt-4 space-y-4 text-sm text-slate-600">
            <li className="flex items-center gap-3">
              <BookOpen size={18} aria-hidden="true" />
              {words}-word theory
            </li>
            <li className="flex items-center gap-3">
              <FileQuestion size={18} aria-hidden="true" />
              {count} questions with answers
            </li>
          </ul>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            {count === 5
              ? "Includes an offline activity."
              : count === 10
                ? "Includes a diagram brief."
                : "Includes equations and a verified 3D asset link where available."}
          </p>
          <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Saved as a draft for review.
          </p>
        </aside>
      </div>
    </div>
  );
}
