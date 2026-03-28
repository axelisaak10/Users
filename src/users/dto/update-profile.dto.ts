import { IsEmail, IsOptional, IsString, MinLength, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Moises Godinez' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  nombre_completo?: string;

  @ApiPropertyOptional({ example: 'GODMOI' })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username?: string;

  @ApiPropertyOptional({ example: 'moises@gmail.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+525555555555' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/)
  telefono?: string;

  @ApiPropertyOptional({ example: 'Mi casa 123' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  direccion?: string;

  @ApiPropertyOptional({ example: '2026-03-25' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_inicio?: string;

  @ApiPropertyOptional({ example: '1995-12-31' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ description: 'Optional new password' })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;
}
