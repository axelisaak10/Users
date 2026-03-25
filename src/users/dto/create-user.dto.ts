import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Carlos Administrador' })
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @ApiProperty({ example: 'carlos_admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'carlos@marher.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

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

  @ApiPropertyOptional({
    description: 'Nombres de permisos asignados. Se validarán en BD.',
    example: ['user:view', 'user:add'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permisos?: string[];
}
