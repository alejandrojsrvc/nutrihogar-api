import {
  NutritionLabelExtractionConfigurationError,
  NutritionLabelExtractionProcessingError,
} from '../../application/errors/nutrition-label.errors';
import {
  GeminiContentConfigurationError,
  GeminiContentProcessingError,
} from '../../../gemini/application/errors/gemini-content.errors';
import { NutritionLabelExtractionPort } from '../../application/ports/nutrition-label-extraction.port';
import {
  NUTRITION_LABEL_SCHEMA_VERSION,
  StructuredNutritionLabelExtraction,
} from '../../domain/models/nutrition-label-draft';
import {
  InvalidNutritionLabelExtractionError,
  validateAndReviewNutritionLabelExtraction,
} from '../../domain/services/validate-nutrition-label-extraction';

export interface StructuredGenerationClient {
  generateStructured(input: {
    model: string;
    systemInstruction: string;
    prompt: string;
    content: Buffer;
    contentType: string;
    responseSchema: Record<string, unknown>;
    timeoutMs?: number;
  }): Promise<unknown>;
}

export interface GeminiNutritionLabelExtractionOptions {
  model: string;
  timeoutMs?: number;
}

export const NUTRITION_LABEL_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  additionalProperties: false,
  properties: {
    schema_version: { type: 'STRING', enum: [NUTRITION_LABEL_SCHEMA_VERSION] },
    product_name: nullable('string'),
    brand: nullable('string'),
    net_content: {
      type: 'OBJECT',
      additionalProperties: false,
      properties: {
        value: nullable('number'),
        unit: nullable('string', ['g', 'ml']),
      },
      required: ['value', 'unit'],
    },
    serving_size: {
      type: 'OBJECT',
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
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        additionalProperties: false,
        properties: {
          basis: {
            type: 'OBJECT',
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
    ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
    allergens: {
      type: 'OBJECT',
      additionalProperties: false,
      properties: {
        contains: { type: 'ARRAY', items: { type: 'STRING' } },
        may_contain: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['contains', 'may_contain'],
    },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    confidence: nullable('number'),
    requires_review: { type: 'BOOLEAN' },
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

export class GeminiNutritionLabelExtractionAdapter implements NutritionLabelExtractionPort {
  constructor(
    private readonly client: StructuredGenerationClient,
    private readonly options: GeminiNutritionLabelExtractionOptions,
  ) {}

  async extract(input: {
    content: Buffer;
    contentType: string;
  }): Promise<StructuredNutritionLabelExtraction> {
    if (!this.options.model.trim()) throw new NutritionLabelExtractionConfigurationError();
    let response: unknown;
    try {
      response = await this.client.generateStructured({
        model: this.options.model,
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: EXTRACTION_PROMPT,
        content: input.content,
        contentType: input.contentType,
        responseSchema: NUTRITION_LABEL_RESPONSE_SCHEMA,
        timeoutMs: this.options.timeoutMs,
      });
    } catch (error) {
      if (error instanceof GeminiContentConfigurationError) {
        throw new NutritionLabelExtractionConfigurationError();
      }
      if (error instanceof GeminiContentProcessingError) {
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
  'The structured generation client must use application/json and temperature 0.',
].join(' ');

export const EXTRACTION_PROMPT = [
  `Extract this nutrition label using schema ${NUTRITION_LABEL_SCHEMA_VERSION}.`,
  'Nutrient values must be copied exactly from the image and must not be derived from package weight.',
  'Mark uncertainty in warnings and keep requires_review as a boolean; the backend recomputes it.',
].join(' ');

function nullable(type: string, enumValues?: string[]): Record<string, unknown> {
  return {
    type: type.toUpperCase(),
    nullable: true,
    ...(enumValues ? { enum: enumValues } : {}),
  };
}

function nutrientsSchema(): Record<string, unknown> {
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
    type: 'OBJECT',
    additionalProperties: false,
    properties: Object.fromEntries(fields.map((field) => [field, nullable('NUMBER')])),
    required: fields,
  };
}
