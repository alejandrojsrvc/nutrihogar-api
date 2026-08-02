import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { HouseholdAccessDeniedError } from '../../../households/application/errors/household-access-denied.error';
import type {
  OperationalReportRepository,
  ReportInventoryItem,
  ReportInventoryMovement,
  ReportPeriod,
  ReportPreparedLeftover,
  ReportPurchase,
} from '../ports/operational-report-repository.port';

export const GET_INVENTORY_REPORT_QUERY = Symbol('GetInventoryReportQuery');
export const GET_PURCHASE_REPORT_QUERY = Symbol('GetPurchaseReportQuery');
export const GET_WASTE_REPORT_QUERY = Symbol('GetWasteReportQuery');

export interface ReportPeriodInput {
  from: string;
  to: string;
}
export interface ReportCommand {
  actorId: string;
  householdId: string;
  from: string;
  to: string;
}

export interface InventoryReport {
  period: { from: string; to: string };
  stock: Array<{
    itemId: string;
    name: string;
    itemType: string;
    quantity: number;
    unit: string;
    status: string;
  }>;
  entries: AmountGroup[];
  consumption: AmountGroup[];
  adjustments: AmountGroup[];
  waste: AmountGroup[];
  expirations: AmountGroup[];
  exhausted: Array<{ itemId: string; name: string; unit: string }>;
  lowMinimum: Array<{
    itemId: string;
    name: string;
    quantity: number;
    minimum: number;
    unit: string;
  }>;
  preparedAvailable: Array<{ name: string; quantity: number; unit: string }>;
  approximateRotation: {
    consumed: number;
    referenceStock: number | null;
    ratio: number | null;
    limitation: string;
  };
}

export interface AmountGroup {
  key: string;
  name: string;
  unit: string;
  quantity: number;
}

export interface PurchaseReport {
  period: { from: string; to: string };
  purchaseCount: number;
  itemCount: number;
  quantity: AmountGroup[];
  totalsByCurrency: CurrencyAmount[];
  averageByCurrency: CurrencyAmount[];
  byWeek: Array<{ week: string; totalsByCurrency: CurrencyAmount[] }>;
  byStore: Array<{ store: string; totalsByCurrency: CurrencyAmount[] }>;
  topProducts: AmountGroup[];
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface WasteReport {
  period: { from: string; to: string };
  quantity: AmountGroup[];
  topFoods: AmountGroup[];
  reasons: Array<{ reason: string; quantity: number; unit: string }>;
  expiration: AmountGroup[];
  preparedDiscarded: Array<{ name: string; quantity: number; unit: string; status: string }>;
  weeklyEvolution: Array<{ week: string; quantity: AmountGroup[] }>;
  limitations: string[];
}

export class GetInventoryReportQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly reports: OperationalReportRepository,
  ) {}
  async execute(command: ReportCommand): Promise<InventoryReport> {
    const period = await authorizedPeriod(this.households, command);
    const items = await this.reports.listInventoryItems(command.householdId, period);
    return inventoryResult(command, items);
  }
}

export class GetPurchaseReportQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly reports: OperationalReportRepository,
  ) {}
  async execute(command: ReportCommand): Promise<PurchaseReport> {
    const period = await authorizedPeriod(this.households, command);
    return purchaseResult(command, await this.reports.listPurchases(command.householdId, period));
  }
}

export class GetWasteReportQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly reports: OperationalReportRepository,
  ) {}
  async execute(command: ReportCommand): Promise<WasteReport> {
    const period = await authorizedPeriod(this.households, command);
    const [items, leftovers] = await Promise.all([
      this.reports.listInventoryItems(command.householdId, period),
      this.reports.listPreparedLeftovers(command.householdId, period),
    ]);
    return wasteResult(command, period, items, leftovers);
  }
}

async function authorizedPeriod(
  households: HouseholdRepository,
  command: ReportCommand,
): Promise<ReportPeriod> {
  const access = await households.findAccess(command.actorId, command.householdId);
  if (!access || access.status !== 'ACTIVE') throw new HouseholdAccessDeniedError();
  const from = boundary(command.from, false);
  const to = boundary(command.to, true);
  if (from >= to) throw new Error('Report period must have from before to.');
  return { from, to };
}

function boundary(value: string, end: boolean): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Report dates must use YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error('Report date is invalid.');
  if (end) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function inventoryResult(command: ReportCommand, items: ReportInventoryItem[]): InventoryReport {
  const movements = items.flatMap((item) => item.movements);
  const amount = (types: ReportInventoryMovement['type'][]) =>
    groups(
      movements
        .filter((movement) => types.includes(movement.type))
        .map((movement) => ({
          ...movement,
          name: items.find((item) => item.id === movement.itemId)?.name ?? 'Unknown',
          quantity:
            movement.type === 'ADJUSTMENT_DECREASE'
              ? -Number(movement.quantity)
              : movement.quantity,
        })),
    );
  const consumption = amount(['CONSUMPTION', 'PREPARATION_CONSUMPTION']);
  const consumed = sum(consumption.map((group) => group.quantity));
  const stockUnits = new Set(items.map((item) => item.unit));
  const referenceStock =
    stockUnits.size === 1
      ? sum(items.map((item) => Number(item.currentQuantity))) +
        sum(amount(['CONSUMPTION']).map((group) => group.quantity)) -
        sum(amount(['PURCHASE', 'MANUAL_ENTRY']).map((group) => group.quantity))
      : null;
  return {
    period: outputPeriod(command),
    stock: items.map((item) => ({
      itemId: item.id,
      name: item.name,
      itemType: item.itemType,
      quantity: Number(item.currentQuantity),
      unit: item.unit,
      status: item.status,
    })),
    entries: amount(['PURCHASE', 'MANUAL_ENTRY']),
    consumption,
    adjustments: amount(['ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE']),
    waste: amount(['WASTE']),
    expirations: amount(['EXPIRATION']),
    exhausted: items
      .filter((item) => Number(item.currentQuantity) === 0)
      .map((item) => ({ itemId: item.id, name: item.name, unit: item.unit })),
    lowMinimum: items
      .filter(
        (item) =>
          item.minimumQuantity !== null &&
          Number(item.currentQuantity) <= Number(item.minimumQuantity),
      )
      .map((item) => ({
        itemId: item.id,
        name: item.name,
        quantity: Number(item.currentQuantity),
        minimum: Number(item.minimumQuantity),
        unit: item.unit,
      })),
    preparedAvailable: items
      .filter((item) => item.itemType === 'PREPARED_FOOD' && item.status === 'ACTIVE')
      .map((item) => ({
        name: item.name,
        quantity: Number(item.currentQuantity),
        unit: item.unit,
      })),
    approximateRotation: {
      consumed,
      referenceStock: referenceStock === null ? null : Math.max(referenceStock, 0),
      ratio: referenceStock !== null && referenceStock > 0 ? consumed / referenceStock : null,
      limitation:
        stockUnits.size > 1
          ? 'Rotation is not combined across incompatible units.'
          : 'Approximation based on current stock and period movements; it is not a lot-level FIFO rotation.',
    },
  };
}

function purchaseResult(command: ReportCommand, purchases: ReportPurchase[]): PurchaseReport {
  const confirmed = purchases.filter((purchase) => purchase.status === 'CONFIRMED');
  const currency = (rows: ReportPurchase[]) =>
    currencies(
      rows.reduce(
        (map, purchase) =>
          map.set(
            purchase.currency,
            new Decimal(map.get(purchase.currency) ?? 0).add(purchase.total),
          ),
        new Map<string, Decimal>(),
      ),
    );
  const quantity = groups(
    confirmed.flatMap((purchase) =>
      purchase.items.map((item) => ({
        ...item,
        quantity: item.quantity,
        occurredAt: purchase.purchaseDate,
      })),
    ),
  );
  const byWeek = [...new Set(confirmed.map((purchase) => week(purchase.purchaseDate)))]
    .sort()
    .map((key) => ({
      week: key,
      totalsByCurrency: currency(
        confirmed.filter((purchase) => week(purchase.purchaseDate) === key),
      ),
    }));
  const byStore = [...new Set(confirmed.map((purchase) => purchase.storeName))]
    .sort()
    .map((store) => ({
      store,
      totalsByCurrency: currency(confirmed.filter((purchase) => purchase.storeName === store)),
    }));
  const totalsByCurrency = currency(confirmed);
  return {
    period: outputPeriod(command),
    purchaseCount: confirmed.length,
    itemCount: confirmed.reduce((count, purchase) => count + purchase.items.length, 0),
    quantity,
    totalsByCurrency,
    averageByCurrency: totalsByCurrency.map((item) => ({
      ...item,
      amount:
        item.amount /
        (confirmed.filter((purchase) => purchase.currency === item.currency).length || 1),
    })),
    byWeek,
    byStore,
    topProducts: quantity
      .slice()
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
  };
}

function wasteResult(
  command: ReportCommand,
  period: ReportPeriod,
  items: ReportInventoryItem[],
  leftovers: ReportPreparedLeftover[],
): WasteReport {
  const waste = items.flatMap((item) =>
    item.movements
      .filter((movement) => movement.type === 'WASTE' || movement.type === 'EXPIRATION')
      .map((movement) => ({ ...movement, name: item.name })),
  );
  const quantity = groups(waste);
  const reasons = groupsByReason(waste);
  const expiration = groups(waste.filter((movement) => movement.type === 'EXPIRATION'));
  const preparedDiscarded = leftovers
    .filter(
      (leftover) =>
        (leftover.status === 'DISCARDED' || leftover.status === 'EXPIRED') &&
        leftover.updatedAt >= period.from &&
        leftover.updatedAt < period.to,
    )
    .map((leftover) => ({
      name: leftover.name,
      quantity: Number(leftover.weight),
      unit: 'GRAM',
      status: leftover.status,
    }));
  const weeks = [...new Set(waste.map((movement) => week(movement.occurredAt)))].sort();
  return {
    period: outputPeriod(command),
    quantity,
    topFoods: quantity
      .slice()
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    reasons,
    expiration,
    preparedDiscarded,
    weeklyEvolution: weeks.map((key) => ({
      week: key,
      quantity: groups(waste.filter((movement) => week(movement.occurredAt) === key)),
    })),
    limitations: [
      'No exact wasted cost is calculated because purchase totals have no reliable product-level allocation.',
      'Quantities are aggregated only when food identity and unit match; incompatible units are kept separate.',
      'Prepared leftover disposal uses its last update timestamp because the record has no dedicated discardedAt field.',
    ],
  };
}

function groups(
  rows: Array<{ foodId?: string | null; name: string; unit: string; quantity: string | number }>,
): AmountGroup[] {
  const map = new Map<string, AmountGroup>();
  for (const row of rows) {
    const key = `${row.foodId ?? row.name.trim().toLocaleLowerCase()}|${row.unit}`;
    const current = map.get(key);
    map.set(key, {
      key,
      name: current?.name ?? row.name,
      unit: row.unit,
      quantity: (current?.quantity ?? 0) + Number(row.quantity),
    });
  }
  return [...map.values()];
}
function groupsByReason(
  rows: Array<{ reason: string | null; unit: string; quantity: string | number }>,
) {
  const map = new Map<string, { reason: string; quantity: number; unit: string }>();
  for (const row of rows) {
    const reason = row.reason?.trim() || 'unspecified';
    const key = `${reason}|${row.unit}`;
    const current = map.get(key);
    map.set(key, {
      reason,
      unit: row.unit,
      quantity: (current?.quantity ?? 0) + Number(row.quantity),
    });
  }
  return [...map.values()];
}
function currencies(map: Map<string, Decimal>) {
  return [...map.entries()].map(([currency, amount]) => ({ currency, amount: amount.toNumber() }));
}
function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
function week(date: Date) {
  const value = new Date(date);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - (day === 0 ? 6 : day - 1));
  return value.toISOString().slice(0, 10);
}
function outputPeriod(command: ReportCommand) {
  return { from: command.from, to: command.to };
}
