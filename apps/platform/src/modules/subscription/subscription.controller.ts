import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { PlanLimitsService } from './plan-limits.service';
import { User } from '../../entities/user.entity';

@ApiTags('Subscription')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/subscription')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private planLimitsService: PlanLimitsService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create a Polar checkout session for upgrade' })
  @ApiResponse({ status: 200, description: 'Returns checkout URL' })
  async createCheckout(
    @Req() req: Request,
    @Body() body: { plan: 'pro' | 'team' },
  ) {
    if (!body.plan || !['pro', 'team'].includes(body.plan)) {
      throw new BadRequestException('Plan must be "pro" or "team"');
    }

    const userId = (req.user as { id: string }).id;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException();

    return this.subscriptionService.createCheckoutSession(user, body.plan);
  }

  @Get('portal')
  @ApiOperation({ summary: 'Get Polar customer portal URL' })
  @ApiResponse({ status: 200, description: 'Returns portal URL' })
  async getPortal(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException();

    return this.subscriptionService.getPortalUrl(user);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get current usage and plan limits' })
  @ApiResponse({ status: 200, description: 'Returns usage data' })
  async getUsage(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException();

    return this.planLimitsService.getUsage(user);
  }
}
