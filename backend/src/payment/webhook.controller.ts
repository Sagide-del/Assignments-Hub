// UNUSED — not registered in any module's `controllers` array (see
// payment.module.ts, which only wires up PaymentController), so Nest never
// instantiates this class and no route here is ever reachable. The real,
// signature-verified IntaSend webhook handler is
// PaymentController.webhook -> PaymentService.handleWebhook at
// POST /api/v1/payment/webhook.
//
// This file is dead code left over from an earlier draft. It's safe to
// delete; kept only because this environment can't delete files. Do not
// register it — it has no signature verification, unlike the real handler.
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('webhook')
@Public()
export class WebhookController {
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    console.log('📨 Webhook received:', JSON.stringify(payload, null, 2));
    
    const { event, data } = payload;
    
    switch(event) {
      case 'payment.completed':
        console.log('💳 Payment completed:', data);
        return { status: 'success', message: 'Payment processed successfully' };
      case 'payment.failed':
        console.log('❌ Payment failed:', data);
        return { status: 'error', message: 'Payment failed' };
      case 'subscription.created':
        console.log('✅ Subscription created:', data);
        return { status: 'success', message: 'Subscription created successfully' };
      case 'subscription.cancelled':
        console.log('❌ Subscription cancelled:', data);
        return { status: 'success', message: 'Subscription cancelled' };
      case 'subscription.renewed':
        console.log('🔄 Subscription renewed:', data);
        return { status: 'success', message: 'Subscription renewed successfully' };
      default:
        console.log('📌 Unhandled event:', event);
        return { status: 'success', message: 'Webhook received', event };
    }
  }
}