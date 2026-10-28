const base = (
  process.argv[2] ?? "https://assignments-hub-api.onrender.com/api/v1"
).replace(/\/$/, "");
for (let attempt = 1; attempt <= 24; attempt++) {
  try {
    const response = await fetch(`${base}/labs/capabilities`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (
      data.immersiveLabsVersion !== 3 ||
      data.workshopReportVersion !== "stem-workshop-v2" ||
      !data.studios?.includes("cyber-studio-v1") ||
      !data.studios?.includes("pendulum-studio-v1") ||
      data.evidenceStorage !== "completionSummary" ||
      !data.gradeLevels?.includes(11)
    )
      throw new Error("3D lab API not ready");
    console.log(
      "PASS: immersive laboratory API and grade-specific catalogue are ready",
    );
    process.exit(0);
  } catch (error) {
    console.log(`3D lab readiness ${attempt}/24: ${error.message}`);
  }
  if (attempt < 24) await new Promise((resolve) => setTimeout(resolve, 10000));
}
console.error(
  "3D laboratory backend/catalogue did not become ready. Frontend publication stopped.",
);
process.exit(1);
