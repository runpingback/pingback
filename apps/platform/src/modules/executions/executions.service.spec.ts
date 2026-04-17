import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { Execution } from './execution.entity';

describe('ExecutionsService', () => {
  let service: ExecutionsService;
  let execRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    execRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        { provide: getRepositoryToken(Execution), useValue: execRepo },
      ],
    }).compile();

    service = module.get(ExecutionsService);
  });

  describe('createPending', () => {
    it('should create a pending execution', async () => {
      execRepo.create.mockReturnValue({ id: 'exec-1', status: 'pending' });
      execRepo.save.mockResolvedValue({ id: 'exec-1', status: 'pending' });

      const result = await service.createPending('job-1', new Date());

      expect(result.status).toBe('pending');
      expect(execRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          status: 'pending',
          scheduledAt: expect.any(Date),
        }),
      );
    });
  });

  describe('markRunning', () => {
    it('should set status to running with startedAt', async () => {
      const exec = { id: 'exec-1', status: 'pending' };
      execRepo.findOne.mockResolvedValue(exec);
      execRepo.save.mockResolvedValue({ ...exec, status: 'running' });

      await service.markRunning('exec-1');

      expect(execRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          startedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('markCompleted', () => {
    it('should set status to success with results', async () => {
      const exec = { id: 'exec-1', status: 'running', startedAt: new Date() };
      execRepo.findOne.mockResolvedValue(exec);
      execRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.markCompleted('exec-1', {
        status: 'success',
        httpStatus: 200,
        responseBody: '{"ok":true}',
        logs: [{ timestamp: 1, message: 'done' }],
      });

      expect(execRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          httpStatus: 200,
          completedAt: expect.any(Date),
          durationMs: expect.any(Number),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      execRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('exec-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasPendingOrRunning', () => {
    it('should return true when pending/running execution exists', async () => {
      execRepo.count.mockResolvedValue(1);

      const result = await service.hasPendingOrRunning('job-1', new Date());

      expect(result).toBe(true);
    });

    it('should return false when no pending/running execution exists', async () => {
      execRepo.count.mockResolvedValue(0);

      const result = await service.hasPendingOrRunning('job-1', new Date());

      expect(result).toBe(false);
    });
  });
});
