import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {
  CREATE_HOUSEHOLD_USE_CASE,
  CreateHouseholdUseCase,
} from '../../application/use-cases/create-household.use-case';
import {
  GET_HOUSEHOLD_USE_CASE,
  GetHouseholdUseCase,
} from '../../application/use-cases/get-household.use-case';
import {
  LIST_HOUSEHOLDS_USE_CASE,
  ListHouseholdsUseCase,
} from '../../application/use-cases/list-households.use-case';
import {
  UPDATE_HOUSEHOLD_USE_CASE,
  UpdateHouseholdUseCase,
} from '../../application/use-cases/update-household.use-case';
import { CreateHouseholdRequestDto } from './dto/create-household-request.dto';
import { HouseholdResponseDto } from './dto/household-response.dto';
import { UpdateHouseholdRequestDto } from './dto/update-household-request.dto';
import { HouseholdHttpMapper } from './household-http.mapper';
import { rethrowHouseholdHttpError } from './household-http-error.mapper';

@ApiTags('households')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token.',
})
@Controller('households')
@UseGuards(SupabaseAuthGuard)
export class HouseholdsController {
  constructor(
    @Inject(CREATE_HOUSEHOLD_USE_CASE)
    private readonly createHousehold: CreateHouseholdUseCase,
    @Inject(LIST_HOUSEHOLDS_USE_CASE)
    private readonly listHouseholds: ListHouseholdsUseCase,
    @Inject(GET_HOUSEHOLD_USE_CASE)
    private readonly getHousehold: GetHouseholdUseCase,
    @Inject(UPDATE_HOUSEHOLD_USE_CASE)
    private readonly updateHousehold: UpdateHouseholdUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crea un hogar y asigna al creador como administrador',
  })
  @ApiCreatedResponse({ type: HouseholdResponseDto })
  async create(
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreateHouseholdRequestDto,
  ): Promise<HouseholdResponseDto> {
    try {
      const household = await this.createHousehold.execute({
        actorId: user.id,
        name: body.name,
        timezone: body.timezone,
        currency: body.currency,
      });

      return HouseholdHttpMapper.toResponse(household);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Lista los hogares activos del usuario autenticado',
  })
  @ApiOkResponse({ type: HouseholdResponseDto, isArray: true })
  async list(
    @CurrentUser() user: CurrentUserModel,
  ): Promise<HouseholdResponseDto[]> {
    try {
      const households = await this.listHouseholds.execute(user.id);

      return HouseholdHttpMapper.toResponseList(households);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Get(':householdId')
  @ApiOperation({ summary: 'Obtiene el detalle de un hogar accesible' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: HouseholdResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no es integrante activo.' })
  @ApiNotFoundResponse({ description: 'El hogar no existe.' })
  async get(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<HouseholdResponseDto> {
    try {
      const household = await this.getHousehold.execute({
        actorId: user.id,
        householdId,
      });

      return HouseholdHttpMapper.toResponse(household);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Patch(':householdId')
  @ApiOperation({ summary: 'Actualiza el nombre de un hogar administrado' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: HouseholdResponseDto })
  @ApiForbiddenResponse({
    description: 'Solo los administradores pueden editar.',
  })
  @ApiNotFoundResponse({ description: 'El hogar no existe.' })
  async update(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdateHouseholdRequestDto,
  ): Promise<HouseholdResponseDto> {
    try {
      const household = await this.updateHousehold.execute({
        actorId: user.id,
        householdId,
        name: body.name,
      });

      return HouseholdHttpMapper.toResponse(household);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }
}
