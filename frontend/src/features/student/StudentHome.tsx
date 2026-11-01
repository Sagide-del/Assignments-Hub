import { useAuthStore } from '../../store/auth.store';
import { isEarlyYearsGrade } from '../../utils/gradeTier';
import { StudentDashboard } from './Dashboard';
import { EarlyYearsPlayground } from './early-years/EarlyYearsPlayground';

export function StudentHome() {
  const user = useAuthStore((state) => state.user);
  return isEarlyYearsGrade(user?.grade) ? <EarlyYearsPlayground grade={user?.grade ?? null} /> : <StudentDashboard />;
}
