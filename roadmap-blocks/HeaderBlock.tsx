import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Plus, CalendarDays, Plane, Calendar, Link2 } from 'lucide-react';

interface HeaderBlockData {
  artistName?: string;
  tourTitle?: string;
  localPromoter?: string;
  tourDates?: string[]; // Array of dates for the tour
}

interface BookingSuggestion {
  artistName?: string;
  tourTitle?: string;
  promoter?: string;
  eventDate?: string;
  eventDates?: string[]; // All dates from all linked bookings
}

interface HeaderBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  bookingSuggestion?: BookingSuggestion;
  onTourDatesChange?: (dates: string[]) => void; // Callback to sync dates with roadmap
  onLinkBooking?: () => void; // Callback to open booking selector
}

export function HeaderBlock({ data, onChange, bookingSuggestion, onTourDatesChange, onLinkBooking }: HeaderBlockProps) {
  const blockData = data as HeaderBlockData;
  
  // Local state for immediate UI updates
  const [localData, setLocalData] = useState<HeaderBlockData>({
    artistName: blockData.artistName || '',
    tourTitle: blockData.tourTitle || '',
    localPromoter: blockData.localPromoter || '',
    tourDates: blockData.tourDates || [],
  });

  // Default new date to the event date first, then nearby dates
  const getDefaultNewDate = () => {
    const existingDates = localData.tourDates || [];
    const eventDate = bookingSuggestion?.eventDate;
    
    // If no dates exist yet, suggest the event date first
    if (existingDates.length === 0 && eventDate) {
      return eventDate;
    }
    
    if (existingDates.length > 0 || eventDate) {
      // Use sorted existing dates or event date as reference
      const referenceDates = existingDates.length > 0 
        ? [...existingDates].sort() 
        : [eventDate!];
      
      const firstDate = new Date(referenceDates[0]);
      const lastDate = new Date(referenceDates[referenceDates.length - 1]);
      
      // Try day before first date
      const dayBefore = new Date(firstDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayBeforeStr = dayBefore.toISOString().split('T')[0];
      
      // Try day after last date
      const dayAfter = new Date(lastDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];
      
      // Prefer day before if not already used, otherwise day after
      if (!existingDates.includes(dayBeforeStr)) {
        return dayBeforeStr;
      }
      if (!existingDates.includes(dayAfterStr)) {
        return dayAfterStr;
      }
    }
    return '';
  };

  const [newDate, setNewDate] = useState(getDefaultNewDate);

  // Update default date when tour dates change
  useEffect(() => {
    if (!newDate) {
      setNewDate(getDefaultNewDate());
    }
  }, [localData.tourDates, bookingSuggestion?.eventDate]);

  // Debounce the local data
  const debouncedData = useDebounce(localData, 500);

  // Sync from parent when data changes externally
  useEffect(() => {
    setLocalData({
      artistName: blockData.artistName || '',
      tourTitle: blockData.tourTitle || '',
      localPromoter: blockData.localPromoter || '',
      tourDates: blockData.tourDates || [],
    });
  }, [blockData.artistName, blockData.tourTitle, blockData.localPromoter, JSON.stringify(blockData.tourDates)]);

  // Auto-fill from booking suggestion if fields are empty
  useEffect(() => {
    if (bookingSuggestion) {
      const updates: Partial<HeaderBlockData> = {};
      let hasUpdates = false;

      if (!localData.artistName && bookingSuggestion.artistName) {
        updates.artistName = bookingSuggestion.artistName;
        hasUpdates = true;
      }
      if (!localData.tourTitle && bookingSuggestion.tourTitle) {
        updates.tourTitle = bookingSuggestion.tourTitle;
        hasUpdates = true;
      }
      if (!localData.localPromoter && bookingSuggestion.promoter) {
        updates.localPromoter = bookingSuggestion.promoter;
        hasUpdates = true;
      }
      
      // Auto-add ALL linked booking dates (merge with existing, avoid duplicates)
      const allEventDates = bookingSuggestion.eventDates || (bookingSuggestion.eventDate ? [bookingSuggestion.eventDate] : []);
      if (allEventDates.length > 0) {
        const currentDates = localData.tourDates || [];
        const newDates = allEventDates.filter(d => !currentDates.includes(d));
        if (newDates.length > 0) {
          updates.tourDates = [...currentDates, ...newDates].sort();
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        setLocalData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [bookingSuggestion?.artistName, bookingSuggestion?.tourTitle, bookingSuggestion?.promoter, JSON.stringify(bookingSuggestion?.eventDates)]);

  // Save to parent when debounced data changes
  useEffect(() => {
    const hasChanges = 
      debouncedData.artistName !== (blockData.artistName || '') ||
      debouncedData.tourTitle !== (blockData.tourTitle || '') ||
      debouncedData.localPromoter !== (blockData.localPromoter || '') ||
      JSON.stringify(debouncedData.tourDates) !== JSON.stringify(blockData.tourDates || []);
    
    if (hasChanges) {
      onChange({ ...data, ...debouncedData });
      
      // Sync tour dates with roadmap (for start_date/end_date)
      if (onTourDatesChange && JSON.stringify(debouncedData.tourDates) !== JSON.stringify(blockData.tourDates || [])) {
        onTourDatesChange(debouncedData.tourDates || []);
      }
    }
  }, [debouncedData]);

  const handleChange = (field: keyof HeaderBlockData, value: string | string[]) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const addDate = (dateToAdd: string) => {
    if (dateToAdd && !localData.tourDates?.includes(dateToAdd)) {
      const updatedDates = [...(localData.tourDates || []), dateToAdd].sort();
      handleChange('tourDates', updatedDates);
      setNewDate('');
    }
  };

  const getDayOffDates = () => {
    const existingDates = localData.tourDates || [];
    const eventDate = bookingSuggestion?.eventDate;
    
    if (existingDates.length > 0 || eventDate) {
      const referenceDates = existingDates.length > 0 
        ? [...existingDates].sort() 
        : [eventDate!];
      
      const firstDate = new Date(referenceDates[0]);
      const lastDate = new Date(referenceDates[referenceDates.length - 1]);
      
      const dayBefore = new Date(firstDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayBeforeStr = dayBefore.toISOString().split('T')[0];
      
      const dayAfter = new Date(lastDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];
      
      return {
        dayBefore: !existingDates.includes(dayBeforeStr) ? dayBeforeStr : null,
        dayAfter: !existingDates.includes(dayAfterStr) ? dayAfterStr : null,
      };
    }
    return { dayBefore: null, dayAfter: null };
  };

  const addDayOffBefore = () => {
    const { dayBefore } = getDayOffDates();
    if (dayBefore) addDate(dayBefore);
  };

  const addDayOffAfter = () => {
    const { dayAfter } = getDayOffDates();
    if (dayAfter) addDate(dayAfter);
  };

  const removeDate = (dateToRemove: string) => {
    const updatedDates = (localData.tourDates || []).filter(d => d !== dateToRemove);
    handleChange('tourDates', updatedDates);
  };

  const formatDateRange = () => {
    const dates = localData.tourDates || [];
    if (dates.length === 0) return 'Sin fechas';
    if (dates.length === 1) return format(new Date(dates[0]), 'd MMMM yyyy', { locale: es });
    
    const sortedDates = [...dates].sort();
    const firstDate = format(new Date(sortedDates[0]), 'd MMM', { locale: es });
    const lastDate = format(new Date(sortedDates[sortedDates.length - 1]), 'd MMMM yyyy', { locale: es });
    return `${firstDate} - ${lastDate} (${dates.length} días)`;
  };

  const hasSuggestion = (field: 'artistName' | 'tourTitle' | 'localPromoter') => {
    if (!bookingSuggestion) return false;
    const suggestionMap = {
      artistName: bookingSuggestion.artistName,
      tourTitle: bookingSuggestion.tourTitle,
      localPromoter: bookingSuggestion.promoter,
    };
    return !!suggestionMap[field] && !localData[field];
  };

  const applySuggestion = (field: 'artistName' | 'tourTitle' | 'localPromoter') => {
    if (!bookingSuggestion) return;
    const suggestionMap = {
      artistName: bookingSuggestion.artistName,
      tourTitle: bookingSuggestion.tourTitle,
      localPromoter: bookingSuggestion.promoter,
    };
    if (suggestionMap[field]) {
      handleChange(field, suggestionMap[field]!);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 space-y-4">
      {bookingSuggestion && (
        <div className="text-xs text-muted-foreground bg-background/50 rounded p-2 mb-4">
          💡 Los campos vacíos se rellenarán automáticamente con la información del evento vinculado
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Nombre del Artista</span>
            {hasSuggestion('artistName') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-primary"
                onClick={() => applySuggestion('artistName')}
              >
                Usar: {bookingSuggestion?.artistName}
              </Button>
            )}
          </Label>
          <Input
            value={localData.artistName}
            onChange={(e) => handleChange('artistName', e.target.value)}
            placeholder={bookingSuggestion?.artistName || "Ej: Bad Bunny"}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Título del Tour</span>
            {hasSuggestion('tourTitle') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-primary"
                onClick={() => applySuggestion('tourTitle')}
              >
                Usar: {bookingSuggestion?.tourTitle}
              </Button>
            )}
          </Label>
          <Input
            value={localData.tourTitle}
            onChange={(e) => handleChange('tourTitle', e.target.value)}
            placeholder={bookingSuggestion?.tourTitle || "Ej: World's Hottest Tour"}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Promotor Local</span>
            {hasSuggestion('localPromoter') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-primary"
                onClick={() => applySuggestion('localPromoter')}
              >
                Usar: {bookingSuggestion?.promoter}
              </Button>
            )}
          </Label>
          <Input
            value={localData.localPromoter}
            onChange={(e) => handleChange('localPromoter', e.target.value)}
            placeholder={bookingSuggestion?.promoter || "Ej: Live Nation España"}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Fechas del Tour
          </Label>
          <div className="space-y-2">
            {/* Current dates summary */}
            <div className="text-sm font-medium text-muted-foreground">
              {formatDateRange()}
            </div>
            
            {/* Date badges */}
            {localData.tourDates && localData.tourDates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {[...localData.tourDates].sort().map((date) => {
                  const isLinkedEventDate = bookingSuggestion?.eventDates?.includes(date) || bookingSuggestion?.eventDate === date;
                  return (
                    <Badge 
                      key={date} 
                      variant={isLinkedEventDate ? "default" : "secondary"} 
                      className={`gap-1 pr-1 ${isLinkedEventDate ? 'bg-primary text-primary-foreground' : ''}`}
                      title={isLinkedEventDate ? 'Fecha de evento vinculado' : 'Fecha manual'}
                    >
                      {format(new Date(date), 'd MMM', { locale: es })}
                      <button
                        onClick={() => removeDate(date)}
                        className={`ml-1 rounded-full p-0.5 ${isLinkedEventDate ? 'hover:bg-primary-foreground/20' : 'hover:bg-destructive/20'}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Add new date options */}
            <div className="flex gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="w-4 h-4" />
                    Añadir
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {getDayOffDates().dayBefore && (
                    <DropdownMenuItem onClick={addDayOffBefore} className="gap-2">
                      <Plane className="w-4 h-4" />
                      Day Off antes
                      <span className="text-xs text-muted-foreground ml-auto">
                        ({format(new Date(getDayOffDates().dayBefore!), 'd MMM', { locale: es })})
                      </span>
                    </DropdownMenuItem>
                  )}
                  {getDayOffDates().dayAfter && (
                    <DropdownMenuItem onClick={addDayOffAfter} className="gap-2">
                      <Plane className="w-4 h-4" />
                      Day Off después
                      <span className="text-xs text-muted-foreground ml-auto">
                        ({format(new Date(getDayOffDates().dayAfter!), 'd MMM', { locale: es })})
                      </span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => {
                      // Delay to allow dropdown to close before opening picker
                      setTimeout(() => {
                        const input = document.getElementById('new-tour-date-input') as HTMLInputElement;
                        input?.showPicker?.();
                      }, 100);
                    }} 
                    className="gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Añadir nueva fecha
                    <span className="text-xs text-muted-foreground ml-auto">
                      (otro evento)
                    </span>
                  </DropdownMenuItem>
                  {onLinkBooking && (
                    <DropdownMenuItem onClick={onLinkBooking} className="gap-2">
                      <Link2 className="w-4 h-4" />
                      Vincular nuevo evento
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Input
                id="new-tour-date-input"
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  if (e.target.value) {
                    addDate(e.target.value);
                  }
                }}
                className="w-40"
              />
            </div>

            {bookingSuggestion?.eventDate && !localData.tourDates?.includes(bookingSuggestion.eventDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => addDate(bookingSuggestion.eventDate!)}
              >
                + Añadir fecha del evento: {format(new Date(bookingSuggestion.eventDate), 'd MMM yyyy', { locale: es })}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
