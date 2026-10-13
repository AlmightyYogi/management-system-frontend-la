import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

function isGuestUser(user: any): boolean {
  if (!user) return false;
  const name = String(user.role_name ?? user.role ?? '').toLowerCase();
  if (name === 'guest') return true;
  return Number(user.role_id) === 4;
}

const GuestGuard = ({ allowGuest = false }: { allowGuest?: boolean }) => {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (isGuestUser(user) && !allowGuest) {
    return <Navigate to="/vss/monitor" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default GuestGuard;