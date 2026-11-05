import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { spawn, ChildProcess } from "child_process";
import { randomBytes } from "crypto";
import { createServer } from "net";
import { isAbsolute, join } from "path";
import { existsSync } from "fs";
export type MathKind = "algebra" | "matrix" | "chemical_equation";
export interface SolvedMath {
  correct_answer: string;
  step_by_step_solution: string[];
}
@Injectable()
export class MathEngineService implements OnModuleDestroy {
  private readonly logger = new Logger(MathEngineService.name);
  private stopping = false;
  private child?: ChildProcess;
  private boot?: Promise<void>;
  private base = "";
  private token = "";
  private queue: Promise<unknown> = Promise.resolve();
  private pending = 0;
  constructor(private readonly config: ConfigService) {}
  onModuleDestroy() {
    this.stopping = true;
    this.child?.kill();
  }
  private async ready() {
    if (this.boot) return this.boot;
    this.boot = this.start().catch((e) => {
      this.boot = undefined;
      throw e;
    });
    return this.boot;
  }
  private async start() {
    const external = this.config.get<string>("MATH_ENGINE_URL");
    if (external) {
      const u = new URL(external);
      if (!["https:", "http:"].includes(u.protocol))
        throw new ServiceUnavailableException("Invalid math engine URL.");
      this.base = external.replace(/\/$/, "");
      this.token = this.config.get<string>("MATH_ENGINE_TOKEN") || "";
      if (!this.token)
        throw new ServiceUnavailableException(
          "Math engine authentication is not configured.",
        );
    } else {
      const port = await new Promise<number>((resolve, reject) => {
        const server = createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            server.close();
            reject(Error("Port unavailable"));
            return;
          }
          server.close(() => resolve(address.port));
        });
      });
      this.base = `http://127.0.0.1:${port}`;
      this.token = randomBytes(32).toString("hex");
      const python =
        this.config.get<string>("MATH_ENGINE_PYTHON") ||
        join(__dirname, "../../../.math-venv/bin/python");
      const workdir =
        this.config.get<string>("MATH_ENGINE_WORKDIR") ||
        join(__dirname, "../../../runtime/math-engine");
      if (
        !existsSync(join(workdir, "main.py")) ||
        !existsSync(join(workdir, "solver.py"))
      ) {
        this.logger.error(
          "MATH_ENGINE_BUNDLE_MISSING: runtime/math-engine is absent from the backend deployment.",
        );
        throw new ServiceUnavailableException({
          code: "MATH_ENGINE_BUNDLE_MISSING",
          message:
            "MATH_ENGINE_BUNDLE_MISSING: Python runtime files are missing from the backend deployment.",
        });
      }
      if (isAbsolute(python) && !existsSync(python)) {
        this.logger.error(
          "MATH_ENGINE_PYTHON_MISSING: the configured interpreter is unavailable; check the backend install logs.",
        );
        throw new ServiceUnavailableException({
          code: "MATH_ENGINE_PYTHON_MISSING",
          message:
            "MATH_ENGINE_PYTHON_MISSING: Python interpreter is missing. The backend installation must prepare the math runtime.",
        });
      }
      let startupFailure: string | undefined;
      this.child = spawn(
        python,
        [
          "-m",
          "uvicorn",
          "main:app",
          "--host",
          "127.0.0.1",
          "--port",
          String(port),
          "--no-access-log",
        ],
        {
          cwd: workdir,
          env: {
            ...process.env,
            MATH_ENGINE_TOKEN: this.token,
            PYTHONDONTWRITEBYTECODE: "1",
            OPENBLAS_NUM_THREADS: "1",
          },
          stdio: ["ignore", "ignore", "pipe"],
        },
      );
      this.child.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        if (/No module named|ModuleNotFoundError/.test(text))
          startupFailure = "MATH_ENGINE_DEPENDENCY_MISSING";
        else if (/ImportError|error while loading shared libraries/.test(text))
          startupFailure = "MATH_ENGINE_IMPORT_FAILED";
      });
      this.child.on("error", (error: NodeJS.ErrnoException) => {
        startupFailure =
          error.code === "ENOENT"
            ? "MATH_ENGINE_PYTHON_MISSING"
            : "MATH_ENGINE_SPAWN_FAILED";
      });
      this.child.on("exit", (code, signal) => {
        startupFailure ||=
          code === 0 ? "MATH_ENGINE_EXITED" : "MATH_ENGINE_START_FAILED";
        if (!this.stopping)
          this.logger.error(
            `${startupFailure}: Python exited (${code ?? signal ?? "unknown"}). Check runtime preparation and host memory.`,
          );
        this.boot = undefined;
      });
      // Record only diagnostic categories; never log request bodies, tokens or environment values.
      for (let i = 0; i < 100; i++) {
        if (startupFailure) {
          this.child.kill();
          throw new ServiceUnavailableException({
            code: startupFailure,
            message:
              `${startupFailure}: Private Python runtime failed to start. Inspect the backend runtime preparation logs.`,
          });
        }
        try {
          const r = await fetch(this.base + "/health", {
            headers: { "X-Math-Engine-Token": this.token },
            signal: AbortSignal.timeout(1000),
          });
          if (r.ok && ((await r.json()) as any).version === 1) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      this.child.kill();
      throw new ServiceUnavailableException({
        code: "MATH_ENGINE_START_TIMEOUT",
        message: "MATH_ENGINE_START_TIMEOUT: Private Python runtime did not become ready on this host.",
      });
    }
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(this.base + "/health", {
          headers: { "X-Math-Engine-Token": this.token },
          signal: AbortSignal.timeout(1000),
        });
        if (r.ok && ((await r.json()) as any).version === 1) return;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    this.child?.kill();
    throw new ServiceUnavailableException(
      "Math verification is temporarily unavailable. No answers have been graded.",
    );
  }
  private async request<T>(path: string, body: unknown): Promise<T> {
    if (this.pending >= 100)
      throw new ServiceUnavailableException(
        "Math verification is busy. Please retry.",
      );
    this.pending++;
    const run = async () => {
      await this.ready();
      let response: Response;
      try {
        response = await fetch(this.base + path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Math-Engine-Token": this.token,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(6000),
        });
      } catch {
        throw new ServiceUnavailableException(
          "Math verification is temporarily unavailable. Please retry.",
        );
      }
      if (response.status === 422)
        throw new UnprocessableEntityException(
          "This calculation cannot be verified safely.",
        );
      if (!response.ok)
        throw new ServiceUnavailableException(
          "Math verification is temporarily unavailable. Please retry.",
        );
      return response.json() as Promise<T>;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    try {
      return await result;
    } finally {
      this.pending--;
    }
  }
  async health() {
    const solved = await this.solve("algebra", "2*x+3=11");
    const balanced = await this.solve("chemical_equation", "H2 + O2 -> H2O");
    if (
      solved.correct_answer !== "x = 4" ||
      balanced.correct_answer !== "2H2 + O2 -> 2H2O"
    )
      throw new ServiceUnavailableException("Math engine self-check failed.");
    return { mathEngineVersion: 1 };
  }
  async solve(kind: MathKind, expression: string) {
    const r = await this.request<SolvedMath>("/solve", {
      question_type: kind,
      expression,
    });
    if (
      typeof r.correct_answer !== "string" ||
      !Array.isArray(r.step_by_step_solution)
    )
      throw new ServiceUnavailableException("Invalid solver response.");
    return r;
  }
  async equivalent(kind: MathKind, student: string, verified: string) {
    if (student.length > 500) return { correct: false };
    const r = await this.request<{ correct: boolean }>("/equivalent", {
      question_type: kind,
      student_answer: student,
      verified_answer: verified,
    });
    if (typeof r.correct !== "boolean")
      throw new ServiceUnavailableException("Invalid solver response.");
    return r;
  }
}
