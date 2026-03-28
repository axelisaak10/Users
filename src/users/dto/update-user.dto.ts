import { IsEmail, IsOptional, IsString, MinLength, IsArray, Matches, MaxLength, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Carlos Administrador' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  nombre_completo?: string;

  @ApiPropertyOptional({ example: 'carlos_admin' })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username?: string;

  @ApiPropertyOptional({ example: 'carlos@marher.com' })
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

  @ApiPropertyOptional({ example: 'Avenida Siempre Viva 123' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  direccion?: string;

  @ApiPropertyOptional({ example: '1995-12-31' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'Array of global permission UUIDs',
    example: ['uuid-1', 'uuid-2'],
    type: [String]
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  permisos_globales?: string[];
}
