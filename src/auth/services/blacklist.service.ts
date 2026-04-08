import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class BlacklistService {
  private cache: Map<string, { blacklisted: boolean; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 60 * 1000;

  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;

    const cached = this.cache.get(jti);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.blacklisted;
    }

    const { data } = await this.supabase
      .from('tokens_blacklist')
      .select('id')
      .eq('token_id', jti)
      .gte('expira_en', new Date().toISOString())
      .limit(1);

    const blacklisted = !!data && data.length > 0;

    this.cache.set(jti, { blacklisted, timestamp: Date.now() });

    return blacklisted;
  }

  async addToBlacklist(jti: string, expiraEn: Date): Promise<void> {
    const { error } = await this.supabase.from('tokens_blacklist').upsert(
      {
        token_id: jti,
        expira_en: expiraEn.toISOString(),
        creado_en: new Date().toISOString(),
      },
      { onConflict: 'token_id', ignoreDuplicates: true },
    );

    if (error && error.code !== '23505') {
      console.error('Error adding to blacklist:', error);
    }

    this.cache.set(jti, { blacklisted: true, timestamp: Date.now() });
  }

  async cleanExpiredTokens(): Promise<void> {
    const now = new Date().toISOString();
    await this.supabase.from('tokens_blacklist').delete().lt('expira_en', now);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
