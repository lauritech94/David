import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Calendar } from '@/components/ui/calendar';
import { Search, Filter, X, CalendarIcon, SortAsc, SortDesc } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DocumentFiltersState {
  search: string;
  category: string;
  fileType: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
}

interface DocumentFiltersProps {
  filters: DocumentFiltersState;
  onFiltersChange: (filters: DocumentFiltersState) => void;
  categories: { value: string; label: string }[];
  activeFiltersCount: number;
}

const FILE_TYPES = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'Word' },
  { value: 'image', label: 'Imágenes' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
];

export function DocumentFilters({
  filters,
  onFiltersChange,
  categories,
  activeFiltersCount,
}: DocumentFiltersProps) {
  const updateFilter = <K extends keyof DocumentFiltersState>(
    key: K,
    value: DocumentFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      category: 'all',
      fileType: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const toggleSortOrder = () => {
    updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar documentos..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => updateFilter('search', '')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Category filter */}
        <Select
          value={filters.category}
          onValueChange={(value) => updateFilter('category', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* File type filter */}
        <Select
          value={filters.fileType}
          onValueChange={(value) => updateFilter('fileType', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date from */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? (
                format(filters.dateFrom, 'dd/MM/yyyy')
              ) : (
                <span className="text-muted-foreground">Desde</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom}
              onSelect={(date) => updateFilter('dateFrom', date)}
              locale={es}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Date to */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? (
                format(filters.dateTo, 'dd/MM/yyyy')
              ) : (
                <span className="text-muted-foreground">Hasta</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo}
              onSelect={(date) => updateFilter('dateTo', date)}
              locale={es}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <div className="flex items-center gap-1">
          <Select
            value={filters.sortBy}
            onValueChange={(value: 'name' | 'date' | 'size') => updateFilter('sortBy', value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Fecha</SelectItem>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="size">Tamaño</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={toggleSortOrder}>
            {filters.sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Clear filters */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.category !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Categoría: {categories.find(c => c.value === filters.category)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('category', 'all')}
              />
            </Badge>
          )}
          {filters.fileType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {FILE_TYPES.find(t => t.value === filters.fileType)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('fileType', 'all')}
              />
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              Desde: {format(filters.dateFrom, 'dd/MM/yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('dateFrom', undefined)}
              />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              Hasta: {format(filters.dateTo, 'dd/MM/yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('dateTo', undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
