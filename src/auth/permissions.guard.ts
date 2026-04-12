import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISOS_KEY = 'permisos';
export const Permisos =
  (...permisos: string[]) =>
  (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(PERMISOS_KEY, permisos, descriptor?.value || target);
    return descriptor || target;
  };

/**
 * Guard que verifica permisos usando los datos del JWT directamente.
 *
 * ✅ OPTIMIZACIÓN: Ya NO consulta Supabase en cada request.
 *    Los permisos ya vienen decodificados en req.user.permisos_globales
 *    por el JwtStrategy (passport-jwt). Esto elimina 2 queries a Supabase
 *    por cada petición autenticada.
 *
 * ⚠️  TRADEOFF: Los cambios de permisos se reflejan cuando el token expire (1h).
 *    El frontend recibe un evento SSE 'permissions-updated' y debe renovar el token.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermisos = this.reflector.getAllAndOverride<string[]>(
      PERMISOS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sin permisos requeridos → libre acceso
    if (!requiredPermisos || requiredPermisos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Los permisos ya vienen en el JWT — seteados por JwtStrategy.validate()
    const globalPerms = user.permisos_globales || [];
    const groupPerms = user.grupos?.flatMap((g: any) => g.permisos || []) || [];
    const userPermisos: string[] = [...new Set([...globalPerms, ...groupPerms])];

    // superadmin tiene acceso total
    if (userPermisos.includes('superadmin')) {
      return true;
    }

    // Verificar que tenga AL MENOS UNO de los permisos requeridos
    const hasAny = requiredPermisos.some((p) => userPermisos.includes(p));

    if (!hasAny) {
      throw new ForbiddenException(
        `Permiso denegado. Requerido: ${requiredPermisos.join(' | ')}`,
      );
    }

    return true;
  }
}
