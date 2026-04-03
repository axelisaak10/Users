import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@seguridad.com',
    description: 'Correo electronico del usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contrasena del usuario',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    example: 'Juan Perez',
    description: 'Nombre completo del usuario',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nombre_completo: string;

  @ApiProperty({ example: 'juanp', description: 'Nombre de usuario unico' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username: string;

  @ApiProperty({
    example: 'juan@correo.com',
    description: 'Correo electronico',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contrasena (minimo 8 caracteres)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Calle Falsa 123', description: 'Direccion' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: '+525555555555', description: 'Telefono' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]*$/)
  telefono?: string;

  @ApiProperty({
    example: '1995-12-31',
    description: 'Fecha de nacimiento',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_nacimiento: string;

  @ApiProperty({ example: '2024-03-25', description: 'Fecha de inicio' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_inicio: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan Perez Actualizado' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nombre_completo?: string;

  @ApiPropertyOptional({ example: 'juanp' })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username?: string;

  @ApiPropertyOptional({ example: 'juan@correo.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+525555555555' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]*$/)
  telefono?: string;

  @ApiPropertyOptional({ example: 'Mi casa 123' })
  @IsString()
  @IsOptional()
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

  @ApiPropertyOptional({
    description: 'Nueva contrasena (minimo 8 caracteres)',
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'usuario@correo.com',
    description: 'Correo electronico del usuario',
  })
  @IsEmail()
  @IsString()
  email: string;
}
