import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Chidi',
    description: 'User first name',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Okonkwo',
    description: 'User last name',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+2348039912345',
    description: 'Phone number in international or national format',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Phone number must be valid with 10-15 digits',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: '1990-05-15',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: 'Software Engineer & Real Estate Investor',
    description: 'User occupation or profession',
  })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({
    example: 'Plot 104, Nelson Mandela Street, Asokoro',
    description: 'Residential or correspondence address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Abuja',
    description: 'City of residence',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'FCT',
    description: 'State / Region of residence',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'Nigeria',
    description: 'Country of residence',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.nimikingsltd.com/avatars/user-profile-chidi.jpg',
    description: 'Cloud storage URL for user profile avatar',
  })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({
    example: 'Licensed real estate consultant specializing in Abuja prime lands.',
    description: 'Professional biography (for registered agents)',
  })
  @IsOptional()
  @IsString()
  bio?: string;
}
