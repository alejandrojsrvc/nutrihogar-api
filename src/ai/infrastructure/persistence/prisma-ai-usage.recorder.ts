import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import {
  AiUsageRecordInput,
  AiUsageRecorder,
} from '../../application/ports/ai-usage-recorder.port';

const TOKENS_PER_MILLION = 1_000_000;
const DEFAULT_CURRENCY = 'USD';

@Injectable()
export class PrismaAiUsageRecorder implements AiUsageRecorder {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AiUsageRecordInput): Promise<void> {
    const occurredAt = input.occurredAt ?? new Date();
    const pricing = await this.prisma.aiModelPricing.findFirst({
      where: {
        provider: input.provider,
        model: input.model,
        isActive: true,
        effectiveFrom: { lte: occurredAt },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: occurredAt } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const inputCost = calculateCost(input.inputTokens, pricing?.inputCostPerMillionTokens);
    const outputCost = calculateCost(input.outputTokens, pricing?.outputCostPerMillionTokens);
    const totalCost =
      inputCost !== null && outputCost !== null ? addCosts(inputCost, outputCost) : null;

    await this.prisma.aiUsageRecord.create({
      data: {
        pricingId: pricing?.id ?? null,
        provider: input.provider,
        model: input.model,
        module: input.module,
        action: input.action,
        status: input.status,
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        thoughtTokens: input.thoughtTokens ?? null,
        totalTokens: input.totalTokens ?? null,
        inputCost,
        outputCost,
        totalCost,
        currency: pricing?.currency ?? DEFAULT_CURRENCY,
        inputRatePerMillionTokens: pricing?.inputCostPerMillionTokens ?? null,
        outputRatePerMillionTokens: pricing?.outputCostPerMillionTokens ?? null,
        latencyMilliseconds: input.latencyMilliseconds ?? null,
        errorCode: input.errorCode ?? null,
        correlationId: input.correlationId ?? null,
        createdAt: occurredAt,
      },
    });
  }
}

function calculateCost(
  tokens: number | null | undefined,
  rate: Decimal | null | undefined,
): string | null {
  if (tokens === null || tokens === undefined || rate === null || rate === undefined) return null;
  return new Decimal(tokens).div(TOKENS_PER_MILLION).times(rate.toString()).toFixed(12);
}

function addCosts(inputCost: string, outputCost: string): string {
  return new Decimal(inputCost).plus(outputCost).toFixed(12);
}
