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

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.permisos_globales) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta accion',
      );
    }

    const requiredPermisos = this.reflector.getAllAndOverride<string[]>(
      PERMISOS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermisos || requiredPermisos.length === 0) {
      return true;
    }

    const hasPermission = requiredPermisos.every((perm) =>
      user.permisos_globales.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'No tienes el permiso necesario: ' + requiredPermisos.join(', '),
      );
    }

    return true;
  }
}
