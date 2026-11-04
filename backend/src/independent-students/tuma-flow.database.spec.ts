import { TumaReconciliationService } from "./tuma-reconciliation.service";
import {
  INestApplication,
  Module,
  RequestMethod,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { IndependentTrialGuard } from "../common/guards/independent-trial.guard";
import { IndependentStudentsService } from "./independent-students.service";
import { TumaPaymentProvider } from "./tuma-payment.provider";
import { TumaPaymentsService } from "./tuma-payments.service";
import { TumaCallbackQueue } from "./tuma-callback-queue";
import { TumaPaymentsController } from "./tuma-payments.controller";
import { MpesaCallbackController } from "./mpesa-callback.controller";
const integration = process.env.MPESA_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration(
  "Isolated Tuma STK HTTP → durable callback → invoice → activation",
  () => {
    let p: PrismaClient,
      app: INestApplication,
      base: string,
      userId: number,
      schoolId: number,
      queue: TumaCallbackQueue,
      jwt: string;
    const requests: any[] = [],
      references: string[] = [];
    let originalAdapter: typeof axios.defaults.adapter;
    beforeAll(async () => {
      const url = new URL(process.env.MPESA_TEST_DATABASE_URL!);
      if (url.hostname !== "127.0.0.1" || url.pathname !== "/mpesa_test")
        throw Error("Use disposable localhost mpesa_test only.");
      p = new PrismaClient({ datasources: { db: { url: url.toString() } } });
      await p.$connect();
      const school = await p.school.upsert({
        where: { code: "INDEPENDENT" },
        create: {
          name: "Independent test learners",
          code: "INDEPENDENT",
          subscriptionStatus: "ACTIVE",
        },
        update: {},
      });
      schoolId = school.id;
      const user = await p.user.create({
        data: {
          schoolId,
          name: "STK fixture learner",
          role: "STUDENT",
          grade: "Grade 7",
          isActive: true,
          isIndependentTrial: true,
        },
      });
      userId = user.id;
      const config = new ConfigService({
        JWT_SECRET: "isolated-test-secret",
        TUMA_ENV: "sandbox",
        TUMA_SANDBOX_CONFIRMED: "true",
        TUMA_API_BASE_URL: "https://sandbox.tuma.invalid",
        TUMA_API_KEY: "mock-secret",
        TUMA_BUSINESS_EMAIL: "sandbox@example.invalid",
        TUMA_CALLBACK_BASE_URL:
          "https://callback.example.invalid/api/payments/mpesa/callback",
      });
      originalAdapter = axios.defaults.adapter;
      axios.defaults.adapter = async (config) => {
        const data =
          typeof config.data === "string"
            ? JSON.parse(config.data)
            : config.data;
        requests.push({ url: config.url, data });
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: String(config.url).endsWith("/auth/token")
            ? { success: true, token: "mock-token" }
            : {
                success: true,
                data: {
                  checkout_request_id: `checkout-${requests.length}`,
                  merchant_request_id: `merchant-${requests.length}`,
                },
              },
        };
      };
      @Module({
        imports: [PassportModule],
        controllers: [TumaPaymentsController, MpesaCallbackController],
        providers: [
          { provide: ConfigService, useValue: config },
          { provide: PrismaService, useValue: p },
          JwtStrategy,
          TumaPaymentProvider,
          TumaPaymentsService,
          TumaCallbackQueue,
          {
            provide: IndependentStudentsService,
            useValue: new IndependentStudentsService(
              p as any,
              {} as any,
              config,
              {} as any,
            ),
          },
        ],
      })
      class FixtureModule {}
      app = await NestFactory.create(FixtureModule, {
        logger: false,
        rawBody: true,
      });
      const reflector = app.get(Reflector);
      app.useGlobalGuards(
        new JwtAuthGuard(reflector),
        new RolesGuard(reflector),
        new TenantGuard(),
        new IndependentTrialGuard(reflector),
      );
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      app.setGlobalPrefix("api/v1", {
        exclude: [
          { path: "api/payments/mpesa/callback", method: RequestMethod.POST },
        ],
      });
      await app.listen(0, "127.0.0.1");
      base = await app.getUrl();
      queue = app.get(TumaCallbackQueue);
      queue.onModuleDestroy(); // Deterministically advance the real worker in tests.
      jwt = new JwtService({ secret: "isolated-test-secret" }).sign({
        sub: userId,
        schoolId,
        role: "STUDENT",
      });
    });
    afterAll(async () => {
      axios.defaults.adapter = originalAdapter;
      await app?.close();
      if (p && userId) {
        await p.mpesaCallbackInbox.deleteMany({
          where: { reference: { in: references } },
        });
        await p.payment.deleteMany({ where: { user_id: userId } });
        await p.independentStudentInvoice.deleteMany({
          where: { studentId: userId },
        });
        await p.independentTumaPayment.deleteMany({
          where: { studentId: userId },
        });
        await p.user.delete({ where: { id: userId } });
        await p.$disconnect();
      }
    });
    const post = (path: string, body: unknown, authenticated = false) =>
      fetch(base + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authenticated ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify(body),
      });
    async function start() {
      const response = await post(
        "/api/v1/independent-students/tuma/stk-push",
        {
          phone: "0712345678",
          interval: "MONTHLY",
          idempotencyKey: randomUUID(),
        },
        true,
      );
      expect(response.status).toBe(201);
      const payment = (await response.json()) as any;
      references.push(payment.reference);
      const call = requests
        .filter((r) => r.url.endsWith("/payment/stk-push"))
        .at(-1);
      expect(call.data.amount).toBe(300);
      expect(call.data.phone).toBe("254712345678");
      expect(call.data.description.length).toBeLessThanOrEqual(13);
      expect(payment.reference.length).toBeLessThanOrEqual(12);
      const row = await p.independentTumaPayment.findUniqueOrThrow({
        where: { reference: payment.reference },
      });
      return { row, url: new URL(call.data.callback_url) };
    }
    const success = (row: any, receipt: string) => ({
      status: "completed",
      merchant_request_id: row.merchantRequestId,
      checkout_request_id: row.checkoutRequestId,
      result_code: 0,
      amount: row.amountKES,
      mpesa_receipt_number: receipt,
    });
    it("acknowledges duplicate callbacks as HTTP 200 before activation and extends access exactly once", async () => {
      const capabilities = await fetch(
        base + "/api/v1/independent-students/tuma/capabilities",
      );
      expect(await capabilities.json()).toMatchObject({
        tumaPaymentsVersion: 2,
        callbackQueueVersion: 1,
        configured: true,
      });
      expect(
        (await post("/api/v1/independent-students/tuma/stk-push", {})).status,
      ).toBe(401);
      const { row, url } = await start(),
        body = success(row, "TESTRECEIPT01");
      const duplicateResponses = await Promise.all([
        post(url.pathname + url.search, body),
        post(url.pathname + url.search, body),
      ]);
      expect(duplicateResponses.map((response) => response.status)).toEqual([
        200, 200,
      ]);
      expect(
        (await p.user.findUniqueOrThrow({ where: { id: userId } }))
          .isIndependentTrial,
      ).toBe(true);
      expect(
        await p.mpesaCallbackInbox.count({
          where: { reference: row.reference },
        }),
      ).toBe(1);
      expect(
        await p.independentStudentInvoice.count({
          where: { studentId: userId },
        }),
      ).toBe(0);
      const audited = await p.payment.findUniqueOrThrow({
        where: { legacy_tuma_id: row.id },
      });
      expect(audited.raw_payload).toBe(JSON.stringify(body));
      await expect(
        p.payment.update({
          where: { id: audited.id },
          data: { raw_payload: "tampered" },
        }),
      ).rejects.toThrow("immutable");
      const auditEvent = await p.mpesaRawCallbackEvent.findFirstOrThrow({
        where: { legacy_tuma_id: row.id },
      });
      await expect(
        p.mpesaRawCallbackEvent.update({
          where: { id: auditEvent.id },
          data: { raw_payload: "tampered" },
        }),
      ).rejects.toThrow("append-only");
      await queue.drain();
      const activated = await p.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(activated.isIndependentTrial).toBe(false);
      const invoice = await p.independentStudentInvoice.findFirstOrThrow({
        where: { studentId: userId },
      });
      expect(invoice.amountKES).toBe(300);
      expect(invoice.interval).toBe("MONTHLY");
      expect(
        await p.payment.findUnique({ where: { legacy_tuma_id: row.id } }),
      ).toMatchObject({
        status: "SUCCESS",
        amount: 300,
        checkout_request_id: row.checkoutRequestId,
        mpesa_receipt: "TESTRECEIPT01",
      });
      await post(url.pathname + url.search, body);
      await post(url.pathname + url.search, {
        ...body,
        mpesa_receipt_number: "TESTRECEIPTZZ",
      });
      await queue.drain();
      expect(
        await p.independentStudentInvoice.count({
          where: { studentId: userId },
        }),
      ).toBe(1);
      expect(
        (await p.user.findUniqueOrThrow({ where: { id: userId } }))
          .subscriptionExpiresAt,
      ).toEqual(activated.subscriptionExpiresAt);
    });
    it("keeps cancelled payments cancelled and never activates on forged or mismatched amounts", async () => {
      const before = (await p.user.findUniqueOrThrow({ where: { id: userId } }))
        .subscriptionExpiresAt;
      const { row, url } = await start();
      const bad = success(row, "TESTRECEIPT02");
      bad.amount = 1;
      expect((await post(url.pathname + url.search, bad)).status).toBe(200);
      await queue.drain();
      expect(
        (await p.user.findUniqueOrThrow({ where: { id: userId } }))
          .subscriptionExpiresAt,
      ).toEqual(before);
      url.searchParams.set("token", "forged");
      expect(
        (await post(url.pathname + url.search, success(row, "TESTRECEIPT03")))
          .status,
      ).toBe(200);
      const realUrl = new URL(
        requests.filter((r) => r.url.endsWith("/payment/stk-push")).at(-1).data
          .callback_url,
      );
      expect(
        (
          await post(realUrl.pathname + realUrl.search, {
            status: "failed",
            result_code: 1032,
            merchant_request_id: row.merchantRequestId,
            checkout_request_id: row.checkoutRequestId,
          })
        ).status,
      ).toBe(200);
      await queue.drain();
      expect(
        await p.payment.findUnique({ where: { legacy_tuma_id: row.id } }),
      ).toMatchObject({ status: "CANCELLED" });
      expect(
        await p.independentStudentInvoice.count({
          where: { studentId: userId },
        }),
      ).toBe(1);
    });
    it("recovers a missing callback through shared settlement exactly once", async () => {
      const { row } = await start();
      await p.payment.update({
        where: { legacy_tuma_id: row.id },
        data: { created_at: new Date(Date.now() - 16 * 60000) },
      });
      const countBefore = await p.independentStudentInvoice.count({
        where: { studentId: userId },
      });
      const provider = {
        statusQueryConfigured: () => true,
        queryTransactionStatus: jest
          .fn()
          .mockResolvedValue({ payload: success(row, "RECOVERED001") }),
      };
      const job = new TumaReconciliationService(
        p as any,
        provider as any,
        app.get(TumaPaymentsService),
      );
      await job.reconcile();
      await job.reconcile();
      const settled = await p.payment.findUniqueOrThrow({
        where: { legacy_tuma_id: row.id },
      });
      expect(settled.status).toBe("SUCCESS");
      expect(settled.raw_payload).toBeNull(); // Query responses never pretend to be callbacks.
      expect(provider.queryTransactionStatus).toHaveBeenCalledTimes(1);
      expect(
        await p.independentStudentInvoice.count({
          where: { studentId: userId },
        }),
      ).toBe(countBefore + 1);
      // A late callback must not activate a second time.
      await app
        .get(TumaPaymentsService)
        .processStoredCallback(row.reference, success(row, "RECOVERED001"));
      expect(
        await p.independentStudentInvoice.count({
          where: { studentId: userId },
        }),
      ).toBe(countBefore + 1);
    });
  },
);
