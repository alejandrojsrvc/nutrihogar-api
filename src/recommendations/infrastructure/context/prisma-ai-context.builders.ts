import { Injectable } from '@nestjs/common';
import {
  ADULT_PROFILE_REPOSITORY,
  type AdultProfileRepository,
} from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import {
  INVENTORY_ITEM_REPOSITORY,
  type InventoryItemRepository,
} from '../../../inventory/application/ports/inventory-repository.port';
import { Inject } from '@nestjs/common';
import type {
  RecipeSuggestionContextBuilder,
  WeeklyPlanContextBuilder,
} from '../../application/ports/ai-context-builder.ports';

@Injectable()
export class PrismaWeeklyPlanContextBuilder implements WeeklyPlanContextBuilder {
  constructor(@Inject(ADULT_PROFILE_REPOSITORY) private readonly adults: AdultProfileRepository) {}

  async build(input: Parameters<WeeklyPlanContextBuilder['build']>[0]) {
    const profiles = await this.adults.listActiveByHousehold(input.householdId);
    const requested = input.adultProfileIds.length
      ? profiles.filter((profile) => input.adultProfileIds.includes(profile.id))
      : profiles;
    if (input.adultProfileIds.some((id) => !profiles.some((profile) => profile.id === id))) {
      throw new Error('One or more adult profiles are not accessible in this household.');
    }
    return {
      schemaVersion: 'ai-weekly-plan.v1',
      contextVersion: 'household-context.v1',
      householdId: input.householdId,
      weekStart: input.weekStart,
      mealTypes: input.mealTypes,
      preferences: input.preferences,
      adults: requested.map((profile) => ({
        id: profile.id,
        name: profile.name,
        goal: profile.primaryGoal,
        restrictions: profile.dietaryRestrictions.map((restriction) => ({
          type: restriction.type,
          name: restriction.name,
        })),
      })),
    };
  }
}

@Injectable()
export class PrismaRecipeSuggestionContextBuilder implements RecipeSuggestionContextBuilder {
  constructor(
    @Inject(ADULT_PROFILE_REPOSITORY) private readonly adults: AdultProfileRepository,
    @Inject(INVENTORY_ITEM_REPOSITORY) private readonly inventory: InventoryItemRepository,
  ) {}

  async build(input: Parameters<RecipeSuggestionContextBuilder['build']>[0]) {
    const profiles = await this.adults.listActiveByHousehold(input.householdId);
    if (input.adultProfileIds.some((id) => !profiles.some((profile) => profile.id === id))) {
      throw new Error('One or more adult profiles are not accessible in this household.');
    }
    const items = await this.inventory.listByHousehold(input.householdId, {
      page: 1,
      limit: 500,
      status: 'ACTIVE',
    });
    return {
      schemaVersion: 'ai-recipe-suggestions.v1',
      contextVersion: 'household-context.v1',
      householdId: input.householdId,
      mealType: input.mealType,
      maximumPreparationMinutes: input.maximumPreparationMinutes,
      maximumSuggestions: input.maximumSuggestions,
      prioritizeExpiringInventory: input.prioritizeExpiringInventory,
      adults: profiles
        .filter((profile) => input.adultProfileIds.includes(profile.id))
        .map((profile) => ({
          id: profile.id,
          restrictions: profile.dietaryRestrictions.map((restriction) => restriction.name),
        })),
      inventory: items.items.map((item) => ({
        id: item.id,
        foodId: item.foodId,
        name: item.nameSnapshot,
        quantity: item.currentQuantity.toString(),
        unit: item.unit,
        expiresAt: item.expiresAt?.toISOString() ?? null,
      })),
    };
  }
}
