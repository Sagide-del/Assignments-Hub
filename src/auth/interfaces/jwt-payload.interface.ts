import { Role } from '../../common/enums/role.enum';

export interface JwtPayload {
  sub: number; // user id
  schoolId: number;
  role: Role;
}
