import {
  NutritionLabelExtractionConfigurationError,
  NutritionLabelExtractionProcessingError,
} from '../../application/errors/nutrition-label.errors';
import {
  StructuredContentConfigurationError,
  StructuredContentProcessingError,
} from '../../../ai/application/errors/structured-content.errors';
import {
  JsonSchema,
  StructuredContentProvider,
} from '../../../ai/application/ports/structured-content-provider.port';
import { NutritionLabelExtractionPort } from '../../application/ports/nutrition-label-extraction.port';
import {
  NUTRITION_LABEL_SCHEMA_VERSION,
  StructuredNutritionLabelExtraction,
} from '../../domain/models/nutrition-label-draft';
import {
  InvalidNutritionLabelExtractionError,
  validateAndReviewNutritionLabelExtraction,
} from '../../domain/services/validate-nutrition-label-extraction';

export interface StructuredNutritionLabelExtractionOptions {
  model: string;
  timeoutMs?: number;
}

export const NUTRITION_LABEL_RESPONSE_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema_version: { type: 'string', enum: [NUTRITION_LABEL_SCHEMA_VERSION] },
    product_name: nullable('string'),
    brand: nullable('string'),
    net_content: {
      type: 'object',
      additionalProperties: false,
      properties: {
        value: nullable('number'),
        unit: nullable('string', ['g', 'ml']),
      },
      required: ['value', 'unit'],
    },
    serving_size: {
      type: 'object',
      additionalProperties: false,
      properties: {
        description: nullable('string'),
        value: nullable('number'),
        unit: nullable('string'),
      },
      required: ['description', 'value', 'unit'],
    },
    servings_per_container: nullable('number'),
    nutrition_declarations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          basis: {
            type: 'object',
            additionalProperties: false,
            properties: {
              type: nullable('string', ['PER_SERVING', 'PER_100']),
              value: nullable('number'),
              unit: nullable('string', ['g', 'ml']),
            },
            required: ['type', 'value', 'unit'],
          },
          nutrients: nutrientsSchema(),
        },
        required: ['basis', 'nutrients'],
      },
    },
    ingredients: { type: 'array', items: { type: 'string' } },
    allergens: {
      type: 'object',
      additionalProperties: false,
      properties: {
        contains: { type: 'array', items: { type: 'string' } },
        may_contain: { type: 'array', items: { type: 'string' } },
      },
      required: ['contains', 'may_contain'],
    },
    warnings: { type: 'array', items: { type: 'string' } },
    confidence: nullable('number'),
    requires_review: { type: 'boolean' },
  },
  required: [
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
  ],
};

export class StructuredNutritionLabelExtractionAdapter implements NutritionLabelExtractionPort {
  constructor(
    private readonly provider: StructuredContentProvider,
    private readonly options: StructuredNutritionLabelExtractionOptions,
  ) {}

  async extract(input: {
    content: Buffer;
    contentType: string;
  }): Promise<StructuredNutritionLabelExtraction> {
    if (!this.options.model.trim()) throw new NutritionLabelExtractionConfigurationError();
    let response: unknown;
    try {
      const content = await this.provider.generateStructuredContent({
        model: this.options.model,
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: EXTRACTION_PROMPT,
        module: 'nutrition-labels',
        action: 'extract-nutrition-label',
        media: { bytes: input.content, mimeType: input.contentType },
        responseSchema: NUTRITION_LABEL_RESPONSE_SCHEMA,
        timeoutMs: this.options.timeoutMs ?? 120000,
      });
      try {
        response = JSON.parse(content) as unknown;
      } catch {
        throw new NutritionLabelExtractionProcessingError(
          'Structured nutrition label extraction returned invalid JSON.',
        );
      }
    } catch (error) {
      if (error instanceof StructuredContentConfigurationError) {
        throw new NutritionLabelExtractionConfigurationError();
      }
      if (error instanceof StructuredContentProcessingError) {
        throw new NutritionLabelExtractionProcessingError(error.message);
      }
      if (error instanceof NutritionLabelExtractionProcessingError) throw error;
      throw new NutritionLabelExtractionProcessingError(
        'Structured nutrition label extraction failed.',
      );
    }

    try {
      return validateAndReviewNutritionLabelExtraction(response);
    } catch (error) {
      if (error instanceof InvalidNutritionLabelExtractionError) {
        throw new NutritionLabelExtractionProcessingError(error.message);
      }
      throw error;
    }
  }
}

export const SYSTEM_INSTRUCTION = [
  'Extract only values visibly printed on the nutrition label.',
  'Return every property in the supplied schema; use null or empty arrays when unknown.',
  'Never calculate, convert, infer, or invent nutrition values.',
  'Preserve separate nutrition declarations when the label contains multiple columns.',
  'The response must be valid application/json matching the supplied schema.',
].join(' ');

export const EXTRACTION_PROMPT = [
  `Extract this nutrition label using schema ${NUTRITION_LABEL_SCHEMA_VERSION}.`,
  'Nutrient values must be copied exactly from the image and must not be derived from package weight.',
  'Mark uncertainty in warnings and keep requires_review as a boolean; the backend recomputes it.',
].join(' ');

function nullable(type: 'string' | 'number', enumValues?: string[]): JsonSchema {
  return {
    anyOf: [{ type, ...(enumValues ? { enum: enumValues } : {}) }, { type: 'null' }],
  };
}

function nutrientsSchema(): JsonSchema {
  const fields = [
    'energy_kcal',
    'protein_g',
    'total_fat_g',
    'saturated_fat_g',
    'trans_fat_g',
    'carbohydrates_g',
    'sugars_g',
    'fiber_g',
    'sodium_mg',
  ];
  return {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(fields.map((field) => [field, nullable('number')])),
    required: fields,
  };
}
