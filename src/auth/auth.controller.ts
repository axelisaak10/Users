import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UnauthorizedException,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SseService } from './services/sse.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
  ForgotPasswordDto,
} from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard, Permisos } from './permissions.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sseService: SseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(loginDto);
    const result = await this.authService.login(user);

    response.cookie('Authentication', result.access_token, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60,
    });

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('No se proporcionó refresh token');
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    response.cookie('Authentication', result.access_token, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60,
    });

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return {
      access_token: result.access_token,
      id: result.id,
      permisos_globales: result.permisos_globales,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  async revoke(
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const jti = req.user.jti;
    await this.authService.revokeToken(req.user.sub, jti);

    response.clearCookie('Authentication', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return { message: 'Token invalidado exitosamente' };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any, @Res({ passthrough: true }) response: Response) {
    const jti = req.user.jti;
    this.authService.revokeToken(req.user.sub, jti);

    response.clearCookie('Authentication', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return { message: 'Sesion cerrada correctamente' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  async getCurrentPermissions(@Req() req: any) {
    return this.authService.getCurrentPermissions(req.user.sub);
  }

  @Get('permissions/grupos')
  @UseGuards(JwtAuthGuard)
  async getPermisosPorGrupos(@Req() req: any) {
    return this.authService.getPermisosCompletos(req.user.sub);
  }

  @Get('grupos')
  @UseGuards(JwtAuthGuard)
  async getGruposDelUsuario(@Req() req: any) {
    return this.authService.getGruposDelUsuario(req.user.sub);
  }

  @Get('grupos/:grupoId/permissions')
  @UseGuards(JwtAuthGuard)
  async getPermisosDeGrupo(@Req() req: any, @Param('grupoId') grupoId: string) {
    const permisos = await this.authService.getPermisosDeGrupo(
      grupoId,
      req.user.sub,
    );
    return {
      grupo_id: grupoId,
      permisos,
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permisos('user:profile:edit')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @Get('events')
  async events(@Req() req: any, @Res() res: Response) {
    const token =
      req.query.token ||
      req.headers.authorization?.replace('Bearer ', '') ||
      '';
    console.log(
      '[SSE] Events endpoint called, token:',
      token ? 'present' : 'missing',
    );

    if (!token) {
      console.log('[SSE] No token provided, returning 401');
      res.status(401).send('Unauthorized');
      return;
    }

    try {
      console.log('[SSE] Verifying token...');
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'super-secret-jwt-key',
        ),
      });
      console.log('[SSE] Token verified, userId:', decoded.sub);

      const clientId = decoded.sub;
      const userId = decoded.sub;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      this.sseService.addClient(clientId, userId, res);

      console.log('[SSE] Sending initial connected event...');
      const sendInitialEvent = () => {
        this.sseService.sendEvent(res, 'connected', {
          userId,
          timestamp: Date.now(),
        });
      };
      sendInitialEvent();
      console.log('[SSE] Initial event sent');

      const pingInterval = setInterval(() => {
        this.sseService.sendPing(res);
      }, 30000);

      req.on('close', () => {
        clearInterval(pingInterval);
        this.sseService.removeClient(clientId);
      });
    } catch (error) {
      console.log('[SSE] Token verification failed:', error.message);
      res.status(401).send('Invalid token');
    }
  }
}
