import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole } from '../lib/auth';
import { UserRole } from '../types/database';
import LoadingSpinner from './ui/LoadingSpinner';

export default function RoleBasedRoute({ roles, unauthenticatedTo }: { roles: UserRole[]; unauthenticatedTo?: string }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage label="Loading your workspace" />;
  }

  if (!user) {
    return <Navigate to={unauthenticatedTo ?? '/login'} replace state={{ from: location }} />;
  }

  if (!profile) {
    return <Navigate to="/complete-profile" replace state={{ from: location }} />;
  }

  if (!roles.includes(profile.role)) {
    return <Navigate to={dashboardPathForRole(profile.role)} replace />;
  }

  return <Outlet />;
}
