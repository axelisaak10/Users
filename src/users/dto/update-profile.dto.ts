import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Moises Godinez' })
  @IsString()
  @IsOptional()
  nombreCompleto?: string;

  @ApiPropertyOptional({ example: 'GODMOI' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'moises@gmail.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '5551234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Mi casa 123' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: '2026-03-25' })
  @IsString()
  @IsOptional()
  fecha_inicio?: string;

  @ApiPropertyOptional({ example: '1995-12-31' })
  @IsString()
  @IsOptional()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ description: 'Optional new password' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;
}
