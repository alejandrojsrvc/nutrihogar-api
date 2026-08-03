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
  CANCEL_PREPARED_BATCH_USE_CASE,
  CancelPreparedBatchUseCase,
} from '../../application/use-cases/cancel-prepared-batch.use-case';
import {
  CONFIRM_PREPARED_BATCH_INGREDIENTS_USE_CASE,
  ConfirmPreparedBatchIngredientsUseCase,
} from '../../application/use-cases/confirm-prepared-batch-ingredients.use-case';
import {
  FINALIZE_PREPARED_BATCH_USE_CASE,
  FinalizePreparedBatchUseCase,
} from '../../application/use-cases/finalize-prepared-batch.use-case';
import {
  GET_PREPARED_BATCH_USE_CASE,
  GetPreparedBatchUseCase,
} from '../../application/use-cases/get-prepared-batch.use-case';
import {
  GET_PREPARED_BATCH_DETAILS_USE_CASE,
  GetPreparedBatchDetailsUseCase,
} from '../../application/use-cases/get-prepared-batch-details.use-case';
import {
  START_PREPARED_BATCH_USE_CASE,
  StartPreparedBatchUseCase,
} from '../../application/use-cases/start-prepared-batch.use-case';
import {
  UPDATE_PREPARED_BATCH_INGREDIENTS_USE_CASE,
  UpdatePreparedBatchIngredientsUseCase,
} from '../../application/use-cases/update-prepared-batch-ingredients.use-case';
import {
  FinalizePreparedBatchRequestDto,
  StartPreparedBatchRequestDto,
  UpdatePreparedBatchIngredientsRequestDto,
} from './dto/prepared-batch-request.dto';
import { PreparedBatchResponseDto } from './dto/prepared-batch-response.dto';
import { PreparedBatchDetailsResponseDto } from './dto/prepared-batch-details-response.dto';
import {
  rethrowPreparedBatchHttpError,
  toPreparedBatchResponse,
} from './prepared-batch-http.mapper';
import { toPreparedBatchDetailsResponse } from './prepared-batch-details-http.mapper';

@ApiTags('prepared-batches')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(JwtAuthGuard)
export class PreparedBatchesController {
  constructor(
    @Inject(START_PREPARED_BATCH_USE_CASE)
    private readonly startPreparedBatch: StartPreparedBatchUseCase,
    @Inject(UPDATE_PREPARED_BATCH_INGREDIENTS_USE_CASE)
    private readonly updateIngredients: UpdatePreparedBatchIngredientsUseCase,
    @Inject(GET_PREPARED_BATCH_USE_CASE)
    private readonly getPreparedBatch: GetPreparedBatchUseCase,
    @Inject(GET_PREPARED_BATCH_DETAILS_USE_CASE)
    private readonly getPreparedBatchDetails: GetPreparedBatchDetailsUseCase,
    @Inject(CANCEL_PREPARED_BATCH_USE_CASE)
    private readonly cancelPreparedBatch: CancelPreparedBatchUseCase,
    @Inject(CONFIRM_PREPARED_BATCH_INGREDIENTS_USE_CASE)
    private readonly confirmIngredients: ConfirmPreparedBatchIngredientsUseCase,
    @Inject(FINALIZE_PREPARED_BATCH_USE_CASE)
    private readonly finalizePreparedBatch: FinalizePreparedBatchUseCase,
  ) {}

  @Post('recipes/:recipeId/prepared-batches')
  @ApiOperation({ summary: 'Inicia una preparacion desde una receta' })
  @ApiParam({ name: 'recipeId', format: 'uuid' })
  @ApiCreatedResponse({ type: PreparedBatchResponseDto })
  @ApiBadRequestResponse({ description: 'La fecha o los datos son invalidos.' })
  @ApiConflictResponse({ description: 'La receta esta archivada.' })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar.' })
  @ApiNotFoundResponse({ description: 'La receta o un alimento no existe.' })
  async start(
    @Param('recipeId', new ParseUUIDPipe()) recipeId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: StartPreparedBatchRequestDto,
  ): Promise<PreparedBatchResponseDto> {
    try {
      const batch = await this.startPreparedBatch.execute({
        actorId: user.id,
        recipeId,
        preparedAt: body.preparedAt ? new Date(body.preparedAt) : undefined,
      });
      return toPreparedBatchResponse(batch);
    } catch (error) {
      rethrowPreparedBatchHttpError(error);
    }
  }

  @Get('prepared-batches/:batchId')
  @ApiOperation({ summary: 'Obtiene una preparacion' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedBatchResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la preparacion.' })
  @ApiNotFoundResponse({ description: 'La preparacion no existe.' })
  async get(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<PreparedBatchResponseDto> {
    try {
      return toPreparedBatchResponse(await this.getPreparedBatch.execute(user.id, batchId));
    } catch (error) {
      rethrowPreparedBatchHttpError(error);
    }
  }

  @Get('prepared-batches/:batchId/details')
  @ApiOperation({ summary: 'Obtiene el detalle operativo de una preparacion' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedBatchDetailsResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la preparacion.' })
  @ApiNotFoundResponse({ description: 'La preparacion no existe.' })
  async getDetails(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<PreparedBatchDetailsResponseDto> {
    try {
      return toPreparedBatchDetailsResponse(
        await this.getPreparedBatchDetails.execute(user.id, batchId),
      );
    } catch (error) {
      rethrowPreparedBatchHttpError(error);
    }
  }

  @Patch('prepared-batches/:batchId/ingredients')
  @ApiOperation({ summary: 'Edita los ingredientes reales de una preparacion' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedBatchResponseDto })
  @ApiBadRequestResponse({ description: 'Los ingredientes son invalidos.' })
  @ApiConflictResponse({ description: 'La preparacion ya no esta en borrador.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede editar la preparacion.' })
  @ApiNotFoundResponse({ description: 'La preparacion o un alimento no existe.' })
  async update(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdatePreparedBatchIngredientsRequestDto,
  ): Promise<PreparedBatchResponseDto> {
    try {
      return toPreparedBatchResponse(
        await this.updateIngredients.execute({
          actorId: user.id,
          batchId,
          ingredients: body.ingredients,
        }),
      );
    } catch (error) {
      rethrowPreparedBatchHttpError(error);
    }
  }

  @Delete('prepared-batches/:batchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancela una preparacion' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'La preparacion fue cancelada.' })
  @ApiConflictResponse({ description: 'La preparacion no puede cancelarse.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede cancelar la preparacion.' })
  @ApiNotFoundResponse({ description: 'La preparacion no existe.' })
  async cancel(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.cancelPreparedBatch.execute(user.id, batchId);
    } catch (error) {
      rethrowPreparedBatchHttpError(error);
    }
  }

  @Post('prepared-batches/:batchId/confirm-ingredients')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma ingredientes y crea snapshots nutricionales' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedBatchResponseDto })
  @ApiBadRequestResponse({ description: 'Los ingredientes o equivalencias son invalidos.' })
  @ApiConflictResponse({ description: 'La preparacion ya fue confirmada.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede confirmar la preparacion.' })
  @ApiNotFoundResponse({ description: 'La preparacion o un alimento no existe.' })
  async confirm(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<PreparedBatchResponseDto> {
    try {
      const result = await this.confirmIngredients.execute(user.id, batchId);
      return toPreparedBatchResponse(result.batch, result.warnings);
    } catch (error) {
      rethrowPreparedBatchHttpError(error);
    }
  }

  @Post('prepared-batches/:batchId/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finaliza una preparacion y calcula su densidad' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedBatchResponseDto })
  @ApiBadRequestResponse({ description: 'El peso cocido es invalido.' })
  @ApiConflictResponse({ description: 'La preparacion no puede finalizarse.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede finalizar la preparacion.' })
  @ApiNotFoundResponse({ description: 'La preparacion no existe.' })
  async finalize(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: FinalizePreparedBatchRequestDto,
  ): Promise<PreparedBatchResponseDto> {
    try {
      return toPreparedBatchResponse(
        await this.finalizePreparedBatch.execute({
          actorId: user.id,
          batchId,
          finalCookedWeight: body.finalCookedWeight,
        }),
      );
    } catch (error) {
      rethrowPreparedBatchHttpError(error);
    }
  }
}
