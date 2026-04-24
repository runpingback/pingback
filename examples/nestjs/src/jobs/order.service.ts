import { Injectable } from '@nestjs/common';
import { Cron, Task, PingbackContext } from '@usepingback/nestjs';

@Injectable()
export class OrderService {
  /**
   * Workflow chain example:
   * process-orders (cron) → validate-order → charge-payment → send-confirmation
   *                                        ↘ notify-failure (if invalid)
   */

  @Cron('process-orders', '*/10 * * * *', { retries: 1, timeout: '30s' })
  async processOrders(ctx: PingbackContext) {
    ctx.log('Checking for pending orders');

    const orders = [
      { orderId: 'ord-001', amount: 49.99, email: 'alice@example.com' },
      { orderId: 'ord-002', amount: 149.00, email: 'bob@example.com' },
      { orderId: 'ord-003', amount: 0, email: 'eve@example.com' },
    ];

    for (const order of orders) {
      ctx.task('validate-order', order);
    }

    ctx.log('Dispatched order validations', { count: orders.length });
    return { dispatched: orders.length };
  }

  @Task('validate-order', { retries: 2, timeout: '15s' })
  async validateOrder(ctx: PingbackContext, payload: { orderId: string; amount: number; email: string }) {
    ctx.log('Validating order', { orderId: payload.orderId });
    await new Promise((r) => setTimeout(r, 30));

    if (payload.amount <= 0) {
      ctx.log.warn('Invalid order amount', { orderId: payload.orderId, amount: payload.amount });
      ctx.task('notify-failure', {
        orderId: payload.orderId,
        email: payload.email,
        reason: 'Invalid amount',
      });
      return { valid: false, orderId: payload.orderId };
    }

    ctx.log('Order valid, proceeding to payment', { orderId: payload.orderId });
    ctx.task('charge-payment', payload);
    return { valid: true, orderId: payload.orderId };
  }

  @Task('charge-payment', { retries: 3, timeout: '30s' })
  async chargePayment(ctx: PingbackContext, payload: { orderId: string; amount: number; email: string }) {
    ctx.log('Charging payment', { orderId: payload.orderId, amount: payload.amount });
    await new Promise((r) => setTimeout(r, 50));

    ctx.log('Payment charged successfully', { orderId: payload.orderId });
    ctx.task('send-confirmation', {
      orderId: payload.orderId,
      email: payload.email,
      amount: payload.amount,
    });
    return { charged: true, orderId: payload.orderId };
  }

  @Task('send-confirmation', { retries: 2, timeout: '15s' })
  async sendConfirmation(ctx: PingbackContext, payload: { orderId: string; email: string; amount: number }) {
    ctx.log('Sending confirmation email', { orderId: payload.orderId, email: payload.email });
    await new Promise((r) => setTimeout(r, 20));

    ctx.log('Confirmation sent', { orderId: payload.orderId });
    return { sent: true, orderId: payload.orderId };
  }

  @Task('notify-failure', { retries: 2, timeout: '15s' })
  async notifyFailure(ctx: PingbackContext, payload: { orderId: string; email: string; reason: string }) {
    ctx.log.error('Order failed, notifying customer', {
      orderId: payload.orderId,
      email: payload.email,
      reason: payload.reason,
    });
    await new Promise((r) => setTimeout(r, 20));

    ctx.log('Failure notification sent', { orderId: payload.orderId });
    return { notified: true, orderId: payload.orderId };
  }
}
