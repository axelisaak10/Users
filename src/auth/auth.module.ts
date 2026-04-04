import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { BlacklistService } from './services/blacklist.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { PermissionVerifyService } from './services/permission-verify.service';
import { AuthMiddleware } from './middleware/auth.middleware';
import { EmailService } from './services/email.service';
import { SseService } from './services/sse.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-jwt-key'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    UsersService,
    EmailService,
    JwtStrategy,
    BlacklistService,
    RefreshTokenService,
    PermissionVerifyService,
    SseService,
  ],
  exports: [
    AuthService,
    JwtModule,
    BlacklistService,
    RefreshTokenService,
    PermissionVerifyService,
    SseService,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/events', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
