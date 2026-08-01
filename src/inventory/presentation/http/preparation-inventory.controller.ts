import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {
  CONFIRM_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE,
  ConfirmPreparedBatchInventoryConsumptionUseCase,
  PREVIEW_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE,
  PreviewPreparedBatchInventoryConsumptionUseCase,
} from '../../application/use-cases/prepared-batch-inventory-consumption.use-cases';
import {
  ADD_PREPARED_LEFTOVER_TO_INVENTORY_USE_CASE,
  AddPreparedLeftoverToInventoryUseCase,
} from '../../application/use-cases/add-prepared-leftover-to-inventory.use-case';
import {
  ConfirmPreparedBatchInventoryConsumptionRequestDto,
  PreparedBatchInventoryPreviewResponseDto,
} from './dto/preparation-inventory.dto';
import { rethrowInventoryHttpError } from './inventory-http.mapper';
import { toInventoryItemResponse } from './inventory-http.mapper';
import { InventoryItemResponseDto } from './dto/inventory-response.dto';

@ApiTags('preparation-inventory')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(SupabaseAuthGuard)
export class PreparationInventoryController {
  constructor(
    @Inject(PREVIEW_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE)
    private readonly preview: PreviewPreparedBatchInventoryConsumptionUseCase,
    @Inject(CONFIRM_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE)
    private readonly confirm: ConfirmPreparedBatchInventoryConsumptionUseCase,
    @Inject(ADD_PREPARED_LEFTOVER_TO_INVENTORY_USE_CASE)
    private readonly addLeftover: AddPreparedLeftoverToInventoryUseCase,
  ) {}

  @Get('prepared-batches/:batchId/inventory-consumption-preview')
  @ApiOperation({ summary: 'Propone el consumo de inventario de una preparacion' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedBatchInventoryPreviewResponseDto })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async previewBatch(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return await this.preview.execute(user.id, batchId);
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Post('prepared-batches/:batchId/inventory-consumption')
  @ApiOperation({ summary: 'Confirma el consumo de ingredientes del inventario' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiOkResponse({ description: 'El consumo fue aplicado.' })
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  @ApiForbiddenResponse()
  async confirmBatch(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: ConfirmPreparedBatchInventoryConsumptionRequestDto,
  ): Promise<void> {
    try {
      await this.confirm.execute({ actorId: user.id, batchId, decisions: body.decisions });
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }

  @Post('prepared-leftovers/:leftoverId/add-to-inventory')
  @ApiOperation({ summary: 'Incorpora un sobrante preparado al inventario' })
  @ApiParam({ name: 'leftoverId', format: 'uuid' })
  @ApiCreatedResponse({ type: InventoryItemResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async add(
    @Param('leftoverId', new ParseUUIDPipe()) leftoverId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<InventoryItemResponseDto> {
    try {
      return toInventoryItemResponse(
        await this.addLeftover.execute({ actorId: user.id, leftoverId }),
      );
    } catch (error) {
      rethrowInventoryHttpError(error);
    }
  }
}
