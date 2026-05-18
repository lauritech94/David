import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Music, Plus, Trash2, Users, Link, Disc } from 'lucide-react';
import {
  useSongs,
  useSongSplits,
  useCreateSongSplit,
  useDeleteSongSplit,
  useTracksWithCredits,
  Song,
  SongSplit,
  Track,
  TrackCredit,
} from '@/hooks/useRoyalties';
import { CreateSongDialog } from './CreateSongDialog';
import { EditSongDialog } from './EditSongDialog';
import { SongDetailDialog } from './SongDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LinkContactDialog } from './LinkContactDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const ROLES = [
  { value: 'writer', label: 'Compositor' },
  { value: 'producer', label: 'Productor' },
  { value: 'performer', label: 'Intérprete' },
  { value: 'featured', label: 'Featuring' },
  { value: 'label', label: 'Sello' },
];

function AddSplitDialog({ song, existingSplits }: { song: Song; existingSplits: SongSplit[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [percentage, setPercentage] = useState('');
  const [role, setRole] = useState('writer');
  
  const createSplit = useCreateSongSplit();
  
  const usedPercentage = existingSplits.reduce((sum, s) => sum + Number(s.percentage), 0);
  const maxPercentage = 100 - usedPercentage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const pct = Number(percentage);
    if (pct <= 0 || pct > maxPercentage) {
      return;
    }
    
    await createSplit.mutateAsync({
      song_id: song.id,
      collaborator_name: name,
      collaborator_email: email || undefined,
      percentage: pct,
      role,
    });
    
    setOpen(false);
    setName('');
    setEmail('');
    setPercentage('');
    setRole('writer');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Añadir Split
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Colaborador a "{song.title}"</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Colaborador *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Porcentaje * (máx. {maxPercentage}%)</Label>
              <Input
                type="number"
                min="1"
                max={maxPercentage}
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="25"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createSplit.isPending}>
              {createSplit.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SongCard({ song }: { song: Song }) {
  const { data: allSplits = [] } = useSongSplits();
  const deleteSplit = useDeleteSongSplit();
  
  const splits = allSplits.filter(s => s.song_id === song.id);
  const totalPercentage = splits.reduce((sum, s) => sum + Number(s.percentage), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {song.title}
              <SongDetailDialog song={song} />
              <EditSongDialog song={song} />
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {song.isrc && <span>ISRC: {song.isrc}</span>}
              {song.release_date && (
                <span>
                  Lanzamiento: {format(new Date(song.release_date), 'dd MMM yyyy', { locale: es })}
                </span>
              )}
            </CardDescription>
          </div>
          <AddSplitDialog song={song} existingSplits={splits} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Distribución total</span>
            <span className={totalPercentage === 100 ? 'text-green-500' : 'text-amber-500'}>
              {totalPercentage}%
            </span>
          </div>
          <Progress value={totalPercentage} className="h-2" />
        </div>
        
        {splits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay splits configurados
          </p>
        ) : (
          <div className="space-y-2">
            {splits.map(split => (
              <div
                key={split.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-sm">{split.collaborator_name}</p>
                      {split.collaborator_contact_id && (
                        <Link className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ROLES.find(r => r.value === split.role)?.label || split.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{split.percentage}%</Badge>
                  <LinkContactDialog split={split} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteSplit.mutate(split.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component to display tracks from releases with their credits
function TrackCreditCard({ track, credits }: { track: Track; credits: TrackCredit[] }) {
  const totalPercentage = credits.reduce((sum, c) => sum + Number(c.percentage), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Disc className="h-4 w-4 text-muted-foreground" />
              {track.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {track.release_title && <Badge variant="outline">{track.release_title}</Badge>}
              {track.isrc && <span className="text-xs">ISRC: {track.isrc}</span>}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Distribución total</span>
            <span className={totalPercentage === 100 ? 'text-green-500' : 'text-amber-500'}>
              {totalPercentage}%
            </span>
          </div>
          <Progress value={totalPercentage} className="h-2" />
        </div>
        
        {credits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay splits configurados
          </p>
        ) : (
          <div className="space-y-2">
            {credits.map(credit => (
              <div
                key={credit.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-sm">{credit.name}</p>
                      {credit.contact_id && (
                        <Link className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{credit.role}</p>
                  </div>
                </div>
                <Badge variant="secondary">{credit.percentage}%</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SongSplitsManagerProps {
  artistId?: string;
}

export function SongSplitsManager({ artistId }: SongSplitsManagerProps) {
  const [activeTab, setActiveTab] = useState('releases');
  const { data: songs = [], isLoading: songsLoading } = useSongs(artistId);
  const { data: tracksData, isLoading: tracksLoading } = useTracksWithCredits(artistId);

  const tracks = tracksData?.tracks || [];
  const trackCredits = tracksData?.credits || [];

  const isLoading = songsLoading || tracksLoading;

  // Stats for display
  const tracksWithSplits = tracks.filter(t => 
    trackCredits.some(c => c.track_id === t.id)
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Cargando canciones...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Canciones & Splits</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los splits de royalties para cada canción
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="releases" className="gap-2">
            <Disc className="h-4 w-4" />
            Desde Discografía ({tracksWithSplits.length})
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Music className="h-4 w-4" />
            Canciones Manuales ({songs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="releases" className="space-y-4 mt-4">
          {tracksWithSplits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Disc className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay tracks con splits desde Discografía</p>
                <p className="text-sm mt-2">
                  Los splits creados en la sección de Discografía aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tracksWithSplits.map(track => (
                <TrackCreditCard 
                  key={track.id} 
                  track={track} 
                  credits={trackCredits.filter(c => c.track_id === track.id)} 
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <CreateSongDialog artistId={artistId} />
          </div>
          {songs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay canciones registradas manualmente</p>
                <p className="text-sm mt-2">Añade una canción para comenzar a gestionar sus splits</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {songs.map(song => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
