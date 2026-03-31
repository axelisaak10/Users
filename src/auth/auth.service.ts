import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import {
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private jwtService: JwtService,
  ) {}

  private async resolvePermisos(permisosIds: string[]): Promise<string[]> {
    if (!permisosIds || permisosIds.length === 0) return [];
    const { data } = await this.supabase
      .from('permisos')
      .select('nombre')
      .in('id', permisosIds);
    return data?.map((p) => p.nombre) || [];
  }

  private async getUserPermisosFromBd(userId: string): Promise<string[]> {
    const { data: user } = await this.supabase
      .from('usuarios')
      .select('permisos_globales')
      .eq('id', userId)
      .single();

    if (!user) return [];
    return this.resolvePermisos(user.permisos_globales || []);
  }

  async validateUser(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const { data: user, error } = await this.supabase
      .from('usuarios')
      .select('id, password, permisos_globales')
      .eq('email', email)
      .single();
    if (error || !user)
      throw new UnauthorizedException('Credenciales invalidas');

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) throw new UnauthorizedException('Credenciales invalidas');

    const permisosNombres = await this.resolvePermisos(
      user.permisos_globales || [],
    );

    return {
      id: user.id,
      permisos_globales: permisosNombres,
    };
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      permisos_globales: user.permisos_globales,
    };

    const nowStamp = new Date().toISOString();
    await this.supabase
      .from('usuarios')
      .update({ last_login: nowStamp })
      .eq('id', user.id);

    return {
      access_token: this.jwtService.sign(payload),
      id: user.id,
      permisos_globales: user.permisos_globales,
    };
  }

  async register(registerDto: RegisterDto) {
    const {
      nombre_completo,
      username,
      email,
      password,
      direccion,
      telefono,
      fecha_nacimiento,
      fecha_inicio,
    } = registerDto;

    const { data: exist } = await this.supabase
      .from('usuarios')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .limit(1);
    if (exist?.length)
      throw new UnauthorizedException('Email o usuario ya existen');

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await this.supabase.from('usuarios').insert([
      {
        nombre_completo,
        username,
        email,
        password: hashedPassword,
        direccion: direccion || null,
        telefono: telefono || null,
        fecha_inicio: fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_nacimiento: fecha_nacimiento || null,
      },
    ]);

    if (error) throw new UnauthorizedException(error.message);

    return { message: 'Usuario registrado exitosamente', email, username };
  }

  async getProfile(userId: string) {
    const { data: user, error } = await this.supabase
      .from('usuarios')
      .select(
        'id, nombre_completo, username, email, telefono, direccion, fecha_inicio, fecha_nacimiento, last_login, permisos_globales, creado_en',
      )
      .eq('id', userId)
      .single();

    if (error || !user)
      throw new UnauthorizedException('Usuario no encontrado');

    const permisosNombres = await this.resolvePermisos(
      user.permisos_globales || [],
    );

    if (!permisosNombres.includes('user:profile:view')) {
      throw new ForbiddenException('Permiso denegado: user:profile:view');
    }

    return {
      id: user.id,
      nombre_completo: user.nombre_completo,
      username: user.username,
      email: user.email,
      telefono: user.telefono,
      direccion: user.direccion,
      fecha_inicio: user.fecha_inicio,
      fecha_nacimiento: user.fecha_nacimiento,
      last_login: user.last_login,
      creado_en: user.creado_en,
      permisos_globales: permisosNombres,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { data: user } = await this.supabase
      .from('usuarios')
      .select('permisos_globales')
      .eq('id', userId)
      .single();

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const permisosNombres = await this.resolvePermisos(
      user.permisos_globales || [],
    );

    if (!permisosNombres.includes('user:profile:edit')) {
      throw new ForbiddenException('Permiso denegado: user:profile:edit');
    }

    if (dto.email || dto.username) {
      const orConditions: string[] = [];
      if (dto.email) orConditions.push(`email.eq.${dto.email}`);
      if (dto.username) orConditions.push(`username.eq.${dto.username}`);
      if (orConditions.length > 0) {
        const { data: existing } = await this.supabase
          .from('usuarios')
          .select('id')
          .neq('id', userId)
          .or(orConditions.join(','));
        if (existing && existing.length > 0) {
          throw new ConflictException(
            'El correo o nombre de usuario ya esta siendo usado por otra cuenta',
          );
        }
      }
    }

    const updates: any = {};
    if (dto.nombre_completo) updates.nombre_completo = dto.nombre_completo;
    if (dto.username) updates.username = dto.username;
    if (dto.email) updates.email = dto.email;
    if (dto.telefono !== undefined) updates.telefono = dto.telefono;
    if (dto.direccion !== undefined) updates.direccion = dto.direccion;
    if (dto.fecha_inicio) updates.fecha_inicio = dto.fecha_inicio;
    if (dto.fecha_nacimiento !== undefined)
      updates.fecha_nacimiento = dto.fecha_nacimiento;
    if (dto.password) {
      updates.password = await bcrypt.hash(dto.password, 10);
    }

    const { data, error } = await this.supabase
      .from('usuarios')
      .update(updates)
      .eq('id', userId)
      .select(
        'id, nombre_completo, username, email, telefono, direccion, fecha_inicio, fecha_nacimiento',
      )
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }
}
