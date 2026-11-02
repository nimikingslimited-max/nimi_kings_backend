import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum KycReviewDecision {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class ReviewKycDto {
  @ApiProperty({
    enum: KycReviewDecision,
    example: KycReviewDecision.VERIFIED,
    description: 'Administrative compliance verification decision',
  })
  @IsEnum(KycReviewDecision)
  status: KycReviewDecision;

  @ApiPropertyOptional({
    example:
      'ID document is blurry and NIN number is illegible. Please re-upload.',
    description: 'Detailed reason if verification was rejected',
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
