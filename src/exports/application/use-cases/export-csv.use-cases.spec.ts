import { ExportAccessDeniedError } from '../errors/export.errors';
import type { ExportsReadRepository } from '../ports/exports-read-repository.port';
import type { HouseholdRepository } from '../../../../households/application/ports/household-repository.port';
import {
  ExportBodyTrackingCsvUseCase,
  ExportInventoryMovementsCsvUseCase,
  ExportPurchasesCsvUseCase,
} from './export-csv.use-cases';

const profile = {
  id: 'profile-1',
  householdId: 'household-1',
  timezone: 'America/Argentina/Buenos_Aires',
};
const household = {
  id: 'household-1',
  name: 'Home',
  timezone: 'UTC',
  currency: 'USD',
  weeklyBudget: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CSV export use cases', () => {
  it('authorizes profiles through active household membership and applies the local half-open range', async () => {
    const repository = {
      findAccessibleProfile: jest.fn().mockResolvedValue(profile),
      listBodyTracking: jest.fn().mockResolvedValue([
        {
          recordedAt: new Date('2026-01-01T03:00:00.000Z'),
          kind: 'weight',
          name: 'weight',
          value: '70.5',
          unit: 'KG',
        },
      ]),
    } as unknown as ExportsReadRepository;
    const csv = await new ExportBodyTrackingCsvUseCase(repository).execute({
      actorId: 'user-1',
      profileId: 'profile-1',
      query: {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-02',
        timezone: 'America/Argentina/Buenos_Aires',
      },
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.listBodyTracking).toHaveBeenCalledWith('profile-1', {
      from: new Date('2026-01-01T03:00:00.000Z'),
      to: new Date('2026-01-02T03:00:00.000Z'),
    });
    expect(csv).toContain('recorded_at,measurement,value,unit');
    expect(csv).toContain('70.5,KG');
  });

  it('does not query profile data when access is denied', async () => {
    const repository = {
      findAccessibleProfile: jest.fn().mockResolvedValue(null),
      listBodyTracking: jest.fn(),
    } as unknown as ExportsReadRepository;
    await expect(
      new ExportBodyTrackingCsvUseCase(repository).execute({
        actorId: 'other-user',
        profileId: 'profile-1',
        query: {},
      }),
    ).rejects.toBeInstanceOf(ExportAccessDeniedError);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.listBodyTracking).not.toHaveBeenCalled();
  });

  it('requires active ADMIN access and never broadens the household query', async () => {
    const repository = {
      listInventoryMovements: jest.fn().mockResolvedValue([]),
      listPurchases: jest.fn().mockResolvedValue([]),
    } as unknown as ExportsReadRepository;
    const findAccess = jest.fn().mockResolvedValue({ household, role: 'MEMBER', status: 'ACTIVE' });
    const households: HouseholdRepository = {
      findAccess,
      findActiveForUser: jest.fn(),
      updateName: jest.fn(),
    };
    await expect(
      new ExportInventoryMovementsCsvUseCase(repository, households).execute({
        actorId: 'member',
        householdId: 'household-1',
        query: {},
      }),
    ).rejects.toBeInstanceOf(ExportAccessDeniedError);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.listInventoryMovements).not.toHaveBeenCalled();
    findAccess.mockResolvedValue({ household, role: 'ADMIN', status: 'ACTIVE' });
    const csv = await new ExportPurchasesCsvUseCase(repository, households).execute({
      actorId: 'admin',
      householdId: 'household-1',
      query: {},
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.listPurchases).toHaveBeenCalledWith('household-1', expect.anything());
    expect(csv).toBe('purchase_date,store,status,currency,total,item,quantity,unit\r\n');
  });
});
