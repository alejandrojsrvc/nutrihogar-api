/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/unbound-method */
import { ReceiptOcrDataError } from '../../application/errors/receipt-ocr.errors';
import { GeminiContentClient } from '../../../gemini/application/ports/gemini-content.port';
import { GeminiReceiptOcrAdapter } from './gemini-receipt-ocr.adapter';

describe('GeminiReceiptOcrAdapter', () => {
  it('maps the structured receipt without changing currency or quantity', async () => {
    const payload = validReceipt();
    const client = {
      generateStructuredContent: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as GeminiContentClient;
    const adapter = new GeminiReceiptOcrAdapter(client, {
      model: 'receipt-model',
      timeoutMs: 9000,
    });

    const result = await adapter.process({
      fileUrl: 'https://signed.test/receipt',
      fileName: 'ticket.pdf',
      contentType: 'application/pdf',
      content: Buffer.from('%PDF-1.7'),
    });

    expect(result.provider).toBe('GEMINI');
    expect(result.purchaseDate.toISOString()).toBe('2026-08-03T14:05:06.000Z');
    expect(result.currency).toBe('ARS');
    expect(result.items[0]).toMatchObject({
      name: 'Rice',
      quantity: '2.5',
      unit: 'KG',
      unitPrice: '4.2',
      total: '10.5',
    });
    expect(result.structuredPayload).toEqual(payload);
    expect(result.reviewRequired).toBe(false);
    expect(client.generateStructuredContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'receipt-model',
        timeoutMs: 9000,
        media: { mimeType: 'application/pdf', bytes: expect.any(Buffer) },
        responseSchema: expect.objectContaining({ required: expect.arrayContaining(['total']) }),
      }),
    );
  });

  it('recomputes reviewRequired for arithmetic inconsistencies and low confidence', async () => {
    const payload = validReceipt();
    payload.items[0]!.total = 11;
    payload.confidence = 0.4;
    const client = {
      generateStructuredContent: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as GeminiContentClient;
    const result = await new GeminiReceiptOcrAdapter(client).process({
      fileUrl: 'unused',
      fileName: 'ticket.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from([0xff, 0xd8, 0xff]),
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining(['Receipt item 1 arithmetic is inconsistent.']),
    );
  });

  it('raises ReceiptOcrDataError for invalid JSON and incompatible shapes', async () => {
    const client = {
      generateStructuredContent: jest
        .fn()
        .mockResolvedValueOnce('{not-json')
        .mockResolvedValueOnce(
          JSON.stringify({ ...validReceipt(), items: [{ description: 'Rice' }] }),
        ),
    } as GeminiContentClient;
    const adapter = new GeminiReceiptOcrAdapter(client);
    const input = {
      fileUrl: 'unused',
      fileName: 'ticket.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from([0xff, 0xd8, 0xff]),
    };

    await expect(adapter.process(input)).rejects.toBeInstanceOf(ReceiptOcrDataError);
    await expect(adapter.process(input)).rejects.toBeInstanceOf(ReceiptOcrDataError);
  });

  it('rejects numeric strings instead of silently converting them', async () => {
    const payload = validReceipt();
    (payload.items[0] as { quantity: unknown }).quantity = '2.5';
    const client = {
      generateStructuredContent: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as GeminiContentClient;

    await expect(
      new GeminiReceiptOcrAdapter(client).process({
        fileUrl: 'unused',
        fileName: 'ticket.jpg',
        contentType: 'image/jpeg',
        content: Buffer.from([0xff, 0xd8, 0xff]),
      }),
    ).rejects.toBeInstanceOf(ReceiptOcrDataError);
  });
});

function validReceipt() {
  return {
    schema_version: 'receipt.v1',
    store: { name: 'Market', branch: 'Downtown', cuit: '30-123' },
    date: '2026-08-03',
    time: '14:05:06',
    ticket_number: 'A-10',
    currency: 'ARS',
    items: [
      {
        description: 'Rice',
        quantity: 2.5,
        unit: 'KG',
        unit_price: 4.2,
        discount: 0,
        total: 10.5,
      },
    ],
    subtotal: 10.5,
    discounts: 0,
    taxes: 0,
    total: 10.5,
    payment_methods: ['CASH'],
    warnings: [],
    confidence: 0.95,
    requires_review: true,
  };
}
