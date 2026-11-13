import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Folder,
  Plus,
  Store,
  Building2,
  Archive,
  Pencil,
  Send,
} from "lucide-react";
import { PageHeader } from "../../../components/ui/Saas";
import { cmsApi, type MasterModule } from "../../../services/cmsApi";
import { cmsFolders, cmsQuestionCount } from "../../../services/cms-folders";
import { apiErrorMessage } from "../../../api/axios";
import { useAuthStore } from "../../../store/auth.store";
import PublishModal from "./PublishModal";
export default function CmsDashboard() {
  const uid = useAuthStore((s) => s.user?.id),
    client = useQueryClient();
  const [grade, setGrade] = useState(""),
    [subject, setSubject] = useState(""),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState("");
  const [publishing, setPublishing] = useState<MasterModule | null>(null),
    [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["cms", uid, "modules"],
    queryFn: cmsApi.getModules,
    retry: false,
  });
  const edit = useMutation({
    mutationFn: ({ id, topic }: { id: string; topic: string }) =>
      cmsApi.updateModule(id, topic),
    onSuccess: () => client.invalidateQueries({ queryKey: ["cms", uid] }),
  });
  const archive = useMutation({
    mutationFn: cmsApi.archiveModule,
    onSuccess: () => client.invalidateQueries({ queryKey: ["cms", uid] }),
  });
  const all = query.data ?? [];
  const filtered = all.filter(
    (m) =>
      (!grade || String(m.grade) === grade) &&
      (!subject || m.subject === subject) &&
      (!status || m.status === status) &&
      m.topic.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const selectClass =
    "min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm";
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Content Library"
        actions={
          <Link
            to="/platform/cms/create"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#101820] px-4 text-sm font-semibold text-white"
          >
            <Plus size={17} />
            Create content
          </Link>
        }
      />
      <Link to="/platform/subject-combinations" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">Grade 10 subject combinations →</Link>
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {message}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <select
          aria-label="Grade"
          className={selectClass}
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setSubject("");
          }}
        >
          <option value="">All grades</option>
          {[...new Set(all.map((m) => m.grade))]
            .sort((a, b) => a - b)
            .map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
        </select>
        <select
          aria-label="Subject"
          className={selectClass}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">All subjects</option>
          {[
            ...new Set(
              all
                .filter((m) => !grade || String(m.grade) === grade)
                .map((m) => m.subject),
            ),
          ]
            .sort()
            .map((s) => (
              <option key={s}>{s}</option>
            ))}
        </select>
        <select
          aria-label="Status"
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["DRAFT", "APPROVED", "ARCHIVED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          aria-label="Search by topic"
          placeholder="Search by topic…"
          className={selectClass}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <p className="text-sm text-slate-500">
        {filtered.length} {filtered.length === 1 ? "batch" : "batches"}
      </p>
      {query.isPending ? (
        <p role="status">Loading library…</p>
      ) : query.isError ? (
        <div role="alert">
          {apiErrorMessage(query.error, "Unable to load content.")}{" "}
          <button onClick={() => query.refetch()} className="underline">
            Retry
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No content found.
        </div>
      ) : (
        <div className="space-y-3">
          {cmsFolders(filtered).map((g) => (
            <details
              key={g.grade}
              open={!!grade}
              className="rounded-xl border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold">
                <Folder size={19} className="text-[#607d00]" />
                Grade {g.grade}
              </summary>
              <div className="space-y-2 px-3 pb-3 sm:px-5">
                {g.subjects.map((s) => (
                  <details
                    key={s.subject}
                    open={!!subject}
                    className="rounded-lg bg-slate-50"
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                      {s.subject}
                    </summary>
                    <div className="space-y-2 px-3 pb-3">
                      {s.topics.map((t) => (
                        <details key={t.topic}>
                          <summary className="cursor-pointer py-2 text-sm text-slate-600">
                            {t.topic}
                          </summary>
                          <div className="divide-y divide-slate-100 rounded-lg bg-white">
                            {t.batches.map((m) => (
                              <article
                                key={m.id}
                                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold">
                                    Batch {m.batch_number ?? 1}{" "}
                                    <span className="font-normal text-slate-500">
                                      · {cmsQuestionCount(m)}{" "}
                                      {cmsQuestionCount(m) === 1
                                        ? "question"
                                        : "questions"}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {m.status} ·{" "}
                                    {new Date(
                                      m.created_at,
                                    ).toLocaleDateString()}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {m.distributions?.map((d) => (
                                      <span
                                        key={d.id}
                                        className="inline-flex items-center gap-1 rounded-md bg-[#f1f5e5] px-2 py-1 text-xs text-[#405615]"
                                      >
                                        {d.audience === "PUBLIC_STORE" ? (
                                          <>
                                            <Store size={12} />
                                            Public Store
                                          </>
                                        ) : (
                                          <>
                                            <Building2 size={12} />
                                            {d.school_name ??
                                              `School ${d.school_id}`}
                                            {d.stream_id
                                              ? ` · ${d.stream_id}`
                                              : " · All streams"}
                                          </>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                  {m.status === "APPROVED" && (
                                    <button
                                      onClick={() => setPublishing(m)}
                                      className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#101820] px-3 text-white"
                                    >
                                      <Send size={13} />
                                      Publish
                                    </button>
                                  )}
                                  <Link
                                    to={`/platform/cms/review/${m.id}`}
                                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3"
                                  >
                                    <Pencil size={13} />
                                    Review
                                  </Link>
                                  <button
                                    disabled={edit.isPending}
                                    onClick={() => {
                                      const topic = window.prompt(
                                        "Topic title",
                                        m.topic,
                                      );
                                      if (
                                        topic?.trim() &&
                                        topic.trim() !== m.topic
                                      )
                                        edit.mutate({
                                          id: m.id,
                                          topic: topic.trim(),
                                        });
                                    }}
                                    className="min-h-10 px-2"
                                  >
                                    Edit title
                                  </button>
                                  {m.status !== "ARCHIVED" && (
                                    <button
                                      disabled={archive.isPending}
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            "Archive this batch? It will be hidden from students; its history will be preserved.",
                                          )
                                        )
                                          archive.mutate(m.id);
                                      }}
                                      className="inline-flex min-h-10 items-center gap-1 px-2 text-slate-500"
                                    >
                                      <Archive size={13} />
                                      Archive
                                    </button>
                                  )}
                                </div>
                              </article>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
      {edit.isError && (
        <p role="alert" className="text-amber-900">
          {apiErrorMessage(edit.error, "Update failed.")}
        </p>
      )}
      {archive.isError && (
        <p role="alert" className="text-amber-900">
          {apiErrorMessage(archive.error, "Archive failed.")}
        </p>
      )}
      {publishing && (
        <PublishModal
          module={publishing}
          onClose={() => setPublishing(null)}
          onPublished={(r) => {
            setMessage(r.message);
            setPublishing(null);
            void client.invalidateQueries({ queryKey: ["cms", uid] });
          }}
        />
      )}
    </div>
  );
}
