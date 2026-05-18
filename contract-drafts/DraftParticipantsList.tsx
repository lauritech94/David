import { useState } from 'react';
import { ChevronDown, ChevronRight, Users, ExternalLink, UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DraftParticipant } from '@/hooks/useDraftParticipants';

interface Props {
  participants: DraftParticipant[];
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';
}

function roleLabel(role: string) {
  if (role === 'producer') return 'Productora';
  if (role === 'collaborator') return 'Colaborador/a';
  return 'Invitado';
}

function roleColor(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'producer') return 'default';
  if (role === 'collaborator') return 'secondary';
  return 'outline';
}

export function DraftParticipantsList({ participants }: Props) {
  const [open, setOpen] = useState(true);
  const activeCount = participants.filter(p => Date.now() - new Date(p.last_seen_at).getTime() < ACTIVE_THRESHOLD_MS).length;

  return (
    <div className="border-b bg-background">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Participantes ({participants.length})</span>
          {activeCount > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 border-green-500 text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {activeCount} activo{activeCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-2 pb-3 space-y-1 max-h-[240px] overflow-y-auto">
          {participants.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Sin participantes aún</p>
          )}
          {participants.map(p => {
            const active = Date.now() - new Date(p.last_seen_at).getTime() < ACTIVE_THRESHOLD_MS;
            const linked = !!(p.profile_id || p.contact_id);
            return (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
                <div className="relative">
                  <Avatar className="h-7 w-7">
                    {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                    <AvatarFallback className="text-[10px]">{initials(p.display_name || p.name)}</AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${
                      active ? 'bg-green-500' : 'bg-muted-foreground/40'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{p.display_name || p.name}</span>
                    {linked && (
                      <span title={p.profile_id ? 'Perfil de la app' : 'Contacto de la app'}>
                        <UserCircle2 className="h-3 w-3 text-primary shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Badge variant={roleColor(p.role)} className="text-[9px] px-1 py-0 h-3.5">{roleLabel(p.role)}</Badge>
                    <span>·</span>
                    <span>{timeAgo(p.last_seen_at)}</span>
                    {p.view_count > 1 && <span>· {p.view_count} visitas</span>}
                  </div>
                </div>
                {p.profile_id && (
                  <a
                    href={`/contacts/${p.profile_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    title="Abrir perfil"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
