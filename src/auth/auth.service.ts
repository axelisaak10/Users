import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    // Buscar usuario por email (Supabase)
    const { data: user, error } = await this.supabase
      .from('usuarios')
      .select('id, email, password, nombre_completo, username')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    
    // Comparar hashes con bcrypt
    const isMatched = await bcrypt.compare(password, user.password);
    
    if (!isMatched) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(registerDto: RegisterDto) {
    const { nombreCompleto, username, email, password, direccion, telefono } = registerDto;

    // Check if user exists
    const { data: existingUsers } = await this.supabase
      .from('usuarios')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      throw new UnauthorizedException('Email or username already in use');
    }

    // Hash user password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default values for required fields like fecha_inicio
    const dt = new Date().toISOString().split('T')[0];

    const { data: newUser, error } = await this.supabase
      .from('usuarios')
      .insert([
        {
          nombre_completo: nombreCompleto,
          username,
          email,
          password: hashedPassword,
          direccion: direccion || null,
          telefono: telefono || null,
          fecha_inicio: dt,
        },
      ])
      .select('id, nombre_completo, username, email, creado_en')
      .single();

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return newUser;
  }
}
