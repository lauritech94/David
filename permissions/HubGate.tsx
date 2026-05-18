import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCan } from '@/hooks/useFunctionalPermissions';
import type { ModuleKey, PermissionLevel } from '@/lib/permissions/types';
import { LEVEL_RANK } from '@/lib/permissions/types';
import { ForbiddenView } from './ForbiddenView';

interface HubGateProps {
  module: ModuleKey;
  required?: PermissionLevel;
  children: ReactNode;
}

/**
 * Envoltorio para hubs/páginas. Hace una verificación autoritativa contra
 * la base de datos (`get_functional_permission`) para que el rol funcional
 * actual del usuario decida sí o sí, sin depender de la caché en cliente.
 *
 * Mientras se resuelve no renderiza children (evita el flash de contenido).
 */
export function HubGate({ module, required = 'view', children }: HubGateProps) {
  const { user } = useAuth();
  const { roleName, loading: permsLoading } = useCan();
  const [state, setState] = useState<{
    loading: boolean;
    allowed: boolean;
    role: string | null;
  }>({ loading: true, allowed: false, role: null });
  const tokenRef = useRef(0);

  useEffect(() => {
    const token = ++tokenRef.current;

    async function check() {
      if (!user?.id) {
        if (tokenRef.current === token) {
          setState({ loading: false, allowed: false, role: null });
        }
        return;
      }

      // Workspace activo (primer membership)
      const { data: ws } = await supabase
        .from('workspace_memberships')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!ws?.workspace_id) {
        if (tokenRef.current === token) {
          setState({ loading: false, allowed: false, role: null });
        }
        return;
      }

      // OWNER / TEAM_MANAGER siempre tienen acceso total
      if (ws.role === 'OWNER' || ws.role === 'TEAM_MANAGER') {
        if (tokenRef.current === token) {
          setState({ loading: false, allowed: true, role: null });
        }
        return;
      }

      // Verificación autoritativa: pregunta a la BD el nivel real
      const { data: levelData, error } = await supabase.rpc(
        'get_functional_permission',
        {
          _user_id: user.id,
          _workspace_id: ws.workspace_id,
          _module: module,
        },
      );

      const level = (error || !levelData ? 'none' : levelData) as PermissionLevel;
      const allowed = LEVEL_RANK[level] >= LEVEL_RANK[required];

      // Resolver nombre del rol funcional (para el mensaje) vía RPC autoritativa.
      let role: string | null = null;
      if (!allowed) {
        const { data: roleData } = await supabase.rpc('get_user_functional_role', {
          _user_id: user.id,
          _workspace_id: ws.workspace_id,
        });
        role = (typeof roleData === 'string' ? roleData.trim() : null) || null;
      }

      if (tokenRef.current === token) {
        setState({ loading: false, allowed, role });
      }
    }

    setState((s) => ({ ...s, loading: true }));
    check();

    // Refrescar cuando cambien permisos / rol del contacto espejo
    const channel = supabase
      .channel(`hubgate-${module}-${user?.id ?? 'anon'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'functional_role_permission_overrides' },
        () => check(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => check(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'artist_role_bindings' },
        () => check(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, module, required]);

  if (state.loading || permsLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!state.allowed) {
    return (
      <ForbiddenView
        module={module}
        required={required}
        roleName={state.role ?? roleName}
      />
    );
  }

  return <>{children}</>;
}
