import { ApiProperty } from '@nestjs/swagger';

export class ServedPortionResultResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  adultProfileId!: string;

  @ApiProperty({ example: 520 })
  servedWeight!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  estimatedNutrition!: Record<string, number>;
}

export class ServePreparedBatchPortionsResponseDto {
  @ApiProperty({ format: 'uuid' })
  preparedBatchId!: string;

  @ApiProperty({ type: ServedPortionResultResponseDto, isArray: true })
  portions!: ServedPortionResultResponseDto[];

  @ApiProperty({ example: 750 })
  availableWeight!: number;
}
