import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useApp } from '../lib/store';
import { login } from '../lib/api/services';
import { ApiError, getToken } from '../lib/api/client';
import { Ticket, AlertTriangle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.currentUser && getToken()) {
      navigate('/', { replace: true });
    }
  }, [state.currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await login(email, password);
      dispatch({ type: 'SET_USER', payload: user });
      toast.success(`Selamat datang, ${user.name}!`);
      navigate('/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login gagal';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ticket className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Ticketing System</CardTitle>
          <CardDescription>Masuk untuk mengakses dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="anton@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sedang masuk...' : 'Masuk'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/forgot-password" className="text-primary hover:underline">
                Lupa kata sandi?
              </Link>
              {" · "}
              <Link to="/register" className="text-primary hover:underline">
                Buat akun
              </Link>
            </p>
          </form>
          <div className="mt-4 rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Akun demo (kata sandi: 12345678)</p>
                <p>anton@example.com — admin</p>
                <p>rusdi@example.com — team_lead</p>
                <p>amba@example.com — it_staff</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
