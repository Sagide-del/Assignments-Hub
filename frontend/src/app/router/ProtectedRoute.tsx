import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { dashboardPathForRole } from '../../services/authService';
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
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }
  if (!allow.includes(user.role)) {
    // A shared link or old browser tab can point at another role's workspace.
    // Preserve the requested path so the recovery page can explain the route.
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname, home: dashboardPathForRole(user.role) }} />;
  }
  return <Outlet />;
}
