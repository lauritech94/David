import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, User, Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Artist {
  id: string;
  name: string;
  stage_name?: string;
  artist_type?: string | null;
  type: 'artist';
}

interface Contact {
  id: string;
  name: string;
  stage_name?: string | null;
  category?: string;
  type: 'contact';
}

type Profile = Artist | Contact;

interface ArtistProfileSelectorProps {
  value: string | null;
  onValueChange: (value: string | null, type: 'artist' | 'contact' | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ArtistProfileSelector({ 
  value, 
  onValueChange, 
  placeholder = "Seleccionar perfil...",
  className,
  disabled = false
}: ArtistProfileSelectorProps) {
  const [open, setOpen] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [artistsRes, contactsRes] = await Promise.all([
        supabase
          .from('artists')
          .select('id, name, stage_name, artist_type')
          .order('name', { ascending: true }),
        supabase
          .from('contacts')
          .select('id, name, stage_name, category')
          .order('name', { ascending: true })
      ]);

      if (artistsRes.data) {
        setArtists(artistsRes.data.map(a => ({ ...a, type: 'artist' as const })));
      }
      if (contactsRes.data) {
        setContacts(contactsRes.data.map(c => ({ ...c, type: 'contact' as const })));
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProfile = [...artists, ...contacts].find(p => p.id === value);
  const getDisplayName = (profile: Profile) => {
    if ('stage_name' in profile && profile.stage_name) {
      return profile.stage_name;
    }
    return profile.name;
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate flex items-center gap-2">
              {selectedProfile ? (
                <>
                  {selectedProfile.type === 'artist' && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  )}
                  {getDisplayName(selectedProfile)}
                </>
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar perfiles..." />
            <CommandEmpty>No se encontraron perfiles.</CommandEmpty>
            <CommandList>
              {/* Artistas del Roster */}
              {(() => {
                const rosterArtists = artists
                  .filter(a => !a.artist_type || a.artist_type === 'roster')
                  .sort((a, b) => (a.stage_name || a.name).localeCompare(b.stage_name || b.name));
                const collaboratorArtists = artists
                  .filter(a => a.artist_type === 'collaborator')
                  .sort((a, b) => (a.stage_name || a.name).localeCompare(b.stage_name || b.name));
                return (
                  <>
                    <CommandGroup heading={
                      <span className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-amber-500" />
                        Artistas del Roster
                      </span>
                    }>
                      {rosterArtists.map((artist) => (
                        <CommandItem
                          key={`artist-${artist.id}`}
                          onSelect={() => {
                            onValueChange(artist.id, 'artist');
                            setOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === artist.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <Star className="mr-2 h-4 w-4 text-amber-500 fill-amber-500" />
                          <div className="flex flex-col flex-1">
                            <span className="font-medium">{getDisplayName(artist)}</span>
                            {artist.stage_name && artist.name !== artist.stage_name && (
                              <span className="text-xs text-muted-foreground">{artist.name}</span>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2 text-xs bg-amber-500/10 text-amber-700 border-amber-200">
                            Roster
                          </Badge>
                        </CommandItem>
                      ))}
                      {rosterArtists.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay artistas en el roster
                        </div>
                      )}
                    </CommandGroup>

                    {collaboratorArtists.length > 0 && (
                      <>
                        <CommandSeparator />
                        <CommandGroup heading={
                          <span className="flex items-center gap-2">
                            <Star className="h-3 w-3 text-indigo-500" />
                            Artistas Colaboradores
                          </span>
                        }>
                          {collaboratorArtists.map((artist) => (
                            <CommandItem
                              key={`artist-${artist.id}`}
                              onSelect={() => {
                                onValueChange(artist.id, 'artist');
                                setOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  value === artist.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Star className="mr-2 h-4 w-4 text-indigo-500" />
                              <div className="flex flex-col flex-1">
                                <span className="font-medium">{getDisplayName(artist)}</span>
                                {artist.stage_name && artist.name !== artist.stage_name && (
                                  <span className="text-xs text-muted-foreground">{artist.name}</span>
                                )}
                              </div>
                              <Badge variant="outline" className="ml-2 text-xs bg-indigo-500/10 text-indigo-700 border-indigo-200">
                                Colaborador
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </>
                );
              })()}

              <CommandSeparator />

              {/* Otros Perfiles / Contactos */}
              <CommandGroup heading={
                <span className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  Otros Perfiles
                </span>
              }>
                <CommandItem
                  onSelect={() => {
                    onValueChange(null, null);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground">Sin asignar</span>
                </CommandItem>
                
                {contacts.map((contact) => (
                  <CommandItem
                    key={`contact-${contact.id}`}
                    onSelect={() => {
                      onValueChange(contact.id, 'contact');
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col flex-1">
                      <span>{getDisplayName(contact)}</span>
                      {contact.category && (
                        <span className="text-xs text-muted-foreground capitalize">{contact.category}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
