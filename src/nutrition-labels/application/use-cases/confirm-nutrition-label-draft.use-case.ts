import Decimal from 'decimal.js';
import { FoodCatalogReadRepository } from '../../../food-catalog/application/ports/food-catalog-read-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import {
  NutritionLabelBaseUnit,
  NUTRITION_LABEL_NUTRIENT_CODES,
  NutritionLabelDraft,
  REQUIRED_NUTRIENT_CODES,
} from '../../domain/models/nutrition-label-draft';
import {
  InvalidNutritionLabelConfirmationError,
  NutritionLabelAdminRequiredError,
  NutritionLabelDraftAlreadyConfirmedError,
  NutritionLabelDraftExpiredError,
  NutritionLabelDraftNotFoundError,
  NutritionLabelReferenceNotFoundError,
} from '../errors/nutrition-label.errors';
import { NutritionLabelConfirmationPort } from '../ports/nutrition-label-confirmation.port';
import { NutritionLabelDraftRepository } from '../ports/nutrition-label-draft.repository';

export interface ConfirmNutritionLabelDraftCommand {
  actorId: string;
  householdId: string;
  draftId: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  categoryId: string;
  preparationState: 'RAW' | 'COOKED' | 'READY_TO_EAT' | 'NOT_APPLICABLE';
  packageQuantity: string;
  packageUnit: NutritionLabelBaseUnit;
  targetFoodId?: string;
  minimumQuantity?: string | null;
  location?: string | null;
  expiresAt?: Date | null;
  basisQuantity: string;
  basisUnit: NutritionLabelBaseUnit;
  nutrients: Array<{ code: string; amount: string }>;
  serving: {
    name: string;
    quantity: string;
    unit: string;
    equivalentGrams?: string | null;
    equivalentMilliliters?: string | null;
  };
}

export class ConfirmNutritionLabelDraftUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly drafts: NutritionLabelDraftRepository,
    private readonly catalog: FoodCatalogReadRepository,
    private readonly transaction: NutritionLabelConfirmationPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(command: ConfirmNutritionLabelDraftCommand) {
    const access = await this.households.findAccess(command.actorId, command.householdId);
    if (!access || access.status !== 'ACTIVE' || access.role !== 'ADMIN') {
      throw new NutritionLabelAdminRequiredError();
    }
    const draft = await this.drafts.findById(command.draftId, command.householdId);
    if (!draft) throw new NutritionLabelDraftNotFoundError();
    if (draft.status === 'CONFIRMED') throw new NutritionLabelDraftAlreadyConfirmedError();
    const currentTime = this.now();
    if (draft.expiresAt <= currentTime) throw new NutritionLabelDraftExpiredError();

    validateConfirmation(command, getSingleExtractedBasis(draft));
    const [categories, definitions] = await Promise.all([
      this.catalog.listCategories(),
      this.catalog.listNutrients(),
    ]);
    if (!categories.some((category) => category.id === command.categoryId)) {
      throw new NutritionLabelReferenceNotFoundError('Food category not found.');
    }
    const definitionCodes = new Set(definitions.map((definition) => definition.code));
    if (command.nutrients.some((nutrient) => !definitionCodes.has(nutrient.code))) {
      throw new NutritionLabelReferenceNotFoundError('Nutrient definition not found.');
    }

    const basis = new Decimal(command.basisQuantity);
    const result = await this.transaction.confirm({
      draftId: command.draftId,
      householdId: command.householdId,
      actorId: command.actorId,
      targetFoodId: command.targetFoodId ?? null,
      name: command.name.trim(),
      brand: normalize(command.brand),
      description: normalize(command.description),
      categoryId: command.categoryId,
      preparationState: command.preparationState,
      packageQuantity: command.packageQuantity,
      packageUnit: command.packageUnit,
      minimumQuantity: command.minimumQuantity ?? null,
      location: normalize(command.location),
      expiresAt: command.expiresAt ?? null,
      nutrients: command.nutrients.map((nutrient) => ({
        code: nutrient.code,
        normalizedAmount: new Decimal(nutrient.amount).mul(100).div(basis).toString(),
      })),
      serving: {
        name: command.serving.name.trim(),
        quantity: command.serving.quantity,
        unit: command.serving.unit.trim(),
        equivalentGrams: command.serving.equivalentGrams ?? null,
        equivalentMilliliters: command.serving.equivalentMilliliters ?? null,
      },
      now: currentTime,
    });
    return result;
  }
}

export function validateConfirmation(
  command: ConfirmNutritionLabelDraftCommand,
  extractedBasis: 'PER_SERVING' | 'PER_100' | null = null,
): void {
  const positive = (value: string | null | undefined) => {
    try {
      return value != null && new Decimal(value).isPositive();
    } catch {
      return false;
    }
  };
  if (
    !command.name.trim() ||
    !positive(command.packageQuantity) ||
    !positive(command.basisQuantity)
  ) {
    throw new InvalidNutritionLabelConfirmationError(
      'Name, package quantity and basis quantity are required.',
    );
  }
  if (command.packageUnit !== command.basisUnit) {
    throw new InvalidNutritionLabelConfirmationError(
      'Package unit must match the nutrition label base unit.',
    );
  }
  const codes = command.nutrients.map((nutrient) => nutrient.code);
  if (
    new Set(codes).size !== codes.length ||
    codes.some((code) => !NUTRITION_LABEL_NUTRIENT_CODES.includes(code as never))
  ) {
    throw new InvalidNutritionLabelConfirmationError('Nutrient codes must be known and unique.');
  }
  if (REQUIRED_NUTRIENT_CODES.some((code) => !codes.includes(code))) {
    throw new InvalidNutritionLabelConfirmationError(
      'Energy, protein, carbohydrate and fat are required.',
    );
  }
  if (
    command.nutrients.some((nutrient) => {
      try {
        const amount = new Decimal(nutrient.amount);
        return !amount.isFinite() || amount.isNegative();
      } catch {
        return true;
      }
    })
  )
    throw new InvalidNutritionLabelConfirmationError('Nutrient amounts must be nonnegative.');
  if (!positive(command.serving.quantity))
    throw new InvalidNutritionLabelConfirmationError('Serving quantity must be positive.');
  const grams = command.serving.equivalentGrams;
  const milliliters = command.serving.equivalentMilliliters;
  if (
    command.basisUnit === 'GRAM'
      ? !positive(grams) || milliliters != null
      : !positive(milliliters) || grams != null
  ) {
    throw new InvalidNutritionLabelConfirmationError(
      'Serving equivalent must match the label base unit.',
    );
  }
  const equivalent = command.basisUnit === 'GRAM' ? grams : milliliters;
  if (extractedBasis === 'PER_SERVING' && !new Decimal(equivalent!).eq(command.basisQuantity)) {
    throw new InvalidNutritionLabelConfirmationError(
      'Serving equivalent must equal a per-serving nutrition basis.',
    );
  }
  if (command.minimumQuantity != null && !positive(command.minimumQuantity)) {
    throw new InvalidNutritionLabelConfirmationError(
      'Minimum inventory quantity must be positive.',
    );
  }
}

function normalize(value?: string | null): string | null {
  return value?.trim() || null;
}

function getSingleExtractedBasis(draft: NutritionLabelDraft): 'PER_SERVING' | 'PER_100' | null {
  const declarations = draft.extractedData.nutrition_declarations;
  return declarations.length === 1 ? (declarations[0]?.basis.type ?? null) : null;
}
