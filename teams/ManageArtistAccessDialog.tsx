import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Star, Users, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  mapFunctionalRoleToBindingRole,
  bindingRoleLabel,
  type ArtistBindingRole,
} from '@/lib/permissions/roleMapping';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string;
  /**
   * Rol funcional global del miembro (p. ej. "Mánager Personal").
   * Determina automáticamente el rol que se grabará en cada binding.
   */
  functionalRole?: string | null;
  onSaved?: () => void;
}

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  artist_type: string | null;
}

interface BindingState {
  artistId: string;
  enabled: boolean;
  originalEnabled: boolean;
}

export function ManageArtistAccessDialog({
  open,
  onOpenChange,
  userId,
  userName,
  functionalRole,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [bindings, setBindings] = useState<Record<string, BindingState>>({});

  const derivedBindingRole: ArtistBindingRole = mapFunctionalRoleToBindingRole(functionalRole);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [artistsRes, bindingsRes] = await Promise.all([
          supabase.from('artists').select('id, name, stage_name, artist_type').order('name'),
          supabase.from('artist_role_bindings').select('artist_id').eq('user_id', userId),
        ]);

        if (cancelled) return;
        if (artistsRes.error) throw artistsRes.error;
        if (bindingsRes.error) throw bindingsRes.error;

        const list = artistsRes.data ?? [];
        const existing = new Set<string>((bindingsRes.data ?? []).map((b: any) => b.artist_id));

        const initial: Record<string, BindingState> = {};
        list.forEach((a) => {
          const enabled = existing.has(a.id);
          initial[a.id] = {
            artistId: a.id,
            enabled,
            originalEnabled: enabled,
          };
        });

        setArtists(list);
        setBindings(initial);
      } catch (err: any) {
        toast({
          title: 'Error al cargar',
          description: err.message ?? 'No se pudieron cargar los artistas.',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const toggleArtist = (artistId: string, enabled: boolean) => {
    setBindings((prev) => ({
      ...prev,
      [artistId]: { ...prev[artistId], enabled },
    }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const toInsert: { artist_id: string; user_id: string; role: ArtistBindingRole }[] = [];
      const toDelete: string[] = [];
      const toUpdate: string[] = []; // bindings ya existentes que mantienen acceso → realinear rol

      Object.values(bindings).forEach((b) => {
        if (b.enabled && !b.originalEnabled) {
          toInsert.push({ artist_id: b.artistId, user_id: userId, role: derivedBindingRole });
        } else if (!b.enabled && b.originalEnabled) {
          toDelete.push(b.artistId);
        } else if (b.enabled && b.originalEnabled) {
          // Asegurar que el binding existente refleja el rol funcional vigente
          toUpdate.push(b.artistId);
        }
      });

      if (toInsert.length > 0) {
        const { error } = await supabase.from('artist_role_bindings').insert(toInsert as any);
        if (error) throw error;
      }
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('artist_role_bindings')
          .delete()
          .eq('user_id', userId)
          .in('artist_id', toDelete);
        if (error) throw error;
      }
      if (toUpdate.length > 0) {
        const { error } = await supabase
          .from('artist_role_bindings')
          .update({ role: derivedBindingRole } as any)
          .eq('user_id', userId)
          .in('artist_id', toUpdate);
        if (error) throw error;
      }

      toast({
        title: 'Acceso actualizado',
        description: `Se actualizó el acceso a artistas de ${userName}.`,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Error al guardar',
        description: err.message ?? 'No se pudieron guardar los cambios.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(bindings).filter((b) => b.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Acceso a artistas</DialogTitle>
          <DialogDescription>
            Selecciona los artistas a los que <strong>{userName}</strong> debe tener acceso.
            Solo verá la información de los artistas marcados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p>
              Este miembro accederá a los artistas marcados con el rol{' '}
              <strong>{functionalRole?.trim() || 'sin rol funcional'}</strong>
              {functionalRole?.trim() && (
                <>
                  {' '}
                  (<span className="text-muted-foreground">{bindingRoleLabel(derivedBindingRole)}</span>)
                </>
              )}
              .
            </p>
            <p className="text-xs text-muted-foreground">
              El rol manda siempre. Para cambiarlo, edita el rol funcional del miembro.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : artists.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No hay artistas en el workspace todavía.
          </p>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-3">
            {(() => {
              const roster = artists.filter((a) => (a.artist_type ?? 'roster') === 'roster');
              const collaborators = artists.filter((a) => a.artist_type === 'collaborator');

              const renderRow = (artist: Artist, isRoster: boolean) => {
                const b = bindings[artist.id];
                if (!b) return null;
                const displayName = artist.stage_name || artist.name;
                return (
                  <div
                    key={artist.id}
                    className="flex items-center gap-3 p-3 rounded-md border bg-card"
                  >
                    <Checkbox
                      id={`a-${artist.id}`}
                      checked={b.enabled}
                      onCheckedChange={(c) => toggleArtist(artist.id, c === true)}
                    />
                    <Label
                      htmlFor={`a-${artist.id}`}
                      className="flex-1 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      {isRoster ? (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      ) : (
                        <Users className="h-3 w-3 text-muted-foreground" />
                      )}
                      {displayName}
                    </Label>
                  </div>
                );
              };

              return (
                <div className="space-y-5">
                  <section className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      Mi Roster
                      <span className="text-xs font-normal">· {roster.length}</span>
                    </div>
                    {roster.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic px-1">
                        No hay artistas en el roster.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {roster.map((a) => renderRow(a, true))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      <Users className="h-4 w-4" />
                      Colaboradores
                      <span className="text-xs font-normal">· {collaborators.length}</span>
                    </div>
                    {collaborators.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic px-1">
                        No hay colaboradores.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {collaborators.map((a) => renderRow(a, false))}
                      </div>
                    )}
                  </section>
                </div>
              );
            })()}
          </ScrollArea>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {enabledCount} artista{enabledCount === 1 ? '' : 's'} seleccionado{enabledCount === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
