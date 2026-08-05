import { GeminiStructuredContentAdapter } from './gemini-structured-content.adapter';

describe('GeminiStructuredContentAdapter', () => {
  it.each([
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff])],
    ['application/pdf', Buffer.from('%PDF-1.7')],
  ])('sends %s as an interaction with explicit JSON structured output', async (mimeType, bytes) => {
    const create = jest.fn().mockResolvedValue({
      status: 'completed',
      output_text: '{"ok":true}',
    });
    const adapter = new GeminiStructuredContentAdapter(
      { apiKey: 'api-key', baseUrl: 'https://gemini.test' },
      { interactions: { create } },
    );

    await adapter.generateStructuredContent({
      model: 'gemini-test',
      timeoutMs: 5000,
      systemInstruction: 'system',
      prompt: 'prompt',
      media: { mimeType, bytes },
      responseSchema: {
        type: 'object',
        required: ['ok'],
        properties: { ok: { type: 'boolean' } },
        additionalProperties: false,
      },
    });

    expect(create).toHaveBeenCalledWith(
      {
        model: 'gemini-test',
        input: [
          {
            type: mimeType === 'application/pdf' ? 'document' : 'image',
            mime_type: mimeType,
            data: bytes.toString('base64'),
          },
          { type: 'text', text: 'prompt' },
        ],
        system_instruction: 'system',
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: {
            type: 'object',
            required: ['ok'],
            properties: { ok: { type: 'boolean' } },
            additionalProperties: false,
          },
        },
        store: false,
      },
      { fetchOptions: { signal: expect.any(AbortSignal) as unknown } },
    );
  });

  it('records provider usage without changing the structured content contract', async () => {
    const create = jest.fn().mockResolvedValue({
      status: 'completed',
      output_text: '{"ok":true}',
      usage: {
        total_input_tokens: 1000,
        total_output_tokens: 200,
        total_thought_tokens: 50,
        total_tokens: 1200,
      },
    });
    const record = jest.fn().mockResolvedValue(undefined);
    const adapter = new GeminiStructuredContentAdapter(
      { apiKey: 'api-key' },
      { interactions: { create } },
      { record },
    );

    await expect(
      adapter.generateStructuredContent({
        model: 'gemini-3.5-flash-lite',
        timeoutMs: 5000,
        systemInstruction: 'system',
        prompt: 'prompt',
        module: 'nutrition-labels',
        action: 'extract-nutrition-label',
        correlationId: 'request-id',
        media: { mimeType: 'image/jpeg', bytes: Buffer.from([0xff, 0xd8, 0xff]) },
        responseSchema: { type: 'object' },
      }),
    ).resolves.toBe('{"ok":true}');

    expect(record).toHaveBeenCalledWith({
      provider: 'GEMINI',
      model: 'gemini-3.5-flash-lite',
      module: 'nutrition-labels',
      action: 'extract-nutrition-label',
      status: 'COMPLETED',
      inputTokens: 1000,
      outputTokens: 200,
      thoughtTokens: 50,
      totalTokens: 1200,
      latencyMilliseconds: expect.any(Number) as unknown,
      errorCode: null,
      correlationId: 'request-id',
    });
  });

  it('records failed provider calls without masking the provider error', async () => {
    const create = jest.fn().mockRejectedValue(new Error('provider unavailable'));
    const record = jest.fn().mockResolvedValue(undefined);
    const adapter = new GeminiStructuredContentAdapter(
      { apiKey: 'api-key' },
      { interactions: { create } },
      { record },
    );

    await expect(
      adapter.generateStructuredContent({
        model: 'gemini-3.5-flash-lite',
        timeoutMs: 5000,
        systemInstruction: 'system',
        prompt: 'prompt',
        module: 'purchases',
        action: 'receipt-ocr',
        media: { mimeType: 'image/jpeg', bytes: Buffer.from([0xff, 0xd8, 0xff]) },
        responseSchema: { type: 'object' },
      }),
    ).rejects.toThrow('Structured content service could not be reached.');

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'GEMINI',
        model: 'gemini-3.5-flash-lite',
        module: 'purchases',
        action: 'receipt-ocr',
        status: 'FAILED',
        inputTokens: null,
        outputTokens: null,
        errorCode: 'AI_PROVIDER_ERROR',
      }),
    );
  });

  it('does not fail a successful provider call when usage persistence fails', async () => {
    const create = jest.fn().mockResolvedValue({
      status: 'completed',
      output_text: '{"ok":true}',
    });
    const record = jest.fn().mockRejectedValue(new Error('database unavailable'));
    const adapter = new GeminiStructuredContentAdapter(
      { apiKey: 'api-key' },
      { interactions: { create } },
      { record },
    );

    await expect(
      adapter.generateStructuredContent({
        model: 'gemini-3.5-flash-lite',
        timeoutMs: 5000,
        systemInstruction: 'system',
        prompt: 'prompt',
        module: 'nutrition-labels',
        action: 'extract-nutrition-label',
        media: { mimeType: 'image/jpeg', bytes: Buffer.from([0xff, 0xd8, 0xff]) },
        responseSchema: { type: 'object' },
      }),
    ).resolves.toBe('{"ok":true}');
  });
});
