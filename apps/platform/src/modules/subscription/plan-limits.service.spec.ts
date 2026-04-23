import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlanLimitsService } from './plan-limits.service';
import { User } from '../../entities/user.entity';
import { Project } from '../projects/project.entity';
import { Job } from '../jobs/job.entity';

describe('PlanLimitsService', () => {
  let service: PlanLimitsService;
  let projectRepo: Record<string, jest.Mock>;
  let jobRepo: Record<string, jest.Mock>;

  const freeUser = {
    id: 'user-1',
    plan: 'free' as const,
    executionsThisMonth: 0,
    executionsResetAt: new Date('2026-05-01'),
  } as User;

  const proUser = {
    id: 'user-2',
    plan: 'pro' as const,
    executionsThisMonth: 0,
    executionsResetAt: new Date('2026-05-01'),
  } as User;

  beforeEach(async () => {
    projectRepo = { count: jest.fn() };
    jobRepo = { count: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PlanLimitsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
      ],
    }).compile();

    service = module.get(PlanLimitsService);
  });

  describe('canCreateProject', () => {
    it('should allow free user with 0 projects', async () => {
      projectRepo.count.mockResolvedValue(0);
      const result = await service.canCreateProject(freeUser);
      expect(result.allowed).toBe(true);
    });

    it('should block free user at limit', async () => {
      projectRepo.count.mockResolvedValue(1);
      const result = await service.canCreateProject(freeUser);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Project limit reached');
    });

    it('should allow pro user with 4 projects', async () => {
      projectRepo.count.mockResolvedValue(4);
      const result = await service.canCreateProject(proUser);
      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreateJob', () => {
    it('should allow free user with 4 jobs', async () => {
      jobRepo.count.mockResolvedValue(4);
      const result = await service.canCreateJob(freeUser, 'project-1');
      expect(result.allowed).toBe(true);
    });

    it('should block free user at 5 jobs', async () => {
      jobRepo.count.mockResolvedValue(5);
      const result = await service.canCreateJob(freeUser, 'project-1');
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Job limit reached');
    });
  });

  describe('canExecute', () => {
    it('should allow when under limit', async () => {
      const result = service.canExecute(freeUser);
      expect(result.allowed).toBe(true);
    });

    it('should block free user at 1000 executions', () => {
      const user = { ...freeUser, executionsThisMonth: 1000 };
      const result = service.canExecute(user as User);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Monthly execution limit reached');
    });
  });

  describe('checkInterval', () => {
    it('should block free user with interval under 60s', () => {
      const result = service.checkInterval(freeUser, 30);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Minimum interval');
    });

    it('should allow pro user with 10s interval', () => {
      const result = service.checkInterval(proUser, 10);
      expect(result.allowed).toBe(true);
    });
  });

  describe('capRetries', () => {
    it('should cap free user retries at 1', () => {
      expect(service.capRetries(freeUser, 5)).toBe(1);
    });

    it('should allow pro user up to 5 retries', () => {
      expect(service.capRetries(proUser, 5)).toBe(5);
    });
  });

  describe('capFanOut', () => {
    it('should return empty array for free user', () => {
      const tasks = [{ name: 'a', payload: {} }];
      expect(service.capFanOut(freeUser, tasks)).toEqual([]);
    });

    it('should cap pro user at 10 tasks', () => {
      const tasks = Array.from({ length: 15 }, (_, i) => ({ name: `t${i}`, payload: {} }));
      expect(service.capFanOut(proUser, tasks)).toHaveLength(10);
    });
  });
});
