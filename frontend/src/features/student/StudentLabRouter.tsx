import { lazy, Suspense } from "react";
const MusicProduction = lazy(() => import("../../pages/student/labs/music/studio"));
const MusicStudio = lazy(() => import("../../pages/student/labs/music"));
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowRight, FlaskConical, RefreshCw } from "lucide-react";
import { api } from "../../api/axios";
import { useLabConfig } from "../../hooks/useLabConfig";
import { useAuthStore } from "../../store/auth.store";
import { StemLabsPage } from "./StemLabs";
import { PageHeader } from "../../components/ui/Saas";
interface LabModule {
  id: string;
  subject: string;
  topic: string;
  question_count: number;
}
export default function StudentLabRouter() {
  const config = useLabConfig(),
    location = useLocation(),
    user = useAuthStore((s) => s.user);
  const modules = useQuery({
    queryKey: [
      "student-lab-modules",
      user?.id,
      user?.schoolId,
      config.labConfig?.category,
    ],
    queryFn: () =>
      api.get<LabModule[]>("/student/lab-modules").then((r) => r.data),
    enabled: !!config.labConfig,
  });
  if (config.isLoading)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Loading your lab…
      </p>
    );
  if (config.isError || !config.labConfig)
    return (
      <div className="p-6">
        <p role="alert">Your lab could not be loaded.</p>
        <button
          onClick={() => void config.refetch()}
          className="mt-3 flex items-center gap-2 text-sm"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  const lab = config.labConfig;
  if (location.pathname === "/student/labs" && lab.route !== location.pathname)
    return <Navigate to={lab.route} replace />;
  const productionRoute = lab.category === "ARTS_MUSIC" && location.pathname.startsWith(lab.route + "/");
  if (location.pathname !== lab.route && !productionRoute)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">
          This lab isn’t part of your current pathway.
        </h1>
        <Link className="mt-3 inline-block underline" to={lab.route}>
          Open {lab.label}
        </Link>
      </div>
    );
  if (lab.category === "ARTS_MUSIC")
    return (
      <Suspense fallback={<p role="status">Loading Music Studio…</p>}>
        {productionRoute ? <MusicProduction /> : <MusicStudio />}
      </Suspense>
    );
  const legacy =
    lab.category?.startsWith("STEM_") ||
    (!lab.category && lab.label === "Junior Science Lab");
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={lab.label} />
      {modules.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-slate-200 bg-white p-5 text-sm"
        >
          Published modules could not be loaded.{" "}
          <button className="underline" onClick={() => void modules.refetch()}>
            Try again
          </button>
        </div>
      ) : modules.isLoading ? (
        <p role="status" className="text-sm text-slate-500">
          Loading published modules…
        </p>
      ) : (modules.data?.length ?? 0) > 0 ? (
        <section
          aria-label="Published lab modules"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {modules.data!.map((m) => (
            <Link
              key={m.id}
              to={`/student/study-hub/library?module=${encodeURIComponent(m.id)}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-400"
            >
              <FlaskConical className="mb-5 h-6 w-6 text-[#526b10]" />
              <p className="text-xs text-slate-500">{m.subject}</p>
              <h2 className="mt-1 font-semibold text-slate-900">{m.topic}</h2>
              <span className="mt-5 flex items-center gap-2 text-sm">
                Open module
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </section>
      ) : !legacy ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <FlaskConical className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <h2 className="font-semibold">No activities published yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your teacher hasn’t published content for this yet. Check back soon.
          </p>
        </div>
      ) : null}
      {legacy && <StemLabsPage embedded />}
    </div>
  );
}
