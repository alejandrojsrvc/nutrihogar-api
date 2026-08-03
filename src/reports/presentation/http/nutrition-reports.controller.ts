import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
  GET_DAILY_NUTRITION_REPORT_QUERY,
  GET_WEEKLY_NUTRITION_REPORT_QUERY,
  GetDailyNutritionReportQuery,
  GetWeeklyNutritionReportQuery,
} from '../../application/use-cases/get-nutrition-reports.query';
import {
  NutritionReportQueryDto,
  NutritionReportResponseDto,
  WeeklyNutritionReportQueryDto,
  WeeklyNutritionReportResponseDto,
} from './dto/nutrition-report.dto';
import {
  toDailyNutritionReportResponse,
  toWeeklyNutritionReportResponse,
} from './nutrition-reports-http.mapper';

@ApiTags('nutrition-reports')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller('adult-profiles/:adultProfileId/reports/nutrition')
@UseGuards(JwtAuthGuard)
export class NutritionReportsController {
  constructor(
    @Inject(GET_DAILY_NUTRITION_REPORT_QUERY) private readonly daily: GetDailyNutritionReportQuery,
    @Inject(GET_WEEKLY_NUTRITION_REPORT_QUERY)
    private readonly weekly: GetWeeklyNutritionReportQuery,
  ) {}

  @Get('daily')
  @ApiOperation({ summary: 'Obtiene el reporte nutricional diario' })
  @ApiParam({ name: 'adultProfileId', format: 'uuid' })
  @ApiOkResponse({ type: NutritionReportResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async getDaily(
    @Param('adultProfileId') adultProfileId: string,
    @Query() query: NutritionReportQueryDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return toDailyNutritionReportResponse(
      await this.daily.execute({
        actorId: user.id,
        adultProfileId,
        date: query.date,
        timezone: query.timezone,
      }),
    );
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Obtiene el reporte nutricional semanal' })
  @ApiParam({ name: 'adultProfileId', format: 'uuid' })
  @ApiOkResponse({ type: WeeklyNutritionReportResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async getWeekly(
    @Param('adultProfileId') adultProfileId: string,
    @Query() query: WeeklyNutritionReportQueryDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return toWeeklyNutritionReportResponse(
      await this.weekly.execute({
        actorId: user.id,
        adultProfileId,
        weekStart: query.weekStart,
        timezone: query.timezone,
        targetRange:
          query.targetMin && query.targetMax
            ? { min: Number(query.targetMin), max: Number(query.targetMax) }
            : undefined,
      }),
    );
  }
}
