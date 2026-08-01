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
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() @Min(0) weeklyBudget?:
    number | null;
  @ApiPropertyOptional({ example: 'ARS' }) @IsOptional() @IsString() currency?: string | null;
}
export class UpdateWeeklyPlanRequestDto {
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() @Min(0) weeklyBudget?:
    number | null;
  @ApiPropertyOptional({ example: 'ARS' }) @IsOptional() @IsString() currency?: string | null;
}
export class ListWeeklyPlansQueryDto {
  @ApiPropertyOptional({ enum: WeeklyPlanStatus })
  @IsOptional()
  @IsEnum(WeeklyPlanStatus)
  status?: WeeklyPlanStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) limit = 20;
}
export class PlannedMealRequestDto {
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty({ enum: PlannedMealType }) @IsEnum(PlannedMealType) type!: PlannedMealType;
  @ApiProperty({ enum: PlannedMealSource }) @IsEnum(PlannedMealSource) source!: PlannedMealSource;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() recipeId?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() nameSnapshot?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
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
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() recipeId?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() nameSnapshot?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) position?: number;
}
export class ReplacePlannedMealRequestDto extends UpdatePlannedMealRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string | null;
}
export class AssignParticipantRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() adultProfileId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}
export class UpdateParticipantRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) suggestedQuantity?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() suggestedUnit?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsNumber() @Min(0) confirmedQuantity?:
    number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() confirmedUnit?: string | null;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsNumber() @Min(0) servingQuantity?:
    number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() servingUnit?: string | null;
}
