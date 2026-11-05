import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateAgentProfileDto {
  @ApiPropertyOptional({
    description: 'First name of the agent',
    example: 'Chidi',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the agent',
    example: 'Okonkwo',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Direct mobile phone / WhatsApp number',
    example: '+2348031234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Name of the real estate agency or firm',
    example: 'NIMI KINGS Prime Properties',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  agencyName?: string;

  @ApiPropertyOptional({
    description: 'Official real estate broker or agent license registration number',
    example: 'REDAN/LAG/2026/0892',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNumber?: string;

  @ApiPropertyOptional({
    description:
      'List of real estate market specialties (e.g. Luxury Villas, Commercial, Waterfront Plots)',
    example: ['Luxury Residential', 'Waterfront Villas', 'Commercial Land', 'Off-Plan Investments'],
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({
    description: 'Number of active professional years in the real estate sector',
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'Physical office or branch address',
    example: 'Suite 4B, Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  officeAddress?: string;

  @ApiPropertyOptional({
    description: 'Professional biography and career summary',
    example:
      'With over 7 years navigating prime Lagos and Abuja property markets, I specialize in connecting discerning investors with premium off-plan developments and secure, verified land assets.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Profile avatar image URL or cloud storage key',
    example: 'https://cdn.nimikingsltd.com/agents/chidi-okonkwo-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImage?: string;
}
