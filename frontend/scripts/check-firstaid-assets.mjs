// A 200 response is insufficient: SPA fallbacks often return homepage HTML for
// missing images. Check both the MIME type and the WebP signature.
const base = new URL(process.argv[2] || 'https://assignmenthub.co.ke');
const topics = ['scene', 'fainting', 'bleeding', 'burns', 'choking', 'response'];
const results = await Promise.all(topics.map(async (topic) => {
  const path = `/skill-illustrations/firstaid-v2-${topic}.webp`;
  try {
    const response = await fetch(new URL(path, base), {
      headers: { Range: 'bytes=0-11', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(20000),
    });
    const type = response.headers.get('content-type') || '';
    const bytes = Buffer.from(await response.arrayBuffer());
    const valid = response.ok && type.startsWith('image/') && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    return { path, valid, detail: `HTTP ${response.status}; ${type || 'no content type'}${valid ? '; valid WebP' : '; not the expected image'}` };
  } catch (error) { return { path, valid: false, detail: error.message }; }
}));
for (const result of results) console.log(`${result.valid ? 'PASS' : 'FAIL'} ${result.path}: ${result.detail}`);
if (results.some(result => !result.valid)) process.exitCode = 1;
