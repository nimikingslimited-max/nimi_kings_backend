import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min, MinLength } from 'class-validator';

export class InspectionFeedbackDto {
  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Rating of the site visit and agent experience from 1 to 5 stars',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @ApiProperty({
    example:
      'Agent Chidi was very punctual, professional, and clearly explained the title documents and property boundaries.',
    description: 'Customer review and feedback notes on the inspection',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Feedback review must be at least 5 characters long' })
  feedback: string;
}
