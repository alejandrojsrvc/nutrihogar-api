import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PlannedMealSource, PlannedMealType } from '../../../domain/value-objects/planned-meal';
import { WeeklyPlanStatus } from '../../../domain/models/meal-planning.models';

export class CreateWeeklyPlanRequestDto {
  @ApiProperty({ example: '2026-08-03' }) @IsDateString() weekStart!: string;
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyBudget?: number | null;
  @ApiPropertyOptional({ type: String, example: 'ARS', nullable: true })
  @IsOptional()
  @IsString()
  currency?: string | null;
}
export class UpdateWeeklyPlanRequestDto {
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyBudget?: number | null;
  @ApiPropertyOptional({ type: String, example: 'ARS', nullable: true })
  @IsOptional()
  @IsString()
  currency?: string | null;
}
export class ListWeeklyPlansQueryDto {
  @ApiPropertyOptional({ enum: WeeklyPlanStatus })
  @IsOptional()
  @IsEnum(WeeklyPlanStatus)
  status?: WeeklyPlanStatus;
  @ApiPropertyOptional({ type: Number, default: 1 }) @IsOptional() @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ type: Number, default: 20 }) @IsOptional() @IsInt() @Min(1) limit = 20;
}
export class PlannedMealRequestDto {
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty({ enum: PlannedMealType }) @IsEnum(PlannedMealType) type!: PlannedMealType;
  @ApiProperty({ enum: PlannedMealSource }) @IsEnum(PlannedMealSource) source!: PlannedMealSource;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  recipeId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  nameSnapshot?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) position!: number;
}
export class UpdatePlannedMealRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional({ enum: PlannedMealType })
  @IsOptional()
  @IsEnum(PlannedMealType)
  type?: PlannedMealType;
  @ApiPropertyOptional({ enum: PlannedMealSource })
  @IsOptional()
  @IsEnum(PlannedMealSource)
  source?: PlannedMealSource;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  recipeId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  nameSnapshot?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) position?: number;
}
export class ReplacePlannedMealRequestDto extends UpdatePlannedMealRequestDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  reason?: string | null;
}
export class AssignParticipantRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() adultProfileId!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
export class UpdateParticipantRequestDto {
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedQuantity?: number | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  suggestedUnit?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
  @ApiPropertyOptional({ type: Number, minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  confirmedQuantity?: number | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  confirmedUnit?: string | null;
  @ApiPropertyOptional({ type: Number, minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  servingQuantity?: number | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  servingUnit?: string | null;
}
export class LinkConsumedMealRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() plannedMealId!: string;
}
export class AdherenceQueryDto {
  @ApiProperty({ example: '2026-08-03' }) @IsDateString() weekStart!: string;
}
