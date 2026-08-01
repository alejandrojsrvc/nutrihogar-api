import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsUUID, Min } from 'class-validator';
import type { MealType } from '../../../../meal-tracking/domain/models/meal.models';

const mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'EXTRA'];

export class ConsumePreparedInventoryItemRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  adultProfileId!: string;

  @ApiProperty({ enum: mealTypes })
  @IsIn(mealTypes)
  mealType!: MealType;

  @ApiProperty({ minimum: 0 })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 12 })
  @Min(Number.EPSILON)
  quantity!: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  consumedAt!: string;
}
