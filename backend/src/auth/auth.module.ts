import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    // Access tokens are now deliberately short-lived (default 15 minutes) —
    // they're meant to be silently refreshed via POST /auth/refresh using
    // the long-lived refresh token (see AuthService), not to carry a whole
    // session on their own the way the old 8h token did. A stolen access
    // token is only useful for ~15 minutes; a stolen refresh token is
    // revocable server-side (unlike a bare JWT) and rotates on every use.
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') || '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  // JwtStrategy is what actually populates req.user (re-fetches the user
  // from the DB, rejects deactivated accounts) — it must be a provider here
  // for Passport's 'jwt' strategy, used by JwtAuthGuard, to exist at all.
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}