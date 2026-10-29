// Fetch data only from a pinned public revision. Never install or execute code
// from the source repository. The runtime imports from this verified snapshot.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(
    join(root, "src/question-bank/github-curriculum.manifest.json"),
    "utf8",
  ),
);
const require = createRequire(import.meta.url);
const { parseRepositoryDesign } = require(
  join(root, "dist/src/question-bank/github-curriculum-parser.js"),
);
const destination = join(root, "dist/curriculum-data");
mkdirSync(destination, { recursive: true });
const local = process.env.CURRICULUM_SOURCE_CHECKOUT;
const temporary = local
  ? null
  : mkdtempSync(join(tmpdir(), "assignmenthub-curriculum-"));
const source = local ? resolve(local) : temporary;
const git = (args, options = {}) =>
  execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd: source,
    timeout: 120000,
    maxBuffer: 3 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
try {
  if (!local) {
    git(["init", "-q"]);
    git([
      "fetch",
      "--depth=1",
      `https://github.com/${manifest.repository}.git`,
      manifest.commit,
    ]);
  }
  const reports = [];
  let bytes = 0;
  for (const entry of manifest.files) {
    if (!/^Grade_(?:6|7|8|9|10|11|12)\/[^/]+\.md$/.test(entry.path))
      throw Error("Invalid manifest path");
    const data = local
      ? readFileSync(join(source, entry.path))
      : git(["show", `${manifest.commit}:${entry.path}`]);
    bytes += data.length;
    if (bytes > 20 * 1024 * 1024 || data.length > 2 * 1024 * 1024)
      throw Error("Curriculum snapshot exceeds its data limit");
    if (createHash("sha256").update(data).digest("hex") !== entry.sha256)
      throw Error(`Source checksum failed: ${entry.path}`);
    writeFileSync(join(destination, entry.id + ".md"), data);
    try {
      const parsed = parseRepositoryDesign(data.toString("utf8"), entry);
      reports.push({
        id: entry.id,
        grade: entry.grade,
        subject: entry.subject,
        rows: parsed.rows,
        outcomes: parsed.outcomes,
        coverage: parsed.coverage,
      });
    } catch (e) {
      reports.push({
        id: entry.id,
        grade: entry.grade,
        subject: entry.subject,
        error: e.message,
      });
    }
  }
  writeFileSync(
    join(destination, "snapshot.json"),
    JSON.stringify({ commit: manifest.commit, files: reports }, null, 2),
  );
  console.log(
    `Prepared ${reports.length} pinned curriculum sources (${bytes} bytes); ${reports.filter((r) => r.error).length} need extraction repair. Source gaps remain visible.`,
  );
} finally {
  if (temporary && existsSync(temporary))
    rmSync(temporary, { recursive: true, force: true });
}
