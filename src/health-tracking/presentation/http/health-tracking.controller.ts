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
  CORRECT_DIGESTIVE_SYMPTOM_USE_CASE,
  CorrectDigestiveSymptomUseCase,
  GET_DIGESTIVE_SYMPTOM_QUERY,
  GET_RECENT_MEALS_FOR_SYMPTOM_LINK_QUERY,
  GetDigestiveSymptomQuery,
  GetRecentMealsForSymptomLinkQuery,
  LIST_DIGESTIVE_SYMPTOMS_QUERY,
  ListDigestiveSymptomsQuery,
  REGISTER_DIGESTIVE_SYMPTOM_USE_CASE,
  RegisterDigestiveSymptomUseCase,
  RESOLVE_DIGESTIVE_SYMPTOM_USE_CASE,
  ResolveDigestiveSymptomUseCase,
} from '../../application/use-cases/digestive-symptom.use-cases';
import {
  GET_BODY_PROGRESS_QUERY,
  GET_DIGESTIVE_SYMPTOM_INSIGHTS_QUERY,
  GetBodyProgressQuery,
  GetDigestiveSymptomInsightsQuery,
} from '../../application/use-cases/health-tracking-analysis.use-cases';
import {
  BodyMeasurementBatchRequestDto,
  BodyMeasurementQueryDto,
  BodyMeasurementRequestDto,
  BodyWeightQueryDto,
  BodyWeightRequestDto,
  HealthTrackingListResponseDto,
  HealthTrackingResponseDto,
  MeasurementConfigurationRequestDto,
  DigestiveSymptomRequestDto,
  DigestiveSymptomQueryDto,
  DigestiveSymptomResponseDto,
  DigestiveSymptomListResponseDto,
  RecentMealsForSymptomQueryDto,
  BodyProgressQueryDto,
  DigestiveSymptomInsightsQueryDto,
  BodyProgressResponseDto,
  DigestiveSymptomInsightsResponseDto,
} from './dto/health-tracking.dto';
import {
  rethrowHealthTrackingHttpError,
  toConfigurationResponse,
  toHealthResponse,
  toDigestiveSymptomResponse,
  toBodyProgressResponse,
  toDigestiveSymptomInsightsResponse,
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
    @Inject(REGISTER_DIGESTIVE_SYMPTOM_USE_CASE)
    private readonly registerSymptom: RegisterDigestiveSymptomUseCase,
    @Inject(RESOLVE_DIGESTIVE_SYMPTOM_USE_CASE)
    private readonly resolveSymptom: ResolveDigestiveSymptomUseCase,
    @Inject(CORRECT_DIGESTIVE_SYMPTOM_USE_CASE)
    private readonly correctSymptom: CorrectDigestiveSymptomUseCase,
    @Inject(GET_DIGESTIVE_SYMPTOM_QUERY) private readonly getSymptom: GetDigestiveSymptomQuery,
    @Inject(LIST_DIGESTIVE_SYMPTOMS_QUERY)
    private readonly listSymptoms: ListDigestiveSymptomsQuery,
    @Inject(GET_RECENT_MEALS_FOR_SYMPTOM_LINK_QUERY)
    private readonly recentMeals: GetRecentMealsForSymptomLinkQuery,
    @Inject(GET_BODY_PROGRESS_QUERY) private readonly bodyProgress: GetBodyProgressQuery,
    @Inject(GET_DIGESTIVE_SYMPTOM_INSIGHTS_QUERY)
    private readonly symptomInsights: GetDigestiveSymptomInsightsQuery,
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

  @Post('adult-profiles/:adultProfileId/digestive-symptoms')
  @ApiCreatedResponse({ type: DigestiveSymptomResponseDto })
  async registerDigestiveSymptom(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: DigestiveSymptomRequestDto,
  ) {
    try {
      return toDigestiveSymptomResponse(
        await this.registerSymptom.execute({ actorId: user.id, adultProfileId, ...body }),
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('adult-profiles/:adultProfileId/digestive-symptoms')
  @ApiOkResponse({ type: DigestiveSymptomListResponseDto })
  async listDigestiveSymptoms(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: DigestiveSymptomQueryDto,
  ) {
    try {
      const result = await this.listSymptoms.execute({
        actorId: user.id,
        adultProfileId,
        ...query,
      });
      return { ...result, items: result.items.map(toDigestiveSymptomResponse) };
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('digestive-symptoms/:symptomId')
  @ApiOkResponse({ type: DigestiveSymptomResponseDto })
  async getDigestiveSymptom(
    @Param('symptomId') symptomId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return toDigestiveSymptomResponse(await this.getSymptom.execute(user.id, symptomId));
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Post('digestive-symptoms/:symptomId/resolve')
  @ApiOkResponse({ type: DigestiveSymptomResponseDto })
  async resolveDigestiveSymptom(
    @Param('symptomId') symptomId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return toDigestiveSymptomResponse(await this.resolveSymptom.execute(user.id, symptomId));
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Post('digestive-symptoms/:symptomId/corrections')
  @ApiCreatedResponse({ type: DigestiveSymptomResponseDto })
  async correctDigestiveSymptom(
    @Param('symptomId') symptomId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: DigestiveSymptomRequestDto,
  ) {
    try {
      return toDigestiveSymptomResponse(
        await this.correctSymptom.execute({ actorId: user.id, symptomId, ...body }),
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('adult-profiles/:adultProfileId/recent-meals-for-symptoms')
  @ApiOkResponse()
  async recentMealsForSymptoms(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: RecentMealsForSymptomQueryDto,
  ) {
    try {
      return await this.recentMeals.execute({ actorId: user.id, adultProfileId, ...query });
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('adult-profiles/:adultProfileId/body-progress')
  @ApiOperation({ summary: 'Calcula progreso corporal descriptivo' })
  @ApiOkResponse({ type: BodyProgressResponseDto })
  async getBodyProgress(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: BodyProgressQueryDto,
  ) {
    try {
      return toBodyProgressResponse(
        await this.bodyProgress.execute({ actorId: user.id, adultProfileId, ...query }),
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }

  @Get('adult-profiles/:adultProfileId/digestive-symptom-insights')
  @ApiOperation({ summary: 'Muestra patrones descriptivos de síntomas digestivos' })
  @ApiOkResponse({ type: DigestiveSymptomInsightsResponseDto })
  async getDigestiveSymptomInsights(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: DigestiveSymptomInsightsQueryDto,
  ) {
    try {
      return toDigestiveSymptomInsightsResponse(
        await this.symptomInsights.execute({ actorId: user.id, adultProfileId, ...query }),
      );
    } catch (e) {
      rethrowHealthTrackingHttpError(e);
    }
  }
}
