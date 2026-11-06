import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createSign } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

export type JengaSignatureInput = {
  accountNumber: string;
  reference: string;
  mobileNumber: string;
  telco: "Safaricom";
  amount: string;
  currency: "KES";
};

@Injectable()
export class JengaSignatureService {
  constructor(private readonly config: ConfigService) {}

  sign(input: JengaSignatureInput) {
    const path = this.config.get<string>("JENGA_PRIVATE_KEY_PATH")?.trim();
    if (!path) {
      throw new ServiceUnavailableException(
        "Jenga signing is not configured yet.",
      );
    }
    let privateKey: string;
    try {
      privateKey = readFileSync(resolve(path), "utf8");
    } catch {
      throw new ServiceUnavailableException(
        "Jenga signing key is unavailable. Please contact support.",
      );
    }

    const plaintext = `${input.accountNumber}${input.reference}${input.mobileNumber}${input.telco}${input.amount}${input.currency}`;
    const signer = createSign("RSA-SHA256");
    signer.update(plaintext, "utf8");
    signer.end();
    return signer.sign(privateKey).toString("base64");
  }
}
