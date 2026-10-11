import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitVerificationDto {
  @ApiPropertyOptional({
    example: 'All primary title documents and survey plans have been uploaded for review.',
    description: 'Submission notes or remarks from agent/landowner',
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}
