import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permisos?: string[];
}
