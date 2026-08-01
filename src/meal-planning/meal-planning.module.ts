import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { HouseholdsModule } from '../households/households.module';
import { RecipesModule } from '../recipes/recipes.module';
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
} from './application/use-cases/planned-meal.use-cases';
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
  imports: [IdentityModule, HouseholdsModule, RecipesModule],
  controllers: [MealPlanningController],
  providers: [
    { provide: WEEKLY_PLAN_REPOSITORY, useClass: PrismaWeeklyPlanRepository },
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
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new AddPlannedMealUseCase({ households: h, plans: p, recipes: r }),
    },
    {
      provide: UPDATE_PLANNED_MEAL_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new UpdatePlannedMealUseCase({ households: h, plans: p, recipes: r }),
    },
    {
      provide: REMOVE_PLANNED_MEAL_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new RemovePlannedMealUseCase({ households: h, plans: p, recipes: r }),
    },
    {
      provide: REPLACE_PLANNED_MEAL_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, WEEKLY_PLAN_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (h: HouseholdRepository, p: WeeklyPlanRepository, r: RecipeRepository) =>
        new ReplacePlannedMealUseCase({ households: h, plans: p, recipes: r }),
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
  ],
})
export class MealPlanningModule {}
