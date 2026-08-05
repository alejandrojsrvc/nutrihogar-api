import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AI_USAGE_RECORDER, AiUsageRecorder } from './application/ports/ai-usage-recorder.port';
import {
  STRUCTURED_CONTENT_OPTIONS,
  STRUCTURED_CONTENT_PROVIDER,
} from './application/ports/structured-content-provider.port';
import { GeminiStructuredContentAdapter } from '../gemini/infrastructure/gemini-structured-content.adapter';
import { PrismaAiUsageRecorder } from './infrastructure/persistence/prisma-ai-usage.recorder';

@Module({
  imports: [DatabaseModule],
  providers: [
    PrismaAiUsageRecorder,
    { provide: AI_USAGE_RECORDER, useExisting: PrismaAiUsageRecorder },
    {
      provide: STRUCTURED_CONTENT_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        model: config.get<string>('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite',
        timeoutMs: config.get<number>('GEMINI_TIMEOUT_MS') ?? 120000,
        provider: 'GEMINI',
      }),
    },
    {
      provide: STRUCTURED_CONTENT_PROVIDER,
      inject: [ConfigService, AI_USAGE_RECORDER],
      useFactory: (config: ConfigService, usageRecorder: AiUsageRecorder) =>
        new GeminiStructuredContentAdapter(
          {
            apiKey: config.get<string>('GEMINI_API_KEY'),
            baseUrl: config.get<string>('GEMINI_BASE_URL'),
          },
          undefined,
          usageRecorder,
        ),
    },
  ],
  exports: [STRUCTURED_CONTENT_OPTIONS, STRUCTURED_CONTENT_PROVIDER],
})
export class StructuredContentModule {}
