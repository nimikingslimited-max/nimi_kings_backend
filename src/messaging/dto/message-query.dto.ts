import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 30;

  @ApiPropertyOptional({
    example: '2026-10-13T10:00:00.000Z',
    description: 'Fetch messages sent before this timestamp (cursor pagination)',
  })
  @IsOptional()
  @IsDateString()
  before?: string;
}
