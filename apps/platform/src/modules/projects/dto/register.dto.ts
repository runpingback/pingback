import {
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class FunctionOptionsDto {
  @IsInt()
  @IsOptional()
  @Min(0)
  retries?: number;

  @IsString()
  @IsOptional()
  timeout?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  concurrency?: number;
}

class FunctionMetadataDto {
  @IsString()
  name: string;

  @IsEnum(['cron', 'task'])
  type: 'cron' | 'task';

  @IsString()
  @IsOptional()
  schedule?: string;

  @ValidateNested()
  @Type(() => FunctionOptionsDto)
  @IsOptional()
  options?: FunctionOptionsDto;
}

export class RegisterDto {
  @IsUUID()
  project_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunctionMetadataDto)
  functions: FunctionMetadataDto[];
}
