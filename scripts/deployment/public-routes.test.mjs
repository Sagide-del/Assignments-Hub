import test from "node:test";
import assert from "node:assert/strict";
import { validateRoutes, aliases } from "./public-routes.mjs";
test("clean URL alias keys exactly match public directory indexes", () => {
  const routes = validateRoutes([
    { path: "/free-revision/", file: "free-revision/index.html" },
    {
      path: "/revision/grade-7/mathematics/",
      file: "revision/grade-7/mathematics/index.html",
    },
  ]);
  assert.deepEqual(
    aliases(routes).map((x) => x.key),
    [
      "free-revision/",
      "free-revision",
      "revision/grade-7/mathematics/",
      "revision/grade-7/mathematics",
    ],
  );
});
test("private paths, traversal, scripts, arbitrary files and duplicate URLs cannot be published", () => {
  for (const r of [
    { path: "/student/", file: "student/index.html" },
    { path: "/revision/../", file: "revision/../index.html" },
    { path: "/revision/grade-7/math/", file: "index.html" },
    { path: "/revision/<script>/", file: "revision/<script>/index.html" },
  ])
    assert.throws(() => validateRoutes([r]));
  assert.throws(() =>
    validateRoutes([
      { path: "/revision/", file: "revision/index.html" },
      { path: "/revision/", file: "revision/index.html" },
    ]),
  );
});

test("publishing and rollback preserve clean-route HTML and clear withdrawn aliases without broader AWS permissions", async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } =
    await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { createHash } = await import("node:crypto");
  const { run } = await import("./public-routes.mjs");
  const root = await mkdtemp(join(tmpdir(), "public-route-aws-"));
  const originalPath = process.env.PATH,
    originalStore = process.env.ROUTE_FIXTURE;
  try {
    const bin = join(root, "bin"),
      store = join(root, "store"),
      dist = join(root, "dist"),
      snapshot = join(root, "snapshot");
    for (const p of [bin, store, join(dist, "revision/grade-7/mathematics")])
      await mkdir(p, { recursive: true });
    const keyfile = (k) =>
      join(store, createHash("sha256").update(k).digest("hex"));
    await writeFile(
      join(bin, "aws"),
      `#!/usr/bin/env python3
import os,sys,hashlib,json
from pathlib import Path
a=sys.argv[1:];key=a[a.index('--key')+1];p=Path(os.environ['ROUTE_FIXTURE'])/hashlib.sha256(key.encode()).hexdigest()
if a[1]=='get-object':
 if not p.exists():
  print('NoSuchKey',file=sys.stderr);sys.exit(1)
 Path(a[-1]).write_bytes(p.read_bytes());print('{}')
elif a[1]=='put-object':p.write_bytes(Path(a[a.index('--body')+1]).read_bytes());print('{}')
elif a[1]=='delete-object':p.unlink(missing_ok=True);print('{}')
else:sys.exit(2)
`,
      { mode: 0o755 },
    );
    process.env.PATH = bin + ":" + originalPath;
    process.env.ROUTE_FIXTURE = store;
    const old = [
        { path: "/revision/old-topic/", file: "revision/old-topic/index.html" },
      ],
      next = [
        {
          path: "/revision/grade-7/mathematics/",
          file: "revision/grade-7/mathematics/index.html",
        },
      ];
    await writeFile(
      keyfile("revision/route-aliases.json"),
      JSON.stringify(old),
    );
    for (const key of [
      "revision/old-topic/",
      "revision/old-topic",
      "revision/old-topic/index.html",
    ])
      await writeFile(keyfile(key), "old page");
    await writeFile(
      join(dist, "revision/route-aliases.json"),
      JSON.stringify(next),
    );
    await writeFile(join(dist, next[0].file), "new page");
    await run("prepare", "fixture", "", dist, snapshot);
    await run("publish", "fixture", "", dist, snapshot);
    assert.equal(
      await readFile(keyfile("revision/grade-7/mathematics/"), "utf8"),
      "new page",
    );
    assert(
      (await readFile(keyfile("revision/old-topic/"), "utf8")).includes(
        "noindex,follow",
      ),
    );
    await run("restore", "fixture", "", dist, snapshot);
    assert.equal(
      await readFile(keyfile("revision/old-topic/"), "utf8"),
      "old page",
    );
    assert(
      (
        await readFile(keyfile("revision/grade-7/mathematics/"), "utf8")
      ).includes("noindex,follow"),
    );
  } finally {
    process.env.PATH = originalPath;
    if (originalStore === undefined) delete process.env.ROUTE_FIXTURE;
    else process.env.ROUTE_FIXTURE = originalStore;
    await rm(root, { recursive: true, force: true });
  }
});
