import { can, resolveUserScopes, ResourceRef } from './index';

/**
 * Authorization helpers for common use cases
 */

/**
 * Checks if user has any of the allowed roles on a specific project
 */
export async function requireRoleOnProject(
  userId: string, 
  projectId: string, 
  allowedRoles: string[]
): Promise<boolean> {
  // Try each allowed action for the project
  for (const role of allowedRoles) {
    // Map roles to actions
    const actionMap: Record<string, string> = {
      'EDITOR': 'EDIT_PROJECT',
      'COMMENTER': 'COMMENT', 
      'VIEWER': 'VIEW_PROJECT'
    };

    const action = actionMap[role] || role;
    const hasPermission = await can(userId, action, {
      type: 'PROJECT',
      id: projectId
    });

    if (hasPermission) return true;
  }

  return false;
}

/**
 * Checks if user is an artist manager for the specified artist
 */
export async function requireArtistManager(
  userId: string,
  artistId: string
): Promise<boolean> {
  return await can(userId, 'CREATE_PROJECT', {
    type: 'ARTIST',
    id: artistId
  });
}

/**
 * Checks if user can view a specific project
 */
export async function canViewProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  return await can(userId, 'VIEW_PROJECT', {
    type: 'PROJECT',
    id: projectId
  });
}

/**
 * Checks if user can edit a specific project
 */
export async function canEditProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  return await can(userId, 'EDIT_PROJECT', {
    type: 'PROJECT',
    id: projectId
  });
}

/**
 * Checks if user can manage workspace
 */
export async function canManageWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  return await can(userId, 'SEE_ALL', {
    type: 'WORKSPACE',
    id: workspaceId
  });
}

/**
 * Gets user's effective permissions for a resource
 */
export async function getUserEffectivePermissions(
  userId: string,
  resourceRef: ResourceRef
): Promise<{
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
}> {
  const [canView, canEdit, canDelete, canManage] = await Promise.all([
    can(userId, 'VIEW_PROJECT', resourceRef),
    can(userId, 'EDIT_PROJECT', resourceRef), 
    can(userId, 'DELETE_PROJECT', resourceRef),
    can(userId, 'MANAGE_PROJECT', resourceRef)
  ]);

  return { canView, canEdit, canDelete, canManage };
}