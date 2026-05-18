import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon, Music, Disc3, Video, VideoOff, Package, Sparkles,
  ChevronRight, ChevronLeft, Building2, Globe, Megaphone,
  StickyNote, Check, Plus, Captions, ChevronDown,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { type ReleaseConfig, type SingleConfig, type VideoType } from '@/lib/releaseTimelineTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ──

export interface TrackOption {
  id: string;
  title: string;
  track_number: number;
  isrc: string | null;
}

interface SingleRow {
  trackId?: string;
  name: string;
  date?: Date;
  videoType: VideoType;
}

const VIDEO_TYPE_OPTIONS: { value: VideoType; label: string; icon: typeof Video; className: string }[] = [
  { value: 'none', label: 'Sin video', icon: VideoOff, className: 'text-muted-foreground' },
  { value: 'videoclip', label: 'Videoclip', icon: Video, className: 'text-green-600' },
  { value: 'visualiser', label: 'Visualiser', icon: Sparkles, className: 'text-purple-500' },
  { value: 'videolyric', label: 'Videolyric', icon: Captions, className: 'text-blue-500' },
];

interface CronogramaSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: ReleaseConfig) => void;
  initialReleaseDate?: Date | null;
  initialNumSongs?: number;
  tracks?: TrackOption[];
  releaseId?: string;
  onTrackCreated?: (track: TrackOption) => void;
  releaseType?: 'single' | 'ep' | 'album';
}

// ── Constants ──

// Song count buttons are rendered inline (1-5 + 6+ with custom input)
const TERRITORIES = [
  { value: 'worldwide', label: 'Mundial' },
  { value: 'spain', label: 'España' },
  { value: 'latam', label: 'LATAM' },
  { value: 'usa', label: 'USA' },
  { value: 'europe', label: 'Europa' },
];

// ── Step Indicator ──

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-primary/20 text-primary',
                !isActive && !isDone && 'bg-muted text-muted-foreground',
              )}
            >
              {isDone ? <Check className="w-3.5 h-3.5" /> : step}
            </div>
            {i < total - 1 && (
              <div className={cn('w-8 h-0.5', step < current ? 'bg-primary/40' : 'bg-muted')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Single Row Component ──

function SingleRowEditor({
  index,
  row,
  onChange,
  tracks,
  releaseId,
  onTrackCreated,
}: {
  index: number;
  row: SingleRow;
  onChange: (row: SingleRow) => void;
  tracks: TrackOption[];
  releaseId?: string;
  onTrackCreated?: (track: TrackOption) => void;
}) {
  const [trackOpen, setTrackOpen] = useState(false);
  const [videoPopoverOpen, setVideoPopoverOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedTrack = tracks.find((t) => t.id === row.trackId);

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
      <span className="text-xs font-semibold text-muted-foreground mt-2.5 w-6 shrink-0">
        {index + 1}.
      </span>

      {/* Track combobox or free text */}
      <div className="flex-1 space-y-2">
        <Popover open={trackOpen} onOpenChange={setTrackOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-9">
              {selectedTrack ? (
                <span className="truncate">
                  {selectedTrack.track_number}. {selectedTrack.title}
                  {selectedTrack.isrc && (
                    <span className="ml-1 text-muted-foreground text-xs">({selectedTrack.isrc})</span>
                  )}
                </span>
              ) : row.name ? (
                <span className="truncate">{row.name}</span>
              ) : (
                <span className="text-muted-foreground">Vincular a canción…</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar canción…"
                value={searchValue}
                onValueChange={(val) => {
                  setSearchValue(val);
                  if (!tracks.find((t) => t.title.toLowerCase() === val.toLowerCase())) {
                    onChange({ ...row, trackId: undefined, name: val });
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>
                  {searchValue && releaseId ? (
                    <button
                      type="button"
                      disabled={isCreating}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-primary hover:bg-accent rounded cursor-pointer disabled:opacity-50"
                      onClick={async () => {
                        if (!searchValue.trim() || !releaseId) return;
                        setIsCreating(true);
                        try {
                          const { data, error } = await supabase
                            .from('tracks')
                            .insert({
                              release_id: releaseId,
                              title: searchValue.trim(),
                              track_number: tracks.length + 1,
                            })
                            .select()
                            .single();
                          if (error) throw error;
                          const newTrack: TrackOption = {
                            id: data.id,
                            title: data.title,
                            track_number: data.track_number,
                            isrc: data.isrc ?? null,
                          };
                          onTrackCreated?.(newTrack);
                          onChange({ ...row, trackId: data.id, name: data.title });
                          setSearchValue('');
                          setTrackOpen(false);
                          toast.success(`Canción "${data.title}" creada`);
                        } catch (err: any) {
                          toast.error('Error al crear canción: ' + (err.message || ''));
                        } finally {
                          setIsCreating(false);
                        }
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isCreating ? 'Creando…' : `Crear "${searchValue.trim()}"`}
                    </button>
                  ) : (
                    'Sin resultados'
                  )}
                </CommandEmpty>
                <CommandGroup heading="Canciones del release">
                  {tracks.map((track) => (
                    <CommandItem
                      key={track.id}
                      value={track.title}
                      onSelect={() => {
                        onChange({ ...row, trackId: track.id, name: track.title });
                        setTrackOpen(false);
                      }}
                    >
                      <span className="truncate">
                        {track.track_number}. {track.title}
                      </span>
                      {track.isrc && (
                        <span className="ml-auto text-xs text-muted-foreground">{track.isrc}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Date + Video toggle row */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={cn('h-7 text-xs', !row.date && 'text-muted-foreground')}>
                <CalendarIcon className="w-3 h-3 mr-1" />
                {row.date ? format(row.date, 'dd MMM yyyy', { locale: es }) : 'Fecha (opcional)'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={row.date}
                defaultMonth={row.date}
                onSelect={(d) => onChange({ ...row, date: d || undefined })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover open={videoPopoverOpen} onOpenChange={setVideoPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  row.videoType !== 'none'
                    ? 'bg-primary/15 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  VIDEO_TYPE_OPTIONS.find(o => o.value === row.videoType)?.className,
                )}
              >
                {(() => {
                  const opt = VIDEO_TYPE_OPTIONS.find(o => o.value === row.videoType) || VIDEO_TYPE_OPTIONS[0];
                  const Icon = opt.icon;
                  return <><Icon className="w-3.5 h-3.5" />{opt.label}<ChevronDown className="w-3 h-3 opacity-50" /></>;
                })()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {VIDEO_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange({ ...row, videoType: opt.value });
                      setVideoPopoverOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors',
                      row.videoType === opt.value && 'bg-accent font-medium',
                      opt.className,
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                    {row.videoType === opt.value && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function CronogramaSetupWizard({
  open,
  onOpenChange,
  onGenerate,
  initialReleaseDate,
  initialNumSongs = 1,
  tracks = [],
  releaseId,
  onTrackCreated,
  releaseType,
}: CronogramaSetupWizardProps) {
  const [step, setStep] = useState(1);
  const isSingle = releaseType === 'single';
  const TOTAL_STEPS = isSingle ? 2 : 3;

  // Step 1 state
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(initialReleaseDate || undefined);
  const [physicalDate, setPhysicalDate] = useState<Date | undefined>(undefined);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasPhysical, setHasPhysical] = useState(false);
  const [singleVideoType, setSingleVideoType] = useState<VideoType>('none');

  // Step 2 state
  const [numSongs, setNumSongs] = useState<number>(initialNumSongs);
  const [showCustomSongs, setShowCustomSongs] = useState(false);
  const [numSingles, setNumSingles] = useState<number>(0);
  const [singleRows, setSingleRows] = useState<SingleRow[]>([]);
  const [focusTrackId, setFocusTrackId] = useState<string | undefined>(undefined);
  const [focusTrackOpen, setFocusTrackOpen] = useState(false);

  // Step 3 state
  const [distributor, setDistributor] = useState('');
  const [label, setLabel] = useState('');
  const [territory, setTerritory] = useState<string[]>([]);
  const [priorityPitching, setPriorityPitching] = useState(false);
  const [notes, setNotes] = useState('');

  // Sync initial values
  useEffect(() => {
    setNumSongs(initialNumSongs);
    if (numSingles >= initialNumSongs) {
      setNumSingles(Math.max(0, initialNumSongs - 1));
    }
  }, [initialNumSongs]);

  // Reset step on open
  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  // Keep singleRows in sync with numSingles
  useEffect(() => {
    setSingleRows((prev) => {
      if (numSingles <= 0) return [];
      const next = [...prev];
      while (next.length < numSingles) next.push({ name: '', trackId: undefined, date: undefined, videoType: 'none' });
      return next.slice(0, numSingles);
    });
  }, [numSingles]);

  const singlesOptions = Array.from({ length: numSongs }, (_, i) => i);

  const handleGenerate = () => {
    if (!releaseDate) return;

    const singleDates: SingleConfig[] | undefined =
      singleRows.length > 0
        ? singleRows.map((r) => ({
            name: r.name || undefined,
            date: r.date || releaseDate,
            trackId: r.trackId || undefined,
            videoType: r.videoType !== 'none' ? r.videoType : undefined,
          }))
        : undefined;

    const config: ReleaseConfig = {
      releaseDate,
      physicalDate: physicalDate || null,
      numSongs: isSingle ? 1 : numSongs,
      numSingles: isSingle ? 0 : numSingles,
      hasVideo: isSingle ? singleVideoType !== 'none' : hasVideo,
      hasPhysical,
      singleDates: isSingle ? undefined : singleDates,
      distributor: distributor || undefined,
      label: label || undefined,
      territory: territory.length > 0 ? territory.join(',') : undefined,
      priorityPitching: priorityPitching || undefined,
      notes: notes || undefined,
      focusTrackId: isSingle ? undefined : (focusTrackId || undefined),
      singleVideoType: isSingle && singleVideoType !== 'none' ? singleVideoType : undefined,
    };

    onGenerate(config);
    onOpenChange(false);
  };

  const canNext = step === 1 ? !!releaseDate : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Configurar Cronograma
          </DialogTitle>
          <DialogDescription>
            {step === 1 && (isSingle
              ? 'Define las fechas clave y el formato de tu single.'
              : 'Define las fechas clave y el formato de tu lanzamiento.')}
            {step === 2 && !isSingle && 'Configura las canciones y vincula los singles a tu tracklist.'}
            {((step === 2 && isSingle) || step === 3) && 'Información adicional opcional para personalizar el cronograma.'}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} total={TOTAL_STEPS} />

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {/* ═══════ STEP 1 ═══════ */}
          {step === 1 && (
            <div className="space-y-6 py-2">
              {/* Release Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Fecha de Lanzamiento Digital *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !releaseDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {releaseDate ? format(releaseDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={releaseDate} defaultMonth={releaseDate} onSelect={setReleaseDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Physical Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Package className="w-4 h-4" />
                  Fecha de Venta Física (opcional)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !physicalDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {physicalDate ? format(physicalDate, 'PPP', { locale: es }) : 'Sin fecha física'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={physicalDate} defaultMonth={physicalDate} onSelect={setPhysicalDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                {isSingle ? (
                  /* Single: direct video type picker instead of boolean toggle */
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-pink-500" />
                      Tipo de vídeo
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {VIDEO_TYPE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = singleVideoType === opt.value;
                        return (
                          <Button
                            key={opt.value}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSingleVideoType(opt.value)}
                            className="gap-1.5"
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <Video className="w-4 h-4 text-pink-500" />
                      ¿Incluir videoclip?
                    </Label>
                    <Switch checked={hasVideo} onCheckedChange={setHasVideo} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Package className="w-4 h-4 text-yellow-500" />
                    ¿Fabricación física (vinilo/CD)?
                  </Label>
                  <Switch checked={hasPhysical} onCheckedChange={setHasPhysical} />
                </div>
              </div>
            </div>
          )}

          {/* ═══════ STEP 2 (skipped for singles — goes straight to metadata) ═══════ */}
          {step === 2 && !isSingle && (
            <div className="space-y-6 py-2">
              {/* Number of Songs */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-blue-500" />
                  Número de canciones
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={numSongs === n && !showCustomSongs ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setNumSongs(n);
                        setShowCustomSongs(false);
                      }}
                      className="w-12"
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={showCustomSongs || numSongs >= 6 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setShowCustomSongs(true);
                      if (numSongs < 6) setNumSongs(6);
                    }}
                    className="w-12"
                  >
                    6+
                  </Button>
                  {showCustomSongs && (
                    <Input
                      type="number"
                      min={6}
                      value={numSongs}
                      onChange={(e) => {
                        const val = Math.max(6, parseInt(e.target.value) || 6);
                        setNumSongs(val);
                      }}
                      className="w-20 h-9"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Focus Track (albums/EPs with 3+ songs) */}
              {numSongs >= 3 && tracks.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary" />
                    Focus Track
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    La canción principal que recibirá más atención promocional y pitching editorial.
                  </p>
                  <Popover open={focusTrackOpen} onOpenChange={setFocusTrackOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-9">
                        {focusTrackId ? (
                          <span className="truncate">
                            {tracks.find(t => t.id === focusTrackId)?.title || 'Track seleccionado'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Seleccionar focus track…</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar canción…" />
                        <CommandList>
                          <CommandEmpty>Sin resultados</CommandEmpty>
                          <CommandGroup heading="Canciones">
                            {tracks.map((track) => (
                              <CommandItem
                                key={track.id}
                                value={track.title}
                                onSelect={() => {
                                  setFocusTrackId(track.id === focusTrackId ? undefined : track.id);
                                  setFocusTrackOpen(false);
                                }}
                              >
                                <span className="truncate">
                                  {track.track_number}. {track.title}
                                </span>
                                {track.id === focusTrackId && <Check className="ml-auto w-4 h-4" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Number of Singles */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-purple-500" />
                  Singles a lanzar antes del álbum
                </Label>
                <div className="flex flex-wrap gap-2">
                  {singlesOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={numSingles === option ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNumSingles(option)}
                      className="w-12"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {numSongs > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Puedes lanzar hasta {numSongs - 1} singles antes del lanzamiento principal
                  </p>
                )}
              </div>

              {/* Single rows with track linking */}
              {numSingles > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Configurar Singles</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Vincula cada single a una canción del tracklist o escribe un nombre libre.
                  </p>
                  <div className="space-y-2">
                    {singleRows.map((row, i) => (
                      <SingleRowEditor
                        key={i}
                        index={i}
                        row={row}
                        onChange={(updated) => {
                          const next = [...singleRows];
                          next[i] = updated;
                          setSingleRows(next);
                        }}
                        tracks={tracks}
                        releaseId={releaseId}
                        onTrackCreated={onTrackCreated}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ STEP 3 (or STEP 2 for singles) ═══════ */}
          {((step === 3 && !isSingle) || (step === 2 && isSingle)) && (
            <div className="space-y-5 py-2">
              <p className="text-xs text-muted-foreground">
                Todos los campos de este paso son opcionales.
              </p>

              {/* Distributor */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Building2 className="w-4 h-4" />
                  Distribuidora
                </Label>
                <Input
                  placeholder="ej: DistroKid, TuneCore, The Orchard…"
                  value={distributor}
                  onChange={(e) => setDistributor(e.target.value)}
                />
              </div>

              {/* Label */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Disc3 className="w-4 h-4" />
                  Sello Discográfico
                </Label>
                <Input
                  placeholder="ej: Sony Music, Independiente…"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>

              {/* Territory */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Globe className="w-4 h-4" />
                  Territorio Principal
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {territory.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {territory.map((t) => {
                            const ter = TERRITORIES.find((x) => x.value === t);
                            return (
                              <span key={t} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {ter?.label || t}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Seleccionar territorios</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    {TERRITORIES.map((t) => {
                      const isSelected = territory.includes(t.value);
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => {
                            setTerritory((prev) =>
                              isSelected
                                ? prev.filter((v) => v !== t.value)
                                : [...prev, t.value]
                            );
                          }}
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors',
                            isSelected && 'bg-accent/50 font-medium',
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                            isSelected ? 'bg-primary border-primary' : 'border-input',
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          {t.label}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority pitching */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm cursor-pointer">
                  <Megaphone className="w-4 h-4" />
                  Prioridad de pitching editorial
                </Label>
                <Switch checked={priorityPitching} onCheckedChange={setPriorityPitching} />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <StickyNote className="w-4 h-4" />
                  Notas adicionales
                </Label>
                <Textarea
                  placeholder="Cualquier contexto relevante para el cronograma…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!releaseDate}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generar Cronograma
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
