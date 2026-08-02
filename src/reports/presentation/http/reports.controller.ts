import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import { HouseholdAccessDeniedError } from '../../../households/application/errors/household-access-denied.error';
import {
  GET_INVENTORY_REPORT_QUERY,
  GET_PURCHASE_REPORT_QUERY,
  GET_WASTE_REPORT_QUERY,
  GetInventoryReportQuery,
  GetPurchaseReportQuery,
  GetWasteReportQuery,
} from '../../application/queries/get-operational-reports.query';
import { OperationalReportQueryDto } from './dto/operational-report.dto';

@ApiTags('reports')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller('households/:householdId/reports')
@UseGuards(SupabaseAuthGuard)
export class ReportsController {
  constructor(
    @Inject(GET_INVENTORY_REPORT_QUERY) private readonly inventory: GetInventoryReportQuery,
    @Inject(GET_PURCHASE_REPORT_QUERY) private readonly purchases: GetPurchaseReportQuery,
    @Inject(GET_WASTE_REPORT_QUERY) private readonly waste: GetWasteReportQuery,
  ) {}

  @Get('inventory')
  @ApiOperation({ summary: 'Obtiene el reporte operativo de inventario' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  async getInventory(
    @Param('householdId') householdId: string,
    @Query() query: OperationalReportQueryDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return this.execute(() =>
      this.inventory.execute({ actorId: user.id, householdId, from: query.from, to: query.to }),
    );
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Obtiene el reporte operativo de compras' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  async getPurchases(
    @Param('householdId') householdId: string,
    @Query() query: OperationalReportQueryDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return this.execute(() =>
      this.purchases.execute({ actorId: user.id, householdId, from: query.from, to: query.to }),
    );
  }

  @Get('waste')
  @ApiOperation({ summary: 'Obtiene el reporte operativo de desperdicio' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  async getWaste(
    @Param('householdId') householdId: string,
    @Query() query: OperationalReportQueryDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return this.execute(() =>
      this.waste.execute({ actorId: user.id, householdId, from: query.from, to: query.to }),
    );
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HouseholdAccessDeniedError) throw new ForbiddenException(error.message);
      if (error instanceof Error && error.message.startsWith('Report '))
        throw new BadRequestException(error.message);
      throw error;
    }
  }
}
