import { practicalFor } from "../../../../backend/src/labs/practical-engine";
import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { labsApi } from "../../api/labs.api";
import { useAuthStore } from "../../store/auth.store";
import { isTitrationKey } from "./stem-workspace/three-d/titration-model";
const TitrationPractical = lazy(
  () => import("./stem-workspace/three-d/TitrationPractical"),
);
const PracticalWorkshop = lazy(
  () => import("./stem-workspace/three-d/PracticalWorkshop"),
);
const CyberStudio = lazy(() => import("./stem-workspace/studios/CyberStudio"));
const PendulumStudio = lazy(
  () => import("./stem-workspace/studios/PendulumStudio"),
);
const RespiratoryStudio = lazy(
  () => import("./stem-workspace/studios/RespiratoryStudio"),
);
const MolecularStudio = lazy(
  () => import("./stem-workspace/studios/MolecularStudio"),
);
const StarchStudio = lazy(
  () => import("./stem-workspace/studios/StarchStudio"),
);
export function StemLabPlayerPage() {
  const { id } = useParams();
  const userId = useAuthStore((s) => s.user?.id);
  const {
    data: lab,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["lab-player", userId, Number(id)],
    queryFn: () => labsApi.findOne(Number(id)),
    enabled: !!userId && Number.isFinite(Number(id)),
  });
  if (isLoading)
    return (
      <p className="rounded-2xl bg-white p-6">Preparing your investigation…</p>
    );
  if (isError || !lab)
    return (
      <div role="alert" className="rounded-2xl bg-white p-6">
        <p>We couldn’t open this lab.</p>
        <button
          type="button"
          className="mt-3 underline"
          onClick={() => refetch()}
        >
          Try again
        </button>
        <Link className="ml-4 underline" to="/student/stem-labs">
          Back to labs
        </Link>
      </div>
    );
  const kind = practicalFor(lab).kind;
  if (["starch", "organic", "molecule"].includes(kind)) {
    const Studio = kind === "starch" ? StarchStudio : MolecularStudio;
    return (
      <Suspense fallback={<p className="p-6">Preparing practical…</p>}>
        <Studio key={`${userId}:${lab.id}`} lab={lab} userId={userId!} />
      </Suspense>
    );
  }
  if (kind === "respiration")
    return (
      <Suspense
        fallback={<p className="p-6 text-sm">Preparing respiratory anatomy…</p>}
      >
        <RespiratoryStudio
          key={`${userId}:${lab.id}`}
          lab={lab}
          userId={userId!}
        />
      </Suspense>
    );
  if (kind === "cyber" || kind === "pendulum") {
    const Studio = kind === "cyber" ? CyberStudio : PendulumStudio;
    return (
      <Suspense
        fallback={<p className="p-6 text-sm">Preparing your laboratory…</p>}
      >
        <Studio key={`${userId}:${lab.id}`} lab={lab} userId={userId!} />
      </Suspense>
    );
  }
  if (isTitrationKey(lab.key))
    return (
      <Suspense
        fallback={
          <p className="p-6 text-sm text-slate-500">
            Preparing your 3D laboratory…
          </p>
        }
      >
        <TitrationPractical
          key={`${userId}:${lab.id}`}
          lab={lab}
          userId={userId!}
        />
      </Suspense>
    );
  return (
    <Suspense
      fallback={<p className="p-6 text-sm">Preparing your 3D workspace…</p>}
    >
      <PracticalWorkshop
        key={`${userId}:${lab.id}`}
        lab={lab}
        userId={userId!}
      />
    </Suspense>
  );
}
