import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { FoodCatalogModule } from '../food-catalog/food-catalog.module';
import { HouseholdsModule } from '../households/households.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ShoppingListModule } from '../shopping-list/shopping-list.module';
import { IdentityModule } from '../identity/identity.module';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import {
  FOOD_CATALOG_READ_REPOSITORY,
  FoodCatalogReadRepository,
} from '../food-catalog/application/ports/food-catalog-read-repository.port';
import {
  INVENTORY_ITEM_REPOSITORY,
  InventoryItemRepository,
} from '../inventory/application/ports/inventory-repository.port';
import {
  SHOPPING_LIST_REPOSITORY,
  ShoppingListRepository,
} from '../shopping-list/application/ports/shopping-list-repository.port';
import { PrismaPurchaseRepository } from './infrastructure/persistence/prisma-purchase.repository';
import { PrismaPurchaseInventoryUnitOfWork } from './infrastructure/persistence/prisma-purchase-inventory.unit-of-work';
import {
  PURCHASE_REPOSITORY,
  PurchaseRepository,
} from './application/ports/purchase-repository.port';
import {
  PURCHASE_INVENTORY_UNIT_OF_WORK,
  PurchaseInventoryUnitOfWork,
} from './application/ports/purchase-inventory-unit-of-work.port';
import {
  CancelPurchaseUseCase,
  ConfirmPurchaseUseCase,
  CreatePurchaseFromShoppingListUseCase,
  CreatePurchaseUseCase,
  GetPurchaseQuery,
  ListPurchasesQuery,
  UpdatePurchaseUseCase,
} from './application/use-cases/purchase.use-cases';
import { PurchaseController } from './presentation/http/purchase.controller';
import { StorageModule } from '../storage/storage.module';
import { RECEIPT_OCR, ReceiptOcrPort } from './application/ports/receipt-ocr.port';
import { OBJECT_STORAGE, ObjectStorage } from '../storage/application/ports/object-storage.port';
import { CreatePurchaseDraftFromReceiptUseCase } from './application/use-cases/create-purchase-draft-from-receipt.use-case';
import {
  GEMINI_CONTENT_CLIENT,
  GeminiContentClient,
} from '../gemini/application/ports/gemini-content.port';
import { GeminiModule } from '../gemini/gemini.module';
import { GeminiReceiptOcrAdapter } from './infrastructure/ocr/gemini-receipt-ocr.adapter';

@Module({
  imports: [
    DatabaseModule,
    HouseholdsModule,
    FoodCatalogModule,
    IdentityModule,
    InventoryModule,
    ShoppingListModule,
    StorageModule,
    GeminiModule,
  ],
  controllers: [PurchaseController],
  providers: [
    PrismaPurchaseRepository,
    {
      provide: GeminiReceiptOcrAdapter,
      inject: [GEMINI_CONTENT_CLIENT, ConfigService],
      useFactory: (client: GeminiContentClient, config: ConfigService) =>
        new GeminiReceiptOcrAdapter(client, {
          model: config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash',
          timeoutMs: config.get<number>('GEMINI_TIMEOUT_MS') ?? 120000,
        }),
    },
    { provide: PURCHASE_REPOSITORY, useExisting: PrismaPurchaseRepository },
    { provide: RECEIPT_OCR, useExisting: GeminiReceiptOcrAdapter },
    PrismaPurchaseInventoryUnitOfWork,
    { provide: PURCHASE_INVENTORY_UNIT_OF_WORK, useExisting: PrismaPurchaseInventoryUnitOfWork },
    {
      provide: 'CREATE_PURCHASE_USE_CASE',
      inject: [HOUSEHOLD_REPOSITORY, PURCHASE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: PurchaseRepository) =>
        new CreatePurchaseUseCase(h, p),
    },
    {
      provide: 'UPDATE_PURCHASE_USE_CASE',
      inject: [HOUSEHOLD_REPOSITORY, PURCHASE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: PurchaseRepository) =>
        new UpdatePurchaseUseCase(h, p),
    },
    {
      provide: 'CREATE_PURCHASE_DRAFT_FROM_RECEIPT_USE_CASE',
      inject: [
        HOUSEHOLD_REPOSITORY,
        PURCHASE_REPOSITORY,
        'CREATE_PURCHASE_USE_CASE',
        RECEIPT_OCR,
        OBJECT_STORAGE,
        ConfigService,
      ],
      useFactory: (
        h: HouseholdRepository,
        p: PurchaseRepository,
        c: CreatePurchaseUseCase,
        o: ReceiptOcrPort,
        s: ObjectStorage,
        config: ConfigService,
      ) =>
        new CreatePurchaseDraftFromReceiptUseCase(
          h,
          p,
          c,
          o,
          s,
          config.getOrThrow<number>('UPLOAD_MAX_FILE_SIZE_MB') * 1024 * 1024,
        ),
    },
    {
      provide: 'GET_PURCHASE_QUERY',
      inject: [HOUSEHOLD_REPOSITORY, PURCHASE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: PurchaseRepository) => new GetPurchaseQuery(h, p),
    },
    {
      provide: 'LIST_PURCHASES_QUERY',
      inject: [HOUSEHOLD_REPOSITORY, PURCHASE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: PurchaseRepository) => new ListPurchasesQuery(h, p),
    },
    {
      provide: 'CONFIRM_PURCHASE_USE_CASE',
      inject: [
        HOUSEHOLD_REPOSITORY,
        PURCHASE_REPOSITORY,
        FOOD_CATALOG_READ_REPOSITORY,
        INVENTORY_ITEM_REPOSITORY,
        PURCHASE_INVENTORY_UNIT_OF_WORK,
      ],
      useFactory: (
        h: HouseholdRepository,
        p: PurchaseRepository,
        f: FoodCatalogReadRepository,
        i: InventoryItemRepository,
        t: PurchaseInventoryUnitOfWork,
      ) => new ConfirmPurchaseUseCase(h, p, f, i, t),
    },
    {
      provide: 'CANCEL_PURCHASE_USE_CASE',
      inject: [HOUSEHOLD_REPOSITORY, PURCHASE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: PurchaseRepository) =>
        new CancelPurchaseUseCase(h, p),
    },
    {
      provide: 'CREATE_PURCHASE_FROM_SHOPPING_LIST_USE_CASE',
      inject: [
        HOUSEHOLD_REPOSITORY,
        SHOPPING_LIST_REPOSITORY,
        PURCHASE_REPOSITORY,
        'CREATE_PURCHASE_USE_CASE',
      ],
      useFactory: (
        h: HouseholdRepository,
        l: ShoppingListRepository,
        p: PurchaseRepository,
        c: CreatePurchaseUseCase,
      ) => new CreatePurchaseFromShoppingListUseCase(h, l, p, c),
    },
  ],
})
export class PurchasesModule {}
