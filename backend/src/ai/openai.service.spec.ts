import { createServer, Server } from "http";
import { AddressInfo } from "net";
import { OpenaiService } from "./openai.service";

describe("DeepSeek request bounds and SDK backoff", () => {
  let server: Server;
  let service: OpenaiService;
  let calls: number;
  let status: number;
  beforeEach(async () => {
    calls = 0;
    status = 429;
    server = createServer((req, res) => {
      req.resume();
      calls++;
      res.setHeader("Content-Type", "application/json");
      if (calls === 1 || status === 401) {
        res.statusCode = status;
        res.setHeader("retry-after-ms", "1");
        res.end(JSON.stringify({ error: { message: "test provider error" } }));
      } else
        res.end(
          JSON.stringify({
            model: "test-model",
            choices: [{ message: { content: '{"questions":[]}' } }],
            usage: { total_tokens: 10 },
          }),
        );
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    service = new OpenaiService({
      get: (key: string) =>
        key === "DEEPSEEK_API_KEY" ? "test-key" : undefined,
    } as any);
    // Only the transport endpoint changes; use the production SDK options.
    (service as any).client.baseURL =
      `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  });
  it("bounds each request and retries rate limits using Retry-After", async () => {
    expect((service as any).client.timeout).toBe(180000);
    expect((service as any).client.maxRetries).toBe(2);
    expect(await service.generateAssignment("test")).toMatchObject({
      content: { questions: [] },
      usage: { totalTokens: 10 },
    });
    expect(calls).toBe(2);
  });
  it("does not retry invalid provider credentials", async () => {
    status = 401;
    await expect(service.generateAssignment("test")).rejects.toMatchObject({
      reason: "NOT_CONFIGURED",
      retryable: false,
    });
    expect(calls).toBe(1);
  });
});
