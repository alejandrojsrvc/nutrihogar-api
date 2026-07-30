import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  HouseholdInvitationRole,
  HouseholdInvitationStatus,
} from '../../../application/invitation-models/household-invitation-view';

export class HouseholdInvitationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  householdId!: string;

  @ApiProperty({ example: 'adulto@example.com' })
  email!: string;

  @ApiProperty({ enum: ['ADMIN', 'MEMBER'] })
  role!: HouseholdInvitationRole;

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'] })
  status!: HouseholdInvitationStatus;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'uuid' })
  invitedById!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  acceptedById!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: 'Token sin hash para compartir localmente con el invitado.',
  })
  token?: string;
}
