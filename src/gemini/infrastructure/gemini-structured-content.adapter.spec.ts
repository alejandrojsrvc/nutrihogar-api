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
});
