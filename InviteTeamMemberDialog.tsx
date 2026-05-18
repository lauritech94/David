import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from '@/lib/validation/team';
import {
  ARTIST_ROLE_CATALOG,
  PROJECT_ROLE_CATALOG,
  WORKSPACE_ROLE_CATALOG,
} from '@/lib/authz';

type TeamCategory = Database['public']['Enums']['team_category'];

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onMemberInvited: () => void;
}

const TEAM_CATEGORIES: { value: TeamCategory; label: string }[] = [
  { value: 'management', label: 'Management' },
  { value: 'banda', label: 'Banda' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'artistico', label: 'Artístico' },
  { value: 'comunicacion', label: 'Comunicación' },
  { value: 'legal', label: 'Legal' },
  { value: 'otro', label: 'Otro' },
];

type ScopeOption = 'WORKSPACE' | 'ARTIST' | 'PROJECT';

interface ArtistOption {
  id: string;
  name: string;
}
interface ProjectOption {
  id: string;
  name: string;
  artist_id: string | null;
}

export function InviteTeamMemberDialog({
  open,
  onOpenChange,
  workspaceId,
  onMemberInvited,
}: InviteTeamMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<ScopeOption>('WORKSPACE');
  const [scopeId, setScopeId] = useState<string>(workspaceId);
  const [role, setRole] = useState<string>('TEAM_MANAGER');
  const [email, setEmail] = useState('');
  const [teamCategory, setTeamCategory] = useState<TeamCategory>('otro');

  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Reset internal state every time the dialog opens
  useEffect(() => {
    if (open) {
      setScope('WORKSPACE');
      setScopeId(workspaceId);
      setRole('TEAM_MANAGER');
      setEmail('');
      setTeamCategory('otro');
    }
  }, [open, workspaceId]);

  // Load artists + projects accessible to current user (RLS-filtered)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase
          .from('artists')
          .select('id, name, stage_name')
          .order('name', { ascending: true })
          .limit(200),
        supabase
          .from('projects')
          .select('id, name, artist_id')
          .order('name', { ascending: true })
          .limit(200),
      ]);
      if (cancelled) return;
      setArtists(
        (a ?? []).map((row: any) => ({
          id: row.id,
          name: row.stage_name || row.name || 'Sin nombre',
        })),
      );
      setProjects(
        (p ?? []).map((row: any) => ({
          id: row.id,
          name: row.name || 'Sin nombre',
          artist_id: row.artist_id ?? null,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Available roles depend on scope
  const roleOptions = useMemo(() => {
    if (scope === 'WORKSPACE') return WORKSPACE_ROLE_CATALOG;
    if (scope === 'ARTIST') return ARTIST_ROLE_CATALOG;
    return PROJECT_ROLE_CATALOG;
  }, [scope]);

  // When scope changes, reset scopeId + role to a sensible default
  useEffect(() => {
    if (scope === 'WORKSPACE') {
      setScopeId(workspaceId);
      setRole('TEAM_MANAGER');
    } else if (scope === 'ARTIST') {
      setScopeId(artists[0]?.id ?? '');
      setRole('ARTIST_MANAGER');
    } else {
      setScopeId(projects[0]?.id ?? '');
      setRole('EDITOR');
    }
  }, [scope, workspaceId, artists, projects]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: InviteMemberInput = {
        email,
        scope,
        scopeId,
        role,
        teamCategory: scope === 'WORKSPACE' ? teamCategory : undefined,
      };
      const parsed = inviteMemberSchema.safeParse(payload);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        toast.error(first?.message ?? 'Datos no válidos');
        return;
      }

      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: parsed.data,
      });

      if (error) {
        toast.error(error.message ?? 'Error al invitar');
        return;
      }
      if (data?.error) {
        toast.error(typeof data.error === 'string' ? data.error : 'Error al invitar');
        return;
      }

      toast.success(data?.message ?? 'Invitación enviada');
      onOpenChange(false);
      onMemberInvited();
    } catch (err: any) {
      console.error('Error inviting member:', err);
      toast.error(err?.message || 'Error al invitar miembro');
    } finally {
      setLoading(false);
    }
  };

  const scopeLabel: Record<ScopeOption, string> = {
    WORKSPACE: 'Workspace (todo el equipo)',
    ARTIST: 'Un artista en concreto',
    PROJECT: 'Un proyecto en concreto',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invitar Miembro al Equipo
          </DialogTitle>
          <DialogDescription>
            Invita a alguien y elige a qué tiene acceso. Si ya tiene cuenta, se añade
            directamente. Si no, se le envía una invitación por email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Alcance del acceso</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as ScopeOption)}>
              <SelectTrigger id="scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORKSPACE">{scopeLabel.WORKSPACE}</SelectItem>
                <SelectItem value="ARTIST" disabled={artists.length === 0}>
                  {scopeLabel.ARTIST}
                </SelectItem>
                <SelectItem value="PROJECT" disabled={projects.length === 0}>
                  {scopeLabel.PROJECT}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'ARTIST' && (
            <div className="space-y-2">
              <Label htmlFor="artist">Artista</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger id="artist">
                  <SelectValue placeholder="Selecciona un artista" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === 'PROJECT' && (
            <div className="space-y-2">
              <Label htmlFor="project">Proyecto</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col">
                      <span>{r.label}</span>
                      <span className="text-xs text-muted-foreground">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scope === 'WORKSPACE' && (
            <div className="space-y-2">
              <Label htmlFor="category">Categoría (opcional)</Label>
              <Select
                value={teamCategory}
                onValueChange={(value: TeamCategory) => setTeamCategory(value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invitar
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
