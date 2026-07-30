import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateHouseholdRequestDto {
  @ApiProperty({ example: 'Hogar Sojo actualizado', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(150)
  name!: string;
}
