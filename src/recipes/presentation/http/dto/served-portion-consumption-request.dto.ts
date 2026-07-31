import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, Min } from 'class-validator';

const remainderDispositions = ['SAVED', 'DISCARDED', 'SHARED', 'CONSUMED_LATER'] as const;
const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'EXTRA'] as const;

export class ConfirmServedPortionConsumptionRequestDto {
  @ApiPropertyOptional({ example: 40, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  remainderWeight?: number;

  @ApiPropertyOptional({ enum: remainderDispositions })
  @IsOptional()
  @IsIn(remainderDispositions)
  remainderDisposition?: (typeof remainderDispositions)[number];

  @ApiProperty({ enum: mealTypes, example: 'LUNCH' })
  @IsIn(mealTypes)
  mealType!: (typeof mealTypes)[number];

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  consumedAt!: string;
}
