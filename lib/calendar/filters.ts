import { z } from 'zod';

/**
 * Pure filter helpers for the Calendar module.
 *
 * Keeping them isolated from React state lets us:
 *  - Unit-test the filtering rules without spinning up Supabase.
 *  - Reuse the same logic for any future data source (cached query, server route…).
 *  - Reason about each filter independently.
 */

// ----- Types -----

export type CalendarTeamMember = {
  id: string;
  full_name: string;
  type?: 'workspace' | 'contact';
  team_category?: string | null; // workspace_memberships.team_category | contacts.category
  artist_ids?: string[]; // artists this member is linked to (role bindings or contact.artist_id)
};

export type FilterableEvent = {
  id: string;
  artist_id?: string | null;
  created_by?: string | null;
};

export type FilterableBooking = {
  id: string;
  artist_id?: string | null;
  project_id?: string | null;
  created_by?: string | null;
  tour_manager_new?: string | null;
};

export type FilterableRelease = {
  id: string;
  artist_id?: string | null;
  project_id?: string | null;
};

export type FilterableMilestone = {
  id: string;
  release?: { id: string; project_id?: string | null; artist_id?: string | null } | null;
  responsible?: string | null;
};

// ----- Validation (defense in depth — IDs already typed but never trust state) -----

const uuid = z.string().uuid();

export const CalendarFiltersSchema = z.object({
  artistIds: z.array(uuid).default([]),
  projectIds: z.array(uuid).default([]),
  member: z.union([z.literal('all'), uuid]).default('all'),
  department: z.string().max(64).default('all'),
});

export type CalendarFilters = z.infer<typeof CalendarFiltersSchema>;

export function safeParseFilters(input: unknown): CalendarFilters {
  const res = CalendarFiltersSchema.safeParse(input);
  if (res.success) return res.data;
  // On validation failure, fall back to a permissive default rather than crashing the UI.
  return { artistIds: [], projectIds: [], member: 'all', department: 'all' };
}

// ----- Project filter -----

/**
 * Project filter is applied differently per entity:
 *  - bookings & releases: have native `project_id` → exact match.
 *  - events & milestones: no `project_id` → fall back to artist of the selected projects.
 *
 * `projectArtistMap` maps projectId → artistId so the fallback works.
 */
export function applyProjectFilterToBookings<T extends FilterableBooking>(
  items: T[],
  projectIds: string[],
): T[] {
  if (projectIds.length === 0) return items;
  const set = new Set(projectIds);
  return items.filter((b) => b.project_id && set.has(b.project_id));
}

export function applyProjectFilterToReleases<T extends FilterableRelease>(
  items: T[],
  projectIds: string[],
): T[] {
  if (projectIds.length === 0) return items;
  const set = new Set(projectIds);
  return items.filter((r) => r.project_id && set.has(r.project_id));
}

export function applyProjectFilterToMilestones<T extends FilterableMilestone>(
  items: T[],
  projectIds: string[],
): T[] {
  if (projectIds.length === 0) return items;
  const set = new Set(projectIds);
  return items.filter((m) => m.release?.project_id && set.has(m.release.project_id));
}

export function applyProjectFilterToEvents<T extends FilterableEvent>(
  items: T[],
  projectIds: string[],
  projectArtistMap: Map<string, string>,
): T[] {
  if (projectIds.length === 0) return items;
  // Derive the set of artists "covered" by the selected projects.
  const artistIds = new Set<string>();
  for (const pid of projectIds) {
    const aid = projectArtistMap.get(pid);
    if (aid) artistIds.add(aid);
  }
  if (artistIds.size === 0) return [];
  return items.filter((e) => e.artist_id && artistIds.has(e.artist_id));
}

// ----- Member filter -----

/**
 * "Equipo" filter: keep only items linked to the selected member.
 *
 *  - workspace member  → match by `created_by = member.id` (uuid is profile.user_id).
 *  - contact member    → match bookings via `tour_manager_new` and milestones via `responsible` name.
 */
export function applyMemberFilterToEvents<T extends FilterableEvent>(
  items: T[],
  member: { id: string; type?: 'workspace' | 'contact' } | null,
): T[] {
  if (!member) return items;
  if (member.type === 'contact') return []; // events have no link to contacts
  return items.filter((e) => e.created_by === member.id);
}

export function applyMemberFilterToBookings<T extends FilterableBooking>(
  items: T[],
  member: { id: string; type?: 'workspace' | 'contact' } | null,
): T[] {
  if (!member) return items;
  if (member.type === 'contact') {
    return items.filter((b) => b.tour_manager_new === member.id);
  }
  return items.filter((b) => b.created_by === member.id);
}

export function applyMemberFilterToMilestones<T extends FilterableMilestone>(
  items: T[],
  member: { id: string; full_name: string; type?: 'workspace' | 'contact' } | null,
): T[] {
  if (!member) return items;
  // milestones.responsible is free text → fuzzy match on the display name.
  const target = member.full_name.trim().toLowerCase();
  if (!target) return [];
  return items.filter((m) => (m.responsible || '').trim().toLowerCase() === target);
}

// ----- Department filter -----

/**
 * "Departamento" filter operates by reducing the team-member set first, then
 * applying the member filter as a union over those members.
 */
function membersInDepartment(
  members: CalendarTeamMember[],
  department: string,
): CalendarTeamMember[] {
  if (department === 'all') return members;
  return members.filter((m) => (m.team_category || '').toLowerCase() === department.toLowerCase());
}

export function applyDepartmentFilterToEvents<T extends FilterableEvent>(
  items: T[],
  members: CalendarTeamMember[],
  department: string,
): T[] {
  if (department === 'all') return items;
  const wsIds = new Set(
    membersInDepartment(members, department)
      .filter((m) => m.type !== 'contact')
      .map((m) => m.id),
  );
  if (wsIds.size === 0) return [];
  return items.filter((e) => e.created_by && wsIds.has(e.created_by));
}

export function applyDepartmentFilterToBookings<T extends FilterableBooking>(
  items: T[],
  members: CalendarTeamMember[],
  department: string,
): T[] {
  if (department === 'all') return items;
  const deptMembers = membersInDepartment(members, department);
  const wsIds = new Set(deptMembers.filter((m) => m.type !== 'contact').map((m) => m.id));
  const contactIds = new Set(deptMembers.filter((m) => m.type === 'contact').map((m) => m.id));
  if (wsIds.size === 0 && contactIds.size === 0) return [];
  return items.filter(
    (b) =>
      (b.created_by && wsIds.has(b.created_by)) ||
      (b.tour_manager_new && contactIds.has(b.tour_manager_new)),
  );
}

export function applyDepartmentFilterToMilestones<T extends FilterableMilestone>(
  items: T[],
  members: CalendarTeamMember[],
  department: string,
): T[] {
  if (department === 'all') return items;
  const deptNames = new Set(
    membersInDepartment(members, department).map((m) => m.full_name.trim().toLowerCase()),
  );
  if (deptNames.size === 0) return [];
  return items.filter((m) => deptNames.has((m.responsible || '').trim().toLowerCase()));
}

// ----- Cross-filter cascade helpers -----

/**
 * Members visible given a selection of artists. A member with no artist links
 * (e.g. workspace-wide management) is always visible — they aren't tied to any
 * specific roster.
 */
export function filterMembersByArtists(
  members: CalendarTeamMember[],
  artistIds: string[],
): CalendarTeamMember[] {
  if (artistIds.length === 0) return members;
  const set = new Set(artistIds);
  return members.filter((m) => {
    const links = m.artist_ids || [];
    if (links.length === 0) return true;
    return links.some((id) => set.has(id));
  });
}

/** List of departments (team_category values) present in the given member set. */
export function departmentsFromMembers(members: CalendarTeamMember[]): string[] {
  const set = new Set<string>();
  members.forEach((m) => {
    if (m.team_category) set.add(m.team_category);
  });
  return Array.from(set);
}

/**
 * Sanitise filters after the artist selection changes (or members reload).
 * Returns the next valid value for each dependent filter; callers compare and
 * only `setState` if there's a real change to avoid render loops.
 */
export function pruneFilters(args: {
  selectedProjects: string[];
  selectedTeam: string; // 'all' | memberId
  selectedDepartment: string; // 'all' | category
  members: CalendarTeamMember[];
  visibleMembers: CalendarTeamMember[];
  projectArtistMap: Map<string, string>;
  selectedArtists: string[];
}): {
  projects: string[];
  team: string;
  department: string;
} {
  const { selectedProjects, selectedTeam, selectedDepartment, visibleMembers, projectArtistMap, selectedArtists } = args;

  // Projects: keep only those whose artist is still selected (when artists are filtered).
  let projects = selectedProjects;
  if (selectedArtists.length > 0) {
    const artistSet = new Set(selectedArtists);
    projects = selectedProjects.filter((pid) => {
      const aid = projectArtistMap.get(pid);
      return aid ? artistSet.has(aid) : false;
    });
  }

  // Team: reset if the selected member is no longer visible.
  const team = selectedTeam === 'all' || visibleMembers.some((m) => m.id === selectedTeam)
    ? selectedTeam
    : 'all';

  // Department: reset if no visible member belongs to it anymore.
  const visibleDepts = new Set(visibleMembers.map((m) => m.team_category).filter(Boolean) as string[]);
  const department = selectedDepartment === 'all' || visibleDepts.has(selectedDepartment)
    ? selectedDepartment
    : 'all';

  return { projects, team, department };
}
