import { ReactNode } from 'react';
import { useAuthz } from '@/hooks/useAuthz';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface PermissionBoundaryProps {
  children: ReactNode;
  projectId?: string;
  artistId?: string;
  workspaceId?: string;
  requiredPermission: 'view' | 'edit' | 'manage' | 'createBudget' | 'createBooking' | 'createEPK';
  fallback?: ReactNode;
  hideWhenDenied?: boolean; // If true, renders nothing when denied. If false, shows fallback
}

export function PermissionBoundary({
  children,
  projectId,
  artistId,
  workspaceId,
  requiredPermission,
  fallback,
  hideWhenDenied = true
}: PermissionBoundaryProps) {
  const permissions = useAuthz({ projectId, artistId, workspaceId });

  // Show loading state
  if (permissions.loading) {
    return hideWhenDenied ? null : (fallback || null);
  }

  // Check if user has required permission
  const hasPermission = () => {
    switch (requiredPermission) {
      case 'view':
        return permissions.canView;
      case 'edit':
        return permissions.canEdit;
      case 'manage':
        return permissions.canManage;
      case 'createBudget':
        return permissions.canCreateBudget;
      case 'createBooking':
        return permissions.canCreateBooking;
      case 'createEPK':
        return permissions.canCreateEPK;
      default:
        return false;
    }
  };

  if (hasPermission()) {
    return <>{children}</>;
  }

  // Return nothing if hideWhenDenied is true, otherwise show fallback
  if (hideWhenDenied) {
    return null;
  }

  return fallback || (
    <Alert className="border-destructive/50">
      <Shield className="h-4 w-4" />
      <AlertDescription>
        No tienes permisos suficientes para realizar esta acción.
      </AlertDescription>
    </Alert>
  );
}

// Utility component for wrapping buttons/actions
interface PermissionWrapperProps {
  children: ReactNode;
  projectId?: string;
  artistId?: string;
  workspaceId?: string;
  requiredPermission: 'view' | 'edit' | 'manage' | 'createBudget' | 'createBooking' | 'createEPK';
}

export function PermissionWrapper({
  children,
  projectId,
  artistId,
  workspaceId,
  requiredPermission
}: PermissionWrapperProps) {
  return (
    <PermissionBoundary
      projectId={projectId}
      artistId={artistId}
      workspaceId={workspaceId}
      requiredPermission={requiredPermission}
      hideWhenDenied={true}
    >
      {children}
    </PermissionBoundary>
  );
}