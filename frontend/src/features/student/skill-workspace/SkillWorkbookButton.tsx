import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { skillsApi } from "../../../api/skills.api";
export function SkillWorkbookButton({ courseId }: { courseId: number }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const blob = await skillsApi.workbook(courseId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Assignment-Hub-Skill-${courseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      setError("Workbook unavailable. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-50"
      >
        {busy ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}{" "}
        {busy ? "Preparing PDF…" : "Workbook PDF"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-amber-800">
          {error}
        </p>
      )}
    </div>
  );
}
