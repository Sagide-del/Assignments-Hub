import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { Role } from '../../types';

interface Props {
  allow: Role[];
  redirectTo?: string;
}

// Route guard mirroring the backend's @Roles() decorator — this is a UX
// convenience only (hiding nav the user can't use), NOT a security boundary.
// The real authorization happens server-side via RolesGuard + TenantGuard
// on every request; this component never substitutes for that.
export function ProtectedRoute({ allow, redirectTo = '/login' }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
