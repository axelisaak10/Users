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
import * as crypto from 'crypto';
import {
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
  ForgotPasswordDto,
} from './dto/update-profile.dto';
import { BlacklistService } from './services/blacklist.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { EmailService } from './services/email.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private jwtService: JwtService,
    private blacklistService: BlacklistService,
    private refreshTokenService: RefreshTokenService,
    private emailService: EmailService,
  ) {}

  private async resolvePermisos(permisosIds: string[]): Promise<string[]> {
    if (!permisosIds || permisosIds.length === 0) return [];
    const { data } = await this.supabase
      .from('permisos')
      .select('nombre')
      .in('nombre', permisosIds);
    return data?.map((p) => p.nombre) || [];
  }

  async getUserPermisosFromBd(userId: string): Promise<string[]> {
    const { data: user } = await this.supabase
      .from('usuarios')
      .select('permisos_globales')
      .eq('id', userId)
      .single();

    if (!user) return [];
    return this.resolvePermisos(user.permisos_globales || []);
  }

  async getCurrentPermissions(userId: string) {
    const permisos = await this.getUserPermisosFromBd(userId);
    return {
      permisos_globales: permisos,
      ultimo_actualizado: new Date().toISOString(),
    };
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
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      permisos_globales: user.permisos_globales,
      jti,
    };

    const nowStamp = new Date().toISOString();
    await this.supabase
      .from('usuarios')
      .update({ last_login: nowStamp })
      .eq('id', user.id);

    const { data: userData } = await this.supabase
      .from('usuarios')
      .select(
        'nombre_completo, username, email, telefono, direccion, fecha_nacimiento, fecha_inicio',
      )
      .eq('id', user.id)
      .single();

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.refreshTokenService.generateRefreshToken(
      user.id,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      id: user.id,
      nombre_completo: userData?.nombre_completo || '',
      username: userData?.username || '',
      email: userData?.email || '',
      telefono: userData?.telefono || '',
      direccion: userData?.direccion || '',
      fecha_nacimiento: userData?.fecha_nacimiento || '',
      fecha_inicio: userData?.fecha_inicio || '',
      permisos_globales: user.permisos_globales,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const payload =
      await this.refreshTokenService.verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const { data: user, error } = await this.supabase
      .from('usuarios')
      .select('permisos_globales')
      .eq('id', payload.sub)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const permisosNombres = await this.resolvePermisos(
      user.permisos_globales || [],
    );
    const newJti = crypto.randomUUID();

    const newPayload = {
      sub: payload.sub,
      permisos_globales: permisosNombres,
      jti: newJti,
    };

    const accessToken = this.jwtService.sign(newPayload);
    const newRefreshToken = await this.refreshTokenService.generateRefreshToken(
      payload.sub,
    );

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      id: payload.sub,
      permisos_globales: permisosNombres,
    };
  }

  async revokeToken(userId: string, jti: string) {
    const decoded = this.jwtService.decode(jti);
    let expiraEn: Date;

    if (decoded && decoded.exp) {
      expiraEn = new Date(decoded.exp * 1000);
    } else {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      expiraEn = now;
    }

    await this.blacklistService.addToBlacklist(jti, expiraEn);
    await this.refreshTokenService.revokeRefreshToken(userId);

    return { message: 'Token invalidado exitosamente' };
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

    if (
      !permisosNombres.includes('user:profile:edit') &&
      !permisosNombres.includes('superadmin')
    ) {
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    const { data: user, error } = await this.supabase
      .from('usuarios')
      .select('id, username, email')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return {
        message: 'Se envió a su correo la recuperación de cuenta',
      };
    }

    const newPassword = this.generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await this.supabase
      .from('usuarios')
      .update({ password: hashedPassword })
      .eq('id', user.id);

    if (updateError) {
      throw new InternalServerErrorException('Error al actualizar contraseña');
    }

    await this.emailService.sendRecoveryEmail(
      user.email,
      newPassword,
      user.username,
    );

    return {
      message: 'Se envió a su correo la recuperación de cuenta',
    };
  }

  private generateSecurePassword(length: number): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@!#$%&*';

    const getRandomChar = (chars: string): string => {
      const array = new Uint32Array(1);
      crypto.randomFillSync(array);
      return chars[array[0] % chars.length];
    };

    let password = '';
    password += getRandomChar(upper);
    password += getRandomChar(lower);
    password += getRandomChar(lower);
    password += getRandomChar(lower);
    password += getRandomChar(numbers);
    password += getRandomChar(numbers);
    password += getRandomChar(numbers);
    password += getRandomChar(numbers);
    password += getRandomChar(symbols);

    const allChars = upper + lower + numbers + symbols;
    for (let i = password.length; i < length; i++) {
      password += getRandomChar(allChars);
    }

    return password;
  }
}
