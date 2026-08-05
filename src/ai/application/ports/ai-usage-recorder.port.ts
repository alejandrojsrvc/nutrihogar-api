export const AI_USAGE_RECORDER = Symbol('AiUsageRecorder');

export type AiUsageStatus = 'COMPLETED' | 'FAILED';

export interface AiUsageRecordInput {
  provider: string;
  model: string;
  module: string;
  action: string;
  status: AiUsageStatus;
  inputTokens?: number | null;
  outputTokens?: number | null;
  thoughtTokens?: number | null;
  totalTokens?: number | null;
  latencyMilliseconds?: number | null;
  errorCode?: string | null;
  correlationId?: string | null;
  occurredAt?: Date;
}

export interface AiUsageRecorder {
  record(input: AiUsageRecordInput): Promise<void>;
}
