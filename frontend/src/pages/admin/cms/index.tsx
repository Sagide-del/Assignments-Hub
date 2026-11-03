import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  Plus,
  Search,
  Store,
} from "lucide-react";
import { useState } from "react";
import { PageHeader, EmptyState } from "../../../components/ui/Saas";
import { apiErrorMessage } from "../../../api/axios";
import { cmsApi, type CmsStatus } from "../../../services/cmsApi";
import { useAuthStore } from "../../../store/auth.store";

const TABS = [
  { status: "DRAFT", label: "Drafts", Icon: FileText },
  { status: "APPROVED", label: "Approved", Icon: CheckCircle2 },
  { status: "PUBLISHED_STORE", label: "Published to Store", Icon: Store },
  {
    status: "PUBLISHED_SCHOOL",
    label: "Published to Schools",
    Icon: Building2,
  },
] as const;

export default function CmsDashboard() {
  const userId = useAuthStore((state) => state.user?.id);
  const [params, setParams] = useSearchParams();
  const status =
    TABS.find((tab) => tab.status === params.get("status"))?.status ?? "DRAFT";
  const [search, setSearch] = useState("");
  const pending = useQuery({
    queryKey: ["cms", userId, "drafts"],
    queryFn: cmsApi.getDrafts,
    enabled: status === "DRAFT" || status === "APPROVED",
    retry: false,
  });
  const store = useQuery({
    queryKey: ["cms", userId, "store"],
    queryFn: cmsApi.getPublicStore,
    enabled: status === "PUBLISHED_STORE",
    retry: false,
  });
  const query = status === "PUBLISHED_STORE" ? store : pending;
  const items = (query.data ?? []).filter(
    (item) =>
      item.status === status &&
      `${item.topic} ${item.subject} ${item.pathway ?? ""} Grade ${item.grade}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  function select(next: CmsStatus) {
    setParams({ status: next });
    setSearch("");
  }
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Content Library"
        actions={
          <Link
            to="/admin/cms/create"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#101820] px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus size={17} aria-hidden="true" />
            Create content
          </Link>
        }
      />
      <div
        role="tablist"
        aria-label="Content status"
        className="flex gap-1 overflow-x-auto border-b border-slate-200"
        onKeyDown={(event) => {
          const current = TABS.findIndex((tab) => tab.status === status);
          const index =
            event.key === "ArrowRight"
              ? (current + 1) % TABS.length
              : event.key === "ArrowLeft"
                ? (current + TABS.length - 1) % TABS.length
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? TABS.length - 1
                    : -1;
          if (index >= 0) {
            event.preventDefault();
            select(TABS[index].status);
            document.getElementById(`cms-tab-${TABS[index].status}`)?.focus();
          }
        }}
      >
        {TABS.map(({ status: key, label, Icon }) => (
          <button
            key={key}
            id={`cms-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={status === key}
            aria-controls="cms-content-panel"
            tabIndex={status === key ? 0 : -1}
            onClick={() => select(key)}
            className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition sm:px-4 sm:text-sm ${status === key ? "border-[#607d00] text-slate-900" : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800"}`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <section
        id="cms-content-panel"
        role="tabpanel"
        aria-labelledby={`cms-tab-${status}`}
        className="space-y-4"
      >
        {status === "PUBLISHED_SCHOOL" ? (
          <EmptyState
            title="School publication list is not connected yet"
            action={
              <p className="mx-auto max-w-md text-sm leading-6 text-slate-500">
                The publishing API supports school delivery. A
                school-publication listing endpoint is still needed to display
                those records here.
              </p>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500" role="status">
                {query.isPending
                  ? "Loading content…"
                  : query.isError
                    ? "Library unavailable"
                    : `${items.length} ${items.length === 1 ? "module" : "modules"}`}
              </p>
              <label className="relative w-full sm:max-w-xs">
                <span className="sr-only">Search content</span>
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-3 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search topic or subject"
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm"
                />
              </label>
            </div>
            {query.isPending ? (
              <div
                role="status"
                aria-label="Loading content library"
                className="space-y-3"
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : query.isError ? (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"
              >
                <p>
                  {apiErrorMessage(
                    query.error,
                    "Content could not be loaded. Try again.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => query.refetch()}
                  className="mt-2 min-h-10 font-semibold underline"
                >
                  Try again
                </button>
              </div>
            ) : !items.length ? (
              <EmptyState
                title={
                  search
                    ? "No matching content"
                    : status === "DRAFT"
                      ? "No drafts yet"
                      : status === "APPROVED"
                        ? "No approved modules yet"
                        : "No store publications yet"
                }
                action={
                  status === "DRAFT" && !search ? (
                    <Link
                      to="/admin/cms/create"
                      className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-800"
                    >
                      Create your first module
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
                  >
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5e5] text-[#526b10] sm:flex">
                      <BookOpen size={19} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">
                        Grade {item.grade} · {item.subject}
                      </p>
                      <h2 className="mt-1 break-words text-base font-semibold text-slate-900">
                        {item.topic}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {[item.pathway, item.track]
                          .filter(Boolean)
                          .join(" · ") || item.level}
                      </p>
                    </div>
                    <Link
                      to={`/admin/cms/review/${encodeURIComponent(item.id)}`}
                      className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 sm:self-auto"
                    >
                      {status === "PUBLISHED_STORE" ? "View summary" : "Review"}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
