import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PrivateRouteProps {
  allowedRoles?: Array<'PROFESSOR' | 'COORDENADOR'>;
}

/**
 * PrivateRoute — wraps protected routes. Redirects to /login when unauthenticated.
 * Optionally restricts access by role.
 */
export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <Outlet />;
}
