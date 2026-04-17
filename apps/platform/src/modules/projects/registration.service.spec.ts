import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegistrationService } from './registration.service';
import { Job } from '../jobs/job.entity';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let jobRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    jobRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: getRepositoryToken(Job), useValue: jobRepo },
      ],
    }).compile();

    service = module.get(RegistrationService);
  });

  // Helper to mock the stale-deactivation query builder
  function mockDeactivationQB() {
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };
    jobRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  describe('register', () => {
    it('should create new cron jobs', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      jobRepo.create.mockReturnValue({ id: 'job-1', name: 'send-emails', status: 'active' });
      jobRepo.save.mockImplementation((j) => Promise.resolve({ id: 'job-1', ...j }));
      mockDeactivationQB();

      const result = await service.register('proj-1', [
        {
          name: 'send-emails',
          type: 'cron' as const,
          schedule: '*/15 * * * *',
          options: { retries: 3 },
        },
      ]);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].name).toBe('send-emails');
      expect(result.jobs[0].status).toBe('active');
    });

    it('should update existing jobs and reactivate them', async () => {
      const existing = {
        id: 'job-1',
        name: 'send-emails',
        schedule: '*/30 * * * *',
        status: 'inactive',
        source: 'sdk',
        retries: 0,
        timeoutSeconds: 30,
        concurrency: 1,
      };
      jobRepo.findOne.mockResolvedValue(existing);
      jobRepo.save.mockImplementation((j) => Promise.resolve(j));
      mockDeactivationQB();

      const result = await service.register('proj-1', [
        {
          name: 'send-emails',
          type: 'cron' as const,
          schedule: '*/15 * * * *',
          options: {},
        },
      ]);

      expect(result.jobs[0].status).toBe('active');
      expect(jobRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: '*/15 * * * *', status: 'active' }),
      );
    });

    it('should store task-type functions with null schedule', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      jobRepo.create.mockReturnValue({ id: 'job-1', name: 'send-email', status: 'active' });
      jobRepo.save.mockImplementation((j) => Promise.resolve({ id: 'job-1', ...j }));
      mockDeactivationQB();

      await service.register('proj-1', [
        { name: 'send-email', type: 'task' as const, options: { retries: 2 } },
      ]);

      expect(jobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: null }),
      );
    });

    it('should deactivate stale SDK jobs not in the incoming list', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      jobRepo.create.mockReturnValue({ id: 'job-1', name: 'keep-me', status: 'active' });
      jobRepo.save.mockImplementation((j) => Promise.resolve({ id: 'job-1', ...j }));
      const qb = mockDeactivationQB();

      await service.register('proj-1', [
        { name: 'keep-me', type: 'cron' as const, schedule: '* * * * *', options: {} },
      ]);

      expect(qb.update).toHaveBeenCalled();
      expect(qb.set).toHaveBeenCalledWith({ status: 'inactive' });
    });
  });
});
