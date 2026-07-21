import { Navigate, useLocation } from 'react-router';
import { useApp } from '../lib/store';
import { getToken } from '../lib/api/client';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { state } = useApp();
  const location = useLocation();
  const hasToken = !!getToken();

  if (state.authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!state.currentUser && !hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!state.currentUser && hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Mengautentikasi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
