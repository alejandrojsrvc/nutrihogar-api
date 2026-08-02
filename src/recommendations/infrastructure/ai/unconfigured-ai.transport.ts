import { AiProviderError } from '../../application/errors/ai-provider.error';
import type {
  StructuredAiTransport,
  StructuredAiTransportRequest,
} from './structured-ai-recommendation.adapter';

export class UnconfiguredAiTransport implements StructuredAiTransport {
  complete(request: StructuredAiTransportRequest) {
    void request;
    return Promise.reject(
      new AiProviderError(
        'AI_CONFIGURATION_ERROR',
        'AI provider transport is not configured.',
        false,
      ),
    );
  }
}
