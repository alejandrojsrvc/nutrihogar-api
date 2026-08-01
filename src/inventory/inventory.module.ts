import { Module } from '@nestjs/common';
import {
  FOOD_CATALOG_READ_REPOSITORY,
  FoodCatalogReadRepository,
} from '../food-catalog/application/ports/food-catalog-read-repository.port';
import { FoodCatalogModule } from '../food-catalog/food-catalog.module';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import { HouseholdsModule } from '../households/households.module';
import { IdentityModule } from '../identity/identity.module';
import { RecipesModule } from '../recipes/recipes.module';
import { MealTrackingModule } from '../meal-tracking/meal-tracking.module';
import {
  PREPARED_BATCH_REPOSITORY,
  PreparedBatchRepository,
} from '../recipes/application/ports/prepared-batch-repository.port';
import {
  PREPARED_FOOD_LEFTOVER_REPOSITORY,
  PreparedFoodLeftoverRepository,
} from '../recipes/application/ports/prepared-food-leftover-repository.port';
import {
  ADULT_PROFILE_REPOSITORY,
  AdultProfileRepository,
} from '../households/application/adult-profile-ports/adult-profile-repository.port';
import {
  GET_INVENTORY_ITEM_QUERY,
  GetInventoryItemQuery,
} from './application/queries/get-inventory-item.query';
import {
  LIST_INVENTORY_ITEMS_QUERY,
  ListInventoryItemsQuery,
} from './application/queries/list-inventory-items.query';
import {
  LIST_INVENTORY_MOVEMENTS_QUERY,
  ListInventoryMovementsQuery,
} from './application/queries/list-inventory-movements.query';
import {
  INVENTORY_ITEM_REPOSITORY,
  INVENTORY_MOVEMENT_REPOSITORY,
  InventoryItemRepository,
  InventoryMovementRepository,
  PREPARED_INVENTORY_CONSUMPTION_UNIT_OF_WORK,
  PreparedInventoryConsumptionUnitOfWork,
} from './application/ports/inventory-repository.port';
import {
  ADJUST_INVENTORY_ITEM_USE_CASE,
  AdjustInventoryItemUseCase,
} from './application/use-cases/adjust-inventory-item.use-case';
import {
  ARCHIVE_INVENTORY_ITEM_USE_CASE,
  ArchiveInventoryItemUseCase,
} from './application/use-cases/archive-inventory-item.use-case';
import {
  CONSUME_INVENTORY_ITEM_USE_CASE,
  ConsumeInventoryItemUseCase,
} from './application/use-cases/consume-inventory-item.use-case';
import {
  CREATE_MANUAL_INVENTORY_ITEM_USE_CASE,
  CreateManualInventoryItemUseCase,
} from './application/use-cases/create-manual-inventory-item.use-case';
import {
  REGISTER_INVENTORY_EXPIRATION_USE_CASE,
  RegisterInventoryExpirationUseCase,
} from './application/use-cases/register-inventory-expiration.use-case';
import {
  REGISTER_INVENTORY_WASTE_USE_CASE,
  RegisterInventoryWasteUseCase,
} from './application/use-cases/register-inventory-waste.use-case';
import {
  SET_INVENTORY_MINIMUM_USE_CASE,
  SetInventoryMinimumUseCase,
} from './application/use-cases/set-inventory-minimum.use-case';
import { PrismaInventoryRepository } from './infrastructure/persistence/prisma-inventory.repository';
import { InventoryController } from './presentation/http/inventory.controller';
import { PreparationInventoryController } from './presentation/http/preparation-inventory.controller';
import {
  PREPARATION_INVENTORY_UNIT_OF_WORK,
  PreparationInventoryUnitOfWork,
} from './application/ports/inventory-repository.port';
import {
  PreviewPreparedBatchInventoryConsumptionUseCase,
  PREVIEW_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE,
  ConfirmPreparedBatchInventoryConsumptionUseCase,
  CONFIRM_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE,
} from './application/use-cases/prepared-batch-inventory-consumption.use-cases';
import {
  AddPreparedLeftoverToInventoryUseCase,
  ADD_PREPARED_LEFTOVER_TO_INVENTORY_USE_CASE,
} from './application/use-cases/add-prepared-leftover-to-inventory.use-case';
import {
  CONSUME_PREPARED_INVENTORY_ITEM_USE_CASE,
  ConsumePreparedInventoryItemUseCase,
} from './application/use-cases/consume-prepared-inventory-item.use-case';

@Module({
  imports: [IdentityModule, HouseholdsModule, FoodCatalogModule, RecipesModule, MealTrackingModule],
  controllers: [InventoryController, PreparationInventoryController],
  providers: [
    PrismaInventoryRepository,
    { provide: INVENTORY_ITEM_REPOSITORY, useExisting: PrismaInventoryRepository },
    { provide: INVENTORY_MOVEMENT_REPOSITORY, useExisting: PrismaInventoryRepository },
    { provide: PREPARATION_INVENTORY_UNIT_OF_WORK, useExisting: PrismaInventoryRepository },
    {
      provide: PREPARED_INVENTORY_CONSUMPTION_UNIT_OF_WORK,
      useExisting: PrismaInventoryRepository,
    },
    {
      provide: CONSUME_PREPARED_INVENTORY_ITEM_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        INVENTORY_ITEM_REPOSITORY,
        PREPARED_FOOD_LEFTOVER_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        PREPARED_INVENTORY_CONSUMPTION_UNIT_OF_WORK,
      ],
      useFactory: (
        households: HouseholdRepository,
        inventory: InventoryItemRepository,
        leftovers: PreparedFoodLeftoverRepository,
        adultProfiles: AdultProfileRepository,
        transaction: PreparedInventoryConsumptionUnitOfWork,
      ) =>
        new ConsumePreparedInventoryItemUseCase(
          households,
          inventory,
          leftovers,
          adultProfiles,
          transaction,
        ),
    },
    {
      provide: PREVIEW_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, PREPARED_BATCH_REPOSITORY, PREPARATION_INVENTORY_UNIT_OF_WORK],
      useFactory: (
        households: HouseholdRepository,
        batches: PreparedBatchRepository,
        inventory: PreparationInventoryUnitOfWork,
      ) => new PreviewPreparedBatchInventoryConsumptionUseCase(households, batches, inventory),
    },
    {
      provide: CONFIRM_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, PREPARED_BATCH_REPOSITORY, PREPARATION_INVENTORY_UNIT_OF_WORK],
      useFactory: (
        households: HouseholdRepository,
        batches: PreparedBatchRepository,
        inventory: PreparationInventoryUnitOfWork,
      ) => new ConfirmPreparedBatchInventoryConsumptionUseCase(households, batches, inventory),
    },
    {
      provide: ADD_PREPARED_LEFTOVER_TO_INVENTORY_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        PREPARED_FOOD_LEFTOVER_REPOSITORY,
        PREPARED_BATCH_REPOSITORY,
        PREPARATION_INVENTORY_UNIT_OF_WORK,
      ],
      useFactory: (
        households: HouseholdRepository,
        leftovers: PreparedFoodLeftoverRepository,
        batches: PreparedBatchRepository,
        inventory: PreparationInventoryUnitOfWork,
      ) => new AddPreparedLeftoverToInventoryUseCase(households, leftovers, batches, inventory),
    },
    {
      provide: LIST_INVENTORY_ITEMS_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (households: HouseholdRepository, inventory: InventoryItemRepository) =>
        new ListInventoryItemsQuery(households, inventory),
    },
    {
      provide: GET_INVENTORY_ITEM_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (households: HouseholdRepository, inventory: InventoryItemRepository) =>
        new GetInventoryItemQuery(households, inventory),
    },
    {
      provide: LIST_INVENTORY_MOVEMENTS_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY, INVENTORY_MOVEMENT_REPOSITORY],
      useFactory: (
        households: HouseholdRepository,
        inventory: InventoryItemRepository,
        movements: InventoryMovementRepository,
      ) => new ListInventoryMovementsQuery(households, inventory, movements),
    },
    {
      provide: CREATE_MANUAL_INVENTORY_ITEM_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, FOOD_CATALOG_READ_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (
        households: HouseholdRepository,
        foods: FoodCatalogReadRepository,
        inventory: InventoryItemRepository,
      ) => new CreateManualInventoryItemUseCase(households, foods, inventory),
    },
    {
      provide: ADJUST_INVENTORY_ITEM_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (households: HouseholdRepository, inventory: InventoryItemRepository) =>
        new AdjustInventoryItemUseCase(households, inventory),
    },
    {
      provide: SET_INVENTORY_MINIMUM_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (households: HouseholdRepository, inventory: InventoryItemRepository) =>
        new SetInventoryMinimumUseCase(households, inventory),
    },
    {
      provide: ARCHIVE_INVENTORY_ITEM_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (households: HouseholdRepository, inventory: InventoryItemRepository) =>
        new ArchiveInventoryItemUseCase(households, inventory),
    },
    {
      provide: CONSUME_INVENTORY_ITEM_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (households: HouseholdRepository, inventory: InventoryItemRepository) =>
        new ConsumeInventoryItemUseCase(households, inventory),
    },
    {
      provide: REGISTER_INVENTORY_WASTE_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (households: HouseholdRepository, inventory: InventoryItemRepository) =>
        new RegisterInventoryWasteUseCase(households, inventory),
    },
    {
      provide: REGISTER_INVENTORY_EXPIRATION_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
      useFactory: (households: HouseholdRepository, inventory: InventoryItemRepository) =>
        new RegisterInventoryExpirationUseCase(households, inventory),
    },
  ],
})
export class InventoryModule {}
