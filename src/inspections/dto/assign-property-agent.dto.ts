import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignPropertyAgentDto {
  @ApiProperty({
    example: 'NK-PROP-537643',
    description: 'Property UUID or Property Code (e.g. NK-PROP-XXXXXX)',
  })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({
    example: 'a4afb82c-7eef-47fa-b5f3-c5339bc19044',
    description: 'User ID of the agent to assign to this property',
  })
  @IsUUID()
  @IsNotEmpty()
  agentId: string;
}
