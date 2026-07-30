import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports an ok status with an ISO timestamp', () => {
    const controller = new HealthController();
    const response = controller.check();

    expect(response.status).toBe('ok');
    expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
  });
});
