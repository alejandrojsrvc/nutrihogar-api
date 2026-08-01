import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {} from '../../application/ports/measurement-configuration-repository.port';
import {
  CORRECT_BODY_MEASUREMENT_USE_CASE,
  CORRECT_BODY_WEIGHT_USE_CASE,
  CorrectBodyMeasurementUseCase,
  CorrectBodyWeightUseCase,
  GET_BODY_WEIGHT_ENTRY_QUERY,
  GET_LATEST_BODY_WEIGHT_QUERY,
  GET_MEASUREMENT_CONFIGURATION_QUERY,
  GetBodyWeightEntryQuery,
  GetLatestBodyWeightQuery,
  GetMeasurementConfigurationQuery,
  LIST_BODY_MEASUREMENTS_QUERY,
  LIST_BODY_WEIGHT_ENTRIES_QUERY,
  ListBodyMeasurementsQuery,
  ListBodyWeightEntriesQuery,
  REGISTER_BODY_MEASUREMENT_USE_CASE,
  REGISTER_BODY_WEIGHT_USE_CASE,
  RegisterBodyMeasurementUseCase,
  RegisterBodyWeightUseCase,
  UPDATE_MEASUREMENT_CONFIGURATION_USE_CASE,
  UpdateMeasurementConfigurationUseCase,
} from '../../application/use-cases/health-tracking.use-cases';
import {
  BodyMeasurementBatchRequestDto,
  BodyMeasurementQueryDto,
  BodyMeasurementRequestDto,
  BodyWeightQueryDto,
  BodyWeightRequestDto,
  HealthTrackingListResponseDto,
  HealthTrackingResponseDto,
  MeasurementConfigurationRequestDto,
} from './dto/health-tracking.dto';
import {
  rethrowHealthTrackingHttpError,
  toConfigurationResponse,
  toHealthResponse,
} from './health-tracking-http.mapper';

@ApiTags('health-tracking')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(SupabaseAuthGuard)
export class HealthTrackingController {
  constructor(
    @Inject(REGISTER_BODY_WEIGHT_USE_CASE)
    private readonly registerWeight: RegisterBodyWeightUseCase,
    @Inject(CORRECT_BODY_WEIGHT_USE_CASE) private readonly correctWeight: CorrectBodyWeightUseCase,
    @Inject(GET_BODY_WEIGHT_ENTRY_QUERY) private readonly getWeight: GetBodyWeightEntryQuery,
    @Inject(LIST_BODY_WEIGHT_ENTRIES_QUERY) private readonly listWeight: ListBodyWeightEntriesQuery,
    @Inject(GET_LATEST_BODY_WEIGHT_QUERY) private readonly latestWeight: GetLatestBodyWeightQuery,
    @Inject(GET_MEASUREMENT_CONFIGURATION_QUERY)
    private readonly getConfiguration: GetMeasurementConfigurationQuery,
    @Inject(UPDATE_MEASUREMENT_CONFIGURATION_USE_CASE)
    private readonly updateConfiguration: UpdateMeasurementConfigurationUseCase,
    @Inject(REGISTER_BODY_MEASUREMENT_USE_CASE)
    private readonly registerMeasurement: RegisterBodyMeasurementUseCase,
    @Inject(CORRECT_BODY_MEASUREMENT_USE_CASE)
    private readonly correctMeasurement: CorrectBodyMeasurementUseCase,
    @Inject(LIST_BODY_MEASUREMENTS_QUERY)
    private readonly listMeasurement: ListBodyMeasurementsQuery,
  ) {}

  @Post('adult-profiles/:adultProfileId/body-weight')
  @ApiOperation({ summary: 'Registra el peso corporal' })
  @ApiCreatedResponse({ type: HealthTrackingResponseDto })
  @ApiForbiddenResponse()
  async registerBodyWeight(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: BodyWeightRequestDto,
  ) {
    try {
      return toHealthResponse(
        await this.registerWeight.execute({ actorId: user.id, adultProfileId, ...body }),
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('adult-profiles/:adultProfileId/body-weight')
  @ApiOkResponse({ type: HealthTrackingListResponseDto })
  async listBodyWeight(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: BodyWeightQueryDto,
  ) {
    try {
      const result = await this.listWeight.execute({ actorId: user.id, adultProfileId, ...query });
      return { ...result, items: result.items.map(toHealthResponse) };
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('body-weight/:entryId')
  @ApiOkResponse({ type: HealthTrackingResponseDto })
  async getBodyWeight(@Param('entryId') entryId: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return toHealthResponse(await this.getWeight.execute(user.id, entryId));
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Post('body-weight/:entryId/corrections')
  @ApiCreatedResponse({ type: HealthTrackingResponseDto })
  async correctBodyWeight(
    @Param('entryId') entryId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: BodyWeightRequestDto,
  ) {
    try {
      return toHealthResponse(
        await this.correctWeight.execute({ actorId: user.id, entryId, ...body }),
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('adult-profiles/:adultProfileId/body-weight/latest')
  @ApiOkResponse({ type: HealthTrackingResponseDto })
  async latestBodyWeight(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      const entry = await this.latestWeight.execute(user.id, adultProfileId);
      return entry ? toHealthResponse(entry) : null;
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('adult-profiles/:adultProfileId/measurement-configuration')
  @ApiOkResponse()
  async getMeasurementConfiguration(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return toConfigurationResponse(await this.getConfiguration.execute(user.id, adultProfileId));
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Put('adult-profiles/:adultProfileId/measurement-configuration')
  @ApiOkResponse()
  async updateMeasurementConfiguration(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: MeasurementConfigurationRequestDto,
  ) {
    try {
      return toConfigurationResponse(
        await this.updateConfiguration.execute(user.id, adultProfileId, body),
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Post('adult-profiles/:adultProfileId/body-measurements')
  @ApiCreatedResponse({ type: HealthTrackingResponseDto, isArray: true })
  async registerBodyMeasurements(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: BodyMeasurementBatchRequestDto | BodyMeasurementRequestDto,
  ) {
    try {
      const batch = 'measurements' in body ? body.measurements : [body];
      const enable = 'measurements' in body ? body.enable : undefined;
      return (await this.registerMeasurement.execute(user.id, adultProfileId, batch, enable)).map(
        toHealthResponse,
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('adult-profiles/:adultProfileId/body-measurements')
  @ApiOkResponse({ type: HealthTrackingListResponseDto })
  async listBodyMeasurements(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: BodyMeasurementQueryDto,
  ) {
    try {
      const result = await this.listMeasurement.execute({
        actorId: user.id,
        adultProfileId,
        ...query,
      });
      return { ...result, items: result.items.map(toHealthResponse) };
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Post('body-measurements/:entryId/corrections')
  @ApiCreatedResponse({ type: HealthTrackingResponseDto })
  async correctBodyMeasurement(
    @Param('entryId') entryId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: BodyMeasurementRequestDto,
  ) {
    try {
      return toHealthResponse(
        await this.correctMeasurement.execute({ actorId: user.id, entryId, ...body }),
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }
}
