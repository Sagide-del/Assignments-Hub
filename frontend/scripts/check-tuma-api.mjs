const base = (
  process.argv[2] ?? "https://assignments-hub-api.onrender.com/api/v1"
).replace(/\/$/, "");
for (let attempt = 1; attempt <= 24; attempt++) {
  try {
    const r = await fetch(`${base}/independent-students/tuma/capabilities`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    if (d.tumaPaymentsVersion !== 1) throw new Error("Tuma API not ready");
    console.log(
      `PASS: Tuma API and migration ready. Credentials configured: ${d.configured === true}`,
    );
    process.exit(0);
  } catch (e) {
    console.log(`Tuma readiness ${attempt}/24: ${e.message}`);
  }
  if (attempt < 24) await new Promise((resolve) => setTimeout(resolve, 10000));
}
console.error(
  "Tuma backend/migration not ready. Frontend publication stopped.",
);
process.exit(1);
