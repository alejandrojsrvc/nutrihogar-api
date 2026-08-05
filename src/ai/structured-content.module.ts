import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  STRUCTURED_CONTENT_OPTIONS,
  STRUCTURED_CONTENT_PROVIDER,
} from './application/ports/structured-content-provider.port';
import { GeminiStructuredContentAdapter } from '../gemini/infrastructure/gemini-structured-content.adapter';

@Module({
  providers: [
    {
      provide: STRUCTURED_CONTENT_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        model: config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash',
        timeoutMs: config.get<number>('GEMINI_TIMEOUT_MS') ?? 120000,
        provider: 'GEMINI',
      }),
    },
    {
      provide: STRUCTURED_CONTENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new GeminiStructuredContentAdapter({
          apiKey: config.get<string>('GEMINI_API_KEY'),
          baseUrl: config.get<string>('GEMINI_BASE_URL'),
        }),
    },
  ],
  exports: [STRUCTURED_CONTENT_OPTIONS, STRUCTURED_CONTENT_PROVIDER],
})
export class StructuredContentModule {}
