import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecipeIngredientResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  foodId!: string;

  @ApiProperty({ example: 600 })
  quantity!: number;

  @ApiProperty({ example: 'GRAM' })
  unit!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  servingId!: string | null;

  @ApiProperty({ example: 1 })
  position!: number;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
}

export class RecipeInstructionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  position!: number;

  @ApiProperty({ example: 'Cocinar el pollo.' })
  description!: string;
}

export class RecipeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  householdId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdById!: string | null;

  @ApiProperty({ example: 'Arroz con pollo' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  category!: string | null;

  @ApiProperty({ example: 4 })
  defaultServings!: number;

  @ApiPropertyOptional({ nullable: true, example: 60 })
  estimatedPreparationMinutes!: number | null;

  @ApiProperty({ type: String, isArray: true })
  tags!: string[];

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: false })
  isGlobal!: boolean;

  @ApiProperty({ type: RecipeIngredientResponseDto, isArray: true })
  ingredients!: RecipeIngredientResponseDto[];

  @ApiProperty({ type: RecipeInstructionResponseDto, isArray: true })
  instructions!: RecipeInstructionResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class RecipeListResponseDto {
  @ApiProperty({ type: RecipeResponseDto, isArray: true })
  items!: RecipeResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}
