import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

interface Props {
  allowedRoles?: number[];
}

const ProtectedRoute = ({ allowedRoles }: Props) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role_id)) {
    return <Navigate to="/reports" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;