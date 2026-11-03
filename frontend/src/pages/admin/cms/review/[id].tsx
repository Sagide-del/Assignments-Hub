import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  Check,
  CheckCircle2,
  FileQuestion,
  Store,
} from "lucide-react";
import { PageHeader, EmptyState } from "../../../../components/ui/Saas";
import { apiErrorMessage } from "../../../../api/axios";
import { cmsApi } from "../../../../services/cmsApi";
import {
  parseCmsContent,
  type CmsQuestionPreview,
} from "../../../../services/cms-content";
import { useAuthStore } from "../../../../store/auth.store";

function Question({
  question,
  number,
}: {
  question: CmsQuestionPreview;
  number: number;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
          {number}
        </span>
        <h3 className="min-w-0 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">
          {question.prompt}
        </h3>
      </div>
      {question.options.length > 0 && (
        <ul className="ml-10 mt-3 space-y-2 text-sm text-slate-600">
          {question.options.map((option, i) => (
            <li key={i} className="break-words [overflow-wrap:anywhere]">
              <span className="mr-2 font-medium text-slate-400">
                {String.fromCharCode(65 + i)}.
              </span>
              {option}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f1f5e5] px-3 py-3 text-sm leading-6 text-slate-700">
        <Check
          size={16}
          className="mt-1 shrink-0 text-[#526b10]"
          aria-hidden="true"
        />
        <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          <span className="mr-2 font-semibold text-[#405615]">Answer</span>
          {question.answer}
        </p>
      </div>
    </article>
  );
}
export default function CmsReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const drafts = useQuery({
    queryKey: ["cms", userId, "drafts"],
    queryFn: cmsApi.getDrafts,
    retry: false,
  });
  const draft = drafts.data?.find((item) => item.id === id);
  const store = useQuery({
    queryKey: ["cms", userId, "store"],
    queryFn: cmsApi.getPublicStore,
    enabled: drafts.isSuccess && !draft,
    retry: false,
  });
  const module = draft ?? store.data?.find((item) => item.id === id);
  const content = parseCmsContent(module?.content_json);
  const approve = useMutation({
    mutationFn: () => cmsApi.approveModule(id!),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cms", userId, "drafts"] });
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      cmsApi.publishModule({ module_id: id!, target_type: "STORE" }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["cms", userId, "drafts"] }),
        client.invalidateQueries({ queryKey: ["cms", userId, "store"] }),
      ]);
      navigate("/platform/cms?status=PUBLISHED_STORE");
    },
  });
  const back = (
    <Link
      to="/platform/cms"
      className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      Content Library
    </Link>
  );
  if (drafts.isPending || (!draft && store.isPending && !drafts.isError))
    return (
      <div className="space-y-4">
        {back}
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500"
        >
          Opening module…
        </p>
      </div>
    );
  if (drafts.isError || (!draft && store.isError))
    return (
      <div className="space-y-4">
        {back}
        <section
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"
        >
          <p>
            {apiErrorMessage(
              drafts.error ?? store.error,
              "This module could not be loaded.",
            )}
          </p>
          <button
            type="button"
            onClick={() =>
              drafts.isError ? drafts.refetch() : store.refetch()
            }
            className="mt-2 min-h-10 font-semibold underline"
          >
            Try again
          </button>
        </section>
      </div>
    );
  if (!module)
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          title="Module preview is not available"
          action={
            <p className="mx-auto max-w-md text-sm leading-6 text-slate-500">
              This module is not in the draft or public-store lists. School
              publications need a separate detail endpoint.
            </p>
          }
        />
      </div>
    );
  const hasPayload = module.content_json !== undefined;
  const complete =
    content.valid && content.questions.length === 30 && !!content.theory.trim();
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {back}
      <PageHeader
        title={module.topic}
        meta={`Grade ${module.grade} · ${module.subject}`}
        actions={
          <>
            <span className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600">
              {module.status === "PUBLISHED_STORE"
                ? "Published to Store"
                : module.status === "APPROVED"
                  ? "Approved"
                  : "Draft"}
            </span>
            {module.status === "DRAFT" && hasPayload && (
              <button
                type="button"
                disabled={approve.isPending || !complete}
                onClick={() => approve.mutate()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#101820] px-4 text-xs font-semibold text-white disabled:opacity-40"
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                {approve.isPending ? "Approving…" : "Approve module"}
              </button>
            )}
            {module.status === "APPROVED" && (
              <button
                type="button"
                disabled={publish.isPending}
                onClick={() => publish.mutate()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#101820] px-4 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Store size={16} aria-hidden="true" />
                {publish.isPending ? "Publishing…" : "Publish to Store"}
              </button>
            )}
          </>
        }
      />
      {(approve.isError || publish.isError) && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          {apiErrorMessage(
            approve.error ?? publish.error,
            "The action could not be completed. Try again.",
          )}
        </p>
      )}
      {!hasPayload ? (
        <EmptyState
          title="Published module summary"
          action={
            <p className="mx-auto max-w-md text-sm leading-6 text-slate-500">
              The public catalogue excludes lesson payloads and answers. A
              protected module-detail endpoint is needed to review this
              publication.
            </p>
          }
        />
      ) : (
        <>
          {!complete && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950"
            >
              {!content.valid
                ? "The content payload could not be read."
                : `This module has ${content.questions.length} questions. This review expects theory and 30 questions before approval.`}
            </p>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">Theory</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                {content.theory ? (
                  content.theory.split(/\n\s*\n/).map((paragraph, i) => (
                    <p
                      key={i}
                      className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                    >
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p>No theory text supplied.</p>
                )}
              </div>
            </section>
            <aside className="min-w-0 space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Box size={17} aria-hidden="true" />
                Assets
              </h2>
              {(content.assets.length
                ? content.assets
                : ["No asset linked"]
              ).map((url, i) => (
                <div
                  key={i}
                  className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
                >
                  <Box
                    size={30}
                    strokeWidth={1.2}
                    className="text-slate-400"
                    aria-hidden="true"
                  />
                  <p className="max-w-full break-words text-xs leading-6 text-slate-500 [overflow-wrap:anywhere]">
                    3D Asset Preview: {url}
                  </p>
                </div>
              ))}
            </aside>
          </div>
          <section aria-label="First three questions" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <FileQuestion
                  size={18}
                  className="text-slate-500"
                  aria-hidden="true"
                />
                Question preview
              </h2>
              <span className="text-xs text-slate-500">
                {content.questions.length} questions · first{" "}
                {Math.min(3, content.questions.length)} shown
              </span>
            </div>
            {content.questions.slice(0, 3).map((question, i) => (
              <Question key={i} question={question} number={i + 1} />
            ))}
            {!content.questions.length && (
              <EmptyState title="No questions supplied" />
            )}
          </section>
          {content.questions.length > 3 && (
            <details className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="min-h-9 cursor-pointer text-sm font-semibold text-slate-700">
                Show remaining {content.questions.length - 3} questions
              </summary>
              <div className="mt-4 space-y-3">
                {content.questions.slice(3).map((question, i) => (
                  <Question key={i} question={question} number={i + 4} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
