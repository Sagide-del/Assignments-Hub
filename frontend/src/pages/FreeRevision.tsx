import { useEffect } from "react";
export default function FreeRevision() {
  useEffect(() => {
    window.location.replace("/revision/");
  }, []);
  return (
    <main className="p-6">
      <a href="/revision/" className="font-semibold underline">
        Open free CBC practice
      </a>
    </main>
  );
}
