import { PreparedBatchDetailsResult } from '../../application/models/prepared-batch-details.models';
import { PreparedBatchDetailsResponseDto } from './dto/prepared-batch-details-response.dto';
import { toPreparedBatchResponse } from './prepared-batch-http.mapper';

export function toPreparedBatchDetailsResponse(
  result: PreparedBatchDetailsResult,
): PreparedBatchDetailsResponseDto {
  return {
    batch: toPreparedBatchResponse(result.batch, [], true),
    availability: result.availability
      ? {
          finalCookedWeight: result.availability.finalCookedWeight.toNumber(),
          servedWeight: result.availability.servedWeight.toNumber(),
          storedLeftoverWeight: result.availability.storedLeftoverWeight.toNumber(),
          savedRemainderWeight: result.availability.savedRemainderWeight.toNumber(),
          discardedWeight: result.availability.discardedWeight.toNumber(),
          availableWeight: result.availability.availableWeight.toNumber(),
        }
      : null,
    servedPortions: result.servedPortions.map((portion) => ({
      id: portion.id,
      adultProfileId: portion.adultProfileId,
      servedWeight: portion.servedWeight.toNumber(),
      servedAt: portion.servedAt,
      status: portion.status,
      consumedWeight: portion.consumedWeight?.toNumber() ?? null,
      remainder: portion.remainder
        ? {
            weight: portion.remainder.weight.toNumber(),
            disposition: portion.remainder.disposition,
            createdAt: portion.remainder.createdAt,
          }
        : null,
      mealId: portion.mealId,
      nutritionSnapshot: Object.fromEntries(
        portion.nutritionSnapshot.map((nutrient) => [nutrient.code, nutrient.amount.toNumber()]),
      ),
    })),
    leftovers: result.leftovers.map((leftover) => ({
      id: leftover.id,
      preparedBatchId: leftover.preparedBatchId,
      availableWeight: leftover.availableWeight.toNumber(),
      nutrientDensitySnapshot: Object.fromEntries(
        leftover.nutrientDensitySnapshot.map((nutrient) => [
          nutrient.code,
          nutrient.amountPerGram.toNumber(),
        ]),
      ),
      storedAt: leftover.storedAt,
      storageLocation: leftover.storageLocation,
      notes: leftover.notes,
      status: leftover.status,
      createdAt: leftover.createdAt,
      updatedAt: leftover.updatedAt,
    })),
  };
}
