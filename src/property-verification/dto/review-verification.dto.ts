import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { RiskLevel, VerificationStatus } from '@prisma/client';

export class ReviewVerificationDto {
  @ApiProperty({
    enum: [
      VerificationStatus.VERIFIED,
      VerificationStatus.FLAGGED,
      VerificationStatus.REJECTED,
    ],
    example: VerificationStatus.VERIFIED,
    description: 'Outcome status of the due diligence process',
  })
  @IsEnum(VerificationStatus)
  @IsNotEmpty()
  status: VerificationStatus;

  @ApiProperty({
    enum: RiskLevel,
    example: RiskLevel.LOW,
    description: 'Assessed risk score for the property title',
  })
  @IsEnum(RiskLevel)
  @IsNotEmpty()
  riskLevel: RiskLevel;

  @ApiProperty({
    example: 'Title confirmed at the land registry. Coordinates match survey plan exactly.',
    description: 'Official legal opinion, findings, or reasons for decision',
  })
  @IsString()
  @IsNotEmpty()
  remarks: string;
}
