import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import { JwtAuthGuard } from '../../../identity/presentation/http/jwt-auth.guard';
import {
  GET_PREPARED_FOOD_LEFTOVER_USE_CASE,
  GetPreparedFoodLeftoverUseCase,
} from '../../application/use-cases/get-prepared-food-leftover.use-case';
import {
  LIST_PREPARED_FOOD_LEFTOVERS_USE_CASE,
  ListPreparedFoodLeftoversUseCase,
} from '../../application/use-cases/list-prepared-food-leftovers.use-case';
import {
  REGISTER_PREPARED_FOOD_LEFTOVER_USE_CASE,
  RegisterPreparedFoodLeftoverUseCase,
} from '../../application/use-cases/register-prepared-food-leftover.use-case';
import {
  UPDATE_PREPARED_FOOD_LEFTOVER_STATUS_USE_CASE,
  UpdatePreparedFoodLeftoverStatusUseCase,
} from '../../application/use-cases/update-prepared-food-leftover-status.use-case';
import {
  ListPreparedFoodLeftoversQueryDto,
  RegisterPreparedFoodLeftoverRequestDto,
  UpdatePreparedFoodLeftoverStatusRequestDto,
} from './dto/prepared-food-leftover-request.dto';
import { PreparedFoodLeftoverResponseDto } from './dto/prepared-food-leftover-response.dto';
import {
  rethrowPreparedFoodLeftoverHttpError,
  toPreparedFoodLeftoverResponse,
} from './prepared-food-leftover-http.mapper';

@ApiTags('prepared-food-leftovers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(JwtAuthGuard)
export class PreparedFoodLeftoversController {
  constructor(
    @Inject(REGISTER_PREPARED_FOOD_LEFTOVER_USE_CASE)
    private readonly registerLeftover: RegisterPreparedFoodLeftoverUseCase,
    @Inject(LIST_PREPARED_FOOD_LEFTOVERS_USE_CASE)
    private readonly listLeftovers: ListPreparedFoodLeftoversUseCase,
    @Inject(GET_PREPARED_FOOD_LEFTOVER_USE_CASE)
    private readonly getLeftover: GetPreparedFoodLeftoverUseCase,
    @Inject(UPDATE_PREPARED_FOOD_LEFTOVER_STATUS_USE_CASE)
    private readonly updateStatus: UpdatePreparedFoodLeftoverStatusUseCase,
  ) {}

  @Post('prepared-batches/:batchId/leftovers')
  @ApiOperation({ summary: 'Registra un sobrante disponible de una preparacion' })
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiCreatedResponse({ type: PreparedFoodLeftoverResponseDto })
  @ApiBadRequestResponse({ description: 'El peso o la fecha son invalidos.' })
  @ApiConflictResponse({ description: 'La preparacion no tiene disponibilidad suficiente.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la preparacion.' })
  @ApiNotFoundResponse({ description: 'La preparacion no existe.' })
  async create(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: RegisterPreparedFoodLeftoverRequestDto,
  ): Promise<PreparedFoodLeftoverResponseDto> {
    try {
      return toPreparedFoodLeftoverResponse(
        await this.registerLeftover.execute({
          actorId: user.id,
          batchId,
          availableWeight: body.weight,
          storedAt: new Date(body.storedAt),
          storageLocation: body.storageLocation,
          notes: body.notes,
        }),
      );
    } catch (error) {
      rethrowPreparedFoodLeftoverHttpError(error);
    }
  }

  @Get('households/:householdId/prepared-leftovers')
  @ApiOperation({ summary: 'Consulta los sobrantes preparados de un hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedFoodLeftoverResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar.' })
  async list(
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: ListPreparedFoodLeftoversQueryDto,
  ): Promise<PreparedFoodLeftoverResponseDto[]> {
    try {
      const leftovers = await this.listLeftovers.execute({
        actorId: user.id,
        householdId,
        status: query.status,
      });
      return leftovers.map(toPreparedFoodLeftoverResponse);
    } catch (error) {
      rethrowPreparedFoodLeftoverHttpError(error);
    }
  }

  @Get('prepared-leftovers/:leftoverId')
  @ApiOperation({ summary: 'Obtiene un sobrante preparado' })
  @ApiParam({ name: 'leftoverId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedFoodLeftoverResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al sobrante.' })
  @ApiNotFoundResponse({ description: 'El sobrante no existe.' })
  async get(
    @Param('leftoverId', new ParseUUIDPipe()) leftoverId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<PreparedFoodLeftoverResponseDto> {
    try {
      return toPreparedFoodLeftoverResponse(await this.getLeftover.execute(user.id, leftoverId));
    } catch (error) {
      rethrowPreparedFoodLeftoverHttpError(error);
    }
  }

  @Patch('prepared-leftovers/:leftoverId/status')
  @ApiOperation({ summary: 'Actualiza el estado de un sobrante preparado' })
  @ApiParam({ name: 'leftoverId', format: 'uuid' })
  @ApiOkResponse({ type: PreparedFoodLeftoverResponseDto })
  @ApiBadRequestResponse({ description: 'El estado es invalido.' })
  @ApiConflictResponse({ description: 'El sobrante ya fue cerrado.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al sobrante.' })
  @ApiNotFoundResponse({ description: 'El sobrante no existe.' })
  async changeStatus(
    @Param('leftoverId', new ParseUUIDPipe()) leftoverId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdatePreparedFoodLeftoverStatusRequestDto,
  ): Promise<PreparedFoodLeftoverResponseDto> {
    try {
      return toPreparedFoodLeftoverResponse(
        await this.updateStatus.execute({
          actorId: user.id,
          leftoverId,
          status: body.status,
        }),
      );
    } catch (error) {
      rethrowPreparedFoodLeftoverHttpError(error);
    }
  }
}
