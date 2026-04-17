import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  refresh(@Req() req: Request, @Body('refreshToken') refreshToken: string) {
    const user = req.user as { id: string };
    return this.authService.refreshTokens(user.id, refreshToken);
  }

  @UseGuards(AuthGuard('github'))
  @Get('github')
  github() {
    // Passport redirects to GitHub
  }

  @UseGuards(AuthGuard('github'))
  @Get('github/callback')
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const tokens = await this.authService.generateTokens(user);
    const params = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    res.redirect(`${process.env.DASHBOARD_URL || 'http://localhost:3000'}/auth/callback?${params}`);
  }
}
