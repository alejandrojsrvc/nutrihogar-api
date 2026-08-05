import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GEMINI_CONTENT_CLIENT } from './application/ports/gemini-content.port';
import { GeminiContentHttpAdapter } from './infrastructure/gemini-content-http.adapter';

@Module({
  providers: [
    {
      provide: GEMINI_CONTENT_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new GeminiContentHttpAdapter({
          apiKey: config.get<string>('GEMINI_API_KEY'),
          baseUrl: config.get<string>('GEMINI_BASE_URL'),
        }),
    },
  ],
  exports: [GEMINI_CONTENT_CLIENT],
})
export class GeminiModule {}
