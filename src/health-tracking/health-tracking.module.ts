import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { HouseholdsModule } from '../households/households.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { MealTrackingModule } from '../meal-tracking/meal-tracking.module';
import {
  MEAL_REPOSITORY,
  MealRepository,
} from '../meal-tracking/application/ports/meal-repository.port';
import {
  NUTRITION_FOOD_REPOSITORY,
  NutritionFoodRepository,
} from '../nutrition/application/ports/nutrition-food-repository.port';
import {
  DIGESTIVE_SYMPTOM_REPOSITORY,
  DigestiveSymptomRepository,
} from './application/ports/digestive-symptom-repository.port';
import {
  BodyMeasurementRepository,
  BODY_MEASUREMENT_REPOSITORY,
} from './application/ports/body-measurement-repository.port';
import {
  BodyWeightRepository,
  BODY_WEIGHT_REPOSITORY,
} from './application/ports/body-weight-repository.port';
import {
  MeasurementConfigurationRepository,
  MEASUREMENT_CONFIGURATION_REPOSITORY,
} from './application/ports/measurement-configuration-repository.port';
import { PrismaBodyMeasurementRepository } from './infrastructure/persistence/prisma-body-measurement.repository';
import { PrismaBodyWeightRepository } from './infrastructure/persistence/prisma-body-weight.repository';
import { PrismaMeasurementConfigurationRepository } from './infrastructure/persistence/prisma-measurement-configuration.repository';
import { PrismaDigestiveSymptomRepository } from './infrastructure/persistence/prisma-digestive-symptom.repository';
import { HealthTrackingController } from './presentation/http/health-tracking.controller';
import {
  CORRECT_BODY_MEASUREMENT_USE_CASE,
  CORRECT_BODY_WEIGHT_USE_CASE,
  CorrectBodyMeasurementUseCase,
  CorrectBodyWeightUseCase,
  GET_BODY_WEIGHT_ENTRY_QUERY,
  GET_LATEST_BODY_WEIGHT_QUERY,
  GET_MEASUREMENT_CONFIGURATION_QUERY,
  GetBodyWeightEntryQuery,
  GetLatestBodyWeightQuery,
  GetMeasurementConfigurationQuery,
  LIST_BODY_MEASUREMENTS_QUERY,
  LIST_BODY_WEIGHT_ENTRIES_QUERY,
  ListBodyMeasurementsQuery,
  ListBodyWeightEntriesQuery,
  REGISTER_BODY_MEASUREMENT_USE_CASE,
  REGISTER_BODY_WEIGHT_USE_CASE,
  RegisterBodyMeasurementUseCase,
  RegisterBodyWeightUseCase,
  UPDATE_MEASUREMENT_CONFIGURATION_USE_CASE,
  UpdateMeasurementConfigurationUseCase,
} from './application/use-cases/health-tracking.use-cases';
import {
  CORRECT_DIGESTIVE_SYMPTOM_USE_CASE,
  CorrectDigestiveSymptomUseCase,
  GET_DIGESTIVE_SYMPTOM_QUERY,
  GET_RECENT_MEALS_FOR_SYMPTOM_LINK_QUERY,
  GetDigestiveSymptomQuery,
  GetRecentMealsForSymptomLinkQuery,
  LIST_DIGESTIVE_SYMPTOMS_QUERY,
  ListDigestiveSymptomsQuery,
  REGISTER_DIGESTIVE_SYMPTOM_USE_CASE,
  RegisterDigestiveSymptomUseCase,
  RESOLVE_DIGESTIVE_SYMPTOM_USE_CASE,
  ResolveDigestiveSymptomUseCase,
} from './application/use-cases/digestive-symptom.use-cases';
import {
  GET_BODY_PROGRESS_QUERY,
  GET_DIGESTIVE_SYMPTOM_INSIGHTS_QUERY,
  GetBodyProgressQuery,
  GetDigestiveSymptomInsightsQuery,
} from './application/use-cases/health-tracking-analysis.use-cases';
import {
  ADULT_PROFILE_REPOSITORY,
  AdultProfileRepository,
} from '../households/application/adult-profile-ports/adult-profile-repository.port';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import { CLOCK, Clock } from '../nutrition/application/ports/clock.port';

@Module({
  imports: [IdentityModule, HouseholdsModule, NutritionModule, MealTrackingModule],
  controllers: [HealthTrackingController],
  providers: [
    { provide: BODY_WEIGHT_REPOSITORY, useClass: PrismaBodyWeightRepository },
    { provide: BODY_MEASUREMENT_REPOSITORY, useClass: PrismaBodyMeasurementRepository },
    { provide: DIGESTIVE_SYMPTOM_REPOSITORY, useClass: PrismaDigestiveSymptomRepository },
    {
      provide: MEASUREMENT_CONFIGURATION_REPOSITORY,
      useClass: PrismaMeasurementConfigurationRepository,
    },
    {
      provide: REGISTER_BODY_WEIGHT_USE_CASE,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new RegisterBodyWeightUseCase(weights, { profiles, households, clock }),
    },
    {
      provide: CORRECT_BODY_WEIGHT_USE_CASE,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new CorrectBodyWeightUseCase(weights, { profiles, households, clock }),
    },
    {
      provide: GET_BODY_WEIGHT_ENTRY_QUERY,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new GetBodyWeightEntryQuery(weights, { profiles, households, clock }),
    },
    {
      provide: LIST_BODY_WEIGHT_ENTRIES_QUERY,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new ListBodyWeightEntriesQuery(weights, { profiles, households, clock }),
    },
    {
      provide: GET_LATEST_BODY_WEIGHT_QUERY,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new GetLatestBodyWeightQuery(weights, { profiles, households, clock }),
    },
    {
      provide: GET_MEASUREMENT_CONFIGURATION_QUERY,
      inject: [
        MEASUREMENT_CONFIGURATION_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
        CLOCK,
      ],
      useFactory: (
        configurations: MeasurementConfigurationRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new GetMeasurementConfigurationQuery(configurations, { profiles, households, clock }),
    },
    {
      provide: UPDATE_MEASUREMENT_CONFIGURATION_USE_CASE,
      inject: [
        MEASUREMENT_CONFIGURATION_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
        CLOCK,
      ],
      useFactory: (
        configurations: MeasurementConfigurationRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) =>
        new UpdateMeasurementConfigurationUseCase(configurations, { profiles, households, clock }),
    },
    {
      provide: REGISTER_BODY_MEASUREMENT_USE_CASE,
      inject: [
        BODY_MEASUREMENT_REPOSITORY,
        MEASUREMENT_CONFIGURATION_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
        CLOCK,
      ],
      useFactory: (
        measurements: BodyMeasurementRepository,
        configurations: MeasurementConfigurationRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) =>
        new RegisterBodyMeasurementUseCase(measurements, configurations, {
          profiles,
          households,
          clock,
        }),
    },
    {
      provide: CORRECT_BODY_MEASUREMENT_USE_CASE,
      inject: [BODY_MEASUREMENT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        measurements: BodyMeasurementRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new CorrectBodyMeasurementUseCase(measurements, { profiles, households, clock }),
    },
    {
      provide: LIST_BODY_MEASUREMENTS_QUERY,
      inject: [BODY_MEASUREMENT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        measurements: BodyMeasurementRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new ListBodyMeasurementsQuery(measurements, { profiles, households, clock }),
    },
    ...digestiveProviders(),
    {
      provide: GET_BODY_PROGRESS_QUERY,
      inject: [
        BODY_WEIGHT_REPOSITORY,
        BODY_MEASUREMENT_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
      ],
      useFactory: (
        weights: BodyWeightRepository,
        measurements: BodyMeasurementRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
      ) => new GetBodyProgressQuery(weights, measurements, { profiles, households }),
    },
    {
      provide: GET_DIGESTIVE_SYMPTOM_INSIGHTS_QUERY,
      inject: [
        DIGESTIVE_SYMPTOM_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
        MEAL_REPOSITORY,
      ],
      useFactory: (
        symptoms: DigestiveSymptomRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        meals: MealRepository,
      ) => new GetDigestiveSymptomInsightsQuery(symptoms, { profiles, households, meals }),
    },
  ],
})
export class HealthTrackingModule {}

function digestiveProviders() {
  const deps = [
    ADULT_PROFILE_REPOSITORY,
    HOUSEHOLD_REPOSITORY,
    MEAL_REPOSITORY,
    NUTRITION_FOOD_REPOSITORY,
    CLOCK,
  ];
  const makeDeps = (
    profiles: AdultProfileRepository,
    households: HouseholdRepository,
    meals: MealRepository,
    foods: NutritionFoodRepository,
    clock: Clock,
  ) => ({ profiles, households, meals, foods, clock });
  return [
    {
      provide: REGISTER_DIGESTIVE_SYMPTOM_USE_CASE,
      inject: [DIGESTIVE_SYMPTOM_REPOSITORY, ...deps],
      useFactory: (
        s: DigestiveSymptomRepository,
        p: AdultProfileRepository,
        h: HouseholdRepository,
        m: MealRepository,
        f: NutritionFoodRepository,
        c: Clock,
      ) => new RegisterDigestiveSymptomUseCase(s, makeDeps(p, h, m, f, c)),
    },
    {
      provide: RESOLVE_DIGESTIVE_SYMPTOM_USE_CASE,
      inject: [DIGESTIVE_SYMPTOM_REPOSITORY, ...deps],
      useFactory: (
        s: DigestiveSymptomRepository,
        p: AdultProfileRepository,
        h: HouseholdRepository,
        m: MealRepository,
        f: NutritionFoodRepository,
        c: Clock,
      ) => new ResolveDigestiveSymptomUseCase(s, makeDeps(p, h, m, f, c)),
    },
    {
      provide: CORRECT_DIGESTIVE_SYMPTOM_USE_CASE,
      inject: [DIGESTIVE_SYMPTOM_REPOSITORY, ...deps],
      useFactory: (
        s: DigestiveSymptomRepository,
        p: AdultProfileRepository,
        h: HouseholdRepository,
        m: MealRepository,
        f: NutritionFoodRepository,
        c: Clock,
      ) => new CorrectDigestiveSymptomUseCase(s, makeDeps(p, h, m, f, c)),
    },
    {
      provide: GET_DIGESTIVE_SYMPTOM_QUERY,
      inject: [DIGESTIVE_SYMPTOM_REPOSITORY, ...deps],
      useFactory: (
        s: DigestiveSymptomRepository,
        p: AdultProfileRepository,
        h: HouseholdRepository,
        m: MealRepository,
        f: NutritionFoodRepository,
        c: Clock,
      ) => new GetDigestiveSymptomQuery(s, makeDeps(p, h, m, f, c)),
    },
    {
      provide: LIST_DIGESTIVE_SYMPTOMS_QUERY,
      inject: [DIGESTIVE_SYMPTOM_REPOSITORY, ...deps],
      useFactory: (
        s: DigestiveSymptomRepository,
        p: AdultProfileRepository,
        h: HouseholdRepository,
        m: MealRepository,
        f: NutritionFoodRepository,
        c: Clock,
      ) => new ListDigestiveSymptomsQuery(s, makeDeps(p, h, m, f, c)),
    },
    {
      provide: GET_RECENT_MEALS_FOR_SYMPTOM_LINK_QUERY,
      inject: [
        MEAL_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
        NUTRITION_FOOD_REPOSITORY,
        CLOCK,
      ],
      useFactory: (
        m: MealRepository,
        p: AdultProfileRepository,
        h: HouseholdRepository,
        f: NutritionFoodRepository,
        c: Clock,
      ) => new GetRecentMealsForSymptomLinkQuery(makeDeps(p, h, m, f, c)),
    },
  ];
}
