import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { User } from '../../entities/user.entity';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let userRepo: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  beforeEach(async () => {
    userRepo = {
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      findOne: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'polar.accessToken': 'test-token',
          'polar.webhookSecret': 'test-secret',
          'polar.products.free': 'prod-free',
          'polar.products.pro': 'prod-pro',
          'polar.products.team': 'prod-team',
          dashboardUrl: 'http://localhost:3000',
        };
        return config[key];
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(SubscriptionService);
  });

  describe('getProductForPlan', () => {
    it('should return correct product ID for each plan', () => {
      expect(service.getProductForPlan('free')).toBe('prod-free');
      expect(service.getProductForPlan('pro')).toBe('prod-pro');
      expect(service.getProductForPlan('team')).toBe('prod-team');
    });
  });

  describe('getPlanForProduct', () => {
    it('should return correct plan for each product ID', () => {
      expect(service.getPlanForProduct('prod-free')).toBe('free');
      expect(service.getPlanForProduct('prod-pro')).toBe('pro');
      expect(service.getPlanForProduct('prod-team')).toBe('team');
    });

    it('should return null for unknown product ID', () => {
      expect(service.getPlanForProduct('unknown')).toBeNull();
    });
  });

  describe('updateUserPlan', () => {
    it('should update user plan and subscription ID', async () => {
      const user = { id: 'user-1', plan: 'free' } as User;
      userRepo.findOne.mockResolvedValue(user);

      await service.updateUserPlan('user-1', 'pro', 'sub-123');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'pro',
          polarSubscriptionId: 'sub-123',
        }),
      );
    });
  });
});
