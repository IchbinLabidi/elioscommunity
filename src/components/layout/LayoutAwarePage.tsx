import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import AppLayout from './AppLayout';
import PublicLayout from './PublicLayout';

export default function LayoutAwarePage() {
  const { loading, profile, session } = useAuth();

  if (loading) return <LoadingSpinner fullPage label="Loading Elios Community" />;

  return session && profile ? <AppLayout /> : <PublicLayout />;
}
