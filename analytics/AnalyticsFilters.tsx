import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PeriodPreset, SourceFilter, StatusFilter } from '@/hooks/useAnalyticsFilters';
import { useState } from 'react';

interface Props {
  period: PeriodPreset;
  setPeriod: (p: PeriodPreset) => void;
  customStart?: Date;
  customEnd?: Date;
  setCustomRange: (start: Date, end: Date) => void;
  artistIds: string[];
  setArtistIds: (ids: string[]) => void;
  artists: { id: string; name: string }[];
  source: SourceFilter;
  setSource: (s: SourceFilter) => void;
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
}

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: '30d', label: 'Últimos 30 días' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
  { value: 'ytd', label: 'Este año' },
  { value: 'prev_year', label: 'Año anterior' },
  { value: 'custom', label: 'Personalizado' },
];

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'Todas las fuentes' },
  { value: 'booking', label: 'Booking' },
  { value: 'sync', label: 'Sincronizaciones' },
  { value: 'royalties', label: 'Royalties' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'confirmed', label: 'Confirmado / Facturado' },
  { value: 'negotiation', label: 'En negociación' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function AnalyticsFilters({
  period, setPeriod, customStart, customEnd, setCustomRange,
  artistIds, setArtistIds, artists,
  source, setSource, status, setStatus,
}: Props) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const toggleArtist = (id: string) => {
    if (artistIds.includes(id)) {
      setArtistIds(artistIds.filter(a => a !== id));
    } else {
      setArtistIds([...artistIds, id]);
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border pb-4 pt-2 -mx-6 px-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Period */}
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {period === 'custom' && (
          <div className="flex items-center gap-1">
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customStart ? format(customStart, 'd MMM yy', { locale: es }) : 'Inicio'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={(d) => { if (d) { setCustomRange(d, customEnd || new Date()); setStartOpen(false); } }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">→</span>
            <Popover open={endOpen} onOpenChange={setEndOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customEnd ? format(customEnd, 'd MMM yy', { locale: es }) : 'Fin'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEnd}
                  onSelect={(d) => { if (d) { setCustomRange(customStart || new Date(), d); setEndOpen(false); } }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Source */}
        <Select value={source} onValueChange={(v) => setSource(v as SourceFilter)}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Artist chips */}
      {artists.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Artistas:</span>
          <Badge
            variant={artistIds.length === 0 ? 'default' : 'outline'}
            className="cursor-pointer text-xs h-6"
            onClick={() => setArtistIds([])}
          >
            Todos
          </Badge>
          {artists.map(a => (
            <Badge
              key={a.id}
              variant={artistIds.includes(a.id) ? 'default' : 'outline'}
              className="cursor-pointer text-xs h-6"
              onClick={() => toggleArtist(a.id)}
            >
              {a.name}
              {artistIds.includes(a.id) && <X className="h-3 w-3 ml-1" />}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
