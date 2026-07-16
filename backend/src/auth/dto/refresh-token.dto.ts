import { IsNotEmpty, IsString } from 'class-validator';

/** Body for both POST /auth/refresh and POST /auth/logout — same shape,
 * different effect (rotate vs. revoke). */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
