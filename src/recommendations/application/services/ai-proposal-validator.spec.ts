import Decimal from 'decimal.js';
import { AiProposalValidator } from './ai-proposal-validator';

describe('AiProposalValidator', () => {
  const food = {
    id: 'food-1',
    name: 'Avena',
    referenceUnit: 'GRAM',
    servings: [],
  };
  const foods = { findVisibleById: jest.fn().mockResolvedValue(food) };
  const recipes = { findByIdForHousehold: jest.fn().mockResolvedValue(null) };
  const item = { foodId: 'food-1', unit: 'GRAM', currentQuantity: new Decimal(100) };
  const inventory = {
    listByHousehold: jest.fn().mockResolvedValue({ items: [item] }),
    save: jest.fn(),
  };
  const nutrition = {
    calculate: jest.fn().mockResolvedValue({ nutrients: { kcal: new Decimal(120) } }),
  };

  function validator() {
    return new AiProposalValidator(
      foods as never,
      recipes as never,
      inventory as never,
      nutrition as never,
    );
  }

  beforeEach(() => jest.clearAllMocks());

  it('resolves catalog references, recalculates nutrition and reports available inventory', async () => {
    const result = await validator().validate({
      proposalId: 'proposal-1',
      householdId: 'household-1',
      actorId: 'user-1',
      adultProfileIds: [],
      payload: {
        suggestions: [{ ingredients: [{ foodId: 'food-1', quantity: 50, unit: 'GRAM' }] }],
      },
      validatedAt: new Date(),
    });

    expect(result.errors).toEqual([]);
    expect(result.catalogValid).toBe(true);
    expect(result.nutritionValid).toBe(true);
    expect(result.inventoryValid).toBe(true);
    expect(nutrition.calculate).toHaveBeenCalledWith(
      expect.objectContaining({ foodId: 'food-1', quantity: 50, unit: 'GRAM' }),
    );
    expect(inventory.listByHousehold).toHaveBeenCalledWith(
      'household-1',
      expect.objectContaining({ status: 'ACTIVE' }),
    );
    expect(inventory.save).not.toHaveBeenCalled();
  });

  it('blocks unknown foods, impossible units and restrictions', async () => {
    foods.findVisibleById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...food, name: 'Leche' })
      .mockResolvedValueOnce({ ...food, name: 'Leche' });
    const result = await validator().validate({
      proposalId: 'proposal-2',
      householdId: 'household-1',
      actorId: 'user-1',
      adultProfileIds: [],
      restrictions: ['lactosa'],
      payload: {
        suggestions: [
          {
            ingredients: [
              { foodId: 'missing', quantity: 10, unit: 'GRAM' },
              { foodId: 'food-1', quantity: 10, unit: 'CUP' },
              { foodId: 'food-1', quantity: 10, unit: 'GRAM' },
            ],
          },
        ],
      },
      validatedAt: new Date(),
    });

    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(['FOOD_NOT_FOUND', 'UNIT_IMPOSSIBLE', 'FOOD_RESTRICTED']),
    );
    expect(result.hasBlockingErrors()).toBe(true);
  });

  it('classifies insufficient inventory as a warning without changing inventory', async () => {
    inventory.listByHousehold.mockResolvedValueOnce({ items: [] });
    const result = await validator().validate({
      proposalId: 'proposal-3',
      householdId: 'household-1',
      actorId: 'user-1',
      adultProfileIds: [],
      payload: {
        suggestions: [{ ingredients: [{ foodId: 'food-1', quantity: 200, unit: 'GRAM' }] }],
      },
      validatedAt: new Date(),
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVENTORY_MISSING', severity: 'WARNING' }),
      ]),
    );
    expect(result.inventoryValid).toBe(false);
    expect(inventory.save).not.toHaveBeenCalled();
  });
});
