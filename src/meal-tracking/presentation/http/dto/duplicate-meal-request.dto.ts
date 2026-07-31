import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsUUID } from 'class-validator';
import { MealTypeDto } from './create-meal-request.dto';

export class DuplicateMealRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  adultProfileId!: string;

  @ApiProperty({ enum: MealTypeDto })
  @IsEnum(MealTypeDto)
  mealType!: MealTypeDto;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  consumedAt!: string;
}
