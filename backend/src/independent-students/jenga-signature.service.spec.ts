import { createVerify, generateKeyPairSync } from "crypto";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { JengaSignatureService } from "./jenga-signature.service";

describe("Jenga account-settlement signature", () => {
  const input = {
    accountNumber: "01116762952500",
    reference: "INV001",
    mobileNumber: "254708374149",
    telco: "Safaricom" as const,
    amount: "300.00",
    currency: "KES" as const,
  };
  let directory = "";

  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  it("signs the documented account-based settlement plaintext", () => {
    const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    directory = mkdtempSync(join(tmpdir(), "assignment-hub-jenga-"));
    const keyPath = join(directory, "jenga_private.pem");
    writeFileSync(
      keyPath,
      pair.privateKey.export({ type: "pkcs8", format: "pem" }),
    );
    const service = new JengaSignatureService({
      get: (key: string) => (key === "JENGA_PRIVATE_KEY_PATH" ? keyPath : undefined),
    } as any);

    const signature = service.sign(input);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(
      "01116762952500INV001254708374149Safaricom300.00KES",
      "utf8",
    );
    verifier.end();

    expect(
      verifier.verify(pair.publicKey, Buffer.from(signature, "base64")),
    ).toBe(true);
  });
});
