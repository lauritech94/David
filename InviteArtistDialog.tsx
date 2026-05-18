import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MODULES, getIndustryDefaults } from '@/lib/permissions/catalog';
import type { ModuleKey, PermissionLevel } from '@/lib/permissions/types';

interface InviteArtistDialogProps {
  onArtistInvited?: () => void;
  artistId?: string;
  artistName?: string;
}

const ROLE_NAME = 'Artista';

export default function InviteArtistDialog({ onArtistInvited, artistId, artistName }: InviteArtistDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState(artistName || '');

  // Per-module access toggles, prefilled from "Artista" defaults.
  const [access, setAccess] = useState<Record<ModuleKey, PermissionLevel>>(
    () => getIndustryDefaults(ROLE_NAME) as Record<ModuleKey, PermissionLevel>,
  );

  const toggleModule = (key: ModuleKey, on: boolean) => {
    setAccess((prev) => ({ ...prev, [key]: on ? 'view' : 'none' }));
  };

  const handleInvite = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !user || !artistId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          email,
          scope: 'ARTIST',
          scopeId: artistId,
          role: ROLE_NAME,
          teamCategory: 'artistico',
        },
      });
      if (error) throw error;

      // Persist module-level overrides for this Artista role on the workspace.
      // Resolve workspace from the artist row.
      const { data: artistRow } = await supabase
        .from('artists')
        .select('workspace_id')
        .eq('id', artistId)
        .maybeSingle();

      if (artistRow?.workspace_id) {
        const rows = (Object.entries(access) as [ModuleKey, PermissionLevel][]).map(
          ([module, level]) => ({
            workspace_id: artistRow.workspace_id,
            role_name: ROLE_NAME,
            module,
            level,
            updated_by: user.id,
          }),
        );
        await supabase
          .from('functional_role_permission_overrides')
          .upsert(rows as any, { onConflict: 'workspace_id,role_name,module' });
      }

      setDone(true);
      toast({
        title: 'Invitación enviada',
        description: data?.message || `Se procesó la invitación para ${email}.`,
      });
      onArtistInvited?.();
    } catch (err: any) {
      console.error('Error inviting artist:', err);
      toast({
        title: 'Error',
        description: err?.message || 'No se pudo enviar la invitación.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setDone(false);
      setEmail('');
      setFullName(artistName || '');
      setAccess(getIndustryDefaults(ROLE_NAME) as Record<ModuleKey, PermissionLevel>);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Artista
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{artistName ? `Invitar a ${artistName}` : 'Invitar Artista'}</DialogTitle>
          <DialogDescription>
            Envía una invitación para que el artista acceda a su portal personal.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <Check className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-medium">¡Invitación procesada!</p>
            <p className="text-sm text-muted-foreground">
              El artista recibirá un email para acceder a su portal.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteFullName">Nombre completo</Label>
              <Input
                id="inviteFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre del artista"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email del artista</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artista@email.com"
                required
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                El artista se invita con el rol funcional <strong>"{ROLE_NAME}"</strong>. Activa
                o desactiva qué módulos podrá ver desde su portal.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Acceso al portal</Label>
              <div className="border rounded-lg divide-y">
                {MODULES.map((m) => {
                  const on = access[m.key] !== 'none';
                  const Icon = m.icon;
                  return (
                    <div key={m.key} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {m.description}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => toggleModule(m.key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading || !email}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Enviar invitación
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
