export const GEMINI_CONTENT_CLIENT = Symbol('GeminiContentClient');

export interface GeminiJsonSchema {
  readonly type: string | readonly string[];
  readonly properties?: Readonly<Record<string, GeminiJsonSchema>>;
  readonly items?: GeminiJsonSchema;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly nullable?: boolean;
  readonly enum?: readonly (string | number | boolean | null)[];
}

export interface GeminiContentRequest {
  model: string;
  timeoutMs: number;
  systemInstruction: string;
  prompt: string;
  media: {
    mimeType: string;
    bytes: Buffer;
  };
  responseSchema: GeminiJsonSchema;
}

export interface GeminiContentClient {
  generateStructuredContent(input: GeminiContentRequest): Promise<string>;
}
