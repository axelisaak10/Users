import { IsEmail, IsOptional, IsString, MinLength, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Carlos Administrador' })
  @IsString()
  @IsOptional()
  nombreCompleto?: string;

  @ApiPropertyOptional({ example: 'carlos_admin' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'carlos@marher.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+52 555 123 4567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Avenida Siempre Viva 123' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: '1995-12-31' })
  @IsString()
  @IsOptional()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: 'Nombres de permisos a asignar. Se resolverán a UUIDs en BD.',
    example: ['user:view', 'user:add'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permisos?: string[];
}
