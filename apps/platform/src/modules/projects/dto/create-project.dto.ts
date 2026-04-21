import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'My SaaS App' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'URL where Pingback will send job execution requests', example: 'https://myapp.com/api/pingback' })
  @IsUrl({ require_tld: false })
  endpointUrl: string;

  @ApiPropertyOptional({ description: 'Custom domain for the project', example: 'myapp.com' })
  @IsString()
  @IsOptional()
  domain?: string;
}
