import { Injectable, Inject, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  async create(createUserDto: CreateUserDto) {
    const { nombreCompleto, username, email, password, telefono, direccion, permisos } = createUserDto;

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

    let permisos_globales: string[] = [];
    if (permisos && permisos.length > 0) {
      const { data: perms } = await this.supabase
        .from('permisos')
        .select('id')
        .in('nombre', permisos);
        
      if (perms) {
        permisos_globales = perms.map((p) => p.id);
      }
    }

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

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { nombreCompleto, username, email, password, telefono, direccion, fecha_inicio } = updateProfileDto;
    
    // Validar nombre de usuario o correo existente que pertenezca a OTRO usuario
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

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await this.supabase
      .from('usuarios')
      .update(updates)
      .eq('id', userId)
      .select('id, nombre_completo, username, email, telefono, direccion, fecha_inicio')
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
