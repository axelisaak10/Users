import { Global, Module } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'SUPABASE_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService): SupabaseClient => {
        return createClient(
          configService.get<string>('NEXT_PUBLIC_SUPABASE_URL')!,
          configService.get<string>('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')!,
        );
      },
    },
  ],
  exports: ['SUPABASE_CLIENT'],
})
export class DatabaseModule {}
