import React from 'react';
import { Search, Filter, X, CalendarIcon, Globe, Download, FileSpreadsheet, Plus, CheckSquare, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Artist {
  id: string;
  name: string;
  stage_name?: string | null;
}

interface Phase {
  id: string;
  label: string;
}

export interface BookingFiltersState {
  searchTerm: string;
  artistFilter: string;
  phaseFilter: string[];
  countryFilter: string;
  promoterFilter: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  showInternational: boolean | 'all';
  
}

interface BookingFiltersToolbarProps {
  filters: BookingFiltersState;
  onFiltersChange: (filters: Partial<BookingFiltersState>) => void;
  onClearFilters: () => void;
  artists: Artist[];
  phases: Phase[];
  countries: string[];
  promoters: string[];
  filteredCount: number;
  totalCount: number;
  // Export actions
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  onNewOffer?: () => void;
  // Selection mode (optional)
  selectionMode?: boolean;
  onToggleSelection?: () => void;
  // Additional components slot
  additionalActions?: React.ReactNode;
}

export function BookingFiltersToolbar({
  filters,
  onFiltersChange,
  onClearFilters,
  artists,
  phases,
  countries,
  promoters,
  filteredCount,
  totalCount,
  onExportExcel,
  onExportCSV,
  onExportPDF,
  onNewOffer,
  selectionMode,
  onToggleSelection,
  additionalActions,
}: BookingFiltersToolbarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  const hasActiveFilters = 
    filters.searchTerm || 
    filters.artistFilter !== 'all' || 
    filters.phaseFilter.length > 0 || 
    filters.countryFilter !== 'all' || 
    filters.promoterFilter !== 'all' || 
    filters.dateFrom || 
    filters.dateTo || 
    filters.showInternational !== 'all';

  const activeFilterCount = [
    filters.searchTerm,
    filters.artistFilter !== 'all',
    filters.phaseFilter.length > 0,
    filters.countryFilter !== 'all',
    filters.promoterFilter !== 'all',
    filters.dateFrom,
    filters.dateTo,
    filters.showInternational !== 'all',
  ].filter(Boolean).length;

  const getArtistDisplayName = (artist: Artist) => {
    return artist.stage_name || artist.name;
  };

  return (
    <div className="space-y-3">
      {/* Main Row: Search + Primary Filters + Actions */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* Search and Filters Group */}
        <div className="flex flex-1 flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
              className="pl-9 w-48 h-9"
            />
          </div>

          {/* Artist Filter */}
          <Select value={filters.artistFilter} onValueChange={(value) => onFiltersChange({ artistFilter: value })}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Artista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {artists.map(artist => (
                <SelectItem key={artist.id} value={artist.id}>
                  {getArtistDisplayName(artist)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Phase Filter (multi-select) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`h-9 min-w-[8rem] justify-between ${filters.phaseFilter.length > 0 ? 'border-primary bg-primary/5' : ''}`}>
                <span className="truncate text-left">
                  {filters.phaseFilter.length === 0
                    ? 'Fase'
                    : filters.phaseFilter.length === 1
                      ? phases.find(p => p.id === filters.phaseFilter[0])?.label || 'Fase'
                      : `${filters.phaseFilter.length} fases`}
                </span>
                {filters.phaseFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                    {filters.phaseFilter.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-muted-foreground h-7"
                  onClick={() => onFiltersChange({ phaseFilter: [] })}
                >
                  Todas
                </Button>
                {phases.map(phase => {
                  const isSelected = filters.phaseFilter.includes(phase.id);
                  return (
                    <label key={phase.id} className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...filters.phaseFilter, phase.id]
                            : filters.phaseFilter.filter(id => id !== phase.id);
                          onFiltersChange({ phaseFilter: next });
                        }}
                      />
                      {phase.label}
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* More Filters Popover */}
          <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`h-9 ${hasActiveFilters ? 'border-primary bg-primary/5' : ''}`}>
                <Filter className="h-4 w-4 mr-1.5" />
                Más
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="font-medium text-sm flex items-center justify-between">
                  Filtros Avanzados
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-7 text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
                
                {/* Country */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">País</Label>
                  <Select value={filters.countryFilter} onValueChange={(value) => onFiltersChange({ countryFilter: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todos los países" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los países</SelectItem>
                      {countries.map(country => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Promoter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Promotor</Label>
                  <Select value={filters.promoterFilter} onValueChange={(value) => onFiltersChange({ promoterFilter: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todos los promotores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los promotores</SelectItem>
                      {promoters.map(promoter => (
                        <SelectItem key={promoter} value={promoter}>
                          {promoter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Date Range */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rango de Fechas</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start text-left font-normal h-8">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                          {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yy', { locale: es }) : 'Desde'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={filters.dateFrom} onSelect={(date) => onFiltersChange({ dateFrom: date })} />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start text-left font-normal h-8">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                          {filters.dateTo ? format(filters.dateTo, 'dd/MM/yy', { locale: es }) : 'Hasta'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={filters.dateTo} onSelect={(date) => onFiltersChange({ dateTo: date })} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Type Filters */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tipo de Evento</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="international" 
                        checked={filters.showInternational === true}
                        onCheckedChange={(checked) => {
                          onFiltersChange({ showInternational: checked ? true : 'all' });
                        }}
                      />
                      <Label htmlFor="international" className="flex items-center gap-1 text-sm cursor-pointer">
                        <Globe className="h-3 w-3" />
                        Solo Internacional
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Actions Group */}
        <div className="flex gap-2 items-center flex-shrink-0">
          {/* Results count */}
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredCount === totalCount ? `${totalCount}` : `${filteredCount}/${totalCount}`}
          </span>

          {onToggleSelection && (
            <Button 
              variant={selectionMode ? "secondary" : "outline"}
              size="sm"
              className="h-9"
              onClick={onToggleSelection}
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          )}

          {(onExportExcel || onExportCSV || onExportPDF) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                {onExportExcel && (
                  <DropdownMenuItem onClick={onExportExcel} className="cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                )}
                {onExportCSV && (
                  <DropdownMenuItem onClick={onExportCSV} className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                )}
                {onExportPDF && (
                  <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {additionalActions}

          {onNewOffer && (
            <Button onClick={onNewOffer} size="sm" className="h-9 btn-primary">
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva Oferta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
