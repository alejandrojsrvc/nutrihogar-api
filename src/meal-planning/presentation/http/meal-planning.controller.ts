import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {
  ACTIVATE_WEEKLY_PLAN_USE_CASE,
  ActivateWeeklyPlanUseCase,
  CANCEL_WEEKLY_PLAN_USE_CASE,
  CancelWeeklyPlanUseCase,
  COMPLETE_WEEKLY_PLAN_USE_CASE,
  CompleteWeeklyPlanUseCase,
  CREATE_WEEKLY_PLAN_USE_CASE,
  CreateWeeklyPlanUseCase,
  GET_WEEKLY_PLAN_QUERY,
  GetWeeklyPlanQuery,
  LIST_WEEKLY_PLANS_QUERY,
  ListWeeklyPlansQuery,
  UPDATE_WEEKLY_PLAN_USE_CASE,
  UpdateWeeklyPlanUseCase,
} from '../../application/use-cases/weekly-plan.use-cases';
import {
  ADD_PLANNED_MEAL_USE_CASE,
  AddPlannedMealUseCase,
  ASSIGN_PLANNED_MEAL_PARTICIPANTS_USE_CASE,
  AssignPlannedMealParticipantsUseCase,
  REMOVE_PLANNED_MEAL_USE_CASE,
  RemovePlannedMealUseCase,
  REMOVE_PLANNED_MEAL_PARTICIPANT_USE_CASE,
  RemovePlannedMealParticipantUseCase,
  REPLACE_PLANNED_MEAL_USE_CASE,
  ReplacePlannedMealUseCase,
  UPDATE_PLANNED_MEAL_USE_CASE,
  UPDATE_PLANNED_MEAL_PARTICIPANT_USE_CASE,
  UpdatePlannedMealParticipantUseCase,
  UpdatePlannedMealUseCase,
} from '../../application/use-cases/planned-meal.use-cases';
import {
  ACCEPT_SUGGESTED_QUANTITIES_USE_CASE,
  AcceptSuggestedQuantitiesUseCase,
  GET_PLANNED_MEAL_QUANTITIES_QUERY,
  GetPlannedMealQuantitiesQuery,
  PROPOSE_MEAL_QUANTITIES_USE_CASE,
  ProposeMealQuantitiesUseCase,
} from '../../application/use-cases/meal-plan-quantity.use-cases';
import {
  CALCULATE_WEEKLY_REQUIREMENTS_QUERY,
  CalculateWeeklyRequirementsQuery,
  COMPARE_PLAN_WITH_INVENTORY_QUERY,
  ComparePlanWithInventoryQuery,
} from '../../application/use-cases/weekly-analysis.use-cases';
import {
  CreateWeeklyPlanRequestDto,
  UpdateWeeklyPlanRequestDto,
  ListWeeklyPlansQueryDto,
  PlannedMealRequestDto,
  UpdatePlannedMealRequestDto,
  ReplacePlannedMealRequestDto,
  AssignParticipantRequestDto,
  UpdateParticipantRequestDto,
  LinkConsumedMealRequestDto,
  AdherenceQueryDto,
} from './dto/meal-planning.dto';
import {
  CALCULATE_WEEKLY_ADHERENCE_USE_CASE,
  CalculateWeeklyAdherenceUseCase,
  LINK_CONSUMED_MEAL_TO_PLANNED_MEAL_USE_CASE,
  LinkConsumedMealToPlannedMealUseCase,
  START_PREPARATION_FROM_PLANNED_MEAL_USE_CASE,
  StartPreparationFromPlannedMealUseCase,
} from '../../application/use-cases/plan-execution.use-cases';
import {
  rethrowMealPlanningHttpError,
  toListResponse,
  toWeeklyPlanResponse,
} from './meal-planning-http.mapper';
import type { WeeklyPlanListResponse, WeeklyPlanResponse } from './meal-planning-http.mapper';

@ApiTags('meal-planning')
@ApiBearerAuth()
@Controller()
@UseGuards(SupabaseAuthGuard)
export class MealPlanningController {
  constructor(
    @Inject(CREATE_WEEKLY_PLAN_USE_CASE) private readonly createPlan: CreateWeeklyPlanUseCase,
    @Inject(GET_WEEKLY_PLAN_QUERY) private readonly getPlan: GetWeeklyPlanQuery,
    @Inject(LIST_WEEKLY_PLANS_QUERY) private readonly listPlans: ListWeeklyPlansQuery,
    @Inject(UPDATE_WEEKLY_PLAN_USE_CASE) private readonly updatePlan: UpdateWeeklyPlanUseCase,
    @Inject(ACTIVATE_WEEKLY_PLAN_USE_CASE) private readonly activatePlan: ActivateWeeklyPlanUseCase,
    @Inject(CANCEL_WEEKLY_PLAN_USE_CASE) private readonly cancelPlan: CancelWeeklyPlanUseCase,
    @Inject(COMPLETE_WEEKLY_PLAN_USE_CASE) private readonly completePlan: CompleteWeeklyPlanUseCase,
    @Inject(ADD_PLANNED_MEAL_USE_CASE) private readonly addMeal: AddPlannedMealUseCase,
    @Inject(UPDATE_PLANNED_MEAL_USE_CASE) private readonly updateMeal: UpdatePlannedMealUseCase,
    @Inject(REMOVE_PLANNED_MEAL_USE_CASE) private readonly removeMeal: RemovePlannedMealUseCase,
    @Inject(REPLACE_PLANNED_MEAL_USE_CASE) private readonly replaceMeal: ReplacePlannedMealUseCase,
    @Inject(ASSIGN_PLANNED_MEAL_PARTICIPANTS_USE_CASE)
    private readonly assignParticipant: AssignPlannedMealParticipantsUseCase,
    @Inject(REMOVE_PLANNED_MEAL_PARTICIPANT_USE_CASE)
    private readonly removeParticipant: RemovePlannedMealParticipantUseCase,
    @Inject(UPDATE_PLANNED_MEAL_PARTICIPANT_USE_CASE)
    private readonly updateParticipant: UpdatePlannedMealParticipantUseCase,
    @Inject(PROPOSE_MEAL_QUANTITIES_USE_CASE)
    private readonly proposeQuantities: ProposeMealQuantitiesUseCase,
    @Inject(GET_PLANNED_MEAL_QUANTITIES_QUERY)
    private readonly getQuantities: GetPlannedMealQuantitiesQuery,
    @Inject(ACCEPT_SUGGESTED_QUANTITIES_USE_CASE)
    private readonly acceptQuantities: AcceptSuggestedQuantitiesUseCase,
    @Inject(CALCULATE_WEEKLY_REQUIREMENTS_QUERY)
    private readonly requirements: CalculateWeeklyRequirementsQuery,
    @Inject(COMPARE_PLAN_WITH_INVENTORY_QUERY)
    private readonly inventoryComparison: ComparePlanWithInventoryQuery,
    @Inject(START_PREPARATION_FROM_PLANNED_MEAL_USE_CASE)
    private readonly startPreparation: StartPreparationFromPlannedMealUseCase,
    @Inject(LINK_CONSUMED_MEAL_TO_PLANNED_MEAL_USE_CASE)
    private readonly linkConsumption: LinkConsumedMealToPlannedMealUseCase,
    @Inject(CALCULATE_WEEKLY_ADHERENCE_USE_CASE)
    private readonly adherence: CalculateWeeklyAdherenceUseCase,
  ) {}

  @Post('households/:householdId/weekly-plans')
  @ApiCreatedResponse({ description: 'Weekly plan created.' })
  async create(
    @Param('householdId') householdId: string,
    @Body() body: CreateWeeklyPlanRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(
        await this.createPlan.execute({ actorId: user.id, householdId, ...body }),
      );
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Get('households/:householdId/weekly-plans') async list(
    @Param('householdId') householdId: string,
    @Query() query: ListWeeklyPlansQueryDto,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanListResponse> {
    try {
      return toListResponse(
        await this.listPlans.execute({ actorId: user.id, householdId, ...query }),
      );
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Get('weekly-plans/:weeklyPlanId') async get(
    @Param('weeklyPlanId') id: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(await this.getPlan.execute(user.id, id));
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Patch('weekly-plans/:weeklyPlanId') async update(
    @Param('weeklyPlanId') id: string,
    @Body() body: UpdateWeeklyPlanRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(
        await this.updatePlan.execute({ actorId: user.id, planId: id, ...body }),
      );
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Post('weekly-plans/:weeklyPlanId/activate') async activate(
    @Param('weeklyPlanId') id: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(await this.activatePlan.execute(user.id, id));
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Post('weekly-plans/:weeklyPlanId/complete') async complete(
    @Param('weeklyPlanId') id: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(await this.completePlan.execute(user.id, id));
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Delete('weekly-plans/:weeklyPlanId') @HttpCode(HttpStatus.NO_CONTENT) async cancel(
    @Param('weeklyPlanId') id: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.cancelPlan.execute(user.id, id);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Post('weekly-plans/:weeklyPlanId/meals') async add(
    @Param('weeklyPlanId') id: string,
    @Body() body: PlannedMealRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(
        await this.addMeal.execute({ actorId: user.id, planId: id, ...body }),
      );
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Patch('planned-meals/:plannedMealId') async editMeal(
    @Param('plannedMealId') id: string,
    @Body() body: UpdatePlannedMealRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(
        await this.updateMeal.execute({ actorId: user.id, mealId: id, ...body }),
      );
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Delete('planned-meals/:plannedMealId') @HttpCode(HttpStatus.NO_CONTENT) async deleteMeal(
    @Param('plannedMealId') id: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.removeMeal.execute({ actorId: user.id, mealId: id });
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Post('planned-meals/:plannedMealId/replace') async replace(
    @Param('plannedMealId') id: string,
    @Body() body: ReplacePlannedMealRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(
        await this.replaceMeal.execute({ actorId: user.id, mealId: id, ...body }),
      );
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Post('planned-meals/:plannedMealId/participants') async assign(
    @Param('plannedMealId') id: string,
    @Body() body: AssignParticipantRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(
        await this.assignParticipant.execute({ actorId: user.id, mealId: id, ...body }),
      );
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Patch('planned-meal-participants/:participantId') async editParticipant(
    @Param('participantId') id: string,
    @Body() body: UpdateParticipantRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<WeeklyPlanResponse> {
    try {
      return toWeeklyPlanResponse(
        await this.updateParticipant.execute({ actorId: user.id, participantId: id, ...body }),
      );
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Delete('planned-meal-participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteParticipant(
    @Param('participantId') id: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.removeParticipant.execute({ actorId: user.id, participantId: id });
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }

  @Post('planned-meals/:plannedMealId/quantities/propose')
  async propose(@Param('plannedMealId') id: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return await this.proposeQuantities.execute(user.id, id);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }

  @Get('planned-meals/:plannedMealId/quantities')
  async quantities(@Param('plannedMealId') id: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return await this.getQuantities.execute(user.id, id);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }

  @Post('planned-meals/:plannedMealId/quantities/accept-suggestions')
  async accept(@Param('plannedMealId') id: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return toWeeklyPlanResponse(await this.acceptQuantities.execute(user.id, id));
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }

  @Get('weekly-plans/:weeklyPlanId/requirements')
  async requirementsQuery(
    @Param('weeklyPlanId') id: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return await this.requirements.execute(user.id, id);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }

  @Get('weekly-plans/:weeklyPlanId/inventory-comparison')
  async compareInventory(@Param('weeklyPlanId') id: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return await this.inventoryComparison.execute(user.id, id);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }

  @Post('planned-meals/:plannedMealId/preparation')
  async prepare(@Param('plannedMealId') id: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return await this.startPreparation.execute(user.id, id);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Get('planned-meals/:plannedMealId/preparation')
  async preparation(@Param('plannedMealId') id: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return await this.startPreparation.get(user.id, id);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Post('consumed-meals/:consumedMealId/link')
  async link(
    @Param('consumedMealId') mealId: string,
    @Body() body: LinkConsumedMealRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return await this.linkConsumption.execute(user.id, mealId, body.plannedMealId);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Get('planned-meals/:plannedMealId/consumption')
  async consumption(@Param('plannedMealId') id: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return await this.linkConsumption.get(user.id, id);
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Get('weekly-plans/:weeklyPlanId/adherence')
  async planAdherence(@Param('weeklyPlanId') id: string, @CurrentUser() user: CurrentUserModel) {
    try {
      return await this.adherence.execute(user.id, { weeklyPlanId: id });
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
  @Get('households/:householdId/adherence')
  async householdAdherence(
    @Param('householdId') householdId: string,
    @Query() query: AdherenceQueryDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return await this.adherence.execute(user.id, { householdId, weekStart: query.weekStart });
    } catch (e) {
      rethrowMealPlanningHttpError(e);
    }
  }
}
