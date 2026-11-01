import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'client.chidi@nimikingsltd.com',
    description: 'Registered account email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
