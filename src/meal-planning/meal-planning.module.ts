import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { HouseholdsModule } from '../households/households.module';
import { RecipesModule } from '../recipes/recipes.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MealTrackingModule } from '../meal-tracking/meal-tracking.module';
import {
  INVENTORY_ITEM_REPOSITORY,
  InventoryItemRepository,
} from '../inventory/application/ports/inventory-repository.port';
import {
  NUTRITION_ENGINE_SERVICE,
  NutritionEngineService,
} from '../nutrition/application/nutrition-engine.service';
import {
  NUTRITION_GOAL_REPOSITORY,
  NutritionGoalRepository,
} from '../nutrition/application/ports/nutrition-goal-repository.port';
import {
  ADULT_PROFILE_REPOSITORY,
  AdultProfileRepository,
} from '../households/application/adult-profile-ports/adult-profile-repository.port';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import {
  RECIPE_REPOSITORY,
  RecipeRepository,
} from '../recipes/application/ports/recipe-repository.port';
import {
  PREPARED_BATCH_REPOSITORY,
  PreparedBatchRepository,
} from '../recipes/application/ports/prepared-batch-repository.port';
import {
  START_PREPARED_BATCH_USE_CASE,
  StartPreparedBatchUseCase,
} from '../recipes/application/use-cases/start-prepared-batch.use-case';
import {
  MEAL_REPOSITORY,
  MealRepository,
} from '../meal-tracking/application/ports/meal-repository.port';
import {
  CALCULATE_WEEKLY_ADHERENCE_USE_CASE,
  CalculateWeeklyAdherenceUseCase,
  LINK_CONSUMED_MEAL_TO_PLANNED_MEAL_USE_CASE,
  LinkConsumedMealToPlannedMealUseCase,
  START_PREPARATION_FROM_PLANNED_MEAL_USE_CASE,
  StartPreparationFromPlannedMealUseCase,
} from './application/use-cases/plan-execution.use-cases';
import {
  WEEKLY_PLAN_REPOSITORY,
  WeeklyPlanRepository,
} from './application/ports/weekly-plan-repository.port';
import { PrismaWeeklyPlanRepository } from './infrastructure/persistence/prisma-weekly-plan.repository';
import { MealPlanningController } from './presentation/http/meal-planning.controller';
import {
  ADD_PLANNED_MEAL_USE_CASE,
  AddPlannedMealUseCase,
  ASSIGN_PLANNED_MEAL_PARTICIPANTS_USE_CASE,
  AssignPlannedMealParticipantsUseCase,
  REMOVE_PLANNED_MEAL_USE_CASE,
  RemovePlannedMealUseCase,
  REMOVE_PLANNED_MEAL_PARTICIPANT_USE_CASE,
  RemovePlannedMealParticipantUseCase,
  REPLACE_PLANNED_MEAL_USE_CASE,
  ReplacePlannedMealUseCase,
  UPDATE_PLANNED_MEAL_USE_CASE,
  UPDATE_PLANNED_MEAL_PARTICIPANT_USE_CASE,
  UpdatePlannedMealParticipantUseCase,
  UpdatePlannedMealUseCase,
  CONFIRM_PARTICIPANT_QUANTITY_USE_CASE,
  ConfirmParticipantQuantityUseCase,
} from './application/use-cases/planned-meal.use-cases';
import {
  ACCEPT_SUGGESTED_QUANTITIES_USE_CASE,
  AcceptSuggestedQuantitiesUseCase,
  GET_PLANNED_MEAL_QUANTITIES_QUERY,
  GetPlannedMealQuantitiesQuery,
  PROPOSE_MEAL_QUANTITIES_USE_CASE,
  ProposeMealQuantitiesUseCase,
} from './application/use-cases/meal-plan-quantity.use-cases';
import {
  CALCULATE_WEEKLY_REQUIREMENTS_QUERY,
  CalculateWeeklyRequirementsQuery,
  COMPARE_PLAN_WITH_INVENTORY_QUERY,
  ComparePlanWithInventoryQuery,
} from './application/use-cases/weekly-analysis.use-cases';
import {
  ACTIVATE_WEEKLY_PLAN_USE_CASE,
  ActivateWeeklyPlanUseCase,
  CANCEL_WEEKLY_PLAN_USE_CASE,
  CancelWeeklyPlanUseCase,
  COMPLETE_WEEKLY_PLAN_USE_CASE,
  CompleteWeeklyPlanUseCase,
  CREATE_WEEKLY_PLAN_USE_CASE,
  CreateWeeklyPlanUseCase,
  GET_WEEKLY_PLAN_QUERY,
  GetWeeklyPlanQuery,
  LIST_WEEKLY_PLANS_QUERY,
  ListWeeklyPlansQuery,
  UPDATE_WEEKLY_PLAN_USE_CASE,
  UpdateWeeklyPlanUseCase,
} from './application/use-cases/weekly-plan.use-cases';

@Module({
  imports: [
    IdentityModule,
    HouseholdsModule,
    RecipesModule,
    MealTrackingModule,
    NutritionModule,
    InventoryModule,
  ],
  controllers: [MealPlanningController],
  providers: [
    { provide: WEEKLY_PLAN_REPOSITORY, useClass: PrismaWeeklyPlanRepository },
    {
      provide: START_PREPARATION_FROM_PLANNED_MEAL_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        WEEKLY_PLAN_REPOSITORY,
        PREPARED_BATCH_REPOSITORY,
        START_PREPARED_BATCH_USE_CASE,
      ],
      useFactory: (
        h: HouseholdRepository,
        p: WeeklyPlanRepository,
        b: PreparedBatchRepository,
        s: StartPreparedBatchUseCase,
      ) => new StartPreparationFromPlannedMealUseCase(h, p, b, s),
    },
    {
      provide: LINK_CONSUMED_MEAL_TO_PLANNED_MEAL_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, MEAL_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, m: MealRepository) =>
        new LinkConsumedMealToPlannedMealUseCase(h, p, m),
    },
    {
      provide: CALCULATE_WEEKLY_ADHERENCE_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, MEAL_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, m: MealRepository) =>
        new CalculateWeeklyAdherenceUseCase(h, p, m),
    },
    {
      provide: CREATE_WEEKLY_PLAN_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository) =>
        new CreateWeeklyPlanUseCase(h, p),
    },
    {
      provide: GET_WEEKLY_PLAN_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository) => new GetWeeklyPlanQuery(h, p),
    },
    {
      provide: LIST_WEEKLY_PLANS_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository) =>
        new ListWeeklyPlansQuery(h, p),
    },
    {
      provide: UPDATE_WEEKLY_PLAN_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository) =>
        new UpdateWeeklyPlanUseCase(h, p),
    },
    {
      provide: ACTIVATE_WEEKLY_PLAN_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository) =>
        new ActivateWeeklyPlanUseCase(h, p),
    },
    {
      provide: CANCEL_WEEKLY_PLAN_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository) =>
        new CancelWeeklyPlanUseCase(h, p),
    },
    {
      provide: COMPLETE_WEEKLY_PLAN_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository) =>
        new CompleteWeeklyPlanUseCase(h, p),
    },
    {
      provide: ADD_PLANNED_MEAL_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        WEEKLY_PLAN_REPOSITORY,
        RECIPE_REPOSITORY,
        NUTRITION_ENGINE_SERVICE,
      ],
      useFactory: (
        h: HouseholdRepository,
        p: WeeklyPlanRepository,
        r: RecipeRepository,
        n: NutritionEngineService,
      ) => new AddPlannedMealUseCase({ households: h, plans: p, recipes: r }, n),
    },
    {
      provide: UPDATE_PLANNED_MEAL_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        WEEKLY_PLAN_REPOSITORY,
        RECIPE_REPOSITORY,
        NUTRITION_ENGINE_SERVICE,
      ],
      useFactory: (
        h: HouseholdRepository,
        p: WeeklyPlanRepository,
        r: RecipeRepository,
        n: NutritionEngineService,
      ) => new UpdatePlannedMealUseCase({ households: h, plans: p, recipes: r }, n),
    },
    {
      provide: REMOVE_PLANNED_MEAL_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new RemovePlannedMealUseCase({ households: h, plans: p, recipes: r }),
    },
    {
      provide: REPLACE_PLANNED_MEAL_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        WEEKLY_PLAN_REPOSITORY,
        RECIPE_REPOSITORY,
        NUTRITION_ENGINE_SERVICE,
      ],
      useFactory: (
        h: HouseholdRepository,
        p: WeeklyPlanRepository,
        r: RecipeRepository,
        n: NutritionEngineService,
      ) => new ReplacePlannedMealUseCase({ households: h, plans: p, recipes: r }, n),
    },
    {
      provide: ASSIGN_PLANNED_MEAL_PARTICIPANTS_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        WEEKLY_PLAN_REPOSITORY,
        RECIPE_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
      ],
      useFactory: (
        h: HouseholdRepository,
        p: WeeklyPlanRepository,
        r: RecipeRepository,
        a: AdultProfileRepository,
      ) => new AssignPlannedMealParticipantsUseCase({ households: h, plans: p, recipes: r }, a),
    },
    {
      provide: REMOVE_PLANNED_MEAL_PARTICIPANT_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new RemovePlannedMealParticipantUseCase({ households: h, plans: p, recipes: r }),
    },
    {
      provide: UPDATE_PLANNED_MEAL_PARTICIPANT_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new UpdatePlannedMealParticipantUseCase({ households: h, plans: p, recipes: r }),
    },
    {
      provide: CONFIRM_PARTICIPANT_QUANTITY_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new ConfirmParticipantQuantityUseCase({ households: h, plans: p, recipes: r }),
    },
    {
      provide: PROPOSE_MEAL_QUANTITIES_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, NUTRITION_GOAL_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, g: NutritionGoalRepository) =>
        new ProposeMealQuantitiesUseCase({ households: h, plans: p, goals: g }),
    },
    {
      provide: GET_PLANNED_MEAL_QUANTITIES_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, NUTRITION_GOAL_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, g: NutritionGoalRepository) =>
        new GetPlannedMealQuantitiesQuery({ households: h, plans: p, goals: g }),
    },
    {
      provide: ACCEPT_SUGGESTED_QUANTITIES_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, NUTRITION_GOAL_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, g: NutritionGoalRepository) =>
        new AcceptSuggestedQuantitiesUseCase({ households: h, plans: p, goals: g }),
    },
    {
      provide: CALCULATE_WEEKLY_REQUIREMENTS_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new CalculateWeeklyRequirementsQuery({ households: h, plans: p, recipes: r }),
    },
    {
      provide: COMPARE_PLAN_WITH_INVENTORY_QUERY,
      inject: [
        HOUSEHOLD_REPOSITORY,
        WEEKLY_PLAN_REPOSITORY,
        RECIPE_REPOSITORY,
        INVENTORY_ITEM_REPOSITORY,
      ],
      useFactory: (
        h: HouseholdRepository,
        p: WeeklyPlanRepository,
        r: RecipeRepository,
        i: InventoryItemRepository,
      ) => new ComparePlanWithInventoryQuery({ households: h, plans: p, recipes: r, inventory: i }),
    },
  ],
  exports: [
    WEEKLY_PLAN_REPOSITORY,
    CALCULATE_WEEKLY_REQUIREMENTS_QUERY,
    COMPARE_PLAN_WITH_INVENTORY_QUERY,
  ],
})
export class MealPlanningModule {}
