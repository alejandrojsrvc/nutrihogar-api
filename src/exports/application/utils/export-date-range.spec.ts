import { InvalidExportQueryError } from '../errors/export.errors';
import { toExportDateRange } from './export-date-range';

describe('toExportDateRange', () => {
  it('uses timezone-aware half-open UTC boundaries', () => {
    expect(
      toExportDateRange({
        dateFrom: '2026-07-01',
        dateTo: '2026-07-02',
        timezone: 'America/New_York',
      }),
    ).toEqual({
      from: new Date('2026-07-01T04:00:00.000Z'),
      to: new Date('2026-07-02T04:00:00.000Z'),
    });
  });

  it('rejects invalid ordering and timezones', () => {
    expect(() => toExportDateRange({ dateFrom: '2026-07-02', dateTo: '2026-07-01' })).toThrow(
      InvalidExportQueryError,
    );
    expect(() => toExportDateRange({ timezone: 'Not/AZone' })).toThrow(InvalidExportQueryError);
  });
});
