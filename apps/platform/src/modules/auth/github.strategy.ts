import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('github.clientId'),
      clientSecret: config.get<string>('github.clientSecret'),
      callbackURL: '/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
  ) {
    const email =
      profile.emails?.[0]?.value || `${profile.id}@github.pingback.dev`;
    return this.authService.findOrCreateGithubUser({
      githubId: String(profile.id),
      email,
      name: profile.displayName || profile.username,
      avatarUrl: profile.photos?.[0]?.value || '',
    });
  }
}
