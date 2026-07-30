import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateHouseholdRequestDto {
  @ApiProperty({ example: 'Hogar Sojo', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: 'America/Argentina/Buenos_Aires',
    maxLength: 64,
    default: 'America/Argentina/Buenos_Aires',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({
    example: 'ARS',
    minLength: 3,
    maxLength: 3,
    default: 'ARS',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
