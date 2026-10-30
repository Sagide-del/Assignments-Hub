import { AiProviderRouterService } from "./ai-provider-router.service";
import {
  AiProviderError,
  AiProviderErrorReason,
} from "./errors/ai-provider.error";
describe("Persistable AI failure guidance", () => {
  it.each<[AiProviderErrorReason, string]>([
    ["INSUFFICIENT_BALANCE", "top up"],
    ["INVALID_REQUEST", "DEEPSEEK_MODEL"],
    ["NOT_CONFIGURED", "DEEPSEEK_API_KEY"],
    ["RATE_LIMITED", "Wait"],
    ["UNAVAILABLE", "Retry the saved job later"],
    ["INVALID_RESPONSE", "invalid JSON"],
    ["UNKNOWN", "inspect the backend provider error log"],
  ])(
    "retains actionable %s guidance in Error.message for saved jobs",
    async (reason, text) => {
      const usage = { record: jest.fn() };
      const router = new AiProviderRouterService(
        {
          providerName: "OPENAI",
          generateAssignment: jest
            .fn()
            .mockRejectedValue(
              new AiProviderError(
                "OPENAI",
                reason,
                "Private provider diagnostic",
              ),
            ),
        } as any,
        usage as any,
      );
      let failure: any;
      try {
        await router.generateAssignment("question");
      } catch (e) {
        failure = e;
      }
      expect(failure.getStatus()).toBe(503);
      expect(failure.message).toContain(reason);
      expect(failure.message).toContain(text);
      expect(failure.message).not.toContain("Private provider diagnostic");
      expect(failure.getResponse().message).toBe(failure.message);
      expect(usage.record).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining(reason),
        }),
      );
    },
  );
});
