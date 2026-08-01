import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { InventoryItemRepository } from '../ports/inventory-repository.port';
import { RegisterInventoryExitCommand, registerInventoryExit } from './register-inventory-exit';

export const REGISTER_INVENTORY_EXPIRATION_USE_CASE = Symbol('RegisterInventoryExpirationUseCase');

export class RegisterInventoryExpirationUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly inventory: InventoryItemRepository,
  ) {}

  execute(command: RegisterInventoryExitCommand): Promise<InventoryItem> {
    return registerInventoryExit(this.households, this.inventory, command, 'EXPIRATION');
  }
}
