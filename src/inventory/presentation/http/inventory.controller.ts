import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { JwtAuthGuard } from '../../../identity/presentation/http/jwt-auth.guard';
import {
  GET_INVENTORY_ITEM_QUERY,
  GetInventoryItemQuery,
} from '../../application/queries/get-inventory-item.query';
import {
  LIST_INVENTORY_ITEMS_QUERY,
  ListInventoryItemsQuery,
} from '../../application/queries/list-inventory-items.query';
import {
  LIST_INVENTORY_MOVEMENTS_QUERY,
  ListInventoryMovementsQuery,
} from '../../application/queries/list-inventory-movements.query';
import {
  ADJUST_INVENTORY_ITEM_USE_CASE,
  AdjustInventoryItemUseCase,
} from '../../application/use-cases/adjust-inventory-item.use-case';
import {
  ARCHIVE_INVENTORY_ITEM_USE_CASE,
  ArchiveInventoryItemUseCase,
} from '../../application/use-cases/archive-inventory-item.use-case';
import {
  CONSUME_INVENTORY_ITEM_USE_CASE,
  ConsumeInventoryItemUseCase,
} from '../../application/use-cases/consume-inventory-item.use-case';
import {
  CONSUME_PREPARED_INVENTORY_ITEM_USE_CASE,
  ConsumePreparedInventoryItemUseCase,
} from '../../application/use-cases/consume-prepared-inventory-item.use-case';
import {
  CREATE_MANUAL_INVENTORY_ITEM_USE_CASE,
  CreateManualInventoryItemUseCase,
} from '../../application/use-cases/create-manual-inventory-item.use-case';
import {
  REGISTER_INVENTORY_EXPIRATION_USE_CASE,
  RegisterInventoryExpirationUseCase,
} from '../../application/use-cases/register-inventory-expiration.use-case';
import {
  REGISTER_INVENTORY_WASTE_USE_CASE,
  RegisterInventoryWasteUseCase,
} from '../../application/use-cases/register-inventory-waste.use-case';
import {
  SET_INVENTORY_MINIMUM_USE_CASE,
  SetInventoryMinimumUseCase,
} from '../../application/use-cases/set-inventory-minimum.use-case';
import {
  SYNCHRONIZE_INVENTORY_OPERATIONS_USE_CASE,
  SynchronizeInventoryOperationsUseCase,
} from '../../application/use-cases/synchronize-inventory-operations.use-case';
import {
  AdjustInventoryItemRequestDto,
  CreateManualInventoryItemRequestDto,
  ListInventoryItemsRequestDto,
  PaginationRequestDto,
  RegisterInventoryExitRequestDto,
  UpdateInventoryItemRequestDto,
} from './dto/inventory-request.dto';
import { ConsumePreparedInventoryItemRequestDto } from './dto/consume-prepared-inventory-item.dto';
import { InventorySyncRequestDto } from './dto/inventory-sync.dto';
import { MealResponseDto } from '../../../meal-tracking/presentation/http/dto/meal-response.dto';
import { toMealResponse } from '../../../meal-tracking/presentation/http/meal-http.mapper';
import {
  InventoryItemListResponseDto,
  InventoryItemResponseDto,
  InventoryMovementListResponseDto,
  InventorySyncResponseDto,
} from './dto/inventory-response.dto';
import {
  rethrowInventoryHttpError,
  toInventoryItemListResponse,
  toInventoryItemResponse,
  toInventoryMovementListResponse,
  toInventorySyncResponse,
} from './inventory-http.mapper';

@ApiTags('inventory')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    @Inject(LIST_INVENTORY_ITEMS_QUERY) private readonly listItems: ListInventoryItemsQuery,
    @Inject(GET_INVENTORY_ITEM_QUERY) private readonly getItem: GetInventoryItemQuery,
    @Inject(CREATE_MANUAL_INVENTORY_ITEM_USE_CASE)
    private readonly createItem: CreateManualInventoryItemUseCase,
    @Inject(SET_INVENTORY_MINIMUM_USE_CASE)
    private readonly updateItem: SetInventoryMinimumUseCase,
    @Inject(ADJUST_INVENTORY_ITEM_USE_CASE)
    private readonly adjustItem: AdjustInventoryItemUseCase,
    @Inject(LIST_INVENTORY_MOVEMENTS_QUERY)
    private readonly listMovements: ListInventoryMovementsQuery,
    @Inject(ARCHIVE_INVENTORY_ITEM_USE_CASE)
    private readonly archiveItem: ArchiveInventoryItemUseCase,
    @Inject(CONSUME_INVENTORY_ITEM_USE_CASE)
    private readonly consumeItem: ConsumeInventoryItemUseCase,
    @Inject(CONSUME_PREPARED_INVENTORY_ITEM_USE_CASE)
    private readonly consumePreparedItem: ConsumePreparedInventoryItemUseCase,
    @Inject(REGISTER_INVENTORY_WASTE_USE_CASE)
    private readonly wasteItem: RegisterInventoryWasteUseCase,
    @Inject(REGISTER_INVENTORY_EXPIRATION_USE_CASE)
    private readonly expireItem: RegisterInventoryExpirationUseCase,
    @Inject(SYNCHRONIZE_INVENTORY_OPERATIONS_USE_CASE)
    private readonly synchronize: SynchronizeInventoryOperationsUseCase,
  ) {}

  @Post('households/:householdId/inventory/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincroniza operaciones offline de inventario' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: InventorySyncResponseDto })
  @ApiBadRequestResponse({ description: 'La operacion de sincronizacion es invalida.' })
  @ApiConflictResponse({
    description: 'Los conflictos por operacion se devuelven en el cuerpo de la respuesta.',
  })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece activamente al hogar.' })
  async sync(
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: InventorySyncRequestDto,
  ): Promise<InventorySyncResponseDto> {
    try {
      return toInventorySyncResponse(
        await this.synchronize.execute({
          actorId: user.id,
          householdId,
          deviceId: body.deviceId,
          operations: body.operations.map((operation) => ({
            ...operation,
            occurredAt: new Date(operation.occurredAt),
          })) as Parameters<SynchronizeInventoryOperationsUseCase['execute']>[0]['operations'],
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Get('households/:householdId/inventory')
  @ApiOperation({ summary: 'Lista el inventario de un hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: InventoryItemListResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece activamente al hogar.' })
  async list(
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: ListInventoryItemsRequestDto,
  ): Promise<InventoryItemListResponseDto> {
    try {
      return toInventoryItemListResponse(
        await this.listItems.execute(user.id, householdId, {
          ...query,
          expiresBefore: query.expiresBefore ? new Date(query.expiresBefore) : undefined,
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Post('households/:householdId/inventory/items')
  @ApiOperation({ summary: 'Crea manualmente una existencia de alimento' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiCreatedResponse({ type: InventoryItemResponseDto })
  @ApiBadRequestResponse({ description: 'La cantidad o unidad es invalida.' })
  @ApiConflictResponse({ description: 'Ya existe una existencia compatible.' })
  @ApiForbiddenResponse({ description: 'Solo administradores pueden crear existencias.' })
  @ApiNotFoundResponse({ description: 'El alimento no esta disponible para el hogar.' })
  async create(
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreateManualInventoryItemRequestDto,
  ): Promise<InventoryItemResponseDto> {
    try {
      return toInventoryItemResponse(
        await this.createItem.execute({
          actorId: user.id,
          householdId,
          ...body,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Get('inventory/items/:inventoryItemId')
  @ApiOperation({ summary: 'Obtiene una existencia de inventario' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiOkResponse({ type: InventoryItemResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al hogar.' })
  @ApiNotFoundResponse({ description: 'La existencia no existe.' })
  async get(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<InventoryItemResponseDto> {
    try {
      return toInventoryItemResponse(await this.getItem.execute(user.id, inventoryItemId));
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Patch('inventory/items/:inventoryItemId')
  @ApiOperation({ summary: 'Actualiza minimo, ubicacion o vencimiento de una existencia' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiOkResponse({ type: InventoryItemResponseDto })
  @ApiBadRequestResponse({ description: 'Los metadatos son invalidos.' })
  @ApiConflictResponse({ description: 'La existencia esta archivada o cambio en paralelo.' })
  @ApiForbiddenResponse({ description: 'Solo administradores pueden editar existencias.' })
  @ApiNotFoundResponse({ description: 'La existencia no existe.' })
  async update(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdateInventoryItemRequestDto,
  ): Promise<InventoryItemResponseDto> {
    try {
      return toInventoryItemResponse(
        await this.updateItem.execute({
          actorId: user.id,
          inventoryItemId,
          ...body,
          expiresAt:
            body.expiresAt === undefined
              ? undefined
              : body.expiresAt === null
                ? null
                : new Date(body.expiresAt),
          occurredAt: new Date(),
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Post('inventory/items/:inventoryItemId/adjustments')
  @ApiOperation({ summary: 'Ajusta de forma absoluta la cantidad de una existencia' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiCreatedResponse({ type: InventoryItemResponseDto })
  @ApiBadRequestResponse({ description: 'La cantidad o unidad es invalida.' })
  @ApiConflictResponse({ description: 'La existencia esta archivada.' })
  @ApiForbiddenResponse({ description: 'Solo administradores pueden ajustar existencias.' })
  @ApiNotFoundResponse({ description: 'La existencia no existe.' })
  async adjust(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: AdjustInventoryItemRequestDto,
  ): Promise<InventoryItemResponseDto> {
    try {
      return toInventoryItemResponse(
        await this.adjustItem.execute({
          actorId: user.id,
          inventoryItemId,
          ...body,
          occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Get('inventory/items/:inventoryItemId/movements')
  @ApiOperation({ summary: 'Lista los movimientos de una existencia' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiOkResponse({ type: InventoryMovementListResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al hogar.' })
  @ApiNotFoundResponse({ description: 'La existencia no existe.' })
  async movements(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: PaginationRequestDto,
  ): Promise<InventoryMovementListResponseDto> {
    try {
      return toInventoryMovementListResponse(
        await this.listMovements.execute(user.id, inventoryItemId, query),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Delete('inventory/items/:inventoryItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archiva una existencia sin eliminar su historial' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'La existencia fue archivada.' })
  @ApiForbiddenResponse({ description: 'Solo administradores pueden archivar existencias.' })
  @ApiNotFoundResponse({ description: 'La existencia no existe.' })
  async archive(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.archiveItem.execute(user.id, inventoryItemId);
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Post('inventory/items/:inventoryItemId/consumptions')
  @ApiOperation({ summary: 'Registra un consumo manual de inventario' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiCreatedResponse({ type: InventoryItemResponseDto })
  @ApiBadRequestResponse({ description: 'La cantidad o unidad es invalida.' })
  @ApiConflictResponse({ description: 'La cantidad disponible es insuficiente.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al hogar.' })
  @ApiNotFoundResponse({ description: 'La existencia no existe.' })
  async consume(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: RegisterInventoryExitRequestDto,
  ): Promise<InventoryItemResponseDto> {
    try {
      return toInventoryItemResponse(
        await this.consumeItem.execute({
          actorId: user.id,
          inventoryItemId,
          ...body,
          occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Post('inventory/items/:inventoryItemId/consume-prepared-food')
  @ApiOperation({ summary: 'Consume un sobrante preparado y registra una comida' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiCreatedResponse({ type: MealResponseDto })
  @ApiBadRequestResponse({ description: 'El alimento no es preparado o la cantidad es invalida.' })
  @ApiConflictResponse({ description: 'La cantidad disponible es insuficiente.' })
  @ApiForbiddenResponse({ description: 'El usuario o perfil no pertenece al hogar.' })
  @ApiNotFoundResponse({ description: 'La existencia o sobrante no existe.' })
  async consumePrepared(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: ConsumePreparedInventoryItemRequestDto,
  ): Promise<MealResponseDto> {
    try {
      return toMealResponse(
        await this.consumePreparedItem.execute({
          actorId: user.id,
          inventoryItemId,
          adultProfileId: body.adultProfileId,
          mealType: body.mealType,
          quantity: body.quantity,
          consumedAt: new Date(body.consumedAt),
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Post('inventory/items/:inventoryItemId/waste')
  @ApiOperation({ summary: 'Registra desperdicio manual de inventario' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiCreatedResponse({ type: InventoryItemResponseDto })
  @ApiBadRequestResponse({ description: 'La cantidad o unidad es invalida.' })
  @ApiConflictResponse({ description: 'La cantidad disponible es insuficiente.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al hogar.' })
  @ApiNotFoundResponse({ description: 'La existencia no existe.' })
  async waste(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: RegisterInventoryExitRequestDto,
  ): Promise<InventoryItemResponseDto> {
    try {
      return toInventoryItemResponse(
        await this.wasteItem.execute({
          actorId: user.id,
          inventoryItemId,
          ...body,
          occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Post('inventory/items/:inventoryItemId/expiration')
  @ApiOperation({ summary: 'Registra una baja por vencimiento' })
  @ApiParam({ name: 'inventoryItemId', format: 'uuid' })
  @ApiCreatedResponse({ type: InventoryItemResponseDto })
  @ApiBadRequestResponse({ description: 'La cantidad o unidad es invalida.' })
  @ApiConflictResponse({ description: 'La cantidad disponible es insuficiente.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al hogar.' })
  @ApiNotFoundResponse({ description: 'La existencia no existe.' })
  async expiration(
    @Param('inventoryItemId', new ParseUUIDPipe()) inventoryItemId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: RegisterInventoryExitRequestDto,
  ): Promise<InventoryItemResponseDto> {
    try {
      return toInventoryItemResponse(
        await this.expireItem.execute({
          actorId: user.id,
          inventoryItemId,
          ...body,
          occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }
}
