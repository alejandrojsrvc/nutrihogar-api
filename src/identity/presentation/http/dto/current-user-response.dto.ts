import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'usuario@example.com' })
  email!: string;

  @ApiProperty({ nullable: true, example: 'Alejandro' })
  displayName!: string | null;

  @ApiProperty({ nullable: true, example: null })
  avatarUrl!: string | null;

  @ApiProperty({ example: 'America/Argentina/Buenos_Aires' })
  timezone!: string;

  @ApiProperty({ example: 'es-AR' })
  locale!: string;
}
