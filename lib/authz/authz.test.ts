import { resolveUserScopes, can, ResourceRef } from './index';

// Test truth table for authorization
// This file contains comprehensive test cases for the authorization module
// Run manually or integrate with your preferred testing framework

interface TestCase {
  name: string;
  userId: string;
  action: string;
  resourceRef: ResourceRef;
  userScopes: {
    workspaces: Array<{ workspace_id: string; role: 'OWNER' | 'TEAM_MANAGER' }>;
    artists: Array<{ artist_id: string; role: 'ARTIST_MANAGER' | 'ARTIST_OBSERVER' }>;
    projects: Array<{ project_id: string; role: 'EDITOR' | 'COMMENTER' | 'VIEWER' }>;
  };
  expected: boolean;
  mockProjectParent?: string;
  mockArtistParent?: string;
}

// Truth table test cases for authorization
export const authzTestCases: TestCase[] = [
  // WORKSPACE scope tests
  {
    name: 'WORKSPACE OWNER can MANAGE_BILLING',
    userId: 'user1',
    action: 'MANAGE_BILLING',
    resourceRef: { type: 'WORKSPACE' as const, id: 'ws1' },
    userScopes: {
      workspaces: [{ workspace_id: 'ws1', role: 'OWNER' as const }],
      artists: [],
      projects: []
    },
    expected: true
  },
  {
    name: 'WORKSPACE TEAM_MANAGER can CREATE_ARTIST',
    userId: 'user1',
    action: 'CREATE_ARTIST',
    resourceRef: { type: 'WORKSPACE' as const, id: 'ws1' },
    userScopes: {
      workspaces: [{ workspace_id: 'ws1', role: 'TEAM_MANAGER' as const }],
      artists: [],
      projects: []
    },
    expected: true
  },
  {
    name: 'WORKSPACE TEAM_MANAGER cannot MANAGE_BILLING',
    userId: 'user1',
    action: 'MANAGE_BILLING',
    resourceRef: { type: 'WORKSPACE' as const, id: 'ws1' },
    userScopes: {
      workspaces: [{ workspace_id: 'ws1', role: 'TEAM_MANAGER' as const }],
      artists: [],
      projects: []
    },
    expected: false
  },

  // ARTIST scope tests
  {
    name: 'ARTIST_MANAGER can CREATE_PROJECT',
    userId: 'user1',
    action: 'CREATE_PROJECT',
    resourceRef: { type: 'ARTIST' as const, id: 'art1' },
    userScopes: {
      workspaces: [],
      artists: [{ artist_id: 'art1', role: 'ARTIST_MANAGER' as const }],
      projects: []
    },
    expected: true
  },
  {
    name: 'ARTIST_OBSERVER can VIEW_DASHBOARD',
    userId: 'user1',
    action: 'VIEW_DASHBOARD',
    resourceRef: { type: 'ARTIST' as const, id: 'art1' },
    userScopes: {
      workspaces: [],
      artists: [{ artist_id: 'art1', role: 'ARTIST_OBSERVER' as const }],
      projects: []
    },
    expected: true
  },
  {
    name: 'ARTIST_OBSERVER cannot CREATE_PROJECT',
    userId: 'user1',
    action: 'CREATE_PROJECT',
    resourceRef: { type: 'ARTIST' as const, id: 'art1' },
    userScopes: {
      workspaces: [],
      artists: [{ artist_id: 'art1', role: 'ARTIST_OBSERVER' as const }],
      projects: []
    },
    expected: false
  },

  // PROJECT scope tests
  {
    name: 'PROJECT EDITOR can EDIT_PROJECT',
    userId: 'user1',
    action: 'EDIT_PROJECT',
    resourceRef: { type: 'PROJECT' as const, id: 'proj1' },
    userScopes: {
      workspaces: [],
      artists: [],
      projects: [{ project_id: 'proj1', role: 'EDITOR' as const }]
    },
    expected: true
  },
  {
    name: 'PROJECT COMMENTER can VIEW_PROJECT',
    userId: 'user1',
    action: 'VIEW_PROJECT',
    resourceRef: { type: 'PROJECT' as const, id: 'proj1' },
    userScopes: {
      workspaces: [],
      artists: [],
      projects: [{ project_id: 'proj1', role: 'COMMENTER' as const }]
    },
    expected: true
  },
  {
    name: 'PROJECT VIEWER cannot EDIT_PROJECT',
    userId: 'user1',
    action: 'EDIT_PROJECT',
    resourceRef: { type: 'PROJECT' as const, id: 'proj1' },
    userScopes: {
      workspaces: [],
      artists: [],
      projects: [{ project_id: 'proj1', role: 'VIEWER' as const }]
    },
    expected: false
  },

  // Inheritance tests
  {
    name: 'WORKSPACE OWNER with SEE_ALL can VIEW_PROJECT via inheritance',
    userId: 'user1',
    action: 'VIEW_PROJECT',
    resourceRef: { type: 'PROJECT' as const, id: 'proj1' },
    userScopes: {
      workspaces: [{ workspace_id: 'ws1', role: 'OWNER' as const }],
      artists: [],
      projects: []
    },
    expected: true,
    mockProjectParent: 'art1',
    mockArtistParent: 'ws1'
  },

  // Deny by default tests
  {
    name: 'No roles should deny access',
    userId: 'user1',
    action: 'EDIT_PROJECT',
    resourceRef: { type: 'PROJECT' as const, id: 'proj1' },
    userScopes: {
      workspaces: [],
      artists: [],
      projects: []
    },
    expected: false
  },
  {
    name: 'Wrong workspace should deny access',
    userId: 'user1',
    action: 'MANAGE_BILLING',
    resourceRef: { type: 'WORKSPACE' as const, id: 'ws2' },
    userScopes: {
      workspaces: [{ workspace_id: 'ws1', role: 'OWNER' as const }],
      artists: [],
      projects: []
    },
    expected: false
  }
];

/**
 * Manual test runner function
 * Usage: await runAuthzTests()
 */
export async function runAuthzTests() {
  console.log('Running authorization truth table tests...');
  
  for (const testCase of authzTestCases) {
    try {
      // Note: In a real test environment, you would mock the database calls
      // For now, this serves as documentation of expected behavior
      console.log(`Test: ${testCase.name}`);
      console.log(`Expected: ${testCase.expected}`);
      console.log('---');
    } catch (error) {
      console.error(`Test failed: ${testCase.name}`, error);
    }
  }
  
  console.log('Test documentation complete. Integrate with your preferred testing framework.');
}