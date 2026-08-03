import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from '../../../identity/presentation/http/jwt-auth.guard';
import {
  CREATE_ADULT_PROFILE_USE_CASE,
  CreateAdultProfileUseCase,
} from '../../application/adult-profile-use-cases/create-adult-profile.use-case';
import {
  GET_ADULT_PROFILE_USE_CASE,
  GetAdultProfileUseCase,
} from '../../application/adult-profile-use-cases/get-adult-profile.use-case';
import {
  LIST_ADULT_PROFILES_USE_CASE,
  ListAdultProfilesUseCase,
} from '../../application/adult-profile-use-cases/list-adult-profiles.use-case';
import {
  UPDATE_ADULT_PROFILE_USE_CASE,
  UpdateAdultProfileUseCase,
} from '../../application/adult-profile-use-cases/update-adult-profile.use-case';
import { AdultProfileResponseDto } from './adult-profile-dto/adult-profile-response.dto';
import { CreateAdultProfileRequestDto } from './adult-profile-dto/create-adult-profile-request.dto';
import { UpdateAdultProfileRequestDto } from './adult-profile-dto/update-adult-profile-request.dto';
import { AdultProfileHttpMapper } from './adult-profile-http.mapper';
import { rethrowHouseholdHttpError } from './household-http-error.mapper';

@ApiTags('adult-profiles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token.',
})
@Controller()
@UseGuards(JwtAuthGuard)
export class AdultProfilesController {
  constructor(
    @Inject(CREATE_ADULT_PROFILE_USE_CASE)
    private readonly createAdultProfile: CreateAdultProfileUseCase,
    @Inject(LIST_ADULT_PROFILES_USE_CASE)
    private readonly listAdultProfiles: ListAdultProfilesUseCase,
    @Inject(GET_ADULT_PROFILE_USE_CASE)
    private readonly getAdultProfile: GetAdultProfileUseCase,
    @Inject(UPDATE_ADULT_PROFILE_USE_CASE)
    private readonly updateAdultProfile: UpdateAdultProfileUseCase,
  ) {}

  @Post('households/:householdId/adult-profiles')
  @ApiOperation({ summary: 'Crea el perfil adulto del usuario autenticado' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiCreatedResponse({ type: AdultProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Los datos del perfil son inválidos.' })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar.' })
  @ApiConflictResponse({
    description: 'El usuario ya tiene un perfil activo en el hogar.',
  })
  async create(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreateAdultProfileRequestDto,
  ): Promise<AdultProfileResponseDto> {
    try {
      const profile = await this.createAdultProfile.execute({
        actorId: user.id,
        householdId,
        name: body.name,
        birthDate: body.birthDate,
        biologicalSex: body.biologicalSex,
        weightKg: body.weightKg,
        heightCm: body.heightCm,
        activityLevel: body.activityLevel,
        primaryGoal: body.primaryGoal,
        hasKitchenScale: body.hasKitchenScale,
        dietaryRestrictions: body.dietaryRestrictions ?? [],
      });

      return AdultProfileHttpMapper.toResponse(profile);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Get('households/:householdId/adult-profiles')
  @ApiOperation({ summary: 'Lista los perfiles adultos activos del hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: AdultProfileResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar.' })
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<AdultProfileResponseDto[]> {
    try {
      const profiles = await this.listAdultProfiles.execute(user.id, householdId);

      return AdultProfileHttpMapper.toResponseList(profiles);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Get('adult-profiles/:profileId')
  @ApiOperation({ summary: 'Obtiene el detalle de un perfil adulto accesible' })
  @ApiParam({ name: 'profileId', format: 'uuid' })
  @ApiOkResponse({ type: AdultProfileResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar.' })
  @ApiNotFoundResponse({ description: 'El perfil no existe.' })
  async get(
    @Param('profileId') profileId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<AdultProfileResponseDto> {
    try {
      const profile = await this.getAdultProfile.execute(user.id, profileId);

      return AdultProfileHttpMapper.toResponse(profile);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Patch('adult-profiles/:profileId')
  @ApiOperation({ summary: 'Actualiza un perfil propio o administrado' })
  @ApiParam({ name: 'profileId', format: 'uuid' })
  @ApiOkResponse({ type: AdultProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Los datos del perfil son inválidos.' })
  @ApiForbiddenResponse({
    description: 'Solo el propietario o un administrador pueden editar.',
  })
  @ApiNotFoundResponse({ description: 'El perfil no existe.' })
  async update(
    @Param('profileId') profileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdateAdultProfileRequestDto,
  ): Promise<AdultProfileResponseDto> {
    try {
      const profile = await this.updateAdultProfile.execute({
        actorId: user.id,
        profileId,
        name: body.name,
        birthDate: body.birthDate,
        biologicalSex: body.biologicalSex,
        weightKg: body.weightKg,
        heightCm: body.heightCm,
        activityLevel: body.activityLevel,
        primaryGoal: body.primaryGoal,
        hasKitchenScale: body.hasKitchenScale,
        dietaryRestrictions: body.dietaryRestrictions,
      });

      return AdultProfileHttpMapper.toResponse(profile);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }
}
