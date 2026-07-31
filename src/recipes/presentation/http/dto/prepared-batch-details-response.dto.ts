import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreparedBatchResponseDto } from './prepared-batch-response.dto';

export class PreparedBatchAvailabilityResponseDto {
  @ApiProperty({ example: 1650 })
  finalCookedWeight!: number;

  @ApiProperty({ example: 900 })
  servedWeight!: number;

  @ApiProperty({ example: 500 })
  storedLeftoverWeight!: number;

  @ApiProperty({ example: 40 })
  savedRemainderWeight!: number;

  @ApiProperty({ example: 0 })
  discardedWeight!: number;

  @ApiProperty({ example: 250 })
  availableWeight!: number;
}

export class PreparedBatchPortionRemainderResponseDto {
  @ApiProperty({ example: 40 })
  weight!: number;

  @ApiProperty({ enum: ['SAVED', 'DISCARDED', 'SHARED', 'CONSUMED_LATER'] })
  disposition!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class PreparedBatchServedPortionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  adultProfileId!: string;

  @ApiProperty({ example: 520 })
  servedWeight!: number;

  @ApiProperty({ format: 'date-time' })
  servedAt!: Date;

  @ApiProperty({ enum: ['SERVED', 'CONSUMED', 'CANCELLED'] })
  status!: string;

  @ApiPropertyOptional({ example: 480, nullable: true })
  consumedWeight!: number | null;

  @ApiPropertyOptional({ type: PreparedBatchPortionRemainderResponseDto, nullable: true })
  remainder!: PreparedBatchPortionRemainderResponseDto | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  mealId!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  nutritionSnapshot!: Record<string, number>;
}

export class PreparedBatchLeftoverDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  preparedBatchId!: string;

  @ApiProperty({ example: 500 })
  availableWeight!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  nutrientDensitySnapshot!: Record<string, number>;

  @ApiProperty({ format: 'date-time' })
  storedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  storageLocation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: ['AVAILABLE', 'CONSUMED', 'DISCARDED', 'EXPIRED'] })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PreparedBatchDetailsResponseDto {
  @ApiProperty({ type: PreparedBatchResponseDto })
  batch!: PreparedBatchResponseDto;

  @ApiPropertyOptional({ type: PreparedBatchAvailabilityResponseDto, nullable: true })
  availability!: PreparedBatchAvailabilityResponseDto | null;

  @ApiProperty({ type: PreparedBatchServedPortionResponseDto, isArray: true })
  servedPortions!: PreparedBatchServedPortionResponseDto[];

  @ApiProperty({ type: PreparedBatchLeftoverDetailResponseDto, isArray: true })
  leftovers!: PreparedBatchLeftoverDetailResponseDto[];
}
