/* eslint-disable @typescript-eslint/no-base-to-string, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/require-await */
import { GeminiContentHttpAdapter } from './gemini-content-http.adapter';

describe('GeminiContentHttpAdapter', () => {
  it.each([
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff])],
    ['application/pdf', Buffer.from('%PDF-1.7')],
  ])('sends %s as inline bytes with explicit JSON structured output', async (mimeType, bytes) => {
    const fetchFunction = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
    } as unknown as Response);
    const adapter = new GeminiContentHttpAdapter(
      { apiKey: 'api-key', baseUrl: 'https://gemini.test' },
      fetchFunction,
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

    const [url, init] = fetchFunction.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      system_instruction: { parts: Array<{ text: string }> };
      contents: Array<{
        parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
      }>;
      generationConfig: {
        responseMimeType: string;
        responseSchema: { type: string };
        temperature: number;
      };
    };

    expect(url).toBe('https://gemini.test/v1beta/models/gemini-test:generateContent?key=api-key');
    expect(init.method).toBe('POST');
    expect(body.system_instruction.parts).toEqual([{ text: 'system' }]);
    expect(body.contents[0]?.parts).toEqual([
      { text: 'prompt' },
      { inline_data: { mime_type: mimeType, data: bytes.toString('base64') } },
    ]);
    expect(body.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
      temperature: 0,
      responseSchema: { type: 'object', required: ['ok'] },
    });
  });
});
