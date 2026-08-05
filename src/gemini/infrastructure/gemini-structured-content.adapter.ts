import { GoogleGenAI } from '@google/genai';
import {
  StructuredContentConfigurationError,
  StructuredContentProcessingError,
} from '../../ai/application/errors/structured-content.errors';
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
  private cachedClient?: GeminiStructuredContentClient;

  constructor(
    private readonly options: GeminiStructuredContentOptions,
    client?: GeminiStructuredContentClient,
  ) {
    if (client) {
      this.cachedClient = client;
    }
  }

  async generateStructuredContent(input: StructuredContentRequest): Promise<string> {
    this.validateInput(input);
    const client = this.getClient();
    const media = input.media;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
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

      if (response.status !== 'completed') {
        throw new StructuredContentProcessingError(
          `Structured content interaction ended with status ${response.status}.`,
        );
      }

      const text = response.output_text?.trim();
      if (!text) {
        throw new StructuredContentProcessingError('Structured content was empty.');
      }
      return text;
    } catch (error) {
      if (
        error instanceof StructuredContentProcessingError ||
        error instanceof StructuredContentConfigurationError
      ) {
        throw error;
      }
      if ((error instanceof Error && error.name === 'AbortError') || controller.signal.aborted) {
        throw new StructuredContentProcessingError('Structured content request timed out.');
      }
      if (statusOf(error) === 429) {
        throw new StructuredContentProcessingError('Structured content rate limit reached.');
      }
      throw new StructuredContentProcessingError(
        'Structured content service could not be reached.',
      );
    } finally {
      clearTimeout(timer);
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
