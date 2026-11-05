import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleType } from '@prisma/client';

export class CreateStaffUserDto {
  @ApiProperty({
    description: 'First name',
    example: 'Emeka',
  })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Eze',
  })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Corporate or verified staff email address',
    example: 'emeka.eze@nimikingsltd.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Valid email address is required' })
  email: string;

  @ApiPropertyOptional({
    description: 'Direct mobile phone number',
    example: '+2348021234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    description: 'Primary staff role',
    enum: RoleType,
    example: RoleType.AGENT,
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(RoleType)
  role: RoleType;

  @ApiPropertyOptional({
    description:
      'Initial password. If omitted, a secure temporary password will be auto-generated and returned.',
    example: 'NimiKings2026!Staff',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;

  @ApiPropertyOptional({
    description: 'Agency or department name (if AGENT or staff)',
    example: 'NIMI KINGS Prime Properties',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  agencyName?: string;

  @ApiPropertyOptional({
    description: 'License registration number (if AGENT)',
    example: 'LASRETR/AGT/2026/0991',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Specialties list (if AGENT)',
    example: ['Commercial Land', 'Luxury Residential'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];
}
