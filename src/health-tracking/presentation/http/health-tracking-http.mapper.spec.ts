import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import { toDigestiveSymptomResponse } from './health-tracking-http.mapper';

describe('health-tracking HTTP mapper', () => {
  it('returns symptom history links and a non-causal medical disclaimer', () => {
    const entry = DigestiveSymptomEntry.create({
      id: 'symptom-1',
      adultProfileId: 'adult-1',
      type: 'BLOATING',
      intensity: 3,
      startAt: '2026-08-01T10:00:00Z',
      now: new Date('2026-08-01T12:00:00Z'),
    });
    entry.linkMeal('meal-1');
    const response = toDigestiveSymptomResponse(entry);
    expect(response).toMatchObject({ id: 'symptom-1', mealIds: ['meal-1'], status: 'ACTIVE' });
    expect(response.disclaimer).toContain('no demuestran causalidad');
  });
});
