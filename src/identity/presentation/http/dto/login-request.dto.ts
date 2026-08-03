import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'usuario@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'password-seguro' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
