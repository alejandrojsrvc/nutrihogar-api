export const STRUCTURED_CONTENT_PROVIDER = Symbol('StructuredContentProvider');
export const STRUCTURED_CONTENT_OPTIONS = Symbol('StructuredContentOptions');

export interface StructuredContentOptions {
  model: string;
  timeoutMs: number;
  provider: string;
}

export type JsonSchema = {
  readonly type?:
    | 'array'
    | 'boolean'
    | 'integer'
    | 'null'
    | 'number'
    | 'object'
    | 'string'
    | readonly ('array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string')[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly items?: JsonSchema;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly anyOf?: readonly JsonSchema[];
  readonly enum?: readonly (string | number | boolean | null)[];
};

export interface StructuredContentRequest {
  model: string;
  timeoutMs: number;
  systemInstruction: string;
  prompt: string;
  media: {
    mimeType: string;
    bytes: Buffer;
  };
  responseSchema: JsonSchema;
}

export interface StructuredContentProvider {
  generateStructuredContent(input: StructuredContentRequest): Promise<string>;
}
