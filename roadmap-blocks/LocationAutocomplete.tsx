import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface LocationAutocompleteProps {
  artistId?: string | null;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({
  artistId,
  value,
  onChange,
  placeholder = 'Ubicación',
  className,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; category: string | null; city: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(inputValue, 250);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Search locations when debounced value changes
  useEffect(() => {
    if (!artistId || !isFocused || debouncedSearch.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const search = async () => {
      const { data } = await supabase
        .from('roadmap_locations')
        .select('id, name, category, city')
        .eq('artist_id', artistId)
        .ilike('name', `%${debouncedSearch}%`)
        .order('name')
        .limit(8);

      if (data && data.length > 0) {
        setSuggestions(data);
        setOpen(true);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    };

    search();
  }, [debouncedSearch, artistId, isFocused]);

  const selectSuggestion = useCallback((name: string) => {
    setInputValue(name);
    onChange(name);
    setOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleBlur = useCallback(async () => {
    // Small delay to allow click on suggestion
    setTimeout(async () => {
      setIsFocused(false);
      setOpen(false);

      const trimmed = inputValue.trim();
      if (trimmed && trimmed !== value) {
        onChange(trimmed);
      }

      // Auto-save new location
      if (trimmed && artistId && trimmed.length >= 2) {
        try {
          await supabase
            .from('roadmap_locations')
            .upsert(
              { artist_id: artistId, name: trimmed },
              { onConflict: 'artist_id,name' }
            );
        } catch {
          // Silent fail - not critical
        }
      }
    }, 150);
  }, [inputValue, value, onChange, artistId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex items-center gap-1 text-muted-foreground w-full">
          <span className="text-xs">⊙</span>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`h-7 border-0 bg-transparent shadow-none px-1 text-sm focus-visible:ring-0 ${className || ''}`}
          />
        </div>
      </PopoverTrigger>
      {suggestions.length > 0 && (
        <PopoverContent
          className="w-64 p-1"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s.id}
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted flex items-center gap-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s.name);
                }}
              >
                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                <span>{s.name}</span>
                {s.city && (
                  <span className="text-xs text-muted-foreground ml-auto">{s.city}</span>
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
