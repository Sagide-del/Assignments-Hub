import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Tighter limit than the global default to slow down credential stuffing.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('staff/login')
  loginStaff(@Body() dto: StaffLoginDto, @Req() req: Request) {
    return this.authService.loginStaff(dto, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('student/login')
  loginStudent(@Body() dto: StudentLoginDto, @Req() req: Request) {
    return this.authService.loginStudent(dto, req.ip);
  }

  // Public: the access token is expired (that's the whole point of calling
  // this), so it can't be used to authenticate the request — the refresh
  // token in the body is what's actually validated, against the DB.
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, req.ip);
  }

  // Public for the same reason as refresh — logging out shouldn't require
  // a still-valid access token, only the refresh token being revoked.
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
