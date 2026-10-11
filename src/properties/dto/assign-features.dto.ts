import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignFeaturesDto {
  @ApiProperty({
    example: [
      '24/7 Electricity',
      'Perimeter Fencing & Security Post',
      'Swimming Pool',
    ],
    description: 'Array of feature/amenity names to attach to the property',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  features: string[];
}
