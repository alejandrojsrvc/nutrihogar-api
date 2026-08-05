import { Injectable } from '@nestjs/common';
import {
  ConfidenceLevel,
  FoodType,
  InventoryItemStatus,
  InventoryItemType,
  InventoryMovementType,
  NutritionLabelDraftStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { InventoryUnit } from '../../../inventory/domain/models/inventory.models';
import {
  NutritionLabelDraftAlreadyConfirmedError,
  NutritionLabelDraftExpiredError,
  NutritionLabelDraftNotFoundError,
  NutritionLabelReferenceNotFoundError,
  NutritionLabelTargetFoodNotAllowedError,
  NutritionLabelTargetFoodNotFoundError,
} from '../../application/errors/nutrition-label.errors';
import {
  ConfirmNutritionLabelTransactionInput,
  NutritionLabelConfirmationPort,
} from '../../application/ports/nutrition-label-confirmation.port';

const foodDetailInclude = {
  category: true,
  nutrients: {
    include: { nutrientDefinition: true },
    orderBy: { nutrientDefinition: { displayOrder: 'asc' } },
  },
  servings: { orderBy: { name: 'asc' } },
  aliases: { orderBy: { alias: 'asc' } },
} satisfies Prisma.FoodInclude;

type FoodDetailRecord = Prisma.FoodGetPayload<{ include: typeof foodDetailInclude }>;

@Injectable()
export class PrismaNutritionLabelConfirmationAdapter implements NutritionLabelConfirmationPort {
  constructor(private readonly prisma: PrismaService) {}

  async confirm(input: ConfirmNutritionLabelTransactionInput) {
    return this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.nutritionLabelDraft.updateMany({
        where: {
          id: input.draftId,
          householdId: input.householdId,
          status: NutritionLabelDraftStatus.PENDING_REVIEW,
          expiresAt: { gt: input.now },
        },
        data: {
          status: NutritionLabelDraftStatus.CONFIRMED,
          confirmedById: input.actorId,
          confirmedAt: input.now,
        },
      });
      if (claimed.count === 0) await throwDraftStateError(transaction, input);

      const category = await transaction.foodCategory.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true, code: true, name: true, displayOrder: true },
      });
      if (!category) throw new NutritionLabelReferenceNotFoundError('Food category not found.');

      const definitions = await transaction.nutrientDefinition.findMany({
        where: { code: { in: input.nutrients.map((nutrient) => nutrient.code) } },
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          group: true,
          displayOrder: true,
          isRequired: true,
        },
      });
      if (definitions.length !== input.nutrients.length) {
        throw new NutritionLabelReferenceNotFoundError('Nutrient definition not found.');
      }
      const definitionIdByCode = new Map(
        definitions.map((definition) => [definition.code, definition.id]),
      );

      const foodId = await this.upsertFood(transaction, input, definitionIdByCode);
      const inventory = await this.createOrIncrementInventory(transaction, input, foodId);
      await transaction.nutritionLabelDraft.update({
        where: { id: input.draftId },
        data: { confirmedFoodId: foodId },
      });

      const food = await transaction.food.findUnique({
        where: { id: foodId },
        include: foodDetailInclude,
      });
      if (!food)
        throw new NutritionLabelReferenceNotFoundError(
          'Food could not be read after confirmation.',
        );

      return {
        food: mapFood(food),
        inventory: mapInventory(inventory),
      };
    });
  }

  private async upsertFood(
    transaction: Prisma.TransactionClient,
    input: ConfirmNutritionLabelTransactionInput,
    definitionIdByCode: Map<string, string>,
  ): Promise<string> {
    const foodData = {
      name: input.name,
      brand: input.brand,
      description: input.description,
      categoryId: input.categoryId,
      preparationState: input.preparationState,
      referenceQuantity: new Prisma.Decimal(100),
      referenceUnit: input.packageUnit,
      source: 'NUTRITION_LABEL_OCR',
      sourceReference: input.draftId,
      confidenceLevel: ConfidenceLevel.USER_PROVIDED,
    };

    let foodId: string;
    if (input.targetFoodId) {
      const target = await transaction.food.findUnique({
        where: { id: input.targetFoodId },
        select: {
          id: true,
          householdId: true,
          foodType: true,
          isGlobal: true,
          isActive: true,
          deletedAt: true,
        },
      });
      if (!target || !target.isActive || target.deletedAt) {
        throw new NutritionLabelTargetFoodNotFoundError();
      }
      if (
        target.householdId !== input.householdId ||
        target.isGlobal ||
        (target.foodType !== FoodType.CUSTOM && target.foodType !== FoodType.COMMERCIAL)
      ) {
        throw new NutritionLabelTargetFoodNotAllowedError();
      }
      foodId = target.id;
      await transaction.food.update({ where: { id: foodId }, data: foodData });
      await transaction.foodNutrient.deleteMany({ where: { foodId } });
      await transaction.foodServing.deleteMany({ where: { foodId } });
    } else {
      const food = await transaction.food.create({
        data: {
          ...foodData,
          householdId: input.householdId,
          createdById: input.actorId,
          foodType: FoodType.COMMERCIAL,
          isGlobal: false,
        },
        select: { id: true },
      });
      foodId = food.id;
    }

    await transaction.foodNutrient.createMany({
      data: input.nutrients.map((nutrient) => ({
        foodId,
        nutrientDefinitionId: definitionIdByCode.get(nutrient.code)!,
        amount: new Prisma.Decimal(nutrient.normalizedAmount),
      })),
    });
    await transaction.foodServing.create({
      data: {
        foodId,
        name: input.serving.name,
        quantity: new Prisma.Decimal(input.serving.quantity),
        unit: input.serving.unit,
        equivalentGrams: input.serving.equivalentGrams
          ? new Prisma.Decimal(input.serving.equivalentGrams)
          : null,
        equivalentMilliliters: input.serving.equivalentMilliliters
          ? new Prisma.Decimal(input.serving.equivalentMilliliters)
          : null,
      },
    });
    return foodId;
  }

  private async createOrIncrementInventory(
    transaction: Prisma.TransactionClient,
    input: ConfirmNutritionLabelTransactionInput,
    foodId: string,
  ) {
    const packageQuantity = new Prisma.Decimal(input.packageQuantity);
    const existing = await transaction.inventoryItem.findFirst({
      where: {
        householdId: input.householdId,
        foodId,
        itemType: InventoryItemType.FOOD,
        unit: input.packageUnit,
        status: InventoryItemStatus.ACTIVE,
        location: input.location,
        expiresAt: input.expiresAt,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      const inventory = await transaction.inventoryItem.update({
        where: { id: existing.id },
        data: {
          nameSnapshot: input.name,
          currentQuantity: { increment: packageQuantity },
          unit: input.packageUnit,
          minimumQuantity: input.minimumQuantity ? new Prisma.Decimal(input.minimumQuantity) : null,
          location: input.location,
          expiresAt: input.expiresAt,
          status: InventoryItemStatus.ACTIVE,
        },
      });
      await transaction.inventoryMovement.create({
        data: {
          itemId: inventory.id,
          type: InventoryMovementType.MANUAL_ENTRY,
          quantity: packageQuantity,
          unit: input.packageUnit,
          occurredAt: input.now,
          sourceType: 'NUTRITION_LABEL_DRAFT',
          sourceId: input.draftId,
          actorId: input.actorId,
        },
      });
      return inventory;
    }

    return transaction.inventoryItem.create({
      data: {
        householdId: input.householdId,
        foodId,
        nameSnapshot: input.name,
        itemType: InventoryItemType.FOOD,
        currentQuantity: packageQuantity,
        unit: input.packageUnit,
        minimumQuantity: input.minimumQuantity ? new Prisma.Decimal(input.minimumQuantity) : null,
        location: input.location,
        expiresAt: input.expiresAt,
        status: InventoryItemStatus.ACTIVE,
        movements: {
          create: {
            type: InventoryMovementType.MANUAL_ENTRY,
            quantity: packageQuantity,
            unit: input.packageUnit,
            occurredAt: input.now,
            sourceType: 'NUTRITION_LABEL_DRAFT',
            sourceId: input.draftId,
            actorId: input.actorId,
          },
        },
      },
    });
  }
}

function mapFood(food: FoodDetailRecord) {
  return {
    id: food.id,
    householdId: food.householdId!,
    name: food.name,
    brand: food.brand,
    description: food.description,
    categoryId: food.categoryId,
    category: {
      id: food.category.id,
      code: food.category.code,
      name: food.category.name,
      displayOrder: food.category.displayOrder,
    },
    foodType: food.foodType as 'CUSTOM' | 'COMMERCIAL',
    preparationState: food.preparationState,
    referenceQuantity: food.referenceQuantity.toNumber(),
    referenceUnit: food.referenceUnit as 'GRAM' | 'MILLILITER',
    source: 'NUTRITION_LABEL_OCR' as const,
    sourceReference: food.sourceReference,
    confidenceLevel: 'USER_PROVIDED' as const,
    isGlobal: food.isGlobal,
    nutrients: food.nutrients.map((nutrient) => ({
      id: nutrient.id,
      nutrientDefinition: {
        id: nutrient.nutrientDefinition.id,
        code: nutrient.nutrientDefinition.code,
        name: nutrient.nutrientDefinition.name,
        unit: nutrient.nutrientDefinition.unit,
        group: nutrient.nutrientDefinition.group,
        displayOrder: nutrient.nutrientDefinition.displayOrder,
        isRequired: nutrient.nutrientDefinition.isRequired,
      },
      amount: nutrient.amount.toNumber(),
    })),
    servings: food.servings.map((serving) => ({
      id: serving.id,
      name: serving.name,
      quantity: serving.quantity.toNumber(),
      unit: serving.unit,
      equivalentGrams: serving.equivalentGrams?.toNumber() ?? null,
      equivalentMilliliters: serving.equivalentMilliliters?.toNumber() ?? null,
    })),
    aliases: food.aliases.map((alias) => alias.alias),
  };
}

function mapInventory(inventory: {
  id: string;
  currentQuantity: Prisma.Decimal;
  unit: InventoryUnit;
  minimumQuantity: Prisma.Decimal | null;
  location: string | null;
  expiresAt: Date | null;
  status: InventoryItemStatus;
}) {
  return {
    id: inventory.id,
    currentQuantity: inventory.currentQuantity.toString(),
    unit: inventory.unit as 'GRAM' | 'MILLILITER',
    minimumQuantity: inventory.minimumQuantity?.toString() ?? null,
    location: inventory.location,
    expiresAt: inventory.expiresAt,
    status: 'ACTIVE' as const,
  };
}

async function throwDraftStateError(
  transaction: Prisma.TransactionClient,
  input: ConfirmNutritionLabelTransactionInput,
): Promise<never> {
  const draft = await transaction.nutritionLabelDraft.findFirst({
    where: { id: input.draftId, householdId: input.householdId },
    select: { status: true, expiresAt: true },
  });
  if (!draft) throw new NutritionLabelDraftNotFoundError();
  if (draft.status === NutritionLabelDraftStatus.CONFIRMED)
    throw new NutritionLabelDraftAlreadyConfirmedError();
  if (draft.expiresAt <= input.now) throw new NutritionLabelDraftExpiredError();
  throw new NutritionLabelDraftAlreadyConfirmedError();
}
