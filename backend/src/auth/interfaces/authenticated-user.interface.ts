import { Role } from '../../common/enums/role.enum';

/** Shape attached to `req.user` after JwtAuthGuard runs. */
export interface AuthenticatedUser {
  allowed_streams?: { stream_id: string; subject: string }[];
  id: number;
  schoolId: number;
  role: Role;
  name: string;
  email: string | null;
  admissionNumber: string | null;
  grade: string | null;
  isIndependentTrial: boolean;
}
