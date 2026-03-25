import { Injectable, Inject, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

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
}
