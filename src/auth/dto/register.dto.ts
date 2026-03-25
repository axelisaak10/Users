import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Perez', description: 'Nombre completo' })
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @ApiProperty({ example: 'juanp', description: 'Nombre de usuario único' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'juan@correo.com', description: 'Correo electrónico' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Contraseña segura' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'Calle Falsa 123', description: 'Dirección física' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: '+525555555555', description: 'Teléfono de contacto' })
  @IsString()
  @IsOptional()
  telefono?: string;
}
