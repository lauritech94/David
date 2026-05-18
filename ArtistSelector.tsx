import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Artist {
  id: string;
  name: string;
  stage_name?: string;
  artist_type?: string | null;
}

interface ArtistSelectorProps {
  selectedArtists: string[];
  onSelectionChange: (artistIds: string[]) => void;
  placeholder?: string;
  className?: string;
  showSelfOption?: boolean;
  showSelectedBadges?: boolean;
}

export function ArtistSelector({ 
  selectedArtists, 
  onSelectionChange, 
  placeholder = "Seleccionar artistas...",
  className,
  showSelfOption = true,
  showSelectedBadges = true,
}: ArtistSelectorProps) {
  const [open, setOpen] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name, artist_type')
        .neq('artist_type', 'collaborator')
        .order('name', { ascending: true });

      if (error) throw error;

      // Deduplicate by display name (stage_name || name), keep first occurrence
      const seen = new Set<string>();
      const unique = (data || []).filter((a: any) => {
        const key = (a.stage_name || a.name || '').trim().toLowerCase();
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setArtists(unique);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (artistId: string) => {
    if (artistId === 'all') {
      // Toggle all artists
      const allArtistIds = artists.map(a => a.id);
      if (selectedArtists.length === allArtistIds.length) {
        onSelectionChange([]);
      } else {
        onSelectionChange(allArtistIds);
      }
    } else {
      // Toggle individual artist
      if (selectedArtists.includes(artistId)) {
        onSelectionChange(selectedArtists.filter(id => id !== artistId));
      } else {
        onSelectionChange([...selectedArtists, artistId]);
      }
    }
  };

  const getDisplayName = (artist: Artist) => artist.stage_name || artist.name;

  const getSelectedNames = () => {
    const names = artists
      .filter(artist => selectedArtists.includes(artist.id))
      .map(artist => getDisplayName(artist));
    
    if (names.length === 0) return "Ninguno seleccionado";
    if (names.length === 1) return names[0];
    if (names.length === artists.length) return "Todos los artistas";
    return `${names.length} artistas seleccionados`;
  };

  const allArtistIds = artists.map(a => a.id);
  const allSelected = selectedArtists.length === allArtistIds.length && allArtistIds.length > 0;

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">{getSelectedNames()}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar artistas..." />
            <CommandEmpty>No se encontraron artistas.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {artists.length > 1 && (
                  <CommandItem
                    onSelect={() => handleSelect('all')}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        allSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Users className="mr-2 h-4 w-4" />
                    <span>Todos los artistas</span>
                  </CommandItem>
                )}
                
                {artists.map((artist) => (
                  <CommandItem
                    key={artist.id}
                    onSelect={() => handleSelect(artist.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedArtists.includes(artist.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{getDisplayName(artist)}</span>
                      {artist.stage_name && artist.stage_name !== artist.name && (
                        <span className="text-xs text-muted-foreground">{artist.name}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {showSelectedBadges && selectedArtists.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {artists
            .filter(artist => selectedArtists.includes(artist.id))
            .map(artist => (
              <Badge
                key={artist.id}
                variant="secondary"
                className="text-xs"
              >
                {getDisplayName(artist)}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}