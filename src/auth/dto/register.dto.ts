import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleType } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Chidi', description: 'User first name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Okonkwo', description: 'User last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'chidi.okonkwo@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+2348012345678',
    description: 'User phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 8 chars)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: [RoleType.CUSTOMER, RoleType.AGENT],
    default: RoleType.CUSTOMER,
    description: 'Account role (defaults to CUSTOMER)',
    required: false,
  })
  @IsEnum(RoleType)
  @IsOptional()
  role?: RoleType;
}
