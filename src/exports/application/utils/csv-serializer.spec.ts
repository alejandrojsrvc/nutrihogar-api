import { CsvSerializer } from './csv-serializer';

describe('CsvSerializer', () => {
  it('writes stable headers, RFC4180 cells, and protects formula-like values', () => {
    expect(
      CsvSerializer.serialize({
        headers: ['name', 'value'],
        rows: [['a,b', '=SUM(A1)', 'ignored']],
      }),
    ).toBe('name,value\r\n"a,b",\'=SUM(A1),ignored\r\n');
    expect(
      CsvSerializer.serialize({
        headers: ['value'],
        rows: [['  +1'], ['line\nvalue'], ['"quote"']],
      }),
    ).toBe('value\r\n\'  +1\r\n"line\nvalue"\r\n"""quote"""\r\n');
  });

  it('serializes an empty export with headers only', () => {
    expect(CsvSerializer.serialize({ headers: ['date', 'unit'], rows: [] })).toBe('date,unit\r\n');
  });
});
