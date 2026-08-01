import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Purchase } from '../../domain/entities/purchase';
import {
  PurchaseAccessDeniedError,
  PurchaseAdminRequiredError,
  PurchaseFoodNotAvailableError,
  PurchaseNotFoundError,
  PurchaseInventorySelectionError,
  PurchaseIdempotencyConflictError,
} from '../../application/errors/purchase-application.errors';
import {
  InvalidPurchaseStateError,
  InvalidPurchaseError,
} from '../../domain/errors/purchase.errors';
export function toPurchaseResponse(purchase: Purchase) {
  return {
    id: purchase.id,
    householdId: purchase.householdId,
    registeredById: purchase.registeredById,
    storeName: purchase.storeName,
    purchaseDate: purchase.purchaseDate.toISOString(),
    status: purchase.status,
    currency: purchase.currency,
    total: purchase.total.toString(),
    idempotencyKey: purchase.toProps().idempotencyKey,
    items: purchase.items.map((item) => ({
      id: item.id,
      foodId: item.foodId,
      inventoryItemId: item.inventoryItemId,
      sourceShoppingItemId: item.sourceShoppingItemId,
      nameSnapshot: item.nameSnapshot,
      unit: item.unit,
      quantity: item.quantity.toString(),
    })),
  };
}
export function rethrowPurchaseHttpError(error: unknown): never {
  if (error instanceof PurchaseNotFoundError) throw new NotFoundException(error.message);
  if (error instanceof PurchaseAccessDeniedError || error instanceof PurchaseAdminRequiredError)
    throw new ForbiddenException(error.message);
  if (
    error instanceof PurchaseFoodNotAvailableError ||
    error instanceof PurchaseInventorySelectionError ||
    error instanceof InvalidPurchaseError ||
    error instanceof InvalidPurchaseStateError
  )
    throw new BadRequestException(error.message);
  if (error instanceof PurchaseIdempotencyConflictError) throw new ConflictException(error.message);
  throw new InternalServerErrorException();
}
