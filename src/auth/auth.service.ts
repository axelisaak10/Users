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
      .select('id, email, password, nombre_completo, username, permisos_globales, telefono, direccion, fecha_inicio')
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

    let permisosSet = new Set<string>();

    // 1. Obtener nombres de permisos globales directos
    if (user.permisos_globales && Array.isArray(user.permisos_globales) && user.permisos_globales.length > 0) {
      const { data: globalPerms } = await this.supabase
        .from('permisos')
        .select('nombre')
        .in('id', user.permisos_globales);
      
      if (globalPerms) {
        globalPerms.forEach(p => permisosSet.add(p.nombre));
      }
    }

    // Guardar los nombres de los permisos en el usuario (excluyendo campos sensibles)
    const { password: _, permisos_globales: __, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      permisos_globales: Array.from(permisosSet),
    };
  }

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      username: user.username,
      nombreCompleto: user.nombre_completo,
      permisos_globales: user.permisos_globales || []
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        nombreCompleto: user.nombre_completo,
        telefono: user.telefono,
        direccion: user.direccion,
        fecha_inicio: user.fecha_inicio,
        permisos_globales: user.permisos_globales || []
      },
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
