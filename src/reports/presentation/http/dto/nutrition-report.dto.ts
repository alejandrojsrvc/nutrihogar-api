import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NutritionReportQueryDto {
  @ApiProperty({ example: '2026-08-01' })
  date!: string;
  @ApiPropertyOptional({ example: 'America/Mexico_City' })
  timezone?: string;
}

export class WeeklyNutritionReportQueryDto {
  @ApiProperty({ example: '2026-07-27' })
  weekStart!: string;
  @ApiPropertyOptional({ example: 'America/Mexico_City' })
  timezone?: string;
  @ApiPropertyOptional({ example: 0.8 })
  targetMin?: string;
  @ApiPropertyOptional({ example: 1.2 })
  targetMax?: string;
}

export class NutritionReportResponseDto {
  @ApiProperty() date!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() profile!: { id: string; name: string };
  @ApiProperty() hasConsumptionData!: boolean;
  @ApiProperty() totals!: unknown;
  @ApiProperty({ nullable: true }) goal!: unknown;
  @ApiProperty({ nullable: true }) comparison!: unknown;
  @ApiProperty({ type: 'array' }) meals!: unknown[];
  @ApiProperty({ type: 'array' }) warnings!: string[];
  @ApiProperty({ nullable: true }) planning!: unknown;
}

export class WeeklyNutritionReportResponseDto {
  @ApiProperty() weekStart!: string;
  @ApiProperty() weekEnd!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() profile!: { id: string; name: string };
  @ApiProperty({ type: 'array' }) days!: unknown[];
  @ApiProperty() totals!: unknown;
  @ApiProperty() averages!: unknown;
  @ApiProperty() recordedMealCount!: number;
  @ApiProperty({ nullable: true }) daysInTargetRange!: number | null;
  @ApiProperty() dataQuality!: unknown;
  @ApiProperty() previousWeek!: unknown;
  @ApiProperty({ nullable: true }) planning!: unknown;
  @ApiProperty() bodyWeight!: unknown;
  @ApiProperty() symptomCount!: number;
}
