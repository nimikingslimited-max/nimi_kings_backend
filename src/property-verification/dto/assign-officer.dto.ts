import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignOfficerDto {
  @ApiProperty({
    example: 'a4afb82c-7eef-47fa-b5f3-c5339bc19044',
    description: 'User ID of the verification officer to assign',
  })
  @IsUUID()
  @IsNotEmpty()
  officerId: string;
}
