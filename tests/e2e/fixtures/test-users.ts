export interface TestUser {
  email: string;
  password: string;
  role: string;
  description: string;
  projectAccess?: string[];
  artistAccess?: string[];
}

export const testUsers: Record<string, TestUser> = {
  owner: {
    email: 'owner@demo.com',
    password: 'demo123456',
    role: 'OWNER',
    description: 'Full workspace access, can manage everything'
  },
  teamManager: {
    email: 'team_manager@demo.com',
    password: 'demo123456',
    role: 'TEAM_MANAGER',
    description: 'Can manage team, projects, and bookings'
  },
  artistManager: {
    email: 'artist_manager@demo.com',
    password: 'demo123456',
    role: 'ARTIST_MANAGER',
    description: 'Manager for Rita Payés',
    artistAccess: ['Rita Payés']
  },
  artistObserver: {
    email: 'artist_observer@demo.com',
    password: 'demo123456',
    role: 'ARTIST_OBSERVER',
    description: 'Observer for Rita Payés',
    artistAccess: ['Rita Payés']
  },
  bookingEditor: {
    email: 'booking_editor@demo.com',
    password: 'demo123456',
    role: 'EDITOR',
    description: 'Editor for Gira 2025 project',
    projectAccess: ['Gira 2025']
  },
  marketingViewer: {
    email: 'marketing_viewer@demo.com',
    password: 'demo123456',
    role: 'VIEWER',
    description: 'Viewer for Campaña PR project',
    projectAccess: ['Campaña PR']
  }
};

export type TestUserKey = keyof typeof testUsers;