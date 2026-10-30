import { createServer } from "http";
import { AddressInfo } from "net";
import { execFile } from "child_process";
import { promisify } from "util";
import { resolve } from "path";
import { KjseaService } from "./kjsea.service";

it("the actual backend blueprint passes the production frontend deployment script", async () => {
  const prisma = {
    kjseaMockAttempt: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const blueprint = await new KjseaService(prisma as any).configuration();
  const server = createServer((req, res) => {
    if (req.url !== "/api/v1/kjsea/blueprint") {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(blueprint));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
    const result = await promisify(execFile)(
      process.execPath,
      [
        resolve(__dirname, "../../../frontend/scripts/check-kjsea-api.mjs"),
        base,
      ],
      { timeout: 4000 },
    );
    expect(result.stdout).toContain(
      "PASS: KJSEA API and attempt storage are ready",
    );
    expect(prisma.kjseaMockAttempt.findFirst).toHaveBeenCalled();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
}, 10000);
