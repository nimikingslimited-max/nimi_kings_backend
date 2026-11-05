import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RoleType } from '@prisma/client';

export class UpdateUserRolesDto {
  @ApiProperty({
    description: 'Array of system role names to assign to the user',
    enum: RoleType,
    isArray: true,
    example: [RoleType.AGENT],
  })
  @IsNotEmpty({ message: 'Roles list is required' })
  @IsArray()
  @ArrayMinSize(1, { message: 'User must be assigned at least one role' })
  @IsEnum(RoleType, { each: true, message: 'Each role must be a valid RoleType' })
  roles: RoleType[];

  @ApiPropertyOptional({
    description: 'Administrative notes explaining the role reassignment',
    example: 'Promoted to field property agent for Lekki Phase 1 developments',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
