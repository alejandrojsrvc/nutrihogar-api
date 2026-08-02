import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const weightUnits = ['KG', 'LB'] as const;
const lengthUnits = ['CM', 'IN'] as const;
const types = [
  'WAIST',
  'HIPS',
  'CHEST',
  'ARM_LEFT',
  'ARM_RIGHT',
  'THIGH_LEFT',
  'THIGH_RIGHT',
  'NECK',
  'CALF_LEFT',
  'CALF_RIGHT',
  'CUSTOM',
] as const;
const sources = ['MANUAL', 'IMPORTED', 'DEVICE'] as const;
const digestiveTypes = [
  'GAS',
  'BLOATING',
  'ABDOMINAL_PAIN',
  'HEARTBURN',
  'NAUSEA',
  'DIARRHEA',
  'CONSTIPATION',
  'OTHER',
] as const;
const digestiveStatuses = ['ACTIVE', 'RESOLVED', 'CORRECTED', 'CANCELLED'] as const;
const digestiveSources = ['MEAL_SELECTED', 'FOOD_FROM_MEAL', 'MANUAL_HYPOTHESIS'] as const;
const granularities = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
const csv = ({ value }: { value: unknown }) =>
  value == null
    ? undefined
    : Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : value;

export class BodyWeightRequestDto {
  @ApiProperty() @IsNumber() value!: number;
  @ApiProperty({ enum: weightUnits }) @IsEnum(weightUnits) unit!: (typeof weightUnits)[number];
  @ApiProperty() @IsDateString() recordedAt!: string;
  @ApiPropertyOptional({ enum: sources, default: 'MANUAL' })
  @IsOptional()
  @IsEnum(sources)
  source: (typeof sources)[number] = 'MANUAL';
}
export class BodyWeightQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ enum: weightUnits })
  @IsOptional()
  @IsEnum(weightUnits)
  unit?: (typeof weightUnits)[number];
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page =
    1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class BodyMeasurementRequestDto {
  @ApiProperty({ enum: types }) @IsEnum(types) type!: (typeof types)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() customMeasurementName?: string;
  @ApiProperty() @IsNumber() value!: number;
  @ApiProperty({ enum: lengthUnits }) @IsEnum(lengthUnits) unit!: (typeof lengthUnits)[number];
  @ApiProperty() @IsDateString() recordedAt!: string;
  @ApiPropertyOptional({ enum: sources, default: 'MANUAL' })
  @IsOptional()
  @IsEnum(sources)
  source: (typeof sources)[number] = 'MANUAL';
}
export class MeasurementConfigurationRequestDto {
  @ApiPropertyOptional({ enum: types, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(types, { each: true })
  enabledTypes?: (typeof types)[number][];
  @ApiPropertyOptional({ type: Object }) @IsOptional() units?: Record<
    string,
    (typeof lengthUnits)[number]
  >;
  @ApiPropertyOptional({ type: Object, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomMeasurementDto)
  customMeasurements?: CustomMeasurementDto[];
}
export class CustomMeasurementDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional({ enum: lengthUnits, default: 'CM' })
  @IsOptional()
  @IsEnum(lengthUnits)
  unit?: (typeof lengthUnits)[number];
  @ApiPropertyOptional({ default: true }) @IsOptional() enabled?: boolean;
}
export class BodyMeasurementBatchRequestDto {
  @ApiProperty({ type: BodyMeasurementRequestDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BodyMeasurementRequestDto)
  measurements!: BodyMeasurementRequestDto[];
  @ApiPropertyOptional({ type: MeasurementConfigurationRequestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MeasurementConfigurationRequestDto)
  enable?: MeasurementConfigurationRequestDto;
}
export class BodyMeasurementQueryDto {
  @ApiPropertyOptional({ enum: types }) @IsOptional() @IsEnum(types) type?: (typeof types)[number];
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page =
    1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class HealthTrackingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() adultProfileId!: string;
  @ApiProperty() value!: string;
  @ApiProperty() unit!: string;
  @ApiProperty() recordedAt!: string;
  @ApiProperty() source!: string;
  @ApiPropertyOptional() correctedFromId!: string | null;
}
export class HealthTrackingListResponseDto {
  @ApiProperty({ type: HealthTrackingResponseDto, isArray: true })
  items!: HealthTrackingResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}

export class DigestiveSymptomFoodLinkDto {
  @ApiProperty() @IsString() foodId!: string;
  @ApiProperty({ enum: digestiveSources })
  @IsEnum(digestiveSources)
  source!: (typeof digestiveSources)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() mealId?: string;
  @ApiPropertyOptional({ type: Object }) @IsOptional() snapshot?: Record<string, unknown>;
}
export class DigestiveSymptomRequestDto {
  @ApiProperty({ enum: digestiveTypes })
  @IsEnum(digestiveTypes)
  type!: (typeof digestiveTypes)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(5) intensity!: number;
  @ApiProperty() @IsDateString() startAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mealIds?: string[];
  @ApiPropertyOptional({ type: DigestiveSymptomFoodLinkDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DigestiveSymptomFoodLinkDto)
  foodLinks?: DigestiveSymptomFoodLinkDto[];
}
export class DigestiveSymptomQueryDto {
  @ApiPropertyOptional({ enum: digestiveTypes })
  @IsOptional()
  @IsEnum(digestiveTypes)
  type?: (typeof digestiveTypes)[number];
  @ApiPropertyOptional({ enum: digestiveStatuses })
  @IsOptional()
  @IsEnum(digestiveStatuses)
  status?: (typeof digestiveStatuses)[number];
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  intensity?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page =
    1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class DigestiveSymptomResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() adultProfileId!: string;
  @ApiProperty() type!: string;
  @ApiPropertyOptional() name!: string | null;
  @ApiProperty() intensity!: number;
  @ApiProperty() startAt!: string;
  @ApiPropertyOptional() endAt!: string | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() correctedFromId!: string | null;
  @ApiProperty({ type: String, isArray: true }) mealIds!: string[];
  @ApiProperty({ type: DigestiveSymptomFoodLinkDto, isArray: true })
  foodLinks!: DigestiveSymptomFoodLinkDto[];
  @ApiProperty() disclaimer!: string;
}
export class DigestiveSymptomListResponseDto {
  @ApiProperty({ type: DigestiveSymptomResponseDto, isArray: true })
  items!: DigestiveSymptomResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
export class RecentMealsForSymptomQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 48 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hours?: number;
  @ApiPropertyOptional({ minimum: 1, default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days?: number;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page =
    1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class BodyProgressQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ enum: granularities, default: 'DAILY' })
  @IsOptional()
  @IsEnum(granularities)
  granularity: (typeof granularities)[number] = 'DAILY';
  @ApiPropertyOptional({ enum: types, isArray: true })
  @IsOptional()
  @Transform(csv)
  @IsArray()
  @IsEnum(types, { each: true })
  measurementTypes?: (typeof types)[number][];
  @ApiPropertyOptional({ enum: weightUnits, default: 'KG' })
  @IsOptional()
  @IsEnum(weightUnits)
  weightUnit: (typeof weightUnits)[number] = 'KG';
  @ApiPropertyOptional({ enum: lengthUnits, default: 'CM' })
  @IsOptional()
  @IsEnum(lengthUnits)
  lengthUnit: (typeof lengthUnits)[number] = 'CM';
}
export class DigestiveSymptomInsightsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ enum: digestiveTypes, isArray: true })
  @IsOptional()
  @Transform(csv)
  @IsArray()
  @IsEnum(digestiveTypes, { each: true })
  symptomTypes?: (typeof digestiveTypes)[number][];
  @ApiPropertyOptional({ minimum: 1, default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minimumOccurrences = 2;
}
export class BodyProgressResponseDto {
  @ApiProperty() periods!: unknown[];
  @ApiProperty() warnings!: string[];
}
export class DigestiveSymptomInsightsResponseDto {
  @ApiProperty() disclaimer!: string;
  @ApiProperty() totalOccurrences!: number;
  @ApiProperty() byType!: Record<string, unknown>;
  @ApiProperty() associations!: Record<string, unknown>;
  @ApiProperty() symptomFreeDays!: string[];
}
