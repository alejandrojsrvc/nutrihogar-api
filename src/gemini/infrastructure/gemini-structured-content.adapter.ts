import { GoogleGenAI } from '@google/genai';
import { Logger } from '@nestjs/common';
import {
  StructuredContentConfigurationError,
  StructuredContentProcessingError,
} from '../../ai/application/errors/structured-content.errors';
import {
  AiUsageRecordInput,
  AiUsageRecorder,
} from '../../ai/application/ports/ai-usage-recorder.port';
import {
  StructuredContentProvider,
  StructuredContentRequest,
} from '../../ai/application/ports/structured-content-provider.port';

export interface GeminiStructuredContentOptions {
  apiKey?: string;
  baseUrl?: string;
}

export interface GeminiStructuredContentClient {
  interactions: Pick<GoogleGenAI['interactions'], 'create'>;
}

export class GeminiStructuredContentAdapter implements StructuredContentProvider {
  private readonly logger = new Logger(GeminiStructuredContentAdapter.name);
  private cachedClient?: GeminiStructuredContentClient;

  constructor(
    private readonly options: GeminiStructuredContentOptions,
    client?: GeminiStructuredContentClient,
    private readonly usageRecorder?: AiUsageRecorder,
  ) {
    if (client) {
      this.cachedClient = client;
    }
  }

  async generateStructuredContent(input: StructuredContentRequest): Promise<string> {
    const startedAt = Date.now();
    let usage: GeminiUsage | undefined;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      this.validateInput(input);
      const client = this.getClient();
      const media = input.media;
      controller = new AbortController();
      timer = setTimeout(() => controller?.abort(), input.timeoutMs);
      const response = await client.interactions.create(
        {
          model: input.model,
          input: [
            {
              type: media.mimeType === 'application/pdf' ? 'document' : 'image',
              mime_type: media.mimeType,
              data: media.bytes.toString('base64'),
            },
            { type: 'text', text: input.prompt },
          ],
          system_instruction: input.systemInstruction,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: input.responseSchema,
          },
          store: false,
        },
        { fetchOptions: { signal: controller.signal } },
      );
      usage = response.usage;

      if (response.status !== 'completed') {
        throw new StructuredContentProcessingError(
          `Structured content interaction ended with status ${response.status}.`,
        );
      }

      const text = response.output_text?.trim();
      if (!text) {
        throw new StructuredContentProcessingError('Structured content was empty.');
      }
      await this.recordUsage(input, 'COMPLETED', usage, startedAt);
      return text;
    } catch (error) {
      await this.recordUsage(input, 'FAILED', usage, startedAt, usageErrorCode(error, controller));
      if (
        error instanceof StructuredContentProcessingError ||
        error instanceof StructuredContentConfigurationError
      ) {
        throw error;
      }
      if ((error instanceof Error && error.name === 'AbortError') || controller?.signal.aborted) {
        throw new StructuredContentProcessingError('Structured content request timed out.');
      }
      if (statusOf(error) === 429) {
        throw new StructuredContentProcessingError('Structured content rate limit reached.');
      }
      throw new StructuredContentProcessingError(
        'Structured content service could not be reached.',
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async recordUsage(
    input: StructuredContentRequest,
    status: AiUsageRecordInput['status'],
    usage: GeminiUsage | undefined,
    startedAt: number,
    errorCode?: string,
  ): Promise<void> {
    if (!this.usageRecorder) return;

    try {
      await this.usageRecorder.record({
        provider: 'GEMINI',
        model: input.model?.trim() || 'unknown',
        module: input.module?.trim() || 'unknown',
        action: input.action?.trim() || 'structured-content',
        status,
        inputTokens: usage?.total_input_tokens ?? null,
        outputTokens: usage?.total_output_tokens ?? null,
        thoughtTokens: usage?.total_thought_tokens ?? null,
        totalTokens: usage?.total_tokens ?? null,
        latencyMilliseconds: Date.now() - startedAt,
        errorCode: errorCode ?? null,
        correlationId: input.correlationId ?? null,
      });
    } catch {
      this.logger.warn('AI usage could not be persisted.');
    }
  }

  private getClient(): GeminiStructuredContentClient {
    if (this.cachedClient) return this.cachedClient;

    const apiKey = this.options.apiKey?.trim();
    if (!apiKey) throw new StructuredContentConfigurationError('API Key is missing.');

    this.cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: this.options.baseUrl ? { baseUrl: this.options.baseUrl } : undefined,
    });

    return this.cachedClient;
  }

  private validateInput(input: StructuredContentRequest): void {
    if (typeof input.model !== 'string' || !input.model.trim()) {
      throw new StructuredContentConfigurationError('Structured content model is required.');
    }
    if (
      !input.media ||
      typeof input.media.mimeType !== 'string' ||
      !input.media.mimeType.trim() ||
      !Buffer.isBuffer(input.media.bytes) ||
      input.media.bytes.length === 0
    ) {
      throw new StructuredContentProcessingError('Structured content media is required.');
    }
  }
}

interface GeminiUsage {
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_thought_tokens?: number;
  total_tokens?: number;
}

function usageErrorCode(error: unknown, controller?: AbortController): string {
  if ((error instanceof Error && error.name === 'AbortError') || controller?.signal.aborted)
    return 'AI_PROVIDER_TIMEOUT';
  if (error instanceof StructuredContentConfigurationError) return 'AI_CONFIGURATION_ERROR';
  if (statusOf(error) === 429) return 'AI_RATE_LIMIT';
  if (error instanceof StructuredContentProcessingError) return 'AI_PROCESSING_ERROR';
  return 'AI_PROVIDER_ERROR';
}

function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const err = error as Record<string, unknown>;
  if (typeof err.status === 'number') return err.status;
  if (typeof err.statusCode === 'number') return err.statusCode;

  if (err.cause && typeof err.cause === 'object') {
    const cause = err.cause as Record<string, unknown>;
    if (typeof cause.status === 'number') return cause.status;
    if (typeof cause.statusCode === 'number') return cause.statusCode;
  }

  return undefined;
}
