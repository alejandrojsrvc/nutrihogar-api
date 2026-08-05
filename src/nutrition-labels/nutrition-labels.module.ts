import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { FoodCatalogModule } from '../food-catalog/food-catalog.module';
import {
  FOOD_CATALOG_READ_REPOSITORY,
  FoodCatalogReadRepository,
} from '../food-catalog/application/ports/food-catalog-read-repository.port';
import { HouseholdsModule } from '../households/households.module';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import { IdentityModule } from '../identity/identity.module';
import { StorageModule } from '../storage/storage.module';
import { OBJECT_STORAGE, ObjectStorage } from '../storage/application/ports/object-storage.port';
import { GeminiModule } from '../gemini/gemini.module';
import {
  GEMINI_CONTENT_CLIENT,
  GeminiContentClient,
  GeminiJsonSchema,
} from '../gemini/application/ports/gemini-content.port';
import {
  NUTRITION_LABEL_DRAFT_REPOSITORY,
  NutritionLabelDraftRepository,
} from './application/ports/nutrition-label-draft.repository';
import {
  NUTRITION_LABEL_CONFIRMATION,
  NutritionLabelConfirmationPort,
} from './application/ports/nutrition-label-confirmation.port';
import {
  NUTRITION_LABEL_EXTRACTION,
  NutritionLabelExtractionPort,
} from './application/ports/nutrition-label-extraction.port';
import { CreateNutritionLabelDraftUseCase } from './application/use-cases/create-nutrition-label-draft.use-case';
import { ConfirmNutritionLabelDraftUseCase } from './application/use-cases/confirm-nutrition-label-draft.use-case';
import {
  GET_NUTRITION_LABEL_DRAFT_USE_CASE,
  GetNutritionLabelDraftUseCase,
} from './application/use-cases/get-nutrition-label-draft.use-case';
import {
  GeminiNutritionLabelExtractionAdapter,
  StructuredGenerationClient,
} from './infrastructure/extraction/gemini-nutrition-label-extraction.adapter';
import { PrismaNutritionLabelDraftRepository } from './infrastructure/persistence/prisma-nutrition-label-draft.repository';
import { PrismaNutritionLabelConfirmationAdapter } from './infrastructure/persistence/prisma-nutrition-label-confirmation.adapter';
import { NutritionLabelsController } from './presentation/http/nutrition-labels.controller';

@Module({
  imports: [
    DatabaseModule,
    FoodCatalogModule,
    GeminiModule,
    HouseholdsModule,
    IdentityModule,
    StorageModule,
  ],
  controllers: [NutritionLabelsController],
  providers: [
    PrismaNutritionLabelDraftRepository,
    PrismaNutritionLabelConfirmationAdapter,
    { provide: NUTRITION_LABEL_DRAFT_REPOSITORY, useExisting: PrismaNutritionLabelDraftRepository },
    { provide: NUTRITION_LABEL_CONFIRMATION, useExisting: PrismaNutritionLabelConfirmationAdapter },
    {
      provide: GET_NUTRITION_LABEL_DRAFT_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, NUTRITION_LABEL_DRAFT_REPOSITORY],
      useFactory: (households: HouseholdRepository, drafts: NutritionLabelDraftRepository) =>
        new GetNutritionLabelDraftUseCase(households, drafts),
    },
    {
      provide: NUTRITION_LABEL_EXTRACTION,
      inject: [GEMINI_CONTENT_CLIENT, ConfigService],
      useFactory: (client: GeminiContentClient, config: ConfigService) =>
        new GeminiNutritionLabelExtractionAdapter(bridgeGeminiContentClient(client), {
          model: config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash',
          timeoutMs: config.get<number>('GEMINI_TIMEOUT_MS'),
        }),
    },
    {
      provide: 'CREATE_NUTRITION_LABEL_DRAFT',
      inject: [
        HOUSEHOLD_REPOSITORY,
        NUTRITION_LABEL_DRAFT_REPOSITORY,
        NUTRITION_LABEL_EXTRACTION,
        OBJECT_STORAGE,
        ConfigService,
      ],
      useFactory: (
        households: HouseholdRepository,
        drafts: NutritionLabelDraftRepository,
        extraction: NutritionLabelExtractionPort,
        storage: ObjectStorage,
        config: ConfigService,
      ) =>
        new CreateNutritionLabelDraftUseCase(
          households,
          drafts,
          extraction,
          storage,
          config.getOrThrow<number>('NUTRITION_LABEL_MAX_FILE_SIZE_MB') * 1024 * 1024,
        ),
    },
    {
      provide: 'CONFIRM_NUTRITION_LABEL_DRAFT',
      inject: [
        HOUSEHOLD_REPOSITORY,
        NUTRITION_LABEL_DRAFT_REPOSITORY,
        FOOD_CATALOG_READ_REPOSITORY,
        NUTRITION_LABEL_CONFIRMATION,
      ],
      useFactory: (
        households: HouseholdRepository,
        drafts: NutritionLabelDraftRepository,
        catalog: FoodCatalogReadRepository,
        confirmation: NutritionLabelConfirmationPort,
      ) => new ConfirmNutritionLabelDraftUseCase(households, drafts, catalog, confirmation),
    },
  ],
})
export class NutritionLabelsModule {}

function bridgeGeminiContentClient(client: GeminiContentClient): StructuredGenerationClient {
  return {
    generateStructured: async (input) => {
      const response = await client.generateStructuredContent({
        model: input.model,
        timeoutMs: input.timeoutMs ?? 120000,
        systemInstruction: input.systemInstruction,
        prompt: input.prompt,
        media: { mimeType: input.contentType, bytes: input.content },
        responseSchema: input.responseSchema as GeminiJsonSchema,
      });
      try {
        return JSON.parse(response) as unknown;
      } catch {
        return response;
      }
    },
  };
}
