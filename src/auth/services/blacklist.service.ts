import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class BlacklistService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;

    const { data } = await this.supabase
      .from('tokens_blacklist')
      .select('id')
      .eq('token_id', jti)
      .gte('expira_en', new Date().toISOString())
      .limit(1);

    return !!data && data.length > 0;
  }

  async addToBlacklist(jti: string, expiraEn: Date): Promise<void> {
    const { error } = await this.supabase.from('tokens_blacklist').insert({
      token_id: jti,
      expira_en: expiraEn.toISOString(),
      creado_en: new Date().toISOString(),
    });

    if (error) {
      console.error('Error adding to blacklist:', error);
    }
  }

  async cleanExpiredTokens(): Promise<void> {
    const now = new Date().toISOString();
    await this.supabase.from('tokens_blacklist').delete().lt('expira_en', now);
  }
}
