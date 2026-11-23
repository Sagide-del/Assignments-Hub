import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
import { useAuthStore } from "../../../store/auth.store";
export function SendToMaster({
  kind,
  payload,
  beforeSend,
}: {
  kind: "piano" | "guitar" | "drums";
  payload: unknown;
  beforeSend: () => void;
}) {
  const user = useAuthStore((s) => s.user),
    navigate = useNavigate(),
    [error, setError] = useState("");
  return (
    <div>
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17352e] px-4 text-sm font-semibold text-white"
        onClick={() => {
          try {
            localStorage.setItem(
              `ah-master-handoff:${user?.id}:${user?.schoolId}`,
              JSON.stringify({ kind, payload }),
            );
            beforeSend();
            navigate("/student/labs/music/beat-maker");
          } catch {
            setError(
              "Browser storage is unavailable. Download your pattern backup first.",
            );
          }
        }}
      >
        <Layers size={17} />
        Send to Master Beat
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
