import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.C_OF_O,
    description: 'Category of title / legal document',
  })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType: DocumentType;

  @ApiPropertyOptional({
    example: 'AGIS/MIS/2021/04982',
    description: 'Official document, parcel, or volume/page number',
  })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({
    example: 'https://cdn.nimikingsltd.com/documents/karu-cofo.pdf',
    description: 'Cloud storage URL for document access',
  })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({
    example: 'documents/properties/karu-cofo.pdf',
    description: 'Cloud object storage key',
  })
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @ApiPropertyOptional({
    example: '2099-12-31T00:00:00.000Z',
    description: 'Document expiration date (if applicable)',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({
    example: 'Certificate of Occupancy issued by Federal Ministry of Housing.',
    description: 'Additional document notes or description',
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}
