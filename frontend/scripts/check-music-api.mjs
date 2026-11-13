const base = (
  process.env.VITE_API_URL || "https://assignments-hub-api.onrender.com/api/v1"
).replace(/\/$/, "");
let ready = false;
for (let n = 0; n < 36; n++) {
  try {
    const r = await fetch(`${base}/student/music-studio/capabilities`, {
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json();
    if (r.ok && d.ready === true && d.version === 1) {
      ready = true;
      console.log("Music Studio project storage ready.");
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 5000));
}
if (!ready)
  throw Error(
    "Music Studio API/migration is not ready; stop before publication.",
  );

let productionReady = false;
for (let n = 0; n < 36; n++) {
  try {
    const r = await fetch(`${base}/music-production/capabilities`, {
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json();
    if (r.ok && d.ready === true && d.version === 1 && d.songs >= 18 && d.sampleStudioVersion === 1) {
      productionReady = true;
      console.log("Music production storage and 18 catalog entries ready.");
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 5000));
}
if (!productionReady)
  throw Error(
    "Music production API/migration/catalog is not ready; stop before publication.",
  );
