import { Injectable, Inject, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  // ─── Método auxiliar: resuelve UUIDs de permisos a nombres ───
  private async resolvePermissionNames(permisoIds: string[]): Promise<string[]> {
    if (!permisoIds || permisoIds.length === 0) return [];
    const { data } = await this.supabase
      .from('permisos')
      .select('nombre')
      .in('id', permisoIds);
    return data ? data.map(p => p.nombre) : [];
  }

  // ─── Método auxiliar: resuelve nombres de permisos a UUIDs ───
  private async resolvePermissionIds(permisoNames: string[]): Promise<string[]> {
    if (!permisoNames || permisoNames.length === 0) return [];
    const { data } = await this.supabase
      .from('permisos')
      .select('id')
      .in('nombre', permisoNames);
    return data ? data.map(p => p.id) : [];
  }

  // ═══════════════════════════════════════════════════════════
  // POST /users — Crear usuario (admin)
  // ═══════════════════════════════════════════════════════════
  async create(createUserDto: CreateUserDto) {
    const { nombreCompleto, username, email, password, telefono, direccion, permisos, fecha_nacimiento } = createUserDto;

    const { data: existingUsers } = await this.supabase
      .from('usuarios')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      throw new ConflictException('Email or username already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dt = new Date().toISOString().split('T')[0];
    const permisos_globales = await this.resolvePermissionIds(permisos || []);

    const { data: newUser, error } = await this.supabase
      .from('usuarios')
      .insert([
        {
          nombre_completo: nombreCompleto,
          username,
          email,
          password: hashedPassword,
          telefono: telefono || null,
          direccion: direccion || null,
          fecha_inicio: dt,
          fecha_nacimiento: fecha_nacimiento || null,
          permisos_globales: permisos_globales.length > 0 ? permisos_globales : null,
        },
      ])
      .select('id, nombre_completo, username, email, creado_en')
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return newUser;
  }

  // ═══════════════════════════════════════════════════════════
  // GET /users — Listar todos los usuarios
  // ═══════════════════════════════════════════════════════════
  async findAll() {
    const { data: users, error } = await this.supabase
      .from('usuarios')
      .select('id, nombre_completo, username, email, telefono, direccion, fecha_nacimiento, fecha_inicio, last_login, permisos_globales, creado_en')
      .order('creado_en', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // Resolver los nombres de permisos para cada usuario
    const result = await Promise.all(
      (users || []).map(async (user) => {
        const permNames = await this.resolvePermissionNames(user.permisos_globales || []);
        const { nombre_completo, permisos_globales, ...rest } = user;
        return {
          ...rest,
          nombreCompleto: nombre_completo,
          permisos_globales: permNames,
        };
      })
    );

    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH /users/:id — Editar cualquier usuario (admin)
  // ═══════════════════════════════════════════════════════════
  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const { nombreCompleto, username, email, password, telefono, direccion, fecha_nacimiento, permisos } = updateUserDto;

    // Validar duplicados excluyendo al usuario actual
    if (email || username) {
      const orConditions: string[] = [];
      if (email) orConditions.push(`email.eq.${email}`);
      if (username) orConditions.push(`username.eq.${username}`);

      if (orConditions.length > 0) {
        const { data: existing } = await this.supabase
          .from('usuarios')
          .select('id')
          .neq('id', userId)
          .or(orConditions.join(','));

        if (existing && existing.length > 0) {
          throw new ConflictException('El correo o nombre de usuario ya está siendo usado por otra cuenta');
        }
      }
    }

    const updates: any = {};
    if (nombreCompleto) updates.nombre_completo = nombreCompleto;
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (telefono !== undefined) updates.telefono = telefono;
    if (direccion !== undefined) updates.direccion = direccion;
    if (fecha_nacimiento !== undefined) updates.fecha_nacimiento = fecha_nacimiento;

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    // Resolver permisos de strings a UUIDs
    if (permisos) {
      updates.permisos_globales = await this.resolvePermissionIds(permisos);
    }

    const { data, error } = await this.supabase
      .from('usuarios')
      .update(updates)
      .eq('id', userId)
      .select('id, nombre_completo, username, email, telefono, direccion, fecha_nacimiento, fecha_inicio, last_login, permisos_globales')
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const permNames = await this.resolvePermissionNames(data.permisos_globales || []);
    const { nombre_completo, permisos_globales, ...rest } = data;
    return {
      ...rest,
      nombreCompleto: nombre_completo,
      permisos_globales: permNames,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE /users/:id — Eliminar usuario
  // ═══════════════════════════════════════════════════════════
  async deleteUser(userId: string) {
    const { error } = await this.supabase
      .from('usuarios')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { message: 'Usuario eliminado exitosamente' };
  }

  // ═══════════════════════════════════════════════════════════
  // GET /permissions — Permisos del usuario logueado
  // ═══════════════════════════════════════════════════════════
  async getPermissions(userId: string) {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('permisos_globales')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { permissions: [] };
    }

    return {
      permissions: data.permisos_globales || [],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH /users/profile — Editar perfil propio
  // ═══════════════════════════════════════════════════════════
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { nombreCompleto, username, email, password, telefono, direccion, fecha_inicio, fecha_nacimiento } = updateProfileDto;
    
    if (email || username) {
      const orConditions: string[] = [];
      if (email) orConditions.push(`email.eq.${email}`);
      if (username) orConditions.push(`username.eq.${username}`);

      if (orConditions.length > 0) {
        const { data: existing } = await this.supabase
          .from('usuarios')
          .select('id')
          .neq('id', userId)
          .or(orConditions.join(','));

        if (existing && existing.length > 0) {
          throw new ConflictException('El correo o nombre de usuario ya está siendo usado por otra cuenta');
        }
      }
    }

    const updates: any = {};
    if (nombreCompleto) updates.nombre_completo = nombreCompleto;
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (telefono !== undefined) updates.telefono = telefono;
    if (direccion !== undefined) updates.direccion = direccion;
    if (fecha_inicio) updates.fecha_inicio = fecha_inicio;
    if (fecha_nacimiento !== undefined) updates.fecha_nacimiento = fecha_nacimiento;

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await this.supabase
      .from('usuarios')
      .update(updates)
      .eq('id', userId)
      .select('id, nombre_completo, username, email, telefono, direccion, fecha_inicio, fecha_nacimiento')
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const { nombre_completo, ...rest } = data;
    return {
      ...rest,
      nombreCompleto: nombre_completo
    };
  }
}
