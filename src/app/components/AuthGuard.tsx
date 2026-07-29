import { Navigate, useLocation } from 'react-router';
import { useApp } from '../lib/store';
import { clearToken, getToken } from '../lib/api/client';
import { Button } from './ui/button';

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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!state.currentUser && !hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!state.currentUser && hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-muted-foreground">
            Gagal memuat sesi. Periksa koneksi, lalu coba lagi.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>Coba lagi</Button>
            <Button
              variant="outline"
              onClick={() => {
                clearToken();
                window.location.assign('/login');
              }}
            >
              Ke halaman login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
