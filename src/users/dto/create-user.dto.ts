import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray, Matches, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan Perez', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  nombre_completo: string;

  @ApiProperty({ example: 'juanp', description: 'Unique username for login' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username: string;

  @ApiProperty({ example: 'juan@correo.com', description: 'User email address' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Calle Falsa 123', description: 'User address' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  direccion: string;

  @ApiProperty({ example: '+525555555555', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/)
  telefono: string;

  @ApiProperty({ example: '1995-12-31', description: 'Date of birth' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_nacimiento: string;

  @ApiProperty({ example: '2024-03-25', description: 'Start date of the user' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_inicio: string;

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
