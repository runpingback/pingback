import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { RegistrationService } from './registration.service';
import { RegisterDto } from './dto/register.dto';

@UseGuards(ApiKeyGuard)
@Controller('api/v1/register')
export class RegistrationController {
  constructor(private registrationService: RegistrationService) {}

  @Post()
  register(@Req() req: Request, @Body() dto: RegisterDto) {
    const { project } = req.user as any;
    if (project.id !== dto.project_id) {
      throw new ForbiddenException('API key does not belong to this project');
    }
    return this.registrationService.register(dto.project_id, dto.functions);
  }
}
