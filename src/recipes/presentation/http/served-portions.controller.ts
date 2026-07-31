import { Body, Controller, Inject, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {
  SERVE_PREPARED_BATCH_PORTIONS_USE_CASE,
  ServePreparedBatchPortionsUseCase,
} from '../../application/use-cases/serve-prepared-batch-portions.use-case';
import {
  CONFIRM_SERVED_PORTION_CONSUMPTION_USE_CASE,
  ConfirmServedPortionConsumptionUseCase,
} from '../../application/use-cases/confirm-served-portion-consumption.use-case';
import { ServePreparedBatchPortionsRequestDto } from './dto/served-portion-request.dto';
import { ServePreparedBatchPortionsResponseDto } from './dto/served-portion-response.dto';
import { ConfirmServedPortionConsumptionRequestDto } from './dto/served-portion-consumption-request.dto';
import { ConfirmServedPortionConsumptionResponseDto } from './dto/served-portion-consumption-response.dto';
import {
  rethrowServedPortionHttpError,
  toServedPortionsResponse,
} from './served-portion-http.mapper';

@ApiTags('served-portions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(SupabaseAuthGuard)
export class ServedPortionsController {
  constructor(
    @Inject(SERVE_PREPARED_BATCH_PORTIONS_USE_CASE)
    private readonly servePortions: ServePreparedBatchPortionsUseCase,
    @Inject(CONFIRM_SERVED_PORTION_CONSUMPTION_USE_CASE)
    private readonly confirmConsumption: ConfirmServedPortionConsumptionUseCase,
  ) {}

  @Post('prepared-batches/:batchId/served-portions')
  @ApiOperation({ summary: 'Asigna porciones de una preparacion a adultos' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiCreatedResponse({ type: ServePreparedBatchPortionsResponseDto })
  @ApiBadRequestResponse({ description: 'Las porciones o la fecha son invalidas.' })
  @ApiConflictResponse({ description: 'La preparacion no tiene disponibilidad suficiente.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la preparacion.' })
  @ApiNotFoundResponse({ description: 'La preparacion o el perfil adulto no existe.' })
  async create(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: ServePreparedBatchPortionsRequestDto,
  ): Promise<ServePreparedBatchPortionsResponseDto> {
    try {
      return toServedPortionsResponse(
        await this.servePortions.execute({
          actorId: user.id,
          batchId,
          servedAt: body.servedAt ? new Date(body.servedAt) : undefined,
          portions: body.portions,
        }),
      );
    } catch (error) {
      rethrowServedPortionHttpError(error);
    }
  }

  @Post('served-portions/:portionId/confirm-consumption')
  @ApiOperation({ summary: 'Confirma el consumo real de una porcion' })
  @ApiParam({ name: 'portionId', format: 'uuid' })
  @ApiCreatedResponse({ type: ConfirmServedPortionConsumptionResponseDto })
  @ApiBadRequestResponse({ description: 'El resto, tipo de comida o fecha son invalidos.' })
  @ApiConflictResponse({ description: 'La porcion ya fue confirmada o no esta disponible.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la porcion.' })
  @ApiNotFoundResponse({ description: 'La porcion o la preparacion no existe.' })
  async confirm(
    @Param('portionId', new ParseUUIDPipe()) portionId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: ConfirmServedPortionConsumptionRequestDto,
  ): Promise<ConfirmServedPortionConsumptionResponseDto> {
    try {
      const result = await this.confirmConsumption.execute({
        actorId: user.id,
        portionId,
        remainderWeight: body.remainderWeight,
        remainderDisposition: body.remainderDisposition,
        mealType: body.mealType,
        consumedAt: new Date(body.consumedAt),
      });
      return {
        portionId: result.portionId,
        adultProfileId: result.adultProfileId,
        servedWeight: result.servedWeight.toDecimalPlaces(2).toNumber(),
        consumedWeight: result.consumedWeight.toDecimalPlaces(2).toNumber(),
        remainderWeight: result.remainderWeight?.toDecimalPlaces(2).toNumber() ?? null,
        remainderDisposition: result.remainderDisposition,
        mealId: result.mealId,
        nutrients: Object.fromEntries(
          result.nutrients.map((nutrient) => [
            nutrient.code,
            nutrient.amount.toDecimalPlaces(4).toNumber(),
          ]),
        ),
      };
    } catch (error) {
      rethrowServedPortionHttpError(error);
    }
  }
}
