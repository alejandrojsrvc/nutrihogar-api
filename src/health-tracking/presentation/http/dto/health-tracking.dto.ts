import { Type } from 'class-transformer';
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
