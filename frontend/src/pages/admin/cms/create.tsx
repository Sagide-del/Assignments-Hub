import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Box, FileQuestion, Sparkles } from "lucide-react";
import { PageHeader } from "../../../components/ui/Saas";

export default function CmsCreatePage() {
  const [grade, setGrade] = useState("11");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [pathway, setPathway] = useState("");
  const [notice, setNotice] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(true);
  }
  const control =
    "mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Grade
              <select
                className={control}
                aria-label="Grade"
                value={grade}
                onChange={(event) => {
                  setGrade(event.target.value);
                  setNotice(false);
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Grade {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Pathway{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <select
                className={control}
                aria-label="Pathway"
                value={pathway}
                onChange={(event) => {
                  setPathway(event.target.value);
                  setNotice(false);
                }}
              >
                <option value="">Select pathway</option>
                <option value="STEM">STEM</option>
                <option value="Social Sciences">Social Sciences</option>
                <option value="Arts and Sports Science">
                  Arts and Sports Science
                </option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Subject
            <input
              required
              maxLength={160}
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setNotice(false);
              }}
              className={control}
              placeholder="e.g. Aviation Technology"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Topic
            <input
              required
              maxLength={240}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                setNotice(false);
              }}
              className={control}
              placeholder="e.g. Four Forces of Flight"
            />
          </label>
          <div className="border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={!subject.trim() || !topic.trim()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#101820] px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Sparkles size={16} aria-hidden="true" />
              Generate with AI
            </button>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              AI generation is not connected to the CMS yet. This form will not
              start a paid request.
            </p>
          </div>
          {notice && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950"
            >
              Generation is not available yet. Your selections are unchanged; no
              content has been generated or saved.
            </p>
          )}
        </form>
        <aside className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Module structure
          </h2>
          <ul className="mt-4 space-y-4 text-sm text-slate-600">
            <li className="flex items-center gap-3">
              <Box size={18} className="text-[#607d00]" aria-hidden="true" />
              Theory and asset references
            </li>
            <li className="flex items-center gap-3">
              <FileQuestion
                size={18}
                className="text-[#607d00]"
                aria-hidden="true"
              />
              30 questions with answers
            </li>
          </ul>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-6 text-slate-500">
            Generated modules will need review and approval before publishing.
          </p>
        </aside>
      </div>
    </div>
  );
}
