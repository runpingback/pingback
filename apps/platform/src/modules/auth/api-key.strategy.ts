import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ApiKey } from '../api-keys/api-key.entity';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(
    @InjectRepository(ApiKey) private apiKeyRepo: Repository<ApiKey>,
  ) {
    super();
  }

  async validate(token: string) {
    if (!token.startsWith('pb_live_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const prefix = token.substring(0, 16);
    const candidates = await this.apiKeyRepo.find({
      where: { keyPrefix: prefix },
      relations: ['project', 'project.user'],
    });

    for (const candidate of candidates) {
      const valid = await bcrypt.compare(token, candidate.keyHash);
      if (valid) {
        await this.apiKeyRepo.update(candidate.id, { lastUsedAt: new Date() });
        return {
          project: candidate.project,
          user: candidate.project.user,
          apiKeyId: candidate.id,
        };
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }
}
