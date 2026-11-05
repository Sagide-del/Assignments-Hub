import { useEffect } from "react";
export default function FreeRevision() {
  useEffect(() => {
    window.location.replace("/free-revision/index.html");
  }, []);
  return (
    <main className="p-6">
      <a href="/free-revision/index.html" className="font-semibold underline">
        Open free CBC practice
      </a>
    </main>
  );
}
