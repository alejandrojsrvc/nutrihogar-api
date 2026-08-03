import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateWeeklyPlanProposalDto {
  @ApiProperty() @IsDateString() weekStart!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) mealTypes!: string[];
  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adultProfileIds: string[] = [];
  @ApiPropertyOptional() @IsOptional() @IsObject() preferences: Record<string, unknown> = {};
}

export class GenerateRecipeSuggestionsDto {
  @ApiProperty() @IsString() mealType!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) adultProfileIds!: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maximumPreparationMinutes?: number;
  @ApiPropertyOptional({ default: 3 }) @IsOptional() @IsInt() @Min(1) @Max(10) maximumSuggestions =
    3;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() prioritizeExpiringInventory =
    true;
}

export class UpdateAiProposalDto {
  @ApiProperty() @IsObject() payload!: Record<string, unknown>;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) mealTypes!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) adultProfileIds!: string[];
}

export class AcceptAiProposalDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedItems?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() editedPayload?: Record<string, unknown>;
}

export class RejectAiProposalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
