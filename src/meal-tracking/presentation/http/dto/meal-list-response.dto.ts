import { ApiProperty } from '@nestjs/swagger';
import { MealResponseDto } from './meal-response.dto';

export class MealListResponseDto {
  @ApiProperty({ type: MealResponseDto, isArray: true })
  items!: MealResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 4 })
  total!: number;
}
