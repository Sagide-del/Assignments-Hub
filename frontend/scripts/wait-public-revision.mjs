// Build must wait for the backend version that exports explicitly approved samples.
const url = process.env.PUBLIC_REVISION_FEED_URL;
if (!url)
  throw Error(
    "PUBLIC_REVISION_FEED_URL is required in the deployment workflow.",
  );
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const data = await r.json();
      if (
        data.version === 1 &&
        Array.isArray(data.topics) &&
        Array.isArray(data.taxonomy)
      ) {
        console.log(
          `Public revision export ready (${data.topics.length} approved topic snapshots).`,
        );
        process.exit(0);
      }
    }
  } catch {}
  console.log(`Waiting for public revision export (${attempt + 1}/60)…`);
  await new Promise((r) => setTimeout(r, 10000));
}
throw Error(
  "Public revision export is not ready. Deployment stopped before publishing.",
);
