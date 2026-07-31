import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { environmentValidationSchema } from './config/environment-validation.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { FoodCatalogModule } from './food-catalog/food-catalog.module';
import { HouseholdsModule } from './households/households.module';
import { IdentityModule } from './identity/identity.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { MealTrackingModule } from './meal-tracking/meal-tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    DatabaseModule,
    HealthModule,
    FoodCatalogModule,
    IdentityModule,
    HouseholdsModule,
    NutritionModule,
    MealTrackingModule,
  ],
})
export class AppModule {}
