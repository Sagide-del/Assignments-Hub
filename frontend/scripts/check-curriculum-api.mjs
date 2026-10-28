const base = (
  process.argv[2] ?? "https://assignments-hub-api.onrender.com/api/v1"
).replace(/\/$/, "");
for (let attempt = 1; attempt <= 24; attempt++) {
  try {
    const r = await fetch(`${base}/ai/curriculum-capabilities`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    if (
      d.curriculumLibraryVersion !== 1 ||
      !d.reviewRequired ||
      !d.independentPublishing
    )
      throw new Error("Curriculum API not ready");
    console.log("PASS: curriculum library API is ready");
    process.exit(0);
  } catch (e) {
    console.log(`Curriculum readiness ${attempt}/24: ${e.message}`);
  }
  if (attempt < 24) await new Promise((resolve) => setTimeout(resolve, 10000));
}
console.error(
  "Curriculum backend did not become ready. Frontend publication stopped.",
);
process.exit(1);
