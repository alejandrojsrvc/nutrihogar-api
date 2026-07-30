import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {
  ACCEPT_HOUSEHOLD_INVITATION_USE_CASE,
  AcceptHouseholdInvitationUseCase,
} from '../../application/invitation-use-cases/accept-household-invitation.use-case';
import {
  CANCEL_HOUSEHOLD_INVITATION_USE_CASE,
  CancelHouseholdInvitationUseCase,
} from '../../application/invitation-use-cases/cancel-household-invitation.use-case';
import {
  CREATE_HOUSEHOLD_INVITATION_USE_CASE,
  CreateHouseholdInvitationUseCase,
} from '../../application/invitation-use-cases/create-household-invitation.use-case';
import {
  LIST_HOUSEHOLD_INVITATIONS_USE_CASE,
  ListHouseholdInvitationsUseCase,
} from '../../application/invitation-use-cases/list-household-invitations.use-case';
import { CreateHouseholdInvitationRequestDto } from './invitation-dto/create-household-invitation-request.dto';
import { HouseholdInvitationResponseDto } from './invitation-dto/household-invitation-response.dto';
import { HouseholdInvitationHttpMapper } from './household-invitation-http.mapper';
import { rethrowHouseholdHttpError } from './household-http-error.mapper';

@ApiTags('household-invitations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token.',
})
@Controller()
@UseGuards(SupabaseAuthGuard)
export class HouseholdInvitationsController {
  constructor(
    @Inject(CREATE_HOUSEHOLD_INVITATION_USE_CASE)
    private readonly createInvitation: CreateHouseholdInvitationUseCase,
    @Inject(LIST_HOUSEHOLD_INVITATIONS_USE_CASE)
    private readonly listInvitations: ListHouseholdInvitationsUseCase,
    @Inject(ACCEPT_HOUSEHOLD_INVITATION_USE_CASE)
    private readonly acceptInvitation: AcceptHouseholdInvitationUseCase,
    @Inject(CANCEL_HOUSEHOLD_INVITATION_USE_CASE)
    private readonly cancelInvitation: CancelHouseholdInvitationUseCase,
  ) {}

  @Post('households/:householdId/invitations')
  @ApiOperation({ summary: 'Crea una invitación para un adulto' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiCreatedResponse({ type: HouseholdInvitationResponseDto })
  @ApiForbiddenResponse({ description: 'Solo administradores pueden invitar.' })
  @ApiConflictResponse({
    description: 'El usuario ya es miembro o ya existe una invitación.',
  })
  async create(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreateHouseholdInvitationRequestDto,
  ): Promise<HouseholdInvitationResponseDto> {
    try {
      const result = await this.createInvitation.execute({
        actorId: user.id,
        householdId,
        email: body.email,
        role: body.role,
      });

      return HouseholdInvitationHttpMapper.toResponse(result.invitation, result.token);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Get('households/:householdId/invitations')
  @ApiOperation({ summary: 'Lista las invitaciones del hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: HouseholdInvitationResponseDto, isArray: true })
  @ApiForbiddenResponse({
    description: 'Solo administradores pueden consultar.',
  })
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<HouseholdInvitationResponseDto[]> {
    try {
      const invitations = await this.listInvitations.execute({
        actorId: user.id,
        householdId,
      });

      return HouseholdInvitationHttpMapper.toResponseList(invitations);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Post('household-invitations/:token/accept')
  @ApiOperation({ summary: 'Acepta una invitación con el correo autenticado' })
  @ApiParam({ name: 'token' })
  @ApiOkResponse({ type: HouseholdInvitationResponseDto })
  @ApiForbiddenResponse({ description: 'El correo autenticado no coincide.' })
  @ApiGoneResponse({ description: 'La invitación ha expirado.' })
  @ApiNotFoundResponse({ description: 'El token no existe.' })
  @ApiConflictResponse({ description: 'La invitación ya fue procesada.' })
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param('token') token: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<HouseholdInvitationResponseDto> {
    try {
      const invitation = await this.acceptInvitation.execute({
        userId: user.id,
        userEmail: user.email,
        token,
      });

      return HouseholdInvitationHttpMapper.toResponse(invitation);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }

  @Post('household-invitations/:invitationId/cancel')
  @ApiOperation({ summary: 'Cancela una invitación pendiente' })
  @ApiParam({ name: 'invitationId', format: 'uuid' })
  @ApiOkResponse({ type: HouseholdInvitationResponseDto })
  @ApiForbiddenResponse({
    description: 'Solo administradores pueden cancelar.',
  })
  @ApiNotFoundResponse({ description: 'La invitación no existe.' })
  @ApiConflictResponse({ description: 'La invitación ya fue procesada.' })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<HouseholdInvitationResponseDto> {
    try {
      const invitation = await this.cancelInvitation.execute({
        actorId: user.id,
        invitationId,
      });

      return HouseholdInvitationHttpMapper.toResponse(invitation);
    } catch (error) {
      rethrowHouseholdHttpError(error);
    }
  }
}
