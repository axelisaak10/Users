import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  CreateUserDto,
  UpdateUserDto,
  SearchUserQueryDto,
} from './dto/user-management.dto';
import { EmailService } from './services/email.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private emailService: EmailService,
  ) {}

  async findAll(filters?: SearchUserQueryDto) {
    let query = this.supabase
      .from('usuarios')
      .select(
        'id, nombre_completo, username, email, telefono, direccion, fecha_inicio, fecha_nacimiento, last_login, permisos_globales, creado_en',
      );

    if (filters?.q) {
      query = query.or(
        `username.ilike.%${filters.q}%,email.ilike.%${filters.q}%`,
      );
    }
    if (filters?.username) {
      query = query.ilike('username', `%${filters.username}%`);
    }
    if (filters?.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const usuariosConPermisos = await Promise.all(
      (data || []).map(async (user) => {
        const permisos = await this.resolvePermisos(
          user.permisos_globales || [],
        );
        return {
          ...user,
          permisos_globales_detailed: permisos,
          permisos_globales_nombres: permisos.map((p) => p.nombre),
        };
      }),
    );

    return usuariosConPermisos;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select(
        'id, nombre_completo, username, email, telefono, direccion, fecha_inicio, fecha_nacimiento, last_login, permisos_globales, creado_en',
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Usuario no encontrado');

    const permisos = await this.resolvePermisos(data.permisos_globales || []);
    return {
      ...data,
      permisos_globales_detailed: permisos,
      permisos_globales_nombres: permisos.map((p) => p.nombre),
    };
  }

  async create(createUserDto: CreateUserDto, adminEmail: string) {
    const { data: exist } = await this.supabase
      .from('usuarios')
      .select('id')
      .or(
        `email.eq.${createUserDto.email},username.eq.${createUserDto.username}`,
      )
      .limit(1);

    if (exist?.length) {
      throw new ConflictException('Email o username ya existen');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const { data, error } = await this.supabase
      .from('usuarios')
      .insert({
        nombre_completo: createUserDto.nombre_completo,
        username: createUserDto.username,
        email: createUserDto.email,
        password: hashedPassword,
        direccion: createUserDto.direccion || null,
        telefono: createUserDto.telefono || null,
        fecha_nacimiento: createUserDto.fecha_nacimiento || null,
        fecha_inicio: new Date().toISOString().split('T')[0],
        permisos_globales: createUserDto.permisos_globales || [],
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.emailService.sendWelcomeEmail(
      createUserDto.email,
      createUserDto.username,
      createUserDto.password,
      adminEmail,
    );

    return data;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const { data: existing } = await this.supabase
      .from('usuarios')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) throw new NotFoundException('Usuario no encontrado');

    if (updateUserDto.email || updateUserDto.username) {
      const orConditions: string[] = [];
      if (updateUserDto.email)
        orConditions.push(`email.eq.${updateUserDto.email}`);
      if (updateUserDto.username)
        orConditions.push(`username.eq.${updateUserDto.username}`);

      const { data: duplicate } = await this.supabase
        .from('usuarios')
        .select('id')
        .neq('id', id)
        .or(orConditions.join(','));

      if (duplicate?.length) {
        throw new ConflictException('Email o username ya están en uso');
      }
    }

    const updates: any = {};
    if (updateUserDto.nombre_completo)
      updates.nombre_completo = updateUserDto.nombre_completo;
    if (updateUserDto.username) updates.username = updateUserDto.username;
    if (updateUserDto.email) updates.email = updateUserDto.email;
    if (updateUserDto.direccion !== undefined)
      updates.direccion = updateUserDto.direccion;
    if (updateUserDto.telefono !== undefined)
      updates.telefono = updateUserDto.telefono;
    if (updateUserDto.fecha_nacimiento !== undefined)
      updates.fecha_nacimiento = updateUserDto.fecha_nacimiento;
    if (updateUserDto.permisos_globales)
      updates.permisos_globales = updateUserDto.permisos_globales;

    const { data, error } = await this.supabase
      .from('usuarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Usuario eliminado correctamente' };
  }

  async changePassword(id: string, adminId: string) {
    const { data: user } = await this.supabase
      .from('usuarios')
      .select('email, nombre_completo, username')
      .eq('id', id)
      .single();

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const { data: admin } = await this.supabase
      .from('usuarios')
      .select('nombre_completo')
      .eq('id', adminId)
      .single();

    const adminName = admin?.nombre_completo || 'Administrador';

    const newPassword = crypto.randomBytes(5).toString('base64').slice(0, 10);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error } = await this.supabase
      .from('usuarios')
      .update({ password: hashedPassword })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    const emailSent = await this.emailService.sendPasswordResetEmail(
      user.email,
      newPassword,
      adminName,
      user.username,
    );

    return {
      success: true,
      emailSent,
      message: emailSent
        ? 'Contraseña actualizada y enviada al correo del usuario'
        : 'Contraseña actualizada pero el email no pudo ser enviado',
    };
  }

  async assignPermissions(id: string, permisos: string[]) {
    const { data: user } = await this.supabase
      .from('usuarios')
      .select('permisos_globales')
      .eq('id', id)
      .single();

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const currentPermisos = user.permisos_globales || [];
    const newPermisos = [...new Set([...currentPermisos, ...permisos])];

    const { error } = await this.supabase
      .from('usuarios')
      .update({ permisos_globales: newPermisos })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    const permisosNombres = await this.resolvePermisos(newPermisos);
    return {
      permisos_globales: newPermisos,
      permisos_globales_detailed: permisosNombres,
      permisos_globales_nombres: permisosNombres.map((p) => p.nombre),
    };
  }

  async removePermissions(id: string, permisos: string[]) {
    const { data: user } = await this.supabase
      .from('usuarios')
      .select('permisos_globales')
      .eq('id', id)
      .single();

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const currentPermisos = user.permisos_globales || [];
    const newPermisos = currentPermisos.filter((p) => !permisos.includes(p));

    const { error } = await this.supabase
      .from('usuarios')
      .update({ permisos_globales: newPermisos })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    const permisosNombres = await this.resolvePermisos(newPermisos);
    return {
      permisos_globales: newPermisos,
      permisos_globales_detailed: permisosNombres,
      permisos_globales_nombres: permisosNombres.map((p) => p.nombre),
    };
  }

  async getAllPermissions() {
    const { data, error } = await this.supabase
      .from('permisos')
      .select('id, nombre, descripcion, creado_en')
      .order('nombre');

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async resolvePermisos(
    permisosIds: string[],
  ): Promise<{ id: string; nombre: string; descripcion: string }[]> {
    if (!permisosIds || permisosIds.length === 0) return [];
    const { data } = await this.supabase
      .from('permisos')
      .select('id, nombre, descripcion')
      .in('nombre', permisosIds);
    return (
      data?.map((p) => ({
        id: p.nombre,
        nombre: p.nombre,
        descripcion: p.descripcion || p.nombre,
      })) || []
    );
  }
}
