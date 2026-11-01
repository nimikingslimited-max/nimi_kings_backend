import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'chidi.okonkwo@example.com',
    description: 'Email address of the user to verify',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit email verification code received in email',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  code: string;
}
