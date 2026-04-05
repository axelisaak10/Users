import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsUUID,
  MinLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  nombre_completo: string;

  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  fecha_nacimiento?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permisos_globales?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nombre_completo?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  fecha_nacimiento?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permisos_globales?: string[];
}

export class SearchUserQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AssignPermissionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  permisos: string[];
}

export class RemovePermissionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  permisos: string[];
}

export class ChangePasswordResponseDto {
  success: boolean;
  emailSent: boolean;
  message: string;
}
