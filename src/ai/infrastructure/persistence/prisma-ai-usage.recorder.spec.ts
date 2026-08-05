/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaAiUsageRecorder } from './prisma-ai-usage.recorder';

describe('PrismaAiUsageRecorder', () => {
  it('calculates and persists input and output cost using the active price', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'pricing-id',
      currency: 'USD',
      inputCostPerMillionTokens: new Decimal('0.30'),
      outputCostPerMillionTokens: new Decimal('2.50'),
    });
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      aiModelPricing: { findFirst },
      aiUsageRecord: { create },
    } as unknown as PrismaService;
    const recorder = new PrismaAiUsageRecorder(prisma);
    const occurredAt = new Date('2026-08-05T12:00:00.000Z');

    await recorder.record({
      provider: 'GEMINI',
      model: 'gemini-3.5-flash-lite',
      module: 'nutrition-labels',
      action: 'extract-nutrition-label',
      status: 'COMPLETED',
      inputTokens: 1000,
      outputTokens: 200,
      thoughtTokens: 50,
      totalTokens: 1200,
      latencyMilliseconds: 1250,
      correlationId: 'request-id',
      occurredAt,
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'GEMINI',
        model: 'gemini-3.5-flash-lite',
        isActive: true,
        effectiveFrom: { lte: occurredAt },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: occurredAt } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        pricingId: 'pricing-id',
        provider: 'GEMINI',
        model: 'gemini-3.5-flash-lite',
        module: 'nutrition-labels',
        action: 'extract-nutrition-label',
        status: 'COMPLETED',
        inputTokens: 1000,
        outputTokens: 200,
        thoughtTokens: 50,
        totalTokens: 1200,
        inputCost: '0.000300000000',
        outputCost: '0.000500000000',
        totalCost: '0.000800000000',
        currency: 'USD',
        inputRatePerMillionTokens: new Decimal('0.30'),
        outputRatePerMillionTokens: new Decimal('2.50'),
        latencyMilliseconds: 1250,
        errorCode: null,
        correlationId: 'request-id',
        createdAt: occurredAt,
      },
    });
  });

  it('persists token usage without inventing a cost when no price is configured', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      aiModelPricing: { findFirst: jest.fn().mockResolvedValue(null) },
      aiUsageRecord: { create },
    } as unknown as PrismaService;
    const recorder = new PrismaAiUsageRecorder(prisma);

    await recorder.record({
      provider: 'OTHER',
      model: 'unknown-model',
      module: 'test',
      action: 'sample',
      status: 'FAILED',
      inputTokens: 10,
      outputTokens: null,
      errorCode: 'AI_PROVIDER_ERROR',
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pricingId: null,
        inputTokens: 10,
        outputTokens: null,
        inputCost: null,
        outputCost: null,
        totalCost: null,
        currency: 'USD',
        errorCode: 'AI_PROVIDER_ERROR',
      }),
    });
  });
});
