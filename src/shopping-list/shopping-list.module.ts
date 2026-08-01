import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { HouseholdsModule } from '../households/households.module';
import { ShoppingListController } from './presentation/http/shopping-list.controller';
import { PrismaShoppingListRepository } from './infrastructure/persistence/prisma-shopping-list.repository';
import {
  SHOPPING_LIST_REPOSITORY,
  ShoppingListRepository,
} from './application/ports/shopping-list-repository.port';
import {
  AddShoppingListItemUseCase,
  GenerateInventoryShoppingListItemsUseCase,
  GetShoppingListQuery,
  MarkShoppingListItemPurchasedUseCase,
  RemoveShoppingListItemUseCase,
  UpdateShoppingListItemUseCase,
} from './application/use-cases/shopping-list.use-cases';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import {
  INVENTORY_ITEM_REPOSITORY,
  InventoryItemRepository,
} from '../inventory/application/ports/inventory-repository.port';

@Module({
  imports: [HouseholdsModule, InventoryModule],
  controllers: [ShoppingListController],
  providers: [
    PrismaShoppingListRepository,
    { provide: SHOPPING_LIST_REPOSITORY, useExisting: PrismaShoppingListRepository },
    {
      provide: 'GET_SHOPPING_LIST_QUERY',
      inject: [HOUSEHOLD_REPOSITORY, SHOPPING_LIST_REPOSITORY],
      useFactory: (h: HouseholdRepository, l: ShoppingListRepository) =>
        new GetShoppingListQuery(h, l),
    },
    {
      provide: 'ADD_SHOPPING_LIST_ITEM_USE_CASE',
      inject: [HOUSEHOLD_REPOSITORY, SHOPPING_LIST_REPOSITORY],
      useFactory: (h: HouseholdRepository, l: ShoppingListRepository) =>
        new AddShoppingListItemUseCase(h, l),
    },
    {
      provide: 'UPDATE_SHOPPING_LIST_ITEM_USE_CASE',
      inject: [HOUSEHOLD_REPOSITORY, SHOPPING_LIST_REPOSITORY],
      useFactory: (h: HouseholdRepository, l: ShoppingListRepository) =>
        new UpdateShoppingListItemUseCase(h, l),
    },
    {
      provide: 'MARK_SHOPPING_LIST_ITEM_PURCHASED_USE_CASE',
      inject: [HOUSEHOLD_REPOSITORY, SHOPPING_LIST_REPOSITORY],
      useFactory: (h: HouseholdRepository, l: ShoppingListRepository) =>
        new MarkShoppingListItemPurchasedUseCase(h, l),
    },
    {
      provide: 'REMOVE_SHOPPING_LIST_ITEM_USE_CASE',
      inject: [HOUSEHOLD_REPOSITORY, SHOPPING_LIST_REPOSITORY],
      useFactory: (h: HouseholdRepository, l: ShoppingListRepository) =>
        new RemoveShoppingListItemUseCase(h, l),
    },
    {
      provide: 'GENERATE_INVENTORY_SHOPPING_LIST_ITEMS_USE_CASE',
      inject: [HOUSEHOLD_REPOSITORY, SHOPPING_LIST_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (h: HouseholdRepository, l: ShoppingListRepository, i: InventoryItemRepository) =>
        new GenerateInventoryShoppingListItemsUseCase(h, l, i),
    },
  ],
  exports: [SHOPPING_LIST_REPOSITORY],
})
export class ShoppingListModule {}
