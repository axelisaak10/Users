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
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard, Permisos } from './permissions.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(loginDto);
    const result = await this.authService.login(user);

    response.cookie('Authentication', result.access_token, {
      httpOnly: true,
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
      httpOnly: true,
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

  @Patch('profile')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permisos('user:profile:edit')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }
}
