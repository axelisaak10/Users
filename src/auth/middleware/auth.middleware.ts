import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BlacklistService } from '../services/blacklist.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private blacklistService: BlacklistService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractToken(req);

    if (token) {
      try {
        const decoded = this.jwtService.verify(token, {
          secret: this.configService.get<string>(
            'JWT_SECRET',
            'super-secret-jwt-key',
          ),
        });

        const isBlacklisted = await this.blacklistService.isTokenBlacklisted(
          decoded.jti,
        );
        if (isBlacklisted) {
          throw new UnauthorizedException('Token ha sido invalidado');
        }

        (req as any).user = {
          sub: decoded.sub,
          permisos_globales: decoded.permisos_globales || [],
          jti: decoded.jti,
        };
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
      }
    }

    next();
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const cookie = req.headers.cookie;
    if (cookie) {
      const match = cookie.match(/Authentication=([^;]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }

    return null;
  }
}
