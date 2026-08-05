import {
  GeminiContentConfigurationError,
  GeminiContentProcessingError,
} from '../application/errors/gemini-content.errors';
import {
  GeminiContentClient,
  GeminiContentRequest,
} from '../application/ports/gemini-content.port';

export interface GeminiContentHttpOptions {
  apiKey?: string;
  baseUrl?: string;
}

type FetchFunction = (input: string, init: RequestInit) => Promise<Response>;

export class GeminiContentHttpAdapter implements GeminiContentClient {
  constructor(
    private readonly options: GeminiContentHttpOptions,
    private readonly fetchFunction: FetchFunction = fetch,
  ) {}

  async generateStructuredContent(input: GeminiContentRequest): Promise<string> {
    const apiKey = this.options.apiKey?.trim();
    if (!apiKey) throw new GeminiContentConfigurationError();
    if (typeof input.model !== 'string' || !input.model.trim())
      throw new GeminiContentConfigurationError('Gemini model is required.');
    if (
      !input.media ||
      typeof input.media.mimeType !== 'string' ||
      !input.media.mimeType.trim() ||
      !Buffer.isBuffer(input.media.bytes) ||
      input.media.bytes.length === 0
    )
      throw new GeminiContentProcessingError('Gemini media content is required.');

    const baseUrl = (this.options.baseUrl ?? 'https://generativelanguage.googleapis.com').replace(
      /\/+$/,
      '',
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchFunction(
        `${baseUrl}/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: input.systemInstruction }],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  { text: input.prompt },
                  {
                    inline_data: {
                      mime_type: input.media.mimeType,
                      data: input.media.bytes.toString('base64'),
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: input.responseSchema,
              temperature: 0,
            },
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new GeminiContentProcessingError('Gemini content request timed out.');
      throw new GeminiContentProcessingError('Gemini content service could not be reached.');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429)
      throw new GeminiContentProcessingError('Gemini content rate limit reached.');
    if (!response.ok)
      throw new GeminiContentProcessingError(`Gemini returned HTTP ${response.status}.`);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new GeminiContentProcessingError('Gemini returned invalid JSON.');
    }
    const text = extractText(payload);
    if (!text) throw new GeminiContentProcessingError('Gemini returned no structured content.');
    return text;
  }
}

function extractText(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidates = (value as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return null;
  const parts = candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
    const content = (candidate as { content?: unknown }).content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) return [];
    const rawParts = (content as { parts?: unknown }).parts;
    if (!Array.isArray(rawParts)) return [];
    return rawParts.flatMap((part) => {
      if (!part || typeof part !== 'object' || Array.isArray(part)) return [];
      const text = (part as { text?: unknown }).text;
      return typeof text === 'string' ? [text] : [];
    });
  });
  const text = parts.join('');
  return text.trim() ? text : null;
}
