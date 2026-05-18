import { useState, useMemo } from 'react';
import { Music, Disc3, Album, Search, Check, ChevronDown, ChevronUp, Loader2, AlertCircle, ExternalLink, Sparkles, ArrowLeft, Lock, Database, Radio } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArtistProfileSelector } from '@/components/ArtistProfileSelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Platform definitions ──────────────────────────────────────────

interface Platform {
  id: string;
  name: string;
  category: 'distribucion' | 'derechos';
  emoji: string;
  available: boolean;
  description: string;
}

const PLATFORMS: Platform[] = [
  // Distribución
  { id: 'spotify', name: 'Spotify', category: 'distribucion', emoji: '🟢', available: true, description: 'Importa discografía pública vía API' },
  { id: 'ditto', name: 'Ditto Music', category: 'distribucion', emoji: '🎵', available: false, description: 'Conecta tu cuenta de distribución' },
  { id: 'altafonte', name: 'Altafonte', category: 'distribucion', emoji: '🌎', available: false, description: 'Importa catálogo distribuido' },
  { id: 'orchard', name: 'The Orchard', category: 'distribucion', emoji: '🍊', available: false, description: 'Catálogo Sony/Orchard' },
  { id: 'sony', name: 'Sony Music', category: 'distribucion', emoji: '🎧', available: false, description: 'Catálogo Sony Music' },
  { id: 'distrokid', name: 'DistroKid', category: 'distribucion', emoji: '🚀', available: false, description: 'Importa desde tu cuenta' },
  { id: 'tunecore', name: 'TuneCore', category: 'distribucion', emoji: '🎹', available: false, description: 'Catálogo TuneCore' },
  { id: 'cdbaby', name: 'CD Baby', category: 'distribucion', emoji: '💿', available: false, description: 'Catálogo CD Baby' },
  // Bases de datos de derechos
  { id: 'sgae', name: 'SGAE', category: 'derechos', emoji: '📜', available: false, description: 'Obras registradas en SGAE' },
  { id: 'aie', name: 'AIE', category: 'derechos', emoji: '🎤', available: false, description: 'Derechos de intérpretes' },
  { id: 'agedi', name: 'AGEDI', category: 'derechos', emoji: '🏭', available: false, description: 'Derechos de productores' },
  { id: 'bmat', name: 'BMAT', category: 'derechos', emoji: '📡', available: false, description: 'Monitorización de derechos' },
  { id: 'soundexchange', name: 'SoundExchange', category: 'derechos', emoji: '🇺🇸', available: false, description: 'Royalties digitales USA' },
];

// ── Spotify types ─────────────────────────────────────────────────

interface SpotifyRelease {
  spotify_id: string;
  title: string;
  type: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  cover_image_url: string | null;
  spotify_url: string;
  upc: string | null;
  label: string | null;
  copyright: string | null;
  genre: string | null;
  artists: { id: string; name: string }[];
  tracks: {
    spotify_id: string;
    title: string;
    track_number: number;
    duration_seconds: number;
    explicit: boolean;
    spotify_url: string;
    isrc: string | null;
    preview_url: string | null;
    popularity: number | null;
    artists: { id: string; name: string }[];
  }[];
}

interface SpotifyArtist {
  name: string;
  spotify_id: string;
  image_url: string | null;
  genres: string[];
  followers: number;
}

interface ImportPlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function extractSpotifyArtistId(input: string): string | null {
  const uriMatch = input.match(/spotify:artist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  const urlMatch = input.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?artist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  return null;
}

type Step = 'platform' | 'input' | 'select' | 'importing' | 'done' | 'credentials-missing';

const TYPE_ORDER = ['album', 'ep', 'single', 'compilation', 'appears_on'];
const TYPE_LABELS: Record<string, string> = {
  album: 'Álbumes',
  ep: 'EPs',
  single: 'Singles',
  compilation: 'Recopilatorios',
  appears_on: 'Apariciones / Featurings',
};
const TYPE_ICONS: Record<string, typeof Album> = {
  album: Album,
  ep: Disc3,
  single: Music,
  compilation: Album,
  appears_on: Sparkles,
};

// ── Platform Selector Step ────────────────────────────────────────

function PlatformSelector({ onSelect }: { onSelect: (platformId: string) => void }) {
  const distribucion = PLATFORMS.filter(p => p.category === 'distribucion');
  const derechos = PLATFORMS.filter(p => p.category === 'derechos');

  const renderCard = (platform: Platform) => (
    <button
      key={platform.id}
      disabled={!platform.available}
      onClick={() => platform.available && onSelect(platform.id)}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
        platform.available
          ? 'cursor-pointer hover:border-primary hover:bg-primary/5 hover:shadow-sm'
          : 'opacity-50 cursor-not-allowed'
      }`}
    >
      <span className="text-2xl">{platform.emoji}</span>
      <span className="text-xs font-medium leading-tight">{platform.name}</span>
      {platform.available ? (
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Disponible</Badge>
      ) : (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">Próximamente</Badge>
      )}
    </button>
  );

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-5">
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Radio className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plataformas de distribución</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {distribucion.map(renderCard)}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Database className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bases de datos de derechos</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {derechos.map(renderCard)}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function ImportPlatformDialog({ open, onOpenChange }: ImportPlatformDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('platform');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [artistId, setArtistId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState('');
  const [loading, setLoading] = useState(false);

  const [spotifyArtist, setSpotifyArtist] = useState<SpotifyArtist | null>(null);
  const [releases, setReleases] = useState<SpotifyRelease[]>([]);
  const [existingSpotifyIds, setExistingSpotifyIds] = useState<Set<string>>(new Set());

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['single', 'appears_on', 'compilation']));

  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [importResult, setImportResult] = useState({ releases: 0, tracks: 0 });

  const groupedReleases = useMemo(() => {
    const groups = new Map<string, SpotifyRelease[]>();
    releases.forEach(r => {
      const key = r.type;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });
    return TYPE_ORDER
      .filter(t => groups.has(t))
      .map(t => ({ type: t, items: groups.get(t)! }));
  }, [releases]);

  const selectedCount = selected.size;
  const selectedTracks = useMemo(() => {
    return releases
      .filter(r => selected.has(r.spotify_id))
      .reduce((sum, r) => sum + r.total_tracks, 0);
  }, [releases, selected]);

  function resetState() {
    setStep('platform');
    setSpotifyUrl('');
    setArtistId(null);
    setUrlError('');
    setLoading(false);
    setSpotifyArtist(null);
    setReleases([]);
    setExistingSpotifyIds(new Set());
    setSelected(new Set());
    setCollapsedSections(new Set(['single', 'appears_on', 'compilation']));
    setImportProgress(0);
    setImportStatus('');
    setImportResult({ releases: 0, tracks: 0 });
  }

  function handlePlatformSelect(platformId: string) {
    if (platformId === 'spotify') {
      setStep('input');
    }
  }

  // ── Spotify flow (unchanged logic) ──

  async function handleSearch() {
    const spotifyArtistId = extractSpotifyArtistId(spotifyUrl.trim());
    if (!spotifyArtistId) {
      setUrlError('URL de Spotify no reconocida. Usa el formato: open.spotify.com/artist/...');
      return;
    }
    if (!artistId) {
      setUrlError('Selecciona un artista de tu roster');
      return;
    }

    setUrlError('');
    setLoading(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/spotify-import?action=fetch&artistId=${spotifyArtistId}`,
        {
          headers: {
            'apikey': anonKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'SPOTIFY_CREDENTIALS_MISSING') {
          setStep('credentials-missing');
          setLoading(false);
          return;
        }
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const result = await res.json();

      const spotifyIds = result.releases.map((r: SpotifyRelease) => r.spotify_id);
      const { data: existing } = await supabase
        .from('releases')
        .select('spotify_id')
        .in('spotify_id', spotifyIds);

      const existingSet = new Set((existing || []).map((e: any) => e.spotify_id));
      setExistingSpotifyIds(existingSet);
      setSpotifyArtist(result.artist);
      setReleases(result.releases);

      const preSelected = new Set<string>();
      result.releases.forEach((r: SpotifyRelease) => {
        if ((r.type === 'album' || r.type === 'ep') && !existingSet.has(r.spotify_id)) {
          preSelected.add(r.spotify_id);
        }
      });
      setSelected(preSelected);
      setStep('select');
    } catch (err: any) {
      setUrlError(err.message || 'Error al conectar con Spotify');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!user?.id || !artistId) return;
    setStep('importing');
    setImportProgress(0);

    const toImport = releases.filter(r => selected.has(r.spotify_id));
    let importedReleases = 0;
    let importedTracks = 0;

    for (let i = 0; i < toImport.length; i++) {
      const release = toImport[i];
      setImportStatus(`Importando ${i + 1} de ${toImport.length}: ${release.title}...`);
      setImportProgress(Math.round(((i) / toImport.length) * 100));

      try {
        let releaseType = release.type;
        if (releaseType === 'compilation' || releaseType === 'appears_on') releaseType = 'album';
        if (!['album', 'ep', 'single'].includes(releaseType)) releaseType = 'single';

        let releaseDate: string | null = null;
        if (release.release_date) {
          if (release.release_date_precision === 'year') {
            releaseDate = `${release.release_date}-01-01`;
          } else if (release.release_date_precision === 'month') {
            releaseDate = `${release.release_date}-01`;
          } else {
            releaseDate = release.release_date;
          }
        }

        const { data: newRelease, error: releaseError } = await supabase
          .from('releases')
          .insert({
            title: release.title,
            type: releaseType,
            release_date: releaseDate,
            cover_image_url: release.cover_image_url,
            status: 'released',
            artist_id: artistId,
            created_by: user.id,
            label: release.label,
            upc: release.upc,
            genre: release.genre,
            spotify_id: release.spotify_id,
            spotify_url: release.spotify_url,
            copyright: release.copyright,
          })
          .select('id')
          .single();

        if (releaseError) {
          console.error('Error importing release:', releaseError);
          continue;
        }

        importedReleases++;

        await supabase
          .from('release_artists')
          .insert({ release_id: newRelease.id, artist_id: artistId })
          .then(() => {});

        if (release.tracks.length > 0) {
          setImportStatus(`Importando canciones de \"${release.title}\"...`);

          for (const track of release.tracks) {
            const { error: trackError } = await supabase
              .from('tracks')
              .insert({
                release_id: newRelease.id,
                title: track.title,
                track_number: track.track_number,
                duration: track.duration_seconds,
                isrc: track.isrc,
                spotify_id: track.spotify_id,
                spotify_url: track.spotify_url,
                preview_url: track.preview_url,
                explicit: track.explicit,
                popularity: track.popularity,
              });

            if (!trackError) importedTracks++;
          }
        }
      } catch (err) {
        console.error('Error importing:', err);
      }

      setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
    }

    setImportResult({ releases: importedReleases, tracks: importedTracks });
    setImportProgress(100);
    setImportStatus('✅ Importación completada');
    setStep('done');

    queryClient.invalidateQueries({ queryKey: ['releases'] });
    toast.success(`${importedReleases} lanzamientos importados`);
  }

  function toggleSelection(spotifyId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(spotifyId)) next.delete(spotifyId);
      else next.add(spotifyId);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      const all = new Set<string>();
      releases.forEach(r => {
        if (!existingSpotifyIds.has(r.spotify_id)) all.add(r.spotify_id);
      });
      setSelected(all);
    } else {
      setSelected(new Set());
    }
  }

  function toggleSection(type: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const sheetTitle = step === 'platform' ? 'Importar discografía' : 'Importar desde Spotify';

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step === 'platform' ? (
              <>
                <Database className="w-5 h-5 text-primary" />
                {sheetTitle}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-primary" />
                {sheetTitle}
              </>
            )}
          </SheetTitle>
          {step === 'platform' && (
            <p className="text-sm text-muted-foreground">Selecciona la fuente de datos</p>
          )}
        </SheetHeader>

        {/* Step: Platform Selection */}
        {step === 'platform' && (
          <PlatformSelector onSelect={handlePlatformSelect} />
        )}

        {/* Step: Credentials Missing */}
        {step === 'credentials-missing' && (
          <div className="flex-1 flex flex-col gap-4 p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Las credenciales de Spotify no están configuradas.
              </AlertDescription>
            </Alert>
            <div className="space-y-3 text-sm">
              <p className="font-medium">Para usar esta función necesitas:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  Ir al{' '}
                  <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">
                    Spotify Developer Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Crear una aplicación (nombre libre, cualquier redirect URI)</li>
                <li>Copiar el <strong>Client ID</strong> y <strong>Client Secret</strong></li>
                <li>
                  Añadirlos como secretos en{' '}
                  <a href="https://supabase.com/dashboard/project/hptjzbaiclmgbvxlmllo/settings/functions" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">
                    Supabase Edge Functions Secrets <ExternalLink className="w-3 h-3" />
                  </a>:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><code className="text-xs bg-muted px-1 rounded">SPOTIFY_CLIENT_ID</code></li>
                    <li><code className="text-xs bg-muted px-1 rounded">SPOTIFY_CLIENT_SECRET</code></li>
                  </ul>
                </li>
              </ol>
              <p className="text-muted-foreground">Una vez configurados, vuelve aquí e inténtalo de nuevo.</p>
            </div>
            <div className="flex gap-2 mt-auto">
              <Button variant="outline" className="flex-1" onClick={() => setStep('platform')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver
              </Button>
              <Button className="flex-1" onClick={() => setStep('input')}>
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {/* Step: Spotify Input */}
        {step === 'input' && (
          <div className="flex-1 flex flex-col gap-4 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL del perfil del artista en Spotify</label>
              <Input
                placeholder="https://open.spotify.com/artist/..."
                value={spotifyUrl}
                onChange={(e) => { setSpotifyUrl(e.target.value); setUrlError(''); }}
              />
              <p className="text-xs text-muted-foreground">
                Compatible con: open.spotify.com/artist/..., open.spotify.com/intl-es/artist/..., spotify:artist:...
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">¿A qué artista de MOODITA asignar?</label>
              <ArtistProfileSelector
                value={artistId}
                onValueChange={(v) => setArtistId(v || null)}
              />
            </div>

            {urlError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{urlError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 mt-auto">
              <Button variant="outline" className="flex-1" onClick={() => setStep('platform')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver
              </Button>
              <Button className="flex-1" onClick={handleSearch} disabled={loading || !spotifyUrl.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Buscar discografía
              </Button>
            </div>
          </div>
        )}

        {/* Step: Select */}
        {step === 'select' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {spotifyArtist && (
              <div className="flex items-center gap-3 p-4 border-b">
                {spotifyArtist.image_url && (
                  <img src={spotifyArtist.image_url} alt={spotifyArtist.name} className="w-10 h-10 rounded-full object-cover" />
                )}
                <div>
                  <p className="font-semibold">{spotifyArtist.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {spotifyArtist.followers.toLocaleString()} seguidores · {releases.length} lanzamientos
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
              <Checkbox
                checked={selected.size > 0 && selected.size === releases.filter(r => !existingSpotifyIds.has(r.spotify_id)).length}
                onCheckedChange={(c) => toggleAll(!!c)}
              />
              <span className="text-sm">
                {selected.size > 0 ? `${selectedCount} seleccionados · ${selectedTracks} canciones` : 'Seleccionar todo'}
              </span>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {groupedReleases.map(({ type, items }) => {
                  const Icon = TYPE_ICONS[type] || Disc3;
                  const isCollapsed = collapsedSections.has(type);
                  const availableCount = items.filter(i => !existingSpotifyIds.has(i.spotify_id)).length;

                  return (
                    <div key={type}>
                      <button
                        className="flex items-center gap-2 w-full text-left py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => toggleSection(type)}
                      >
                        <Icon className="w-4 h-4" />
                        {TYPE_LABELS[type] || type} ({items.length})
                        {availableCount < items.length && (
                          <Badge variant="outline" className="text-[10px] ml-1">{items.length - availableCount} ya importados</Badge>
                        )}
                        {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronUp className="w-3.5 h-3.5 ml-auto" />}
                      </button>

                      {!isCollapsed && (
                        <div className="space-y-1 mt-1">
                          {items.map(release => {
                            const isExisting = existingSpotifyIds.has(release.spotify_id);
                            const isSelected = selected.has(release.spotify_id);
                            const year = release.release_date?.slice(0, 4) || '—';

                            return (
                              <label
                                key={release.spotify_id}
                                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                  isExisting ? 'opacity-50 cursor-default' : isSelected ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isExisting}
                                  onCheckedChange={() => !isExisting && toggleSelection(release.spotify_id)}
                                />
                                {release.cover_image_url ? (
                                  <img src={release.cover_image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" loading="lazy" />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{release.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {year} · {release.total_tracks} {release.total_tracks === 1 ? 'canción' : 'canciones'}
                                  </p>
                                </div>
                                {isExisting && (
                                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                    <Check className="w-3 h-3 mr-0.5" /> Ya importado
                                  </Badge>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 p-3 border-t bg-background">
              <Button variant="outline" size="sm" onClick={() => setStep('input')}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Volver
              </Button>
              <div className="flex-1" />
              <Button size="sm" onClick={handleImport} disabled={selectedCount === 0}>
                <Check className="w-4 h-4 mr-1" />
                Importar seleccionados ({selectedCount})
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="w-full space-y-2">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">{importStatus}</p>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Importación completada</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• {importResult.releases} lanzamientos añadidos</p>
              <p>• {importResult.tracks} canciones añadidas</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => { resetState(); }}>
                Importar más
              </Button>
              <Button onClick={() => { resetState(); onOpenChange(false); }}>
                Ver discografía
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
