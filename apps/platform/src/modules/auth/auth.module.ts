import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { ApiKey } from '../api-keys/api-key.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GithubStrategy } from './github.strategy';
import { ApiKeyStrategy } from './api-key.strategy';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    GithubStrategy,
    ApiKeyStrategy,
    ApiKeyGuard,
  ],
  exports: [AuthService, JwtAuthGuard, ApiKeyGuard],
})
export class AuthModule {}
