import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import type {
  OperationalReportRepository,
  ReportInventoryItem,
  ReportPurchase,
} from '../ports/operational-report-repository.port';
import {
  GetInventoryReportQuery,
  GetPurchaseReportQuery,
  GetWasteReportQuery,
} from './get-operational-reports.query';

const access = { household: {} as never, role: 'MEMBER' as const, status: 'ACTIVE' as const };
const item = (overrides: Partial<ReportInventoryItem> = {}): ReportInventoryItem => ({
  id: 'item',
  foodId: 'food',
  name: 'Rice',
  itemType: 'FOOD',
  currentQuantity: '5',
  unit: 'GRAM',
  minimumQuantity: '10',
  expiresAt: null,
  status: 'ACTIVE',
  movements: [],
  ...overrides,
});
const repository = (
  overrides: Partial<OperationalReportRepository> = {},
): jest.Mocked<OperationalReportRepository> => ({
  listInventoryItems: jest.fn().mockResolvedValue([]),
  listPurchases: jest.fn().mockResolvedValue([]),
  listPreparedLeftovers: jest.fn().mockResolvedValue([]),
  ...overrides,
});
const households = (allowed = true): jest.Mocked<HouseholdRepository> => ({
  findAccess: jest.fn().mockResolvedValue(allowed ? access : null),
  findActiveForUser: jest.fn(),
  updateName: jest.fn(),
});

describe('operational reports', () => {
  it('uses an inclusive UTC start and exclusive next-day end, and isolates the household in the application layer', async () => {
    const reports = repository();
    await new GetInventoryReportQuery(households(), reports).execute({
      actorId: 'user',
      householdId: 'house',
      from: '2026-08-01',
      to: '2026-08-01',
    });
    // Jest inspects the mock function directly to verify the exact period passed to the port.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reports.listInventoryItems).toHaveBeenCalledWith('house', {
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-02T00:00:00.000Z'),
    });
    await expect(
      new GetWasteReportQuery(households(false), reports).execute({
        actorId: 'user',
        householdId: 'other',
        from: '2026-08-01',
        to: '2026-08-02',
      }),
    ).rejects.toThrow();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reports.listInventoryItems).toHaveBeenCalledTimes(1);
  });

  it('keeps inventory quantities separate by compatible unit and does not combine rotation across units', async () => {
    const reports = repository({
      listInventoryItems: jest.fn().mockResolvedValue([
        item(),
        item({
          id: 'water',
          name: 'Water',
          unit: 'MILLILITER',
          currentQuantity: '2',
          minimumQuantity: null,
          movements: [
            {
              itemId: 'water',
              type: 'WASTE',
              quantity: '1',
              unit: 'MILLILITER',
              occurredAt: new Date(),
              reason: 'spill',
            },
          ],
        }),
      ]),
    });
    const result = await new GetInventoryReportQuery(households(), reports).execute({
      actorId: 'user',
      householdId: 'house',
      from: '2026-08-01',
      to: '2026-08-02',
    });
    expect(result.stock).toHaveLength(2);
    expect(result.approximateRotation.referenceStock).toBeNull();
    expect(result.approximateRotation.ratio).toBeNull();
  });

  it('groups purchase totals by currency and never derives product prices', async () => {
    const purchases: ReportPurchase[] = [
      {
        id: 'p1',
        storeName: 'Market',
        purchaseDate: new Date('2026-08-01T10:00:00Z'),
        status: 'CONFIRMED',
        currency: 'USD',
        total: '10',
        items: [{ foodId: 'food', name: 'Rice', unit: 'GRAM', quantity: '2' }],
      },
      {
        id: 'p2',
        storeName: 'Market',
        purchaseDate: new Date('2026-08-01T11:00:00Z'),
        status: 'CONFIRMED',
        currency: 'EUR',
        total: '8',
        items: [{ foodId: 'food', name: 'Rice', unit: 'GRAM', quantity: '3' }],
      },
    ];
    const result = await new GetPurchaseReportQuery(
      households(),
      repository({ listPurchases: jest.fn().mockResolvedValue(purchases) }),
    ).execute({ actorId: 'user', householdId: 'house', from: '2026-08-01', to: '2026-08-01' });
    expect(result.totalsByCurrency).toEqual([
      { currency: 'USD', amount: 10 },
      { currency: 'EUR', amount: 8 },
    ]);
    expect(result.topProducts[0].quantity).toBe(5);
    expect(result).not.toHaveProperty('productPrices');
  });

  it('reports waste reasons and states why exact waste cost is unavailable', async () => {
    const reports = repository({
      listInventoryItems: jest.fn().mockResolvedValue([
        item({
          movements: [
            {
              itemId: 'item',
              type: 'EXPIRATION',
              quantity: '2',
              unit: 'GRAM',
              occurredAt: new Date('2026-08-01T12:00:00Z'),
              reason: null,
            },
          ],
        }),
      ]),
    });
    const result = await new GetWasteReportQuery(households(), reports).execute({
      actorId: 'user',
      householdId: 'house',
      from: '2026-08-01',
      to: '2026-08-01',
    });
    expect(result.expiration[0].quantity).toBe(2);
    expect(result.reasons[0].reason).toBe('unspecified');
    expect(result.limitations.some((limitation) => limitation.includes('exact wasted cost'))).toBe(
      true,
    );
  });
});
