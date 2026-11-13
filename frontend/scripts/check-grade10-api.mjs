const base = (
  process.env.VITE_API_URL || "https://assignments-hub-api.onrender.com/api/v1"
).replace(/\/$/, "");
let ready = false;
for (let n = 0; n < 36; n++) {
  try {
    const r = await fetch(`${base}/career/capabilities`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    if (r.ok && data.ready === true && data.version === 1) {
      ready = true;
      console.log(
        `Grade 10 guide ready: ${data.verified_combinations} source-reviewed combinations.`,
      );
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (!ready)
  throw Error(
    "Grade 10 guide migration/API is not ready; stop before publishing.",
  );
