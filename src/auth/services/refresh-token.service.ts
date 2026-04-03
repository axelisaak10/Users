import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  exp: number;
}

@Injectable()
export class RefreshTokenService {
  private readonly REFRESH_SECRET: string;
  private readonly REFRESH_EXPIRY = '7d';

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {
    this.REFRESH_SECRET = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
      'super-secret-refresh-key',
    );
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const jti = crypto.randomUUID();

    const payload = {
      sub: userId,
      jti,
      type: 'refresh',
    };

    const token = this.jwtService.sign(payload, {
      secret: this.REFRESH_SECRET,
      expiresIn: this.REFRESH_EXPIRY,
    });

    const now = new Date();
    const expiraEn = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await this.supabase.from('refresh_tokens').insert({
      user_id: userId,
      token: token,
      jti: jti,
      expira_en: expiraEn.toISOString(),
      activo: true,
    });

    return token;
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.REFRESH_SECRET,
      });

      if (payload.type !== 'refresh') {
        return null;
      }

      const { data } = await this.supabase
        .from('refresh_tokens')
        .select('id')
        .eq('jti', payload.jti)
        .eq('activo', true)
        .gte('expira_en', new Date().toISOString())
        .limit(1);

      if (!data || data.length === 0) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.supabase
      .from('refresh_tokens')
      .update({ activo: false })
      .eq('user_id', userId)
      .eq('activo', true);
  }

  getRefreshTokenExpiry(): Date {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    return now;
  }
}
