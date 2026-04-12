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
  private permisosCache: Map<string, { nombres: string[]; timestamp: number }> =
    new Map();
  private gruposCache: Map<string, { grupos: any[]; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 30 * 1000;
  private readonly GRUPOS_CACHE_TTL = 60 * 1000;

  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private jwtService: JwtService,
    private blacklistService: BlacklistService,
    private refreshTokenService: RefreshTokenService,
    private emailService: EmailService,
  ) {}

  private async resolvePermisos(permisosIds: string[]): Promise<string[]> {
    if (!permisosIds || permisosIds.length === 0) return [];

    const cacheKey = permisosIds.sort().join(',');
    const cached = this.permisosCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.nombres;
    }

    const { data } = await this.supabase
      .from('permisos')
      .select('nombre')
      .in('id', permisosIds);

    const nombres = data?.map((p) => p.nombre) || [];

    this.permisosCache.set(cacheKey, {
      nombres,
      timestamp: now,
    });

    return nombres;
  }

  async getGruposDelUsuario(userId: string): Promise<any[]> {
    const cacheKey = userId;
    const cached = this.gruposCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.GRUPOS_CACHE_TTL) {
      return cached.grupos;
    }

    const { data, error } = await this.supabase
      .from('grupo_miembros')
      .select('grupo_id, grupos(nombre)')
      .eq('usuario_id', userId);

    if (error || !data) {
      this.gruposCache.set(cacheKey, { grupos: [], timestamp: now });
      return [];
    }

    const grupos = data.map((item: any) => ({
      id: item.grupo_id,
      nombre: item.grupos?.nombre || '',
    }));

    this.gruposCache.set(cacheKey, { grupos, timestamp: now });
    return grupos;
  }

  async getPermisosDeGrupo(
    grupoId: string,
    usuarioId: string,
  ): Promise<string[]> {
    const cacheKey = `${grupoId}:${usuarioId}`;
    const cached = this.permisosCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.nombres;
    }

    const { data } = await this.supabase
      .from('grupo_usuario_permisos')
      .select('permiso_id')
      .eq('grupo_id', grupoId)
      .eq('usuario_id', usuarioId);

    if (!data || data.length === 0) {
      this.permisosCache.set(cacheKey, { nombres: [], timestamp: now });
      return [];
    }

    const permisoIds = data.map((p) => p.permiso_id);
    const nombres = await this.resolvePermisos(permisoIds);

    this.permisosCache.set(cacheKey, { nombres, timestamp: now });
    return nombres;
  }

  async getPermisosCompletos(userId: string): Promise<{
    permisos_globales: string[];
    permisos_por_grupo: {
      grupo_id: string;
      nombre: string;
      permisos: string[];
    }[];
    ultimo_actualizado: string;
  }> {
    const [user, grupos] = await Promise.all([
      this.supabase
        .from('usuarios')
        .select('permisos_globales')
        .eq('id', userId)
        .single(),
      this.getGruposDelUsuario(userId),
    ]);

    const permisosGlobales = await this.resolvePermisos(
      user.data?.permisos_globales || [],
    );

    const permisosPorGrupo = await Promise.all(
      grupos.map(async (grupo) => ({
        grupo_id: grupo.id,
        nombre: grupo.nombre,
        permisos: await this.getPermisosDeGrupo(grupo.id, userId),
      })),
    );

    return {
      permisos_globales: permisosGlobales,
      permisos_por_grupo: permisosPorGrupo.filter(
        (pg) => pg.permisos.length > 0,
      ),
      ultimo_actualizado: new Date().toISOString(),
    };
  }

  invalidateGruposCache(userId: string): void {
    this.gruposCache.delete(userId);
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
    const permisosCompletos = await this.getPermisosCompletos(userId);
    return {
      permisos_globales: permisosCompletos.permisos_globales,
      permisos_por_grupo: permisosCompletos.permisos_por_grupo,
      ultimo_actualizado: permisosCompletos.ultimo_actualizado,
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
    console.log('[AUTH-SERVICE] Login for user:', user.id);
    
    const grupos = await this.getGruposDelUsuario(user.id);
    console.log('[AUTH-SERVICE] Grupos:', grupos);

    const permisosPorGrupo = await Promise.all(
      grupos.map(async (grupo) => ({
        id: grupo.id,
        nombre: grupo.nombre,
        permisos: await this.getPermisosDeGrupo(grupo.id, user.id),
      })),
    );
    console.log('[AUTH-SERVICE] Permisos por grupo:', permisosPorGrupo);

    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      permisos_globales: user.permisos_globales,
      grupos: permisosPorGrupo,
      jti,
    };
    console.log('[AUTH-SERVICE] JWT payload:', payload);

    const nowStamp = new Date().toISOString();

    // ✅ OPTIMIZACIÓN: Paralelizar update last_login + fetch perfil + generar tokens
    const [, [userData], accessToken, refreshToken] = await Promise.all([
      // 1. Actualizar last_login (fire & forget en paralelo)
      this.supabase
        .from('usuarios')
        .update({ last_login: nowStamp })
        .eq('id', user.id),

      // 2. Obtener datos del perfil en paralelo
      this.supabase
        .from('usuarios')
        .select(
          'nombre_completo, username, email, telefono, direccion, fecha_nacimiento, fecha_inicio',
        )
        .eq('id', user.id)
        .single()
        .then(({ data }) => [data]),

      // 3. Firmar access token (síncrono pero dentro del Promise.all para limpieza)
      Promise.resolve(this.jwtService.sign(payload)),

      // 4. Generar refresh token (implica insert a Supabase) en paralelo
      this.refreshTokenService.generateRefreshToken(user.id),
    ]);

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
      grupos: permisosPorGrupo,
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
    
    const grupos = await this.getGruposDelUsuario(payload.sub);
    const permisosPorGrupo = await Promise.all(
      grupos.map(async (grupo) => ({
        id: grupo.id,
        nombre: grupo.nombre,
        permisos: await this.getPermisosDeGrupo(grupo.id, payload.sub),
      })),
    );

    const newJti = crypto.randomUUID();

    const newPayload = {
      sub: payload.sub,
      permisos_globales: permisosNombres,
      grupos: permisosPorGrupo,
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
      grupos: permisosPorGrupo,
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
    console.log('[AUTH-SERVICE] getProfile for user:', userId);
    
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

    const grupos = await this.getGruposDelUsuario(userId);
    const permisosPorGrupo = await Promise.all(
      grupos.map(async (grupo) => ({
        id: grupo.id,
        nombre: grupo.nombre,
        permisos: await this.getPermisosDeGrupo(grupo.id, userId),
      })),
    );
    console.log('[AUTH-SERVICE] getProfile grupos:', permisosPorGrupo);

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
      grupos: permisosPorGrupo,
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
