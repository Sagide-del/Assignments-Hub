import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Store, X } from "lucide-react";
import { schoolsApi } from "../../../api/schools.api";
import { usersApi } from "../../../api/users.api";
import { apiErrorMessage } from "../../../api/axios";
import { cmsApi, type MasterModule } from "../../../services/cmsApi";
import { cmsSchoolStreams } from "../../../services/cms-streams";
import { useAuthStore } from "../../../store/auth.store";

export interface CmsPublishSuccess {
  message: string;
  status: "PUBLISHED_STORE" | "PUBLISHED_SCHOOL";
}
export default function PublishModal({
  module,
  onClose,
  onPublished,
}: {
  module: MasterModule;
  onClose: () => void;
  onPublished: (result: CmsPublishSuccess) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [target, setTarget] = useState<"STORE" | "SCHOOL">("STORE");
  const [schoolId, setSchoolId] = useState("");
  const [streams, setStreams] = useState<string[]>([]);
  const [wholeSchool, setWholeSchool] = useState(false);
  const userId = useAuthStore((state) => state.user?.id);
  const schools = useQuery({
    queryKey: ["cms", userId, "publish-schools"],
    queryFn: schoolsApi.findAll,
    enabled: target === "SCHOOL",
    retry: false,
  });
  const learners = useQuery({
    queryKey: ["cms", userId, "school-streams", schoolId, module.grade],
    queryFn: () => usersApi.findAll(Number(schoolId)),
    enabled: target === "SCHOOL" && !!schoolId,
    retry: false,
  });
  const choices = cmsSchoolStreams(
    learners.data ?? [],
    Number(schoolId),
    module.grade,
  );
  const validSchool = schools.data?.find(
    (school) => String(school.id) === schoolId && school.code !== "INDEPENDENT",
  );
  const publish = useMutation({
    mutationFn: () =>
      cmsApi.publishModule(
        target === "STORE"
          ? { module_id: module.id, target_type: "STORE" }
          : {
              module_id: module.id,
              target_type: "SCHOOL",
              target_id: schoolId,
              stream_ids: wholeSchool ? [] : streams,
            },
      ),
    onMutate: () => {
      busy.current = true;
    },
    onSettled: () => {
      busy.current = false;
    },
    onSuccess: () =>
      onPublished({
        status: target === "STORE" ? "PUBLISHED_STORE" : "PUBLISHED_SCHOOL",
        message:
          target === "STORE"
            ? "Published to Public Store."
            : `Published to ${validSchool?.name ?? "school"}${wholeSchool ? " · whole school" : ` · ${streams.length} ${streams.length === 1 ? "stream" : "streams"}`}.`,
      }),
  });
  useEffect(() => {
    const element = dialog.current,
      previous = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  const ready =
    target === "STORE" ||
    (!!validSchool &&
      (wholeSchool ||
        (!learners.isFetching &&
          !learners.isError &&
          streams.length > 0 &&
          streams.every((stream) => choices.includes(stream)))));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready && !busy.current) {
      busy.current = true;
      publish.mutate();
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="cms-publish-title"
      aria-describedby="cms-publish-context"
      onCancel={(event) => {
        if (busy.current) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy.current) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/45"
    >
      <form onSubmit={submit} className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="cms-publish-title" className="text-lg font-semibold">
              Publish module
            </h2>
            <p
              id="cms-publish-context"
              className="mt-1 break-words text-xs leading-5 text-slate-500"
            >
              Grade {module.grade} · {module.subject} · {module.topic}
            </p>
          </div>
          <button
            type="button"
            disabled={publish.isPending}
            aria-label="Close publish dialog"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <fieldset className="mt-5 space-y-2">
          <legend className="mb-2 text-xs font-semibold text-slate-500">
            Destination
          </legend>
          <label
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium ${target === "STORE" ? "border-slate-600 bg-slate-50" : "border-slate-200"}`}
          >
            <input
              type="radio"
              name="cms-destination"
              value="STORE"
              checked={target === "STORE"}
              disabled={publish.isPending}
              onChange={() => {
                setTarget("STORE");
                publish.reset();
              }}
              className="accent-slate-900"
            />
            <Store size={18} className="text-slate-500" aria-hidden="true" />
            Publish to Public Store
          </label>
          <label
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium ${target === "SCHOOL" ? "border-slate-600 bg-slate-50" : "border-slate-200"}`}
          >
            <input
              type="radio"
              name="cms-destination"
              value="SCHOOL"
              checked={target === "SCHOOL"}
              disabled={publish.isPending}
              onChange={() => {
                setTarget("SCHOOL");
                publish.reset();
              }}
              className="accent-slate-900"
            />
            <Building2
              size={18}
              className="text-slate-500"
              aria-hidden="true"
            />
            Publish to School
          </label>
        </fieldset>
        {target === "SCHOOL" && (
          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="cms-publish-school"
                className="text-sm font-medium"
              >
                School
              </label>
              <select
                id="cms-publish-school"
                value={schoolId}
                disabled={
                  schools.isPending || schools.isError || publish.isPending
                }
                onChange={(event) => {
                  setSchoolId(event.target.value);
                  setStreams([]);
                  setWholeSchool(false);
                  publish.reset();
                }}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">
                  {schools.isPending ? "Loading schools…" : "Select a school"}
                </option>
                {schools.data
                  ?.filter((school) => school.code !== "INDEPENDENT")
                  .map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
              </select>
              {schools.isError && (
                <p role="alert" className="mt-2 text-xs text-amber-900">
                  Schools could not be loaded.{" "}
                  <button
                    type="button"
                    onClick={() => schools.refetch()}
                    className="min-h-9 font-semibold underline"
                  >
                    Retry schools
                  </button>
                </p>
              )}
            </div>
            {schoolId && (
              <>
                <label className="flex min-h-10 items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={wholeSchool}
                    disabled={publish.isPending}
                    onChange={(event) => {
                      setWholeSchool(event.target.checked);
                      setStreams([]);
                      publish.reset();
                    }}
                    className="accent-slate-900"
                  />
                  Publish to the entire school
                </label>
                {!wholeSchool && (
                  <fieldset
                    disabled={publish.isPending}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <legend className="px-1 text-sm font-medium">
                      Streams · Grade {module.grade}
                    </legend>
                    {learners.isPending ? (
                      <p role="status" className="py-2 text-xs text-slate-500">
                        Loading streams…
                      </p>
                    ) : learners.isError ? (
                      <p role="alert" className="text-xs text-amber-900">
                        Streams could not be loaded.{" "}
                        <button
                          type="button"
                          onClick={() => learners.refetch()}
                          className="min-h-9 font-semibold underline"
                        >
                          Retry streams
                        </button>
                      </p>
                    ) : choices.length ? (
                      <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto">
                        {choices.map((stream) => (
                          <label
                            key={stream}
                            className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={streams.includes(stream)}
                              onChange={(event) =>
                                setStreams((current) =>
                                  event.target.checked
                                    ? [...current, stream]
                                    : current.filter((item) => item !== stream),
                                )
                              }
                              className="accent-slate-900"
                            />
                            <span className="break-words">{stream}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs leading-6 text-slate-500">
                        No streams found for this grade. Update the school’s
                        learner profiles or choose the entire school.
                      </p>
                    )}
                  </fieldset>
                )}
              </>
            )}
          </div>
        )}
        {publish.isError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950"
          >
            {apiErrorMessage(
              publish.error,
              "Publishing failed. Your selection is kept; try again.",
            )}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={publish.isPending}
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || publish.isPending}
            className="min-h-11 rounded-lg bg-[#101820] px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {publish.isPending ? "Publishing…" : "Publish"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
