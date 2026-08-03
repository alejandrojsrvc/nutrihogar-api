import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() foodId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() inventoryItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sourceShoppingItemId?: string;
  @ApiProperty() @IsString() nameSnapshot!: string;
  @ApiProperty() @IsString() unit!: string;
  @ApiProperty() @IsNumber() quantity!: number;
}
export class CreatePurchaseRequestDto {
  @ApiProperty() @IsString() storeName!: string;
  @ApiProperty() @IsDateString() purchaseDate!: string;
  @ApiProperty() @IsNumber() total!: number;
  @ApiPropertyOptional() @IsString() currency?: string;
  @ApiProperty({ type: [PurchaseItemRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemRequestDto)
  items!: PurchaseItemRequestDto[];
}
export class UpdatePurchaseRequestDto extends PartialType(CreatePurchaseRequestDto) {}
export class ListPurchasesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  @ApiPropertyOptional() @IsOptional() @IsNumber() page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() storeName?: string;
}
export class ConfirmPurchaseRequestDto {
  @ApiPropertyOptional() @IsOptional() selections?: Record<string, string>;
}
export class CreatePurchaseFromReceiptRequestDto {
  @ApiPropertyOptional({ example: 'EUR' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ example: 'es-ES' }) @IsOptional() @IsString() locale?: string;
}
export class ConvertShoppingListRequestDto extends CreatePurchaseRequestDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID(undefined, { each: true }) itemIds!: string[];
  @ApiPropertyOptional() quantities?: Record<string, number>;
  @ApiPropertyOptional() @IsOptional() @IsString() idempotencyKey?: string;
}
export class PurchaseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() status!: string;
  @ApiProperty() source!: string;
  @ApiProperty() householdId!: string;
  @ApiProperty() total!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() items!: unknown[];
}
