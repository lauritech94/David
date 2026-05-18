import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp } from 'lucide-react';
import { EditEarningDialog } from './EditEarningDialog';
import { useSongs, usePlatformEarnings, useCreatePlatformEarning, useRoyaltiesStats, useTracksWithCredits } from '@/hooks/useRoyalties';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ImportEarningsDialog } from './ImportEarningsDialog';
import { ExportRoyaltiesButton } from './ExportRoyaltiesButton';
import { EarningsFilters } from './EarningsFilters';

const PLATFORMS = [
  { value: 'spotify', label: 'Spotify', icon: '🎵', color: 'bg-green-500' },
  { value: 'apple_music', label: 'Apple Music', icon: '🍎', color: 'bg-red-500' },
  { value: 'youtube', label: 'YouTube Music', icon: '▶️', color: 'bg-red-600' },
  { value: 'amazon', label: 'Amazon Music', icon: '🛒', color: 'bg-orange-500' },
  { value: 'tidal', label: 'Tidal', icon: '🌊', color: 'bg-blue-500' },
  { value: 'deezer', label: 'Deezer', icon: '🎧', color: 'bg-purple-500' },
  { value: 'other', label: 'Otra', icon: '📀', color: 'bg-gray-500' },
];

function AddEarningDialog({ artistId }: { artistId?: string }) {
  const [open, setOpen] = useState(false);
  const [songId, setSongId] = useState('');
  const [platform, setPlatform] = useState('');
  const [amount, setAmount] = useState('');
  const [streams, setStreams] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  
  const { data: songs = [] } = useSongs(artistId);
  const { data: tracksData } = useTracksWithCredits(artistId);
  const tracks = tracksData?.tracks || [];
  const createEarning = useCreatePlatformEarning();

  // Combine manual songs and discography tracks for the selector
  const allSongs = [
    ...songs.map(s => ({ id: s.id, title: s.title, type: 'manual' as const })),
    ...tracks.map(t => ({ id: t.id, title: t.title, type: 'discography' as const, releaseTitle: t.release_title })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createEarning.mutateAsync({
      song_id: songId,
      platform,
      amount: Number(amount),
      streams: streams ? Number(streams) : 0,
      period_start: periodStart,
      period_end: periodEnd,
    });
    
    setOpen(false);
    setSongId('');
    setPlatform('');
    setAmount('');
    setStreams('');
    setPeriodStart('');
    setPeriodEnd('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Ganancias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Ganancias de Plataforma</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Canción *</Label>
            <Select value={songId} onValueChange={setSongId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una canción" />
              </SelectTrigger>
              <SelectContent>
                {songs.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Canciones Manuales</div>
                    {songs.map(song => (
                      <SelectItem key={`song-${song.id}`} value={song.id}>{song.title}</SelectItem>
                    ))}
                  </>
                )}
                {tracks.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Desde Discográfica</div>
                    {tracks.map(track => (
                      <SelectItem key={`track-${track.id}`} value={track.id}>
                        {track.title} {track.release_title && <span className="text-muted-foreground">({track.release_title})</span>}
                      </SelectItem>
                    ))}
                  </>
                )}
                {songs.length === 0 && tracks.length === 0 && (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">No hay canciones registradas</div>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Plataforma *</Label>
            <Select value={platform} onValueChange={setPlatform} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona plataforma" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto (€) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Reproducciones</Label>
              <Input
                type="number"
                min="0"
                value={streams}
                onChange={(e) => setStreams(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período Inicio *</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Período Fin *</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createEarning.isPending || (songs.length === 0 && tracks.length === 0)}>
              {createEarning.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PlatformEarningsManagerProps {
  artistId?: string;
}

export function PlatformEarningsManager({ artistId }: PlatformEarningsManagerProps) {
  const [filters, setFilters] = useState<{ startDate?: string; endDate?: string }>({});
  const { data: allEarnings = [], isLoading } = usePlatformEarnings();
  const { data: songs = [] } = useSongs(artistId);
  const { data: tracksData } = useTracksWithCredits(artistId);
  const tracks = tracksData?.tracks || [];
  const { earningsByPlatform, totalEarnings } = useRoyaltiesStats(artistId);

  // Get song IDs and track IDs for this artist
  const songIds = new Set(songs.map(s => s.id));
  const trackIds = new Set(tracks.map(t => t.id));

  // Apply date filters and artist filter
  const earnings = allEarnings.filter(e => {
    if (artistId && artistId !== 'all' && !songIds.has(e.song_id) && !trackIds.has(e.song_id)) return false;
    if (filters.startDate && e.period_start < filters.startDate) return false;
    if (filters.endDate && e.period_end > filters.endDate) return false;
    return true;
  });

  const getSongTitle = (songId: string) => {
    const song = songs.find(s => s.id === songId);
    if (song) return song.title;
    const track = tracks.find(t => t.id === songId);
    if (track) return track.title;
    return 'Canción desconocida';
  };

  const getPlatformInfo = (platformKey: string) => {
    return PLATFORMS.find(p => p.value === platformKey) || PLATFORMS[PLATFORMS.length - 1];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Cargando ganancias...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="font-semibold">Ganancias por Plataforma</h3>
          <p className="text-sm text-muted-foreground">
            Registra y visualiza tus ingresos de streaming
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EarningsFilters onFilterChange={setFilters} />
          <ImportEarningsDialog />
          <ExportRoyaltiesButton />
          <AddEarningDialog artistId={artistId} />
        </div>
      </div>

      {/* Platform Summary */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {PLATFORMS.filter(p => earningsByPlatform[p.value]).map(platform => (
          <Card key={platform.value}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${platform.color} flex items-center justify-center text-xl`}>
                  {platform.icon}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{platform.label}</p>
                  <p className="text-xl font-bold">
                    €{earningsByPlatform[platform.value]?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings List */}
      {earnings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No hay ganancias registradas</p>
            <p className="text-sm mt-2">
              {songs.length === 0 && tracks.length === 0
                ? 'Primero añade una canción en la pestaña de Splits'
                : 'Registra tus primeras ganancias de streaming'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de Ganancias</CardTitle>
            <CardDescription>
              Total acumulado: €{totalEarnings.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {earnings.map(earning => {
                const platform = getPlatformInfo(earning.platform);
                return (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full ${platform.color} flex items-center justify-center text-lg`}>
                        {platform.icon}
                      </div>
                      <div>
                        <p className="font-medium">{getSongTitle(earning.song_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {platform.label} • {format(new Date(earning.period_start), 'MMM yyyy', { locale: es })} - {format(new Date(earning.period_end), 'MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-500">
                          €{Number(earning.amount).toFixed(2)}
                        </p>
                        {earning.streams > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {earning.streams.toLocaleString()} reproducciones
                          </p>
                        )}
                      </div>
                      <EditEarningDialog earning={earning} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
