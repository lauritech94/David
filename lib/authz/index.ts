import { supabase } from '@/integrations/supabase/client';
import * as yaml from 'js-yaml';
import { Database } from '@/integrations/supabase/types';

// Types
export type WorkspaceRole = Database['public']['Enums']['workspace_role'];
export type ArtistRole = Database['public']['Enums']['artist_role'];
export type ProjectRole = Database['public']['Enums']['project_role'];

export interface UserScopes {
  workspaces: Array<{
    workspace_id: string;
    role: WorkspaceRole;
  }>;
  artists: Array<{
    artist_id: string;
    role: ArtistRole;
  }>;
  projects: Array<{
    project_id: string;
    role: ProjectRole;
  }>;
}

export interface ResourceRef {
  type: 'WORKSPACE' | 'ARTIST' | 'PROJECT';
  id: string;
}

export interface PermissionMatrix {
  scopes: string[];
  roles: {
    WORKSPACE: Record<string, { description: string; allow: string[] }>;
    ARTIST: Record<string, { description: string; allow: string[] }>;
    PROJECT: Record<string, { description: string; allow: string[] }>;
  };
  acciones_clave: string[];
}

// Load permissions configuration
const PERMISSIONS_CONFIG = `
scopes:
  - WORKSPACE
  - ARTIST
  - PROJECT

roles:
  WORKSPACE:
    OWNER:
      description: "Propietario del workspace con acceso completo"
      allow: [MANAGE_BILLING, INVITE_USERS, CREATE_ARTIST, SEE_ALL]
      
    TEAM_MANAGER:
      description: "Gestor de equipo con permisos administrativos limitados"
      allow: [INVITE_USERS, CREATE_ARTIST, SEE_ALL]

  ARTIST:
    ARTIST_MANAGER:
      description: "Manager del artista con control total sobre su carrera y proyectos"
      allow: [SEE_ALL, CREATE_PROJECT, ASSIGN_PROJECT_ROLES, VIEW_SALES, VIEW_CALENDAR, VIEW_PROJECT, EDIT_PROJECT, VIEW_FINANCE, EDIT_FINANCE, VIEW_CONTRACTS, EDIT_CONTRACTS, VIEW_RELEASES, EDIT_RELEASES, VIEW_BOOKING, EDIT_BOOKING, VIEW_ROADMAP, EDIT_ROADMAP]

    LABEL:
      description: "Sello discográfico: gestiona lanzamientos, contratos y finanzas del artista"
      allow: [SEE_ALL, VIEW_RELEASES, EDIT_RELEASES, VIEW_CONTRACTS, EDIT_CONTRACTS, VIEW_FINANCE, VIEW_SALES, VIEW_CALENDAR, VIEW_PROJECT]

    BOOKING_AGENT:
      description: "Agente de booking: gestiona ofertas, calendario y contratos de directo"
      allow: [VIEW_BOOKING, EDIT_BOOKING, VIEW_CALENDAR, VIEW_CONTRACTS, EDIT_CONTRACTS, VIEW_ROADMAP, EDIT_ROADMAP, VIEW_PROJECT]

    PRODUCER:
      description: "Productor musical: gestiona créditos, audio y sesiones de los lanzamientos"
      allow: [VIEW_RELEASES, EDIT_RELEASES, VIEW_CALENDAR, VIEW_PROJECT, COMMENT]

    PUBLISHER:
      description: "Editorial: gestiona splits, royalties y contratos de IP"
      allow: [VIEW_RELEASES, VIEW_CONTRACTS, EDIT_CONTRACTS, VIEW_FINANCE, VIEW_SALES, COMMENT]

    AR:
      description: "A&R: ve lanzamientos y agenda, comenta y propone"
      allow: [VIEW_RELEASES, VIEW_CALENDAR, VIEW_PROJECT, COMMENT]

    ROADIE_TECH:
      description: "Equipo técnico de gira: ve hojas de ruta, riders y calendario"
      allow: [VIEW_CALENDAR, VIEW_ROADMAP, VIEW_PROJECT]

    ARTIST_OBSERVER:
      description: "Observador con acceso de solo lectura al dashboard del artista"
      allow: [VIEW_DASHBOARD, VIEW_CALENDAR, VIEW_PROJECT]

  PROJECT:
    EDITOR:
      description: "Editor con permisos completos de gestión del proyecto"
      allow: [VIEW_PROJECT, EDIT_PROJECT, CREATE_WORK_ITEM, EDIT_WORK_ITEM, SEND_BUDGET, CHANGE_STATUS, UPLOAD_FILES, CREATE_APPROVAL, SUBMIT_APPROVAL]
      
    COMMENTER:
      description: "Colaborador con permisos de comentario y aprobación"
      allow: [VIEW_PROJECT, COMMENT, APPROVE_IF_ASSIGNED]
      
    VIEWER:
      description: "Visualizador con acceso de solo lectura al proyecto"
      allow: [VIEW_PROJECT]

acciones_clave:
  - MANAGE_BILLING
  - INVITE_USERS
  - CREATE_ARTIST
  - SEE_ALL
  - CREATE_PROJECT
  - ASSIGN_PROJECT_ROLES
  - VIEW_SALES
  - VIEW_CALENDAR
  - VIEW_DASHBOARD
  - VIEW_PROJECT
  - EDIT_PROJECT
  - CREATE_WORK_ITEM
  - EDIT_WORK_ITEM
  - SEND_BUDGET
  - CHANGE_STATUS
  - UPLOAD_FILES
  - COMMENT
  - APPROVE_IF_ASSIGNED
  - CREATE_APPROVAL
  - SUBMIT_APPROVAL
  - VIEW_FINANCE
  - EDIT_FINANCE
  - VIEW_CONTRACTS
  - EDIT_CONTRACTS
  - VIEW_RELEASES
  - EDIT_RELEASES
  - VIEW_BOOKING
  - EDIT_BOOKING
  - VIEW_ROADMAP
  - EDIT_ROADMAP
`;

const permissions: PermissionMatrix = yaml.load(PERMISSIONS_CONFIG) as PermissionMatrix;

/**
 * Public catalog: all artist roles with human-readable label & description.
 * Drives the role selector in the Teams module.
 */
export const ARTIST_ROLE_CATALOG: Array<{ value: ArtistRole; label: string; description: string }> = [
  { value: 'ARTIST_MANAGER' as ArtistRole, label: 'Manager del artista', description: 'Control total sobre la carrera y los proyectos' },
  { value: 'LABEL' as ArtistRole, label: 'Sello discográfico', description: 'Lanzamientos, contratos y finanzas' },
  { value: 'BOOKING_AGENT' as ArtistRole, label: 'Agente de booking', description: 'Ofertas, calendario y contratos de directo' },
  { value: 'PRODUCER' as ArtistRole, label: 'Productor musical', description: 'Créditos, audio y sesiones' },
  { value: 'PUBLISHER' as ArtistRole, label: 'Editorial', description: 'Splits, royalties y contratos IP' },
  { value: 'AR' as ArtistRole, label: 'A&R', description: 'Lanzamientos y agenda con permisos de comentario' },
  { value: 'ROADIE_TECH' as ArtistRole, label: 'Equipo técnico de gira', description: 'Hojas de ruta, riders y calendario' },
  { value: 'ARTIST_OBSERVER' as ArtistRole, label: 'Observador', description: 'Solo lectura del dashboard del artista' },
];

export const PROJECT_ROLE_CATALOG: Array<{ value: ProjectRole; label: string; description: string }> = [
  { value: 'EDITOR', label: 'Editor', description: 'Permisos completos de gestión del proyecto' },
  { value: 'COMMENTER', label: 'Comentador', description: 'Comentar y aprobar tareas asignadas' },
  { value: 'VIEWER', label: 'Visualizador', description: 'Solo lectura' },
];

export const WORKSPACE_ROLE_CATALOG: Array<{ value: WorkspaceRole; label: string; description: string }> = [
  { value: 'OWNER', label: 'Propietario', description: 'Control total del workspace' },
  { value: 'TEAM_MANAGER', label: 'Team Manager', description: 'Administrar miembros y artistas' },
];

/**
 * Resolves all scopes (workspace, artist, project) for a given user
 */
export async function resolveUserScopes(userId: string): Promise<UserScopes> {
  const [workspacesResult, artistsResult, projectsResult] = await Promise.all([
    supabase
      .from('workspace_memberships')
      .select('workspace_id, role')
      .eq('user_id', userId),
    
    supabase
      .from('artist_role_bindings')
      .select('artist_id, role')
      .eq('user_id', userId),
    
    supabase
      .from('project_role_bindings')
      .select('project_id, role')
      .eq('user_id', userId)
  ]);

  if (workspacesResult.error) throw workspacesResult.error;
  if (artistsResult.error) throw artistsResult.error;
  if (projectsResult.error) throw projectsResult.error;

  return {
    workspaces: workspacesResult.data || [],
    artists: artistsResult.data || [],
    projects: projectsResult.data || []
  };
}

/**
 * Gets the parent artist ID for a given project
 */
async function getProjectParentArtist(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('artist_id')
    .eq('id', projectId)
    .single();

  if (error) return null;
  return data?.artist_id || null;
}

/**
 * Gets the parent workspace ID for a given artist
 */
async function getArtistParentWorkspace(artistId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('artists')
    .select('workspace_id')
    .eq('id', artistId)
    .single();

  if (error) return null;
  return data?.workspace_id || null;
}

/**
 * Checks if a user can perform an action on a resource
 */
export async function can(
  userId: string,
  action: string,
  resourceRef: ResourceRef
): Promise<boolean> {
  const userScopes = await resolveUserScopes(userId);
  console.log('authz.can - userId:', userId, 'action:', action, 'resource:', resourceRef);
  console.log('authz.can - userScopes:', userScopes);
  
  // Algorithm based on resourceRef.type
  switch (resourceRef.type) {
    case 'PROJECT': {
      // 1. Check direct project role
      const projectRole = userScopes.projects.find(p => p.project_id === resourceRef.id);
      if (projectRole) {
        const allowedActions = permissions.roles.PROJECT[projectRole.role]?.allow || [];
        if (allowedActions.includes(action)) return true;
      }

      // 2. Check parent artist role (ARTIST_MANAGER)
      const parentArtistId = await getProjectParentArtist(resourceRef.id);
      if (parentArtistId) {
        const artistRole = userScopes.artists.find(a => a.artist_id === parentArtistId);
        if (artistRole?.role === 'ARTIST_MANAGER') {
          const allowedActions = permissions.roles.ARTIST.ARTIST_MANAGER?.allow || [];
          if (allowedActions.includes(action)) return true;
        }

        // 3. Check parent workspace role with SEE_ALL
        const parentWorkspaceId = await getArtistParentWorkspace(parentArtistId);
        if (parentWorkspaceId) {
          const workspaceRole = userScopes.workspaces.find(w => w.workspace_id === parentWorkspaceId);
          if (workspaceRole) {
            const allowedActions = permissions.roles.WORKSPACE[workspaceRole.role]?.allow || [];
            // SEE_ALL acts as a wildcard for resources within the workspace
            if (allowedActions.includes('SEE_ALL')) return true;
            if (allowedActions.includes(action)) return true;
          }
        }
      }
      break;
    }

    case 'ARTIST': {
      // 1. Check direct artist role
      const artistRole = userScopes.artists.find(a => a.artist_id === resourceRef.id);
      if (artistRole) {
        const allowedActions = permissions.roles.ARTIST[artistRole.role]?.allow || [];
        if (allowedActions.includes(action)) return true;
      }

      // 2. Check parent workspace role with SEE_ALL
      const parentWorkspaceId = await getArtistParentWorkspace(resourceRef.id);
      if (parentWorkspaceId) {
        const workspaceRole = userScopes.workspaces.find(w => w.workspace_id === parentWorkspaceId);
        if (workspaceRole) {
          const allowedActions = permissions.roles.WORKSPACE[workspaceRole.role]?.allow || [];
          // SEE_ALL acts as a wildcard for resources within the workspace
          if (allowedActions.includes('SEE_ALL')) return true;
          if (allowedActions.includes(action)) return true;
        }
      }
      break;
    }

    case 'WORKSPACE': {
      // Check workspace role
      const workspaceRole = userScopes.workspaces.find(w => w.workspace_id === resourceRef.id);
      if (workspaceRole && (workspaceRole.role === 'OWNER' || workspaceRole.role === 'TEAM_MANAGER')) {
        const allowedActions = permissions.roles.WORKSPACE[workspaceRole.role]?.allow || [];
        // SEE_ALL acts as a wildcard for workspace-wide capabilities
        if (allowedActions.includes('SEE_ALL')) return true;
        if (allowedActions.includes(action)) return true;
      }
      break;
    }
  }

  // Deny by default
  return false;
}

/**
 * Logs authorization decisions to audit_logs
 */
export async function logAuthzDecision(
  userId: string,
  action: string,
  resourceRef: ResourceRef,
  decision: 'permit' | 'deny',
  metadata: Record<string, any> = {}
): Promise<void> {
  await supabase.from('audit_logs').insert({
    actor_user_id: userId,
    action: `authz:${decision}:${action}`,
    resource_type: resourceRef.type,
    resource_id: resourceRef.id,
    metadata: {
      action,
      decision,
      ...metadata
    }
  });
}

/**
 * Resource resolver type for middleware
 */
export type ResourceResolver = (req: any) => ResourceRef | Promise<ResourceRef>;

/**
 * Authorization middleware/guard
 */
export function authorize(action: string, resourceResolver: ResourceResolver) {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const resourceRef = await resourceResolver(req);
      const canPerform = await can(userId, action, resourceRef);

      // Log decision in debug mode
      if (process.env.NODE_ENV === 'development') {
        await logAuthzDecision(userId, action, resourceRef, canPerform ? 'permit' : 'deny', {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
      }

      if (!canPerform) {
        res.status(403).json({ 
          error: 'Forbidden',
          message: `Access denied for action '${action}' on ${resourceRef.type}:${resourceRef.id}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Common resource resolvers
 */
export const resourceResolvers = {
  project: (req: any): ResourceRef => ({
    type: 'PROJECT',
    id: req.params.projectId || req.params.id
  }),
  
  artist: (req: any): ResourceRef => ({
    type: 'ARTIST', 
    id: req.params.artistId || req.params.id
  }),
  
  workspace: (req: any): ResourceRef => ({
    type: 'WORKSPACE',
    id: req.params.workspaceId || req.params.id
  })
};