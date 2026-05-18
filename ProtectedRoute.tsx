import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  projectId?: string;
  artistId?: string;
  workspaceId?: string;
  requiredAction?: string;
  fallbackPath?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// 403 Forbidden Page Component
export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Shield className="h-16 w-16 mx-auto text-destructive" />
        </div>
        <h1 className="text-4xl font-bold mb-4">403</h1>
        <h2 className="text-xl font-semibold mb-4">Acceso Denegado</h2>
        <p className="text-muted-foreground mb-6">
          No tienes permisos para acceder a este recurso. Si crees que esto es un error, 
          contacta con tu administrador.
        </p>
        <div className="space-y-2">
          <Button asChild variant="default">
            <a href="/dashboard">Volver al Dashboard</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/">Ir al Inicio</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
