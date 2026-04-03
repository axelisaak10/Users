import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionVerifyService } from './services/permission-verify.service';

export const PERMISOS_KEY = 'permisos';
export const Permisos =
  (...permisos: string[]) =>
  (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(PERMISOS_KEY, permisos, descriptor?.value || target);
    return descriptor || target;
  };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => PermissionVerifyService))
    private permissionVerify: PermissionVerifyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const requiredPermisos = this.reflector.getAllAndOverride<string[]>(
      PERMISOS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermisos || requiredPermisos.length === 0) {
      return true;
    }

    for (const permission of requiredPermisos) {
      const hasPermission = await this.permissionVerify.hasPermission(
        user.sub,
        permission,
      );

      if (!hasPermission) {
        throw new ForbiddenException(`Permiso denegado: ${permission}`);
      }
    }

    return true;
  }
}
