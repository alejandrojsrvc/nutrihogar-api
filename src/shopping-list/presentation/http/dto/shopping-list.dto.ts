import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddShoppingListItemRequestDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() foodId?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ minimum: 0.000001 }) @IsNumber() @Min(0.000001) quantity!: number;
  @ApiProperty({ example: 'UNIT' }) @IsString() unit!: string;
  @ApiPropertyOptional({ enum: ['MANUAL', 'BELOW_MINIMUM', 'DEPLETED', 'MEAL_PLAN'] })
  @IsOptional()
  @IsEnum(['MANUAL', 'BELOW_MINIMUM', 'DEPLETED', 'MEAL_PLAN'])
  source?: 'MANUAL' | 'BELOW_MINIMUM' | 'DEPLETED' | 'MEAL_PLAN';
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() sourceReferenceId?: string;
}
export class UpdateShoppingListItemRequestDto extends PartialType(AddShoppingListItemRequestDto) {}
export class AddMissingIngredientRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() foodId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiProperty() @IsString() unit!: string;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsNumber() @Min(0) quantity?: number;
}
export class AddMissingIngredientsRequestDto {
  @ApiProperty({ type: AddMissingIngredientRequestDto, isArray: true })
  @IsArray()
  items!: AddMissingIngredientRequestDto[];
}
export class ShoppingListItemResponseDto {
  id!: string;
  shoppingListId!: string;
  foodId!: string | null;
  name!: string;
  quantity!: number;
  unit!: string;
  source!: string;
  sourceReferenceId!: string | null;
  status!: string;
  actorId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  purchasedAt!: Date | null;
  purchasedById!: string | null;
  removedAt!: Date | null;
  removedById!: string | null;
}
export class ShoppingListResponseDto {
  id!: string;
  householdId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  @ApiProperty({ type: ShoppingListItemResponseDto, isArray: true })
  items!: ShoppingListItemResponseDto[];
}
