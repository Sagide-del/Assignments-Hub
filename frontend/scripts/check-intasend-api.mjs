// Read-only release gate: checks the new API and migrated ledger, never sends an STK request.
const base = (
  process.argv[2] ?? "https://assignments-hub-api.onrender.com/api/v1"
).replace(/\/$/, "");
for (let attempt = 1; attempt <= 30; attempt++) {
  try {
    const r = await fetch(
      `${base}/independent-students/intasend/capabilities`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    const d = await r.json();
    if (
      d.intasendPaymentsVersion !== 1 ||
      d.callbackInboxVersion !== 1 ||
      d.provider !== "IntaSend"
    )
      throw Error("IntaSend schema/API not ready");
    console.log(
      `PASS: IntaSend API/ledger ready. Live configuration enabled: ${d.configured === true && d.mode === "live"}. No charge sent.`,
    );
    process.exit(0);
  } catch (e) {
    console.log(`IntaSend readiness ${attempt}/30: ${e.message}`);
  }
  if (attempt < 30) await new Promise((r) => setTimeout(r, 10000));
}
throw Error(
  "IntaSend backend/migration not ready; frontend publication blocked.",
);
