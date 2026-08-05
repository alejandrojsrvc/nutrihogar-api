import {
  NUTRITION_LABEL_SCHEMA_VERSION,
  REQUIRED_NUTRIENT_CODES,
  StructuredNutritionLabelExtraction,
  StructuredNutritionLabelNutrients,
} from '../models/nutrition-label-draft';

const NUTRIENT_FIELDS = [
  'energy_kcal',
  'protein_g',
  'total_fat_g',
  'saturated_fat_g',
  'trans_fat_g',
  'carbohydrates_g',
  'sugars_g',
  'fiber_g',
  'sodium_mg',
] as const;

const EXTRACTION_FIELDS = [
  'schema_version',
  'product_name',
  'brand',
  'net_content',
  'serving_size',
  'servings_per_container',
  'nutrition_declarations',
  'ingredients',
  'allergens',
  'warnings',
  'confidence',
  'requires_review',
] as const;

const BASIS_FIELDS = ['type', 'value', 'unit'] as const;
const NET_CONTENT_FIELDS = ['value', 'unit'] as const;
const SERVING_SIZE_FIELDS = ['description', 'value', 'unit'] as const;
const ALLERGEN_FIELDS = ['contains', 'may_contain'] as const;

export class InvalidNutritionLabelExtractionError extends Error {
  constructor(message = 'Structured nutrition label response is incompatible.') {
    super(message);
  }
}

export function validateAndReviewNutritionLabelExtraction(
  input: unknown,
): StructuredNutritionLabelExtraction {
  const root = readObject(input, 'response');
  assertExactFields(root, EXTRACTION_FIELDS, 'response');
  if (root.schema_version !== NUTRITION_LABEL_SCHEMA_VERSION) {
    throw new InvalidNutritionLabelExtractionError('Unsupported nutrition label schema version.');
  }
  if (typeof root.requires_review !== 'boolean') {
    throw new InvalidNutritionLabelExtractionError('requires_review must be a boolean.');
  }

  const warnings = readStrings(root.warnings, 'warnings');
  const declarations = readDeclarations(root.nutrition_declarations);
  const reviewWarnings: string[] = [];
  const sanitizedDeclarations = declarations.map((declaration, index) => {
    const basis = sanitizeBasis(declaration.basis, index, reviewWarnings);
    const nutrients = sanitizeNutrients(declaration.nutrients, index, reviewWarnings);
    return { basis, nutrients };
  });

  if (!sanitizedDeclarations.length) reviewWarnings.push('No nutrition declaration was found.');
  if (sanitizedDeclarations.length > 1) {
    reviewWarnings.push('Multiple nutrition declarations require human selection.');
  }

  const firstDeclaration = sanitizedDeclarations[0];
  if (
    !firstDeclaration ||
    !firstDeclaration.basis.type ||
    firstDeclaration.basis.value == null ||
    !firstDeclaration.basis.unit
  ) {
    reviewWarnings.push('Nutrition declaration basis is missing.');
  }
  if (firstDeclaration) {
    for (const code of REQUIRED_NUTRIENT_CODES) {
      const field = codeToField(code);
      if (firstDeclaration.nutrients[field] == null) {
        reviewWarnings.push(`Required nutrient ${field} is missing.`);
      }
    }
  }

  const confidence = sanitizeConfidence(root.confidence, reviewWarnings);
  const productName = readNullableString(root.product_name, 'product_name');
  const brand = readNullableString(root.brand, 'brand');
  const netContentObject = readObject(root.net_content, 'net_content');
  assertExactFields(netContentObject, NET_CONTENT_FIELDS, 'net_content');
  const servingSizeObject = readObject(root.serving_size, 'serving_size');
  assertExactFields(servingSizeObject, SERVING_SIZE_FIELDS, 'serving_size');
  const allergens = readObject(root.allergens, 'allergens');
  assertExactFields(allergens, ALLERGEN_FIELDS, 'allergens');

  const netContentValue = sanitizePositiveNumber(
    netContentObject.value,
    'net_content.value',
    reviewWarnings,
  );
  const netContentUnit = readNullableUnit(netContentObject.unit, 'net_content.unit');
  const servingValue = sanitizePositiveNumber(
    servingSizeObject.value,
    'serving_size.value',
    reviewWarnings,
  );
  const servingUnit = readNullableString(servingSizeObject.unit, 'serving_size.unit');
  if (servingValue == null || servingUnit == null) {
    reviewWarnings.push('Serving size is missing.');
  }

  const servingsPerContainer = sanitizePositiveNumber(
    root.servings_per_container,
    'servings_per_container',
    reviewWarnings,
  );
  const normalizedWarnings = uniqueStrings([...warnings, ...reviewWarnings]);
  const requiresReview =
    normalizedWarnings.length > 0 ||
    confidence == null ||
    confidence < 0.7 ||
    sanitizedDeclarations.length !== 1 ||
    !hasCompleteBasis(firstDeclaration?.basis) ||
    !hasRequiredNutrients(firstDeclaration?.nutrients);

  return {
    schema_version: NUTRITION_LABEL_SCHEMA_VERSION,
    product_name: productName,
    brand,
    net_content: {
      value: netContentValue,
      unit: netContentUnit,
    },
    serving_size: {
      description: readNullableString(servingSizeObject.description, 'serving_size.description'),
      value: servingValue,
      unit: servingUnit,
    },
    servings_per_container: servingsPerContainer,
    nutrition_declarations: sanitizedDeclarations,
    ingredients: readStrings(root.ingredients, 'ingredients'),
    allergens: {
      contains: readStrings(allergens.contains, 'allergens.contains'),
      may_contain: readStrings(allergens.may_contain, 'allergens.may_contain'),
    },
    warnings: normalizedWarnings,
    confidence,
    requires_review: requiresReview,
  };
}

export function getNutritionLabelMissingFields(
  extraction: StructuredNutritionLabelExtraction,
): string[] {
  const declaration = extraction.nutrition_declarations[0];
  const missing: string[] = [];
  if (!declaration || !hasCompleteBasis(declaration.basis)) missing.push('BASIS');
  if (!declaration) {
    missing.push(...REQUIRED_NUTRIENT_CODES);
  } else {
    for (const code of REQUIRED_NUTRIENT_CODES) {
      if (declaration.nutrients[codeToField(code)] == null) missing.push(code);
    }
  }
  if (extraction.product_name == null) missing.push('PRODUCT_NAME');
  if (extraction.serving_size.value == null || extraction.serving_size.unit == null) {
    missing.push('SERVING_SIZE');
  }
  return missing;
}

function readDeclarations(value: unknown): Array<{
  basis: Record<string, unknown>;
  nutrients: Record<string, unknown>;
}> {
  if (!Array.isArray(value))
    throw new InvalidNutritionLabelExtractionError('nutrition_declarations must be an array.');
  return value.map((item, index) => {
    const declaration = readObject(item, `nutrition_declarations[${index}]`);
    assertExactFields(declaration, ['basis', 'nutrients'], `nutrition_declarations[${index}]`);
    const basis = readObject(declaration.basis, `nutrition_declarations[${index}].basis`);
    assertExactFields(basis, BASIS_FIELDS, `nutrition_declarations[${index}].basis`);
    const nutrients = readObject(
      declaration.nutrients,
      `nutrition_declarations[${index}].nutrients`,
    );
    assertExactFields(nutrients, NUTRIENT_FIELDS, `nutrition_declarations[${index}].nutrients`);
    return { basis, nutrients };
  });
}

function sanitizeBasis(
  value: Record<string, unknown>,
  index: number,
  warnings: string[],
): { type: 'PER_SERVING' | 'PER_100' | null; value: number | null; unit: 'g' | 'ml' | null } {
  const type = readNullableBasisType(value.type, `nutrition_declarations[${index}].basis.type`);
  const unit = readNullableUnit(value.unit, `nutrition_declarations[${index}].basis.unit`);
  const basisValue = sanitizePositiveNumber(
    value.value,
    `nutrition_declarations[${index}].basis.value`,
    warnings,
  );
  if (type === 'PER_100' && basisValue != null && basisValue !== 100) {
    warnings.push(`Nutrition declaration ${index} has an invalid per-100 basis.`);
  }
  if (type && (!basisValue || !unit)) {
    warnings.push(`Nutrition declaration ${index} has an incomplete basis.`);
  }
  return { type, value: basisValue, unit };
}

function sanitizeNutrients(
  value: Record<string, unknown>,
  index: number,
  warnings: string[],
): StructuredNutritionLabelNutrients {
  return Object.fromEntries(
    NUTRIENT_FIELDS.map((field) => [
      field,
      sanitizeNonNegativeNumber(
        value[field],
        `nutrition_declarations[${index}].nutrients.${field}`,
        warnings,
      ),
    ]),
  ) as StructuredNutritionLabelNutrients;
}

function sanitizeConfidence(value: unknown, warnings: string[]): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    warnings.push('Confidence is invalid.');
    return null;
  }
  return value;
}

function sanitizePositiveNumber(value: unknown, path: string, warnings: string[]): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    warnings.push(`${path} is invalid.`);
    return null;
  }
  return value;
}

function sanitizeNonNegativeNumber(
  value: unknown,
  path: string,
  warnings: string[],
): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    warnings.push(`${path} is invalid.`);
    return null;
  }
  return value;
}

function readObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidNutritionLabelExtractionError(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertExactFields(
  value: Record<string, unknown>,
  fields: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    throw new InvalidNutritionLabelExtractionError(
      `${path} must contain the exact contract fields.`,
    );
  }
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new InvalidNutritionLabelExtractionError(`${path} must be a string or null.`);
  }
  return value.trim() || null;
}

function readStrings(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new InvalidNutritionLabelExtractionError(`${path} must be an array of strings.`);
  }
  const strings = value as string[];
  return uniqueStrings(strings.map((item) => item.trim()).filter(Boolean));
}

function readNullableUnit(value: unknown, path: string): 'g' | 'ml' | null {
  if (value === null) return null;
  if (value !== 'g' && value !== 'ml') {
    throw new InvalidNutritionLabelExtractionError(`${path} must be g, ml or null.`);
  }
  return value;
}

function readNullableBasisType(value: unknown, path: string): 'PER_SERVING' | 'PER_100' | null {
  if (value === null) return null;
  if (value !== 'PER_SERVING' && value !== 'PER_100') {
    throw new InvalidNutritionLabelExtractionError(`${path} has an unsupported value.`);
  }
  return value;
}

function hasCompleteBasis(
  basis:
    | { type: 'PER_SERVING' | 'PER_100' | null; value: number | null; unit: 'g' | 'ml' | null }
    | undefined,
): boolean {
  return Boolean(basis?.type && basis.value != null && basis.unit);
}

function hasRequiredNutrients(nutrients: StructuredNutritionLabelNutrients | undefined): boolean {
  return Boolean(
    nutrients &&
    nutrients.energy_kcal != null &&
    nutrients.protein_g != null &&
    nutrients.carbohydrates_g != null &&
    nutrients.total_fat_g != null,
  );
}

function codeToField(
  code: (typeof REQUIRED_NUTRIENT_CODES)[number],
): keyof StructuredNutritionLabelNutrients {
  switch (code) {
    case 'ENERGY_KCAL':
      return 'energy_kcal';
    case 'PROTEIN':
      return 'protein_g';
    case 'CARBOHYDRATE':
      return 'carbohydrates_g';
    case 'FAT':
      return 'total_fat_g';
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
