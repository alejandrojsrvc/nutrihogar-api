import {
  FoodHouseholdAccessDeniedError,
  FoodModificationNotAllowedError,
  InvalidFoodInputError,
} from '../errors/food-catalog-mutation.errors';
import { FoodNotFoundError } from '../errors/food-not-found.error';
import {
  ConfidenceLevel,
  FoodDetailView,
  PreparationState,
  ReferenceUnit,
} from '../models/food-catalog.models';
import {
  FoodCatalogMutationRepository,
  FoodCatalogUnitOfWork,
  FoodHouseholdAccessRepository,
  FoodMutationResultReader,
  FoodNutrientInput,
  FoodServingInput,
} from '../ports/food-catalog-mutation.port';
import { FoodCatalogReadRepository } from '../ports/food-catalog-read-repository.port';
import {
  ensurePositiveReferenceQuantity,
  validateNutrients,
  validateServings,
} from './custom-food-validation';

export const CREATE_CUSTOM_FOOD_USE_CASE = Symbol('CreateCustomFoodUseCase');
export const UPDATE_CUSTOM_FOOD_USE_CASE = Symbol('UpdateCustomFoodUseCase');
export const DELETE_CUSTOM_FOOD_USE_CASE = Symbol('DeleteCustomFoodUseCase');

export interface CustomFoodFields {
  name: string;
  brand?: string | null;
  description?: string | null;
  categoryId: string;
  preparationState: PreparationState;
  referenceQuantity: number;
  referenceUnit: ReferenceUnit;
  source?: string;
  confidenceLevel: ConfidenceLevel;
  nutrients: FoodNutrientInput[];
  servings?: FoodServingInput[];
}

export interface CreateCustomFoodCommand extends CustomFoodFields {
  actorId: string;
  householdId: string;
}

export interface UpdateCustomFoodCommand {
  actorId: string;
  foodId: string;
  name?: string;
  brand?: string | null;
  description?: string | null;
  categoryId?: string;
  preparationState?: PreparationState;
  referenceQuantity?: number;
  referenceUnit?: ReferenceUnit;
  source?: string;
  confidenceLevel?: ConfidenceLevel;
  nutrients?: FoodNutrientInput[];
  servings?: FoodServingInput[];
}

export class CreateCustomFoodUseCase {
  constructor(
    private readonly access: FoodHouseholdAccessRepository,
    private readonly catalog: FoodCatalogReadRepository,
    private readonly unitOfWork: FoodCatalogUnitOfWork,
  ) {}

  async execute(command: CreateCustomFoodCommand): Promise<FoodDetailView> {
    await ensureActiveMember(this.access, command.actorId, command.householdId);
    await validateFoodReferences(
      this.catalog,
      command.categoryId,
      command.nutrients,
      command.referenceQuantity,
      command.servings,
    );

    const foodId = await this.unitOfWork.create({
      householdId: command.householdId,
      createdById: command.actorId,
      name: command.name.trim(),
      brand: normalizeOptionalString(command.brand),
      description: normalizeOptionalString(command.description),
      categoryId: command.categoryId,
      preparationState: command.preparationState,
      referenceQuantity: command.referenceQuantity,
      referenceUnit: command.referenceUnit,
      source: normalizeOptionalString(command.source) ?? 'USER',
      confidenceLevel: command.confidenceLevel,
      nutrients: command.nutrients,
      servings: command.servings ?? [],
    });

    return readMutationResult(this.catalog, command.actorId, foodId);
  }
}

export class UpdateCustomFoodUseCase {
  constructor(
    private readonly access: FoodHouseholdAccessRepository,
    private readonly mutations: FoodCatalogMutationRepository,
    private readonly catalog: FoodCatalogReadRepository,
    private readonly unitOfWork: FoodCatalogUnitOfWork,
  ) {}

  async execute(command: UpdateCustomFoodCommand): Promise<FoodDetailView> {
    const target = await ensureMutableTarget(this.mutations, command.foodId);
    await ensureActiveMember(this.access, command.actorId, target.householdId);
    await validateFoodReferences(
      this.catalog,
      command.categoryId,
      command.nutrients,
      command.referenceQuantity,
      command.servings,
    );

    await this.unitOfWork.update(command.foodId, {
      name: command.name?.trim(),
      brand: normalizeOptionalString(command.brand),
      description: normalizeOptionalString(command.description),
      categoryId: command.categoryId,
      preparationState: command.preparationState,
      referenceQuantity: command.referenceQuantity,
      referenceUnit: command.referenceUnit,
      source:
        command.source === undefined
          ? undefined
          : (normalizeOptionalString(command.source) ?? 'USER'),
      confidenceLevel: command.confidenceLevel,
      nutrients: command.nutrients,
      servings: command.servings,
    });

    return readMutationResult(this.catalog, command.actorId, command.foodId);
  }
}

export class DeleteCustomFoodUseCase {
  constructor(
    private readonly access: FoodHouseholdAccessRepository,
    private readonly mutations: FoodCatalogMutationRepository,
    private readonly unitOfWork: FoodCatalogUnitOfWork,
  ) {}

  async execute(actorId: string, foodId: string): Promise<void> {
    const target = await ensureMutableTarget(this.mutations, foodId);
    await ensureActiveMember(this.access, actorId, target.householdId);
    await this.unitOfWork.softDelete(foodId, new Date());
  }
}

async function validateFoodReferences(
  catalog: FoodCatalogReadRepository,
  categoryId: string | undefined,
  nutrients: FoodNutrientInput[] | undefined,
  referenceQuantity: number | undefined,
  servings: FoodServingInput[] | undefined,
): Promise<void> {
  ensurePositiveReferenceQuantity(referenceQuantity);
  validateServings(servings);

  if (categoryId !== undefined) {
    const categories = await catalog.listCategories();
    if (!categories.some((category) => category.id === categoryId)) {
      throw new InvalidFoodInputError('The food category does not exist or is inactive.');
    }
  }

  if (nutrients !== undefined) {
    validateNutrients(nutrients, await catalog.listNutrients());
  }
}

async function ensureActiveMember(
  access: FoodHouseholdAccessRepository,
  actorId: string,
  householdId: string,
): Promise<void> {
  if (!(await access.isActiveMember(actorId, householdId))) {
    throw new FoodHouseholdAccessDeniedError();
  }
}

async function ensureMutableTarget(mutations: FoodCatalogMutationRepository, foodId: string) {
  const target = await mutations.findTarget(foodId);
  if (!target || !target.isActive || target.deletedAt) throw new FoodNotFoundError();
  if (target.foodType !== 'CUSTOM' || target.isGlobal || !target.householdId) {
    throw new FoodModificationNotAllowedError();
  }
  return { ...target, householdId: target.householdId };
}

async function readMutationResult(
  reader: FoodMutationResultReader,
  actorId: string,
  foodId: string,
): Promise<FoodDetailView> {
  const food = await reader.findVisibleById(actorId, foodId);
  if (!food) throw new FoodNotFoundError();
  return food;
}

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
