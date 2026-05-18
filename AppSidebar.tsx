import RoleSelector from '@/components/RoleSelector';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLinkedArtist } from '@/hooks/useLinkedArtist';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  Calendar, 
  FileText, 
  MessageCircle, 
  Users, 
  UsersRound,
  LogOut,
  Music,
  Menu,
  Calculator,
  FolderKanban,
  Map,
  Mic,
  FileImage,
  Disc3,
  User,
  Settings,
  Wallet,
  HardDrive,
  Film,
  Bell,
  Mail,
  BarChart3,
  Zap,
  Lock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useState } from 'react';
import { useActionCenter } from '@/hooks/useActionCenter';
import { useCan } from '@/hooks/useFunctionalPermissions';
import type { ModuleKey } from '@/lib/permissions/types';

// Mapa URL → módulo funcional (para filtrar sidebar por permisos).
// Las URLs no listadas son siempre visibles (Dashboard, Chat, Ajustes, etc.).
const URL_TO_MODULE: Record<string, ModuleKey> = {
  '/booking': 'bookings',
  '/finanzas': 'cashflow',
  '/analytics': 'analytics',
  '/proyectos': 'projects',
  '/releases': 'releases',
  '/drive': 'drive',
  '/documents': 'contracts',
  '/roadmaps': 'roadmaps',
  '/solicitudes': 'solicitudes',
  '/automatizaciones': 'automations',
  '/agenda': 'contacts',
};

// ─── NAV ITEM TYPE ────────────────────────────────────────────────────────────

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'pending' | 'booking';
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

// ─── NAVIGATION GROUPS ────────────────────────────────────────────────────────

const getNavigationGroups = (isManagement: boolean, linkedArtistId?: string | null): NavGroup[] => {
  // Simplified nav for artist users (linked roster artists)
  if (!isManagement && linkedArtistId) {
    return [
      {
        label: null,
        items: [
          { title: "Dashboard", url: "/dashboard", icon: Home },
        ],
      },
      {
        label: "Mi Carrera",
        items: [
          { title: "Mi Perfil", url: `/artistas/${linkedArtistId}`, icon: User },
          { title: "Mis Lanzamientos", url: "/releases", icon: Disc3 },
          { title: "Mis Shows", url: "/booking", icon: Mic },
          { title: "Calendario", url: "/calendar", icon: Calendar },
        ],
      },
      {
        label: "Dinero",
        items: [
          { title: "Finanzas", url: "/finanzas", icon: Wallet },
        ],
      },
      {
        label: "Archivos",
        items: [
          { title: "Drive", url: "/drive", icon: HardDrive },
          { title: "Documentos", url: "/documents", icon: FileText },
        ],
      },
      {
        label: "Comunicación",
        items: [
          { title: "Solicitudes", url: "/solicitudes", icon: Bell, badge: 'pending' as const },
          { title: "Chat", url: "/chat", icon: MessageCircle },
        ],
      },
    ];
  }

  // Full nav: same for OWNER/TEAM_MANAGER and for any workspace collaborator.
  // Items the user lacks permission for will be visually locked, not hidden.
  const groups: NavGroup[] = [
    {
      label: null,
      items: [
        { title: "Dashboard", url: "/dashboard", icon: Home },
      ],
    },
    {
      label: "Artistas",
      items: [
        { title: "Mis Artistas", url: "/mi-management", icon: Music },
        { title: "Proyectos", url: "/proyectos", icon: FolderKanban },
        { title: "Discografía", url: "/releases", icon: Disc3 },
      ],
    },
    {
      label: "Operaciones",
      items: [
        { title: "Booking", url: "/booking", icon: Mic, badge: 'booking' as const },
        { title: "Sincronizaciones", url: "/sincronizaciones", icon: Film },
        { title: "Hojas de Ruta", url: "/roadmaps", icon: Map },
      ],
    },
    {
      label: "Dinero",
      items: [
        { title: "Finanzas", url: "/finanzas", icon: Wallet },
        { title: "Analytics", url: "/analytics", icon: BarChart3 },
      ],
    },
    {
      label: "Archivos",
      items: [
        { title: "Drive", url: "/drive", icon: HardDrive },
        { title: "Documentos", url: "/documents", icon: FileText },
      ],
    },
    {
      label: "Comunicación",
      items: [
        { title: "Solicitudes", url: "/solicitudes", icon: Bell, badge: 'pending' as const },
        { title: "Correo", url: "/correo", icon: Mail },
        { title: "Chat", url: "/chat", icon: MessageCircle },
      ],
    },
    {
      label: "Administración",
      items: [
        { title: "Automatizaciones", url: "/automatizaciones", icon: Zap },
        { title: "Equipos", url: "/teams", icon: UsersRound },
        { title: "Contactos", url: "/agenda", icon: Users },
        { title: "EPKs", url: "/epks", icon: FileImage },
        { title: "Calendario", url: "/calendar", icon: Calendar },
        { title: "Mi Perfil", url: "/contacts", icon: User },
        { title: "Ajustes", url: "/settings", icon: Settings },
      ],
    },
  ];

  return groups;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { profile, user, signOut, switchRole } = useAuth();
  const { linkedArtist, isImpersonating, stopImpersonation } = useLinkedArtist();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentPath = location.pathname;

  const isManagement = profile?.active_role === 'management' && !isImpersonating;
  const { can, loading: permsLoading, isWorkspaceAdmin, roleName } = useCan();
  const navigationGroups = getNavigationGroups(isManagement, linkedArtist?.id);

  // Returns true if the user lacks permission to view the module behind this URL.
  // OWNER / TEAM_MANAGER never see locks (they have full access via HubGate bypass).
  // Items without a module mapping (Dashboard, Chat, Mi Perfil, Ajustes…) are
  // never locked. While permissions are loading we don't lock anything to avoid
  // a flash of "locked" state. If we couldn't resolve a functional role we
  // also avoid locking — HubGate is the authoritative gate.
  const isItemLocked = (url: string): boolean => {
    if (!isManagement || permsLoading) return false;
    if (isWorkspaceAdmin) return false;
    if (!roleName) return false;
    const mod = URL_TO_MODULE[url];
    if (!mod) return false;
    return !can(mod, 'view');
  };

  // Badge counts — no extra queries, uses data already fetched
  const { items: actionItems } = useActionCenter({ status: ['pending', 'in_review'] });
  const pendingCount = actionItems.filter(i => i.status === 'pending').length;
  const bookingPendingCount = actionItems.filter(
    i => i.item_type === 'booking_request' && i.status === 'pending'
  ).length;

  const getBadgeCount = (badge: 'pending' | 'booking' | undefined): number => {
    if (!badge) return 0;
    if (badge === 'pending') return pendingCount;
    if (badge === 'booking') return bookingPendingCount;
    return 0;
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
  };

  const renderNavItem = (item: NavItem, locked: boolean) => {
    const count = locked ? 0 : getBadgeCount(item.badge);

    // Locked items: same visual slot but muted, with a lock indicator. Clicking
    // still navigates to the route — HubGate will show the ForbiddenView with
    // the "ask the workspace owner for access" message.
    if (locked) {
      return (
        <NavLink
          key={item.title}
          to={item.url}
          className={({ isActive: navIsActive }) =>
            `nav-item group relative opacity-60 ${
              navIsActive
                ? 'bg-muted/40 text-muted-foreground'
                : 'hover:bg-muted/40 text-muted-foreground'
            } ${isCollapsed ? 'justify-center' : ''}`
          }
          aria-disabled="true"
          title={`${item.title} · Sin acceso`}
        >
          <div className="relative flex-shrink-0">
            <item.icon className="w-5 h-5" />
            <Lock className="absolute -bottom-1 -right-1 w-3 h-3 text-muted-foreground bg-card rounded-full p-[1px]" />
          </div>

          {!isCollapsed && (
            <>
              <span className="font-medium flex-1">{item.title}</span>
              <Lock className="w-3.5 h-3.5 text-muted-foreground/70 ml-auto" />
            </>
          )}

          {/* Tooltip in collapsed mode */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
              {item.title} · Sin acceso
            </div>
          )}
        </NavLink>
      );
    }

    return (
      <NavLink
        key={item.title}
        to={item.url}
        className={({ isActive: navIsActive }) =>
          `nav-item group relative ${
            navIsActive
              ? 'active bg-primary/10 text-primary border border-primary/20'
              : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
          } ${isCollapsed ? 'justify-center' : ''}`
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />

        {/* Badge dot in collapsed mode */}
        {isCollapsed && count > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-destructive" />
        )}

        {/* Label + badge in expanded mode */}
        {!isCollapsed && (
          <>
            <span className="font-medium flex-1">{item.title}</span>
            {count > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </>
        )}

        {/* Tooltip in collapsed mode */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
            {item.title}
            {count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  const renderGroup = (group: NavGroup, index: number) => {
    if (group.items.length === 0) return null;

    return (
      <div key={group.label ?? 'inicio'}>
        {/* Separator between groups in collapsed mode */}
        {isCollapsed && index > 0 && (
          <Separator className="my-1.5 mx-2 w-auto" />
        )}

        {/* Group label in expanded mode */}
        {!isCollapsed && group.label && (
          <h3 className="px-2 pt-1 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {group.label}
          </h3>
        )}

        <nav className="space-y-0.5">
          {group.items.map(it => renderNavItem(it, isItemLocked(it.url)))}
        </nav>
      </div>
    );
  };

  return (
    <Card className={`h-screen border-r rounded-none ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300`}>
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-primary">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Music className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold font-playfair text-white">MOODITA</h1>
                <p className="text-xs text-white/80">Gestión Artística</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:bg-white/20"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Impersonation Banner */}
        {isImpersonating && !isCollapsed && (
          <div className="mx-2 mt-2 p-3 rounded-lg bg-warning/15 border border-warning/30">
            <p className="text-xs font-medium text-foreground mb-2">
              Viendo como: {linkedArtist?.stage_name || linkedArtist?.name}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                stopImpersonation();
                navigate(`/artistas/${linkedArtist?.id}`);
              }}
            >
              <LogOut className="w-3 h-3 mr-1" />
              Volver a Management
            </Button>
          </div>
        )}
        {isImpersonating && isCollapsed && (
          <div className="mx-2 mt-2 flex justify-center">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-warning/30 bg-warning/15"
              onClick={() => {
                stopImpersonation();
                navigate(`/artistas/${linkedArtist?.id}`);
              }}
              title="Volver a Management"
            >
              <LogOut className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {navigationGroups.map((group, index) => renderGroup(group, index))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          {!isCollapsed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {profile?.active_role}
                  </p>
                </div>
                <NotificationBell />
              </div>
              <RoleSelector />
            </div>
          )}
          
          {user && (
            <Button
              variant="outline"
              size={isCollapsed ? "icon" : "sm"}
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="w-4 h-4" />
              {!isCollapsed && <span className="ml-2">Cerrar Sesión</span>}
            </Button>
          )}
          
          {isCollapsed && (
            <div className="flex justify-center">
              <NotificationBell />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
