import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mic2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ReleaseArtist } from '@/hooks/useReleases';
import { ArtistSelector } from '@/components/ArtistSelector';

interface ReleaseArtistRolesProps {
  releaseId: string;
  releaseArtists: ReleaseArtist[];
  compact?: boolean;
}

export function ReleaseArtistRoles({ releaseId, releaseArtists, compact = false }: ReleaseArtistRolesProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newArtistIds, setNewArtistIds] = useState<string[]>([]);

  const existingIds = releaseArtists.map(ra => ra.artist_id);

  const handleRoleChange = async (artistId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('release_artists')
        .update({ role: newRole })
        .eq('release_id', releaseId)
        .eq('artist_id', artistId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['release-artists', releaseId] });
    } catch {
      toast.error('Error al cambiar rol');
    }
  };

  const handleAddArtist = async () => {
    const toAdd = newArtistIds.filter(id => !existingIds.includes(id));
    if (toAdd.length === 0) return;
    try {
      const { error } = await supabase
        .from('release_artists')
        .insert(toAdd.map(aid => ({ release_id: releaseId, artist_id: aid, role: 'featuring' })));
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['release-artists', releaseId] });
      setIsAdding(false);
      setNewArtistIds([]);
      toast.success('Artista añadido');
    } catch {
      toast.error('Error al añadir artista');
    }
  };

  const handleRemoveArtist = async (artistId: string) => {
    try {
      const { error } = await supabase
        .from('release_artists')
        .delete()
        .eq('release_id', releaseId)
        .eq('artist_id', artistId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['release-artists', releaseId] });
      toast.success('Artista eliminado del lanzamiento');
    } catch {
      toast.error('Error al eliminar artista');
    }
  };

  const mainArtists = releaseArtists.filter(ra => ra.role !== 'featuring');
  const featArtists = releaseArtists.filter(ra => ra.role === 'featuring');

  const content = (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Mic2 className="h-4 w-4" />
            Artistas del Lanzamiento
          </h4>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Añadir
          </Button>
        </div>
      )}
      {compact && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Artistas (Main / Featuring)</p>
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Añadir
          </Button>
        </div>
      )}

      {releaseArtists.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No hay artistas vinculados a este lanzamiento.</p>
      ) : (
        <div className="space-y-1.5">
          {[...mainArtists, ...featArtists].map((ra) => (
            <div
              key={ra.artist_id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={ra.artist?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(ra.artist?.name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm truncate">{ra.artist?.name || 'Artista'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={ra.role === 'featuring' ? 'featuring' : 'main'}
                  onValueChange={(v) => handleRoleChange(ra.artist_id, v)}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Artist</SelectItem>
                    <SelectItem value="featuring">Featuring</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveArtist(ra.artist_id)}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="flex items-end gap-2 pt-2 border-t">
          <div className="flex-1">
            <ArtistSelector
              selectedArtists={newArtistIds}
              onSelectionChange={setNewArtistIds}
              placeholder="Seleccionar artista..."
            />
          </div>
          <Button size="sm" onClick={handleAddArtist} disabled={newArtistIds.length === 0}>
            Añadir
          </Button>
        </div>
      )}

      {releaseArtists.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Vista de distribución: </span>
            {mainArtists.map(ra => ra.artist?.name).filter(Boolean).join(', ')}
            {featArtists.length > 0 && (
              <span className="italic"> feat. {featArtists.map(ra => ra.artist?.name).filter(Boolean).join(', ')}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="border-primary/20 bg-accent/30">
      <CardContent className="pt-5 pb-4">
        {content}
      </CardContent>
    </Card>
  );
}
