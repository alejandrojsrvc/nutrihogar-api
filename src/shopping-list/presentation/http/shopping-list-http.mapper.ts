import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ShoppingList } from '../../domain/entities/shopping-list';
import { ShoppingListItem } from '../../domain/entities/shopping-list-item';
import { ShoppingListItemNotFoundError } from '../../application/errors/shopping-list-application.errors';
import {
  InvalidShoppingListItemError,
  InvalidShoppingListItemTransitionError,
} from '../../domain/errors/shopping-list.errors';
import { HouseholdAccessDeniedError } from '../../../households/application/errors/household-access-denied.error';
import { ShoppingListResponseDto, ShoppingListItemResponseDto } from './dto/shopping-list.dto';

export function toItemResponse(item: ShoppingListItem): ShoppingListItemResponseDto {
  const p = item.toProps();
  return { ...p, quantity: p.quantity.toNumber() };
}
export function toListResponse(list: ShoppingList): ShoppingListResponseDto {
  const p = list.toProps();
  return {
    id: p.id,
    householdId: p.householdId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    items: p.items.map((item) => ({ ...item, quantity: item.quantity.toNumber() })),
  };
}
export function rethrowShoppingListHttpError(error: unknown): never {
  if (error instanceof HouseholdAccessDeniedError) throw new ForbiddenException(error.message);
  if (error instanceof ShoppingListItemNotFoundError) throw new NotFoundException(error.message);
  if (error instanceof InvalidShoppingListItemTransitionError)
    throw new ConflictException(error.message);
  if (error instanceof InvalidShoppingListItemError) throw new BadRequestException(error.message);
  throw error;
}
