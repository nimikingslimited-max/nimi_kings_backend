import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'chidi.okonkwo@example.com',
    description: 'Email address of the user requesting a new verification code',
  })
  @IsEmail()
  email: string;
}
