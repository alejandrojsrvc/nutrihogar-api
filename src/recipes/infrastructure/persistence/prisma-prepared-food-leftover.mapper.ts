import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import { PreparedFoodLeftoverProps } from '../../domain/models/prepared-food-leftover.models';

export const preparedFoodLeftoverInclude = {
  nutrientSnapshots: true,
} satisfies Prisma.PreparedFoodLeftoverInclude;

export type PreparedFoodLeftoverRecord = Prisma.PreparedFoodLeftoverGetPayload<{
  include: typeof preparedFoodLeftoverInclude;
}>;

export class PrismaPreparedFoodLeftoverMapper {
  static toDomain(record: PreparedFoodLeftoverRecord): PreparedFoodLeftover {
    const props: PreparedFoodLeftoverProps = {
      id: record.id,
      preparedBatchId: record.preparedBatchId,
      householdId: record.householdId,
      availableWeight: new Decimal(record.availableWeight.toString()),
      nutrientDensitySnapshot: record.nutrientSnapshots.map((nutrient) => ({
        code: nutrient.nutrientCode,
        name: nutrient.nutrientName,
        unit: nutrient.unit,
        amountPerGram: new Decimal(nutrient.amountPerGram.toString()),
      })),
      storedAt: record.storedAt,
      storageLocation: record.storageLocation,
      notes: record.notes,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return PreparedFoodLeftover.reconstitute(props);
  }

  static toPersistence(leftover: PreparedFoodLeftover) {
    const props = leftover.toProps();
    return {
      id: props.id,
      preparedBatchId: props.preparedBatchId,
      householdId: props.householdId,
      availableWeight: props.availableWeight.toString(),
      storedAt: props.storedAt,
      storageLocation: props.storageLocation,
      notes: props.notes,
      status: props.status,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      nutrients: props.nutrientDensitySnapshot.map((nutrient) => ({
        code: nutrient.code,
        name: nutrient.name,
        unit: nutrient.unit,
        amountPerGram: nutrient.amountPerGram.toString(),
      })),
    };
  }
}
