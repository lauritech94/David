import { useAuth } from '@/hooks/useAuth';
import { useAuthz } from '@/hooks/useAuthz';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Eye, Edit, Settings, Crown, UserCog } from 'lucide-react';

interface PermissionChipProps {
  projectId?: string;
  artistId?: string;
  workspaceId?: string;
  className?: string;
}

export function PermissionChip({ projectId, artistId, workspaceId, className }: PermissionChipProps) {
  const { profile } = useAuth();
  const { canView, canEdit, canManage, loading } = useAuthz({ projectId, artistId, workspaceId });

  if (loading || !profile) {
    return (
      <Badge variant="secondary" className={className}>
        <Shield className="h-3 w-3 mr-1" />
        Verificando...
      </Badge>
    );
  }

  // Determine highest permission level
  const getPermissionLevel = () => {
    if (canManage) return 'manage';
    if (canEdit) return 'edit';
    if (canView) return 'view';
    return 'none';
  };

  const getPermissionDisplay = () => {
    const level = getPermissionLevel();
    const role = profile.active_role;

    switch (level) {
      case 'manage':
        return {
          icon: Crown,
          label: role === 'artist' ? 'Propietario' : 'Manager',
          variant: 'default' as const,
          tooltip: 'Acceso completo: ver, editar, gestionar usuarios y configuración'
        };
      case 'edit':
        return {
          icon: Edit,
          label: 'Editor',
          variant: 'secondary' as const,
          tooltip: 'Puede ver y editar contenido, crear presupuestos y booking'
        };
      case 'view':
        return {
          icon: Eye,
          label: 'Observador',
          variant: 'outline' as const,
          tooltip: 'Solo lectura: puede ver contenido pero no editarlo'
        };
      default:
        return {
          icon: Shield,
          label: 'Sin acceso',
          variant: 'destructive' as const,
          tooltip: 'No tienes permisos para acceder a este recurso'
        };
    }
  };

  const permission = getPermissionDisplay();
  const Icon = permission.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={permission.variant} className={`${className} cursor-help`}>
            <Icon className="h-3 w-3 mr-1" />
            {permission.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-semibold mb-2">Permisos actuales:</p>
            <p className="text-sm">{permission.tooltip}</p>
            {profile.active_role && (
              <p className="text-xs text-muted-foreground mt-2">
                Rol activo: {profile.active_role === 'artist' ? 'Artista' : 'Management'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Higher-order component to conditionally render based on permissions
interface PermissionGateProps {
  children: React.ReactNode;
  projectId?: string;
  artistId?: string;
  workspaceId?: string;
  requiredPermission: 'view' | 'edit' | 'manage';
  fallback?: React.ReactNode;
}

export function PermissionGate({ 
  children, 
  projectId, 
  artistId, 
  workspaceId, 
  requiredPermission,
  fallback 
}: PermissionGateProps) {
  const { canView, canEdit, canManage, loading } = useAuthz({ projectId, artistId, workspaceId });

  if (loading) {
    return fallback || null;
  }

  const hasRequiredPermission = () => {
    switch (requiredPermission) {
      case 'view':
        return canView;
      case 'edit':
        return canEdit;
      case 'manage':
        return canManage;
      default:
        return false;
    }
  };

  return hasRequiredPermission() ? <>{children}</> : (fallback || null);
}

// Hook for getting detailed permission info
export function useDetailedPermissions(projectId?: string, artistId?: string, workspaceId?: string) {
  const { profile } = useAuth();
  const authz = useAuthz({ projectId, artistId, workspaceId });

  const getCapabilities = () => {
    const capabilities: string[] = [];

    if (authz.canView) {
      capabilities.push('Ver contenido');
    }
    if (authz.canEdit) {
      capabilities.push('Editar contenido', 'Crear presupuestos', 'Gestionar booking', 'Crear EPKs');
    }
    if (authz.canManage) {
      capabilities.push('Gestionar usuarios', 'Configurar permisos', 'Eliminar contenido');
    }

    return capabilities;
  };

  const getRoleDescription = () => {
    if (!profile) return '';

    const role = profile.active_role;
    if (authz.canManage) {
      return role === 'artist' 
        ? 'Tienes control total sobre tu perfil y proyectos'
        : 'Puedes gestionar este artista y todos sus proyectos';
    }
    if (authz.canEdit) {
      return 'Puedes editar y crear contenido en este contexto';
    }
    if (authz.canView) {
      return 'Solo puedes ver contenido, sin permisos de edición';
    }
    return 'No tienes acceso a este recurso';
  };

  return {
    ...authz,
    capabilities: getCapabilities(),
    roleDescription: getRoleDescription()
  };
}