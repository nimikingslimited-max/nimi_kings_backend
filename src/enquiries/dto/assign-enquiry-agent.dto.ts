import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignEnquiryAgentDto {
  @ApiProperty({
    example: 'a4afb82c-7eef-47fa-b5f3-c5339bc19044',
    description: 'User ID of the field agent to assign to this enquiry',
  })
  @IsUUID()
  @IsNotEmpty()
  agentId: string;
}
