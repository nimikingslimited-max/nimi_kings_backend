import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IdType } from '@prisma/client';

export class SubmitKycDto {
  @ApiProperty({
    enum: IdType,
    example: IdType.NIN,
    description: 'Type of government-issued identity document',
  })
  @IsEnum(IdType)
  idType: IdType;

  @ApiProperty({
    example: '12345678901',
    description:
      'Official identification document number (e.g. NIN, Passport Number)',
  })
  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @ApiProperty({
    example: 'https://storage.nimikingsltd.com/kyc/nin-slip-user-123.jpg',
    description: 'Cloud storage URL of the uploaded front/slip ID document',
  })
  @IsString()
  @IsNotEmpty()
  idDocumentUrl: string;

  @ApiPropertyOptional({
    example: 'https://storage.nimikingsltd.com/kyc/utility-bill-user-123.pdf',
    description: 'Cloud storage URL of the utility bill or proof of residence',
  })
  @IsString()
  @IsOptional()
  proofOfAddressUrl?: string;
}
