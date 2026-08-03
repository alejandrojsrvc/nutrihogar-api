import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Purchase } from '../../domain/entities/purchase';
import {
  PurchaseAccessDeniedError,
  PurchaseAdminRequiredError,
  PurchaseFoodNotAvailableError,
  PurchaseNotFoundError,
  PurchaseInventorySelectionError,
  PurchaseIdempotencyConflictError,
  PurchaseUnitConversionError,
} from '../../application/errors/purchase-application.errors';
import {
  ReceiptOcrDataError,
  ReceiptOcrConfigurationError,
  ReceiptOcrFileError,
  ReceiptOcrProcessingError,
} from '../../application/errors/receipt-ocr.errors';
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
    source: purchase.toProps().source,
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
    error instanceof InvalidPurchaseStateError ||
    error instanceof PurchaseUnitConversionError
  )
    throw new BadRequestException(error.message);
  if (error instanceof PurchaseIdempotencyConflictError) throw new ConflictException(error.message);
  if (error instanceof ReceiptOcrFileError) throw new BadRequestException(error.message);
  if (error instanceof ReceiptOcrDataError) throw new UnprocessableEntityException(error.message);
  if (error instanceof ReceiptOcrConfigurationError)
    throw new InternalServerErrorException(error.message);
  if (error instanceof ReceiptOcrProcessingError) throw new BadGatewayException(error.message);
  throw new InternalServerErrorException();
}
