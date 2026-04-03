import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class PermissionVerifyService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    if (!userId || !permission) {
      return false;
    }

    const { data: user, error } = await this.supabase
      .from('usuarios')
      .select('permisos_globales')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return false;
    }

    const permisosNombres = await this.resolvePermisos(
      user.permisos_globales || [],
    );

    const hasPermission =
      permisosNombres.includes(permission) ||
      permisosNombres.includes('superadmin');

    return hasPermission;
  }

  async verifyPermission(userId: string, permission: string): Promise<void> {
    const hasPermission = await this.hasPermission(userId, permission);

    if (!hasPermission) {
      throw new ForbiddenException(`Permiso denegado: ${permission}`);
    }
  }

  private async resolvePermisos(permisosIds: string[]): Promise<string[]> {
    if (!permisosIds || permisosIds.length === 0) {
      return [];
    }

    const { data } = await this.supabase
      .from('permisos')
      .select('nombre')
      .in('nombre', permisosIds);

    return data?.map((p) => p.nombre) || [];
  }
}
