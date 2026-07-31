import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { ServedPortion } from '../../domain/entities/served-portion';
import {
  PortionRemainderProps,
  ServedPortionNutrientSnapshotProps,
  ServedPortionProps,
} from '../../domain/models/served-portion.models';

export const servedPortionInclude = {
  remainder: true,
  nutrientSnapshots: true,
} satisfies Prisma.ServedPortionInclude;

export type ServedPortionRecord = Prisma.ServedPortionGetPayload<{
  include: typeof servedPortionInclude;
}>;

export class PrismaServedPortionMapper {
  static toDomain(record: ServedPortionRecord): ServedPortion {
    const props: ServedPortionProps = {
      id: record.id,
      preparedBatchId: record.preparedBatchId,
      adultProfileId: record.adultProfileId,
      servedWeight: new Decimal(record.servedWeight.toString()),
      servedAt: record.servedAt,
      status: record.status,
      remainder: record.remainder ? toRemainder(record.remainder) : null,
      consumedWeight: toDecimal(record.consumedWeight),
      nutritionSnapshot: record.nutrientSnapshots.map(toNutrient),
      mealId: record.mealId,
      createdById: record.createdById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cancelledAt: record.cancelledAt,
    };
    return ServedPortion.reconstitute(props);
  }

  static toPersistence(portion: ServedPortion) {
    const props = portion.toProps();
    return {
      id: props.id,
      preparedBatchId: props.preparedBatchId,
      adultProfileId: props.adultProfileId,
      servedWeight: props.servedWeight.toString(),
      servedAt: props.servedAt,
      status: props.status,
      remainderWeight: props.remainder?.weight.toString() ?? null,
      consumedWeight: props.consumedWeight?.toString() ?? null,
      mealId: props.mealId,
      createdById: props.createdById,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      cancelledAt: props.cancelledAt,
      remainder: props.remainder
        ? {
            id: props.remainder.id,
            weight: props.remainder.weight.toString(),
            disposition: props.remainder.disposition,
            createdAt: props.remainder.createdAt,
          }
        : null,
      nutrients: props.nutritionSnapshot.map((nutrient) => ({
        code: nutrient.code,
        name: nutrient.name,
        unit: nutrient.unit,
        amount: nutrient.amount.toString(),
      })),
    };
  }
}

function toRemainder(remainder: ServedPortionRecord['remainder'] & object): PortionRemainderProps {
  return {
    id: remainder.id,
    weight: new Decimal(remainder.weight.toString()),
    disposition: remainder.disposition,
    createdAt: remainder.createdAt,
  };
}

function toNutrient(
  nutrient: ServedPortionRecord['nutrientSnapshots'][number],
): ServedPortionNutrientSnapshotProps {
  return {
    code: nutrient.nutrientCode,
    name: nutrient.nutrientName,
    unit: nutrient.unit,
    amount: new Decimal(nutrient.amount.toString()),
  };
}

function toDecimal(value: Prisma.Decimal | null): Decimal | null {
  return value ? new Decimal(value.toString()) : null;
}
