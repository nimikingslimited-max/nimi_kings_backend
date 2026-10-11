import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DocumentStatus } from '@prisma/client';

export class VerifyDocumentDto {
  @ApiProperty({
    enum: [DocumentStatus.VERIFIED, DocumentStatus.FLAGGED, DocumentStatus.REJECTED],
    example: DocumentStatus.VERIFIED,
    description: 'Verification review outcome for this specific document',
  })
  @IsEnum(DocumentStatus)
  @IsNotEmpty()
  status: DocumentStatus;

  @ApiPropertyOptional({
    example: 'Stamp verified against registry records. Seal is authentic.',
    description: 'Specific reviewer remarks or reasons for flag/rejection',
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}
