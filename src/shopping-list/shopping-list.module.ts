import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { MealPlanningModule } from '../meal-planning/meal-planning.module';
import { HouseholdsModule } from '../households/households.module';
import { IdentityModule } from '../identity/identity.module';
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
  AddMissingIngredientsToShoppingListUseCase,
} from './application/use-cases/shopping-list.use-cases';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import {
  INVENTORY_ITEM_REPOSITORY,
  InventoryItemRepository,
} from '../inventory/application/ports/inventory-repository.port';
import {
  WEEKLY_PLAN_REPOSITORY,
  WeeklyPlanRepository,
} from '../meal-planning/application/ports/weekly-plan-repository.port';
import {
  COMPARE_PLAN_WITH_INVENTORY_QUERY,
  ComparePlanWithInventoryQuery,
} from '../meal-planning/application/use-cases/weekly-analysis.use-cases';

@Module({
  imports: [IdentityModule, HouseholdsModule, InventoryModule, MealPlanningModule],
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
    {
      provide: 'ADD_MISSING_INGREDIENTS_TO_SHOPPING_LIST_USE_CASE',
      inject: [
        HOUSEHOLD_REPOSITORY,
        SHOPPING_LIST_REPOSITORY,
        WEEKLY_PLAN_REPOSITORY,
        COMPARE_PLAN_WITH_INVENTORY_QUERY,
      ],
      useFactory: (
        h: HouseholdRepository,
        l: ShoppingListRepository,
        p: WeeklyPlanRepository,
        c: ComparePlanWithInventoryQuery,
      ) => new AddMissingIngredientsToShoppingListUseCase(h, l, p, c),
    },
  ],
  exports: [SHOPPING_LIST_REPOSITORY],
})
export class ShoppingListModule {}
