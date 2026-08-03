import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { JwtAuthGuard } from '../../../identity/presentation/http/jwt-auth.guard';
import { ExportQueryDto } from './dto/export-query.dto';
import {
  EXPORT_BODY_TRACKING_CSV_USE_CASE,
  EXPORT_DIGESTIVE_SYMPTOMS_CSV_USE_CASE,
  EXPORT_INVENTORY_MOVEMENTS_CSV_USE_CASE,
  EXPORT_NUTRITION_REPORT_CSV_USE_CASE,
  EXPORT_PURCHASES_CSV_USE_CASE,
  ExportBodyTrackingCsvUseCase,
  ExportDigestiveSymptomsCsvUseCase,
  ExportInventoryMovementsCsvUseCase,
  ExportNutritionReportCsvUseCase,
  ExportPurchasesCsvUseCase,
} from '../../application/use-cases/export-csv.use-cases';
import {
  ExportAccessDeniedError,
  InvalidExportQueryError,
} from '../../application/errors/export.errors';

@ApiTags('exports')
@ApiBearerAuth()
@ApiProduces('text/csv; charset=utf-8')
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@ApiBadRequestResponse({ description: 'Invalid date range, timezone or locale.' })
@Controller()
@UseGuards(JwtAuthGuard)
export class ExportsController {
  constructor(
    @Inject(EXPORT_BODY_TRACKING_CSV_USE_CASE)
    private readonly bodyTracking: ExportBodyTrackingCsvUseCase,
    @Inject(EXPORT_NUTRITION_REPORT_CSV_USE_CASE)
    private readonly nutrition: ExportNutritionReportCsvUseCase,
    @Inject(EXPORT_DIGESTIVE_SYMPTOMS_CSV_USE_CASE)
    private readonly symptoms: ExportDigestiveSymptomsCsvUseCase,
    @Inject(EXPORT_INVENTORY_MOVEMENTS_CSV_USE_CASE)
    private readonly inventory: ExportInventoryMovementsCsvUseCase,
    @Inject(EXPORT_PURCHASES_CSV_USE_CASE) private readonly purchases: ExportPurchasesCsvUseCase,
  ) {}

  @Get('adult-profiles/:adultProfileId/exports/body-tracking.csv')
  @ApiOperation({ summary: 'Exporta seguimiento corporal en CSV' })
  @ApiParam({ name: 'adultProfileId', format: 'uuid' })
  @ApiForbiddenResponse()
  async body(
    @Param('adultProfileId') profileId: string,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: CurrentUserModel,
    @Res() response: Response,
  ) {
    return this.send(response, 'body-tracking.csv', () =>
      this.bodyTracking.execute({ actorId: user.id, profileId, query }),
    );
  }

  @Get('adult-profiles/:adultProfileId/exports/nutrition.csv')
  @ApiOperation({ summary: 'Exporta nutrientes de comidas en CSV' })
  @ApiParam({ name: 'adultProfileId', format: 'uuid' })
  @ApiForbiddenResponse()
  async nutritionCsv(
    @Param('adultProfileId') profileId: string,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: CurrentUserModel,
    @Res() response: Response,
  ) {
    return this.send(response, 'nutrition.csv', () =>
      this.nutrition.execute({ actorId: user.id, profileId, query }),
    );
  }

  @Get('adult-profiles/:adultProfileId/exports/digestive-symptoms.csv')
  @ApiOperation({ summary: 'Exporta síntomas digestivos en CSV' })
  @ApiParam({ name: 'adultProfileId', format: 'uuid' })
  @ApiForbiddenResponse()
  async digestiveSymptoms(
    @Param('adultProfileId') profileId: string,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: CurrentUserModel,
    @Res() response: Response,
  ) {
    return this.send(response, 'digestive-symptoms.csv', () =>
      this.symptoms.execute({ actorId: user.id, profileId, query }),
    );
  }

  @Get('households/:householdId/exports/inventory-movements.csv')
  @ApiOperation({ summary: 'Exporta movimientos de inventario en CSV' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiForbiddenResponse()
  async inventoryCsv(
    @Param('householdId') householdId: string,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: CurrentUserModel,
    @Res() response: Response,
  ) {
    return this.send(response, 'inventory-movements.csv', () =>
      this.inventory.execute({ actorId: user.id, householdId, query }),
    );
  }

  @Get('households/:householdId/exports/purchases.csv')
  @ApiOperation({ summary: 'Exporta compras en CSV' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiForbiddenResponse()
  async purchasesCsv(
    @Param('householdId') householdId: string,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: CurrentUserModel,
    @Res() response: Response,
  ) {
    return this.send(response, 'purchases.csv', () =>
      this.purchases.execute({ actorId: user.id, householdId, query }),
    );
  }

  private async send(response: Response, filename: string, createCsv: () => Promise<string>) {
    let csv: string;
    try {
      csv = await createCsv();
    } catch (error) {
      if (error instanceof ExportAccessDeniedError) throw new ForbiddenException(error.message);
      if (error instanceof InvalidExportQueryError) throw new BadRequestException(error.message);
      throw error;
    }
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return response.send(csv);
  }
}
