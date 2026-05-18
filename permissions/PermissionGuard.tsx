import { type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCan } from '@/hooks/useFunctionalPermissions';
import type { ModuleKey, PermissionLevel } from '@/lib/permissions/types';
import { getModule } from '@/lib/permissions/catalog';

interface PermissionGuardProps {
  module: ModuleKey;
  required: PermissionLevel;
  /** Render fn — recibe `allowed` para que el caller decida cómo presentar el bloqueo. */
  children: (allowed: boolean) => ReactNode;
  /** Si true (default), envuelve children no permitidos en tooltip explicativo. */
  withTooltip?: boolean;
  /** Tooltip personalizado; si no se pasa se genera automáticamente. */
  tooltip?: string;
}

/**
 * Gate de UI por permiso funcional.
 *
 * Ejemplo:
 *   <PermissionGuard module="budgets" required="edit">
 *     {(allowed) => (
 *       <Button disabled={!allowed}>Editar presupuesto</Button>
 *     )}
 *   </PermissionGuard>
 */
export function PermissionGuard({
  module,
  required,
  children,
  withTooltip = true,
  tooltip,
}: PermissionGuardProps) {
  const { can, loading } = useCan();
  // Durante la carga, considerar NO permitido para acciones sensibles —
  // así no aparecen botones de editar/borrar antes de aplicar el bloqueo.
  const allowed = loading ? false : can(module, required);

  if (allowed || !withTooltip) return <>{children(allowed)}</>;

  const moduleLabel = getModule(module).label;
  const message =
    tooltip ??
    `Tu rol funcional no permite ${required === 'view' ? 'ver' : required === 'edit' ? 'editar' : 'gestionar'} ${moduleLabel.toLowerCase()}.`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">{children(false)}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="max-w-xs text-xs">{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface IfCanProps {
  module: ModuleKey;
  required: PermissionLevel;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Atajo declarativo: muestra `children` solo si se cumple el permiso. */
export function IfCan({ module, required, children, fallback = null }: IfCanProps) {
  const { can, loading } = useCan();
  // Durante la carga ocultamos el contenido protegido para evitar
  // que se filtren acciones a usuarios sin permiso.
  if (loading) return <>{fallback}</>;
  return <>{can(module, required) ? children : fallback}</>;
}
