import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn().mockReturnValue({ sub: 'user-1' }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('should create a user and return tokens', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue({ id: 'user-1', email: 'test@test.com' });
      userRepo.save.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.register({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hash,
      });

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('password123', 10);
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hash,
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nope@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens for valid refresh token', async () => {
      const hash = await bcrypt.hash('valid-refresh', 10);
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        refreshToken: hash,
      });

      const result = await service.refreshTokens('valid-refresh');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const hash = await bcrypt.hash('valid-refresh', 10);
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        refreshToken: hash,
      });

      await expect(
        service.refreshTokens('invalid-refresh'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findOrCreateGithubUser', () => {
    it('should return existing user by githubId', async () => {
      const existing = { id: 'user-1', githubId: '12345', email: 'gh@test.com' };
      userRepo.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreateGithubUser({
        githubId: '12345',
        email: 'gh@test.com',
        name: 'GH User',
        avatarUrl: 'https://avatar.url',
      });

      expect(result.id).toBe('user-1');
    });

    it('should create new user if githubId not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue({
        id: 'user-2',
        githubId: '12345',
        email: 'gh@test.com',
      });
      userRepo.save.mockResolvedValue({
        id: 'user-2',
        githubId: '12345',
        email: 'gh@test.com',
      });

      const result = await service.findOrCreateGithubUser({
        githubId: '12345',
        email: 'gh@test.com',
        name: 'GH User',
        avatarUrl: 'https://avatar.url',
      });

      expect(result.id).toBe('user-2');
      expect(userRepo.save).toHaveBeenCalled();
    });
  });
});
