import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Target account status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsNotEmpty({ message: 'Target status is required' })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({
    description: 'Administrative reason or justification for status change',
    example: 'Account reactivated after successful identity verification audit',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
