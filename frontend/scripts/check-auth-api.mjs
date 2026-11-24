const base = (
  process.argv[2] ?? "https://assignments-hub-api.onrender.com/api/v1"
).replace(/\/$/, "");
for (let attempt = 1; attempt <= 24; attempt++) {
  try {
    const response = await fetch(`${base}/auth/independent/capabilities`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.usernameRegistrationVersion !== 1 || data.unifiedLoginVersion !== 1)
      throw new Error("Unified sign-in API not ready");
    console.log("PASS: unified sign-in and username registration API ready");
    process.exit(0);
  } catch (error) {
    console.log(`Username API readiness ${attempt}/24: ${error.message}`);
  }
  if (attempt < 24) await new Promise((resolve) => setTimeout(resolve, 10000));
}
console.error(
  "Username registration backend not ready. Frontend publication stopped.",
);
process.exit(1);
