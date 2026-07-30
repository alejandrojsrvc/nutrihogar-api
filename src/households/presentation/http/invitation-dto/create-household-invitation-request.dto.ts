import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';

export enum HouseholdInvitationRoleDto {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class CreateHouseholdInvitationRequestDto {
  @ApiProperty({ example: 'adulto@example.com' })
  @Transform(({ value }: TransformFnParams): unknown => {
    const input: unknown = value;

    return typeof input === 'string' ? input.trim() : input;
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ enum: HouseholdInvitationRoleDto, example: 'MEMBER' })
  @IsEnum(HouseholdInvitationRoleDto)
  role!: HouseholdInvitationRoleDto;
}
