import { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, DollarSign, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export interface ReleasesFiltersState {
  search: string;
  status: string;
  type: string;
  artistId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  hasBudget: string;
  sortBy: string;
}

export const SORT_OPTIONS = [
  { value: 'release_date_desc', label: 'Publicación (más reciente)' },
  { value: 'release_date_asc', label: 'Publicación (más antigua)' },
  { value: 'created_at_desc', label: 'Creación (más reciente)' },
  { value: 'created_at_asc', label: 'Creación (más antigua)' },
  { value: 'title_asc', label: 'Alfabético (A–Z)' },
  { value: 'title_desc', label: 'Alfabético (Z–A)' },
  { value: 'status', label: 'Estado' },
];

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
}

interface ReleasesFiltersToolbarProps {
  filters: ReleasesFiltersState;
  onFiltersChange: (filters: ReleasesFiltersState) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'planning', label: 'Planificando' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'released', label: 'Publicado' },
  { value: 'archived', label: 'Archivado' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'album', label: 'Álbum' },
  { value: 'ep', label: 'EP' },
  { value: 'single', label: 'Single' },
];

const BUDGET_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'with', label: 'Con presupuesto' },
  { value: 'without', label: 'Sin presupuesto' },
];

export function ReleasesFiltersToolbar({ filters, onFiltersChange }: ReleasesFiltersToolbarProps) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await supabase
        .from('artists')
        .select('id, name, stage_name, artist_type')
        .in('artist_type', ['roster', 'collaborator'])
        .order('name');
      setArtists(data || []);
    };
    fetchArtists();
  }, []);

  const updateFilter = <K extends keyof ReleasesFiltersState>(
    key: K,
    value: ReleasesFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      type: 'all',
      artistId: 'all',
      startDate: undefined,
      endDate: undefined,
      hasBudget: 'all',
      sortBy: 'release_date_desc',
    });
  };

  const activeFilterCount = [
    filters.search,
    filters.status !== 'all' ? filters.status : null,
    filters.type !== 'all' ? filters.type : null,
    filters.artistId !== 'all' ? filters.artistId : null,
    filters.startDate,
    filters.endDate,
    filters.hasBudget !== 'all' ? filters.hasBudget : null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en título, créditos, audio, presupuestos..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type */}
        <Select
          value={filters.type}
          onValueChange={(value) => updateFilter('type', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.artistId}
          onValueChange={(value) => updateFilter('artistId', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Artista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los artistas</SelectItem>
            {artists.map((artist) => (
              <SelectItem key={artist.id} value={artist.id}>
                {artist.stage_name || artist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sortBy}
          onValueChange={(value) => updateFilter('sortBy', value)}
        >
          <SelectTrigger className="w-[220px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Más filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtros avanzados</h4>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Rango de fechas
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                        {filters.startDate
                          ? format(filters.startDate, 'dd/MM/yyyy', { locale: es })
                          : 'Desde'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.startDate}
                        onSelect={(date) => updateFilter('startDate', date)}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                        {filters.endDate
                          ? format(filters.endDate, 'dd/MM/yyyy', { locale: es })
                          : 'Hasta'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.endDate}
                        onSelect={(date) => updateFilter('endDate', date)}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Presupuesto
                </Label>
                <Select
                  value={filters.hasBudget}
                  onValueChange={(value) => updateFilter('hasBudget', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1">
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
                <Button size="sm" onClick={() => setShowAdvanced(false)} className="flex-1">
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Estado: {STATUS_OPTIONS.find(s => s.value === filters.status)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('status', 'all')} />
            </Badge>
          )}
          {filters.type !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {TYPE_OPTIONS.find(t => t.value === filters.type)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('type', 'all')} />
            </Badge>
          )}
          {filters.artistId !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Artista: {artists.find(a => a.id === filters.artistId)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('artistId', 'all')} />
            </Badge>
          )}
          {filters.startDate && (
            <Badge variant="secondary" className="gap-1">
              Desde: {format(filters.startDate, 'dd/MM/yyyy', { locale: es })}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('startDate', undefined)} />
            </Badge>
          )}
          {filters.endDate && (
            <Badge variant="secondary" className="gap-1">
              Hasta: {format(filters.endDate, 'dd/MM/yyyy', { locale: es })}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('endDate', undefined)} />
            </Badge>
          )}
          {filters.hasBudget !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {BUDGET_OPTIONS.find(b => b.value === filters.hasBudget)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('hasBudget', 'all')} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
