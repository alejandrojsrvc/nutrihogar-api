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
import { RecipesModule } from './recipes/recipes.module';
import { InventoryModule } from './inventory/inventory.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { PurchasesModule } from './purchases/purchases.module';
import { MealPlanningModule } from './meal-planning/meal-planning.module';
import { HealthTrackingModule } from './health-tracking/health-tracking.module';
import { ReportsModule } from './reports/reports.module';

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
    RecipesModule,
    InventoryModule,
    ShoppingListModule,
    PurchasesModule,
    MealPlanningModule,
    HealthTrackingModule,
    ReportsModule,
  ],
})
export class AppModule {}
