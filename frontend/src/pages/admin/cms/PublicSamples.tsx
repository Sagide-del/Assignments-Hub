import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { cmsApi, type MasterModule } from "../../../services/cmsApi";
import { apiErrorMessage } from "../../../api/axios";

export default function PublicSamples({ module }: { module: MasterModule }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [intro, setIntro] = useState("");
  const [guidance, setGuidance] = useState("");
  const [rights, setRights] = useState(false);
  const data = module.content_json as
    | {
        questions?: {
          question_text?: string;
          options?: unknown[];
          illustration?: unknown;
        }[];
        public_revision?: unknown;
      }
    | undefined;
  const publish = useMutation({
    mutationFn: () =>
      cmsApi.publishPublicSamples(module.id, {
        question_indices: selected,
        introduction: intro,
        guidance: guidance
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        rights_confirmed: rights,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["cms"] });
    },
  });
  const withdraw = useMutation({
    mutationFn: () => cmsApi.withdrawPublicSamples(module.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["cms"] });
    },
  });
  if (module.status !== "APPROVED" || module.tenant_id) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-10 items-center gap-2 text-sm font-semibold"
      >
        <Globe size={17} /> Public revision samples
      </button>
      {open && (
        <div className="mt-3 space-y-4 text-sm">
          <p className="max-w-3xl text-slate-600">
            Choose 3–5 text-only questions for free, public revision pages.
            These samples and their answers can appear on Google. The rest of
            this batch stays private. Approved samples appear after the next
            site deployment.
          </p>
          <fieldset className="max-h-64 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
            <legend className="font-medium">Select samples</legend>
            {(data?.questions || []).map((q, i) => (
              <label key={i} className="flex gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(i)}
                  disabled={
                    !!q.illustration ||
                    q.options?.length !== 4 ||
                    (!selected.includes(i) && selected.length >= 5)
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, i]
                        : selected.filter((n) => n !== i),
                    )
                  }
                />
                <span>
                  {i + 1}. {q.question_text}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="block font-medium">
            Topic introduction{" "}
            <span className="font-normal text-slate-500">
              (120–1800 characters)
            </span>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              minLength={120}
              maxLength={1800}
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3"
            />
          </label>
          <label className="block font-medium">
            Study reminders{" "}
            <span className="font-normal text-slate-500">
              (2–6 lines, at least 25 characters each)
            </span>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3"
            />
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => setRights(e.target.checked)}
            />
            <span>
              I have reviewed the accuracy and own or have permission to publish
              these questions, answers and reminders publicly.
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                !rights ||
                selected.length < 3 ||
                intro.trim().length < 120 ||
                publish.isPending ||
                withdraw.isPending
              }
              onClick={() => publish.mutate()}
              className="rounded-lg bg-[#101820] px-4 py-3 font-semibold text-white disabled:opacity-40"
            >
              {publish.isPending ? "Saving…" : "Approve public samples"}
            </button>
            {!!data?.public_revision && (
              <button
                type="button"
                disabled={withdraw.isPending || publish.isPending}
                onClick={() => withdraw.mutate()}
                className="rounded-lg border border-slate-300 px-4 py-3"
              >
                Withdraw public samples
              </button>
            )}
          </div>
          {(publish.isSuccess || withdraw.isSuccess) && (
            <p role="status" className="text-[#426011]">
              {withdraw.isSuccess
                ? "Withdrawn from the export. Redeploy the site to remove previously published pages."
                : "Samples approved. Redeploy the public site to update revision pages."}
            </p>
          )}
          {(publish.isError || withdraw.isError) && (
            <p role="alert" className="text-amber-900">
              {apiErrorMessage(
                publish.error || withdraw.error,
                "Could not update public samples.",
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
