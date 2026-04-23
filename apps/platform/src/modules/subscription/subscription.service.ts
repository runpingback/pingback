import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';
import { User } from '../../entities/user.entity';
import { PlanType } from './plan-limits';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly polar: Polar;
  private readonly productToPlan: Record<string, PlanType>;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService,
  ) {
    this.polar = new Polar({
      accessToken: this.config.get<string>('polar.accessToken'),
    });

    const freeId = this.config.get<string>('polar.products.free');
    const proId = this.config.get<string>('polar.products.pro');
    const teamId = this.config.get<string>('polar.products.team');

    this.productToPlan = {};
    if (freeId) this.productToPlan[freeId] = 'free';
    if (proId) this.productToPlan[proId] = 'pro';
    if (teamId) this.productToPlan[teamId] = 'team';
  }

  getProductForPlan(plan: PlanType): string | undefined {
    return this.config.get<string>(`polar.products.${plan}`);
  }

  getPlanForProduct(productId: string): PlanType | null {
    return this.productToPlan[productId] || null;
  }

  async createFreeSubscription(user: User): Promise<void> {
    try {
      const customer = await this.polar.customers.create({
        email: user.email,
        externalId: user.id,
        name: user.name || undefined,
      });

      const freeProductId = this.getProductForPlan('free');
      if (!freeProductId) {
        this.logger.warn(
          'POLAR_FREE_PRODUCT_ID not configured, skipping free subscription',
        );
        user.polarCustomerId = customer.id;
        await this.userRepo.save(user);
        return;
      }

      const subscription = await this.polar.subscriptions.create({
        customerId: customer.id,
        productId: freeProductId,
      });

      user.polarCustomerId = customer.id;
      user.polarSubscriptionId = subscription.id;
      user.executionsResetAt = this.nextMonthReset();
      await this.userRepo.save(user);
    } catch (err) {
      this.logger.error(
        `Failed to create Polar subscription for user ${user.id}: ${(err as Error).message}`,
      );
    }
  }

  async createCheckoutSession(
    user: User,
    plan: 'pro' | 'team',
  ): Promise<{ url: string }> {
    const productId = this.getProductForPlan(plan);
    if (!productId) {
      throw new Error(`No Polar product configured for plan: ${plan}`);
    }

    const checkout = await this.polar.checkouts.create({
      products: [productId],
      externalCustomerId: user.id,
      successUrl: `${this.config.get<string>('dashboardUrl')}/settings?upgraded=true`,
    });

    return { url: checkout.url };
  }

  async getPortalUrl(user: User): Promise<{ url: string }> {
    if (!user.polarCustomerId) {
      throw new Error('User has no Polar customer ID');
    }

    const session = await this.polar.customerSessions.create({
      customerId: user.polarCustomerId,
    });

    return { url: session.customerPortalUrl };
  }

  async updateUserPlan(
    userId: string,
    plan: PlanType,
    subscriptionId?: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`Webhook: user not found for ID ${userId}`);
      return;
    }

    user.plan = plan;
    if (subscriptionId) user.polarSubscriptionId = subscriptionId;

    if (plan !== 'free' && user.executionsResetAt === null) {
      user.executionsResetAt = this.nextMonthReset();
    }

    await this.userRepo.save(user);
    this.logger.log(`Updated user ${userId} to plan: ${plan}`);
  }

  private nextMonthReset(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}
