import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFunctionalPermissions } from '@/hooks/useFunctionalPermissions';
import {
  computeRolePerms,
  loadPermissionsMatrix,
  type PermissionsMatrix,
} from '@/lib/permissions/service';
import {
  MODULES,
  LEVEL_LABEL,
  LEVEL_COLOR_CLASS,
} from '@/lib/permissions/catalog';
import type { ModuleKey } from '@/lib/permissions/types';
import { cn } from '@/lib/utils';

interface RolePermissionSummaryProps {
  roleName: string;
  /** Cuántos módulos destacar como vista compacta (los más relevantes con manage/edit). */
  topN?: number;
}

/**
 * Tarjeta resumen compacta para mostrar en el modal "Editar rol funcional".
 * Lee defaults+overrides, computa permisos efectivos y muestra los más relevantes.
 */
export function RolePermissionSummary({ roleName, topN = 6 }: RolePermissionSummaryProps) {
  const { workspaceId } = useFunctionalPermissions();
  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadPermissionsMatrix(workspaceId)
      .then((m) => !cancelled && setMatrix(m))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  if (!roleName?.trim()) return null;

  if (loading || !matrix) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando permisos del rol…
      </div>
    );
  }

  const perms = computeRolePerms(matrix, roleName);

  // Ordenar módulos por nivel desc para destacar lo que SÍ puede hacer
  const sorted = [...MODULES].sort((a, b) => {
    const rank: Record<string, number> = { manage: 3, edit: 2, view: 1, none: 0 };
    return rank[perms[b.key]] - rank[perms[a.key]];
  });

  const top = sorted.slice(0, topN);
  const hidden = MODULES.filter((m) => perms[m.key as ModuleKey] === 'none');

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Permisos efectivos de este rol</p>
        <span className="text-[10px] text-muted-foreground">
          {hidden.length === 0
            ? 'Acceso a todos los módulos'
            : `${MODULES.length - hidden.length}/${MODULES.length} módulos visibles`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {top.map((m) => {
          const lvl = perms[m.key];
          const Icon = m.icon;
          return (
            <Badge
              key={m.key}
              variant="outline"
              className={cn('text-[10px] gap-1 font-normal', LEVEL_COLOR_CLASS[lvl])}
            >
              <Icon className="h-2.5 w-2.5" />
              {m.label}: {LEVEL_LABEL[lvl]}
            </Badge>
          );
        })}
      </div>
      {hidden.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Sin acceso a:{' '}
          {hidden
            .slice(0, 4)
            .map((m) => m.label)
            .join(', ')}
          {hidden.length > 4 && ` y ${hidden.length - 4} más`}
        </p>
      )}
    </div>
  );
}
