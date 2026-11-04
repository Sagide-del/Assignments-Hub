import { Req, RawBodyRequest } from "@nestjs/common";
import { Request } from "express";
import { SkipThrottle } from "@nestjs/throttler";
import { Body, Controller, HttpCode, Post, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { TumaCallbackQueue } from "./tuma-callback-queue";
@Controller("api/payments/mpesa")
export class MpesaCallbackController {
  constructor(private readonly callbacks: TumaCallbackQueue) {}
  @Post("callback")
  @Public()
  @HttpCode(200)
  @SkipThrottle()
  async callback(
    @Query("reference") reference: string,
    @Query("token") token: string,
    @Body() payload: unknown,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (typeof reference === "string" && typeof token === "string")
      await this.callbacks.acknowledge(
        reference,
        token,
        payload,
        request.rawBody,
      );
    return { ResultCode: 0, ResultDesc: "Accepted" };
  }
}
