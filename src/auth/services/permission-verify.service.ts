import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

interface PermissionCache {
  nombres: string[];
  timestamp: number;
}

@Injectable()
export class PermissionVerifyService {
  private permisosCache: Map<string, PermissionCache> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

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

    const permisosNombres = await this.getCachedPermissionNames(
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

  invalidateCache(userId: string): void {
    this.permisosCache.delete(userId);
  }

  private async getCachedPermissionNames(permisosIds: string[]): Promise<string[]> {
    if (!permisosIds || permisosIds.length === 0) {
      return [];
    }

    const cacheKey = permisosIds.sort().join(',');
    const cached = this.permisosCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
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
}
