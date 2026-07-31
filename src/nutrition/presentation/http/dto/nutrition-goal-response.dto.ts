import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NutritionGoalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  adultProfileId!: string;

  @ApiProperty({ format: 'date-time' })
  validFrom!: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  validUntil!: Date | null;

  @ApiProperty({ example: 2150 })
  dailyCalories!: number;

  @ApiProperty({ example: 170 })
  proteinGrams!: number;

  @ApiProperty({ example: 210 })
  carbohydrateGrams!: number;

  @ApiProperty({ example: 70 })
  fatGrams!: number;

  @ApiProperty({ example: 30 })
  fiberGrams!: number;

  @ApiProperty({ example: 'FAT_LOSS' })
  goalType!: string;

  @ApiProperty({ example: 'MIFFLIN_ST_JEOR_V1' })
  calculationMethod!: string;

  @ApiProperty({ format: 'uuid' })
  confirmedById!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
