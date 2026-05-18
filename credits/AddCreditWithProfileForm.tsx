import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Users, Star, Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { GroupedRoleSelect } from '@/components/credits/GroupedRoleSelect';
import { type CreditCategory, getRoleLabel } from '@/lib/creditRoles';
import { useAuth } from '@/hooks/useAuth';

interface ExistingCredit {
  name: string;
  role: string;
  contact_id?: string | null;
}

interface AddCreditWithProfileFormProps {
  onSubmit: (data: { 
    name: string; 
    role: string; 
    contact_id?: string;
    publishing_percentage?: number; 
    master_percentage?: number;
    custom_instrument?: string;
  }) => void;
  isLoading: boolean;
  releaseArtistId?: string | null;
  /** Pre-filter roles to a specific category */
  filterCategory?: CreditCategory;
  /** Existing credits on this track, used to show which roles a person already has */
  existingCredits?: ExistingCredit[];
}

interface Contact {
  id: string;
  name: string;
  stage_name?: string | null;
  email?: string | null;
  category?: string;
}

interface Artist {
  id: string;
  name: string;
  stage_name?: string | null;
}

export function AddCreditWithProfileForm({ onSubmit, isLoading, releaseArtistId, filterCategory, existingCredits = [] }: AddCreditWithProfileFormProps) {
  const [mode, setMode] = useState<'search' | 'new'>('search');
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; name: string; type: 'artist' | 'contact' } | null>(null);
  const { user } = useAuth();
  
  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [customInstrument, setCustomInstrument] = useState('');
  const [publishingPct, setPublishingPct] = useState('');
  const [masterPct, setMasterPct] = useState('');

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-credits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, stage_name, email, category')
        .order('name');
      if (error) throw error;
      return data as Contact[];
    },
  });

  const { data: artists = [] } = useQuery({
    queryKey: ['artists-for-credits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name');
      if (error) throw error;
      return data as Artist[];
    },
  });

  // Get artist's team members if we have an artist ID
  const { data: artistTeam = [] } = useQuery({
    queryKey: ['artist-team-for-credits', releaseArtistId],
    queryFn: async () => {
      if (!releaseArtistId) return [];
      const { data, error } = await supabase
        .from('contact_artist_assignments')
        .select(`
          contact_id,
          contacts:contact_id(id, name, stage_name, category)
        `)
        .eq('artist_id', releaseArtistId);
      if (error) throw error;
      return data?.map(d => d.contacts).filter(Boolean) as Contact[] || [];
    },
    enabled: !!releaseArtistId,
  });

  const getDisplayName = (item: Contact | Artist) => {
    return item.stage_name || item.name;
  };

  // Group contacts by category
  const teamContacts = contacts.filter(c => 
    c.category && ['banda', 'artistico', 'tecnico', 'productor', 'compositor', 'letrista', 'interprete'].includes(c.category)
  );
  const otherContacts = contacts.filter(c => 
    !c.category || !['banda', 'artistico', 'tecnico', 'productor', 'compositor', 'letrista', 'interprete'].includes(c.category)
  );

  // Get existing roles for the selected person
  const selectedPersonExistingRoles = useMemo(() => {
    if (!selectedProfile) return [];
    return existingCredits.filter(c => {
      if (selectedProfile.type === 'contact' && c.contact_id) return c.contact_id === selectedProfile.id;
      return c.name.toLowerCase().trim() === selectedProfile.name.toLowerCase().trim();
    }).map(c => c.role);
  }, [selectedProfile, existingCredits]);

  const handleSelectProfile = (id: string, displayName: string, type: 'artist' | 'contact') => {
    setSelectedProfile({ id, name: displayName, type });
    setName(displayName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = selectedProfile?.name || name.trim();
    if (!finalName || !role) return;
    if (role === 'otro_instrumento' && !customInstrument.trim()) return;

    // Save custom instrument to DB for future use (workspace-scoped)
    if (role === 'otro_instrumento' && customInstrument.trim() && user?.id) {
      try {
        // Resolve workspace_id from the artist linked to this credit (release artist)
        let workspaceId: string | null = null;
        if (releaseArtistId) {
          const { data: artist } = await supabase
            .from('artists')
            .select('workspace_id')
            .eq('id', releaseArtistId)
            .maybeSingle();
          workspaceId = artist?.workspace_id ?? null;
        }
        // Fallback: any workspace the user belongs to
        if (!workspaceId) {
          const { data: membership } = await supabase
            .from('workspace_memberships')
            .select('workspace_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          workspaceId = membership?.workspace_id ?? null;
        }
        if (workspaceId) {
          await supabase
            .from('custom_instruments')
            .upsert(
              [{ name: customInstrument.trim(), created_by: user.id, workspace_id: workspaceId }],
              { onConflict: 'workspace_id,name' }
            );
        }
      } catch (err) {
        console.warn('No se pudo guardar el instrumento personalizado', err);
      }
    }
    
    onSubmit({
      name: finalName,
      role: role === 'otro_instrumento' ? customInstrument.trim() : role,
      contact_id: selectedProfile?.type === 'contact' ? selectedProfile.id : undefined,
      publishing_percentage: publishingPct ? parseFloat(publishingPct) : undefined,
      master_percentage: masterPct ? parseFloat(masterPct) : undefined,
      custom_instrument: role === 'otro_instrumento' ? customInstrument.trim() : undefined,
    });
  };

  const clearSelection = () => {
    setSelectedProfile(null);
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => { setMode(v as 'search' | 'new'); clearSelection(); }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Buscar Perfil
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {selectedProfile ? (
            <>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                <div className="flex items-center gap-2">
                  {selectedProfile.type === 'artist' ? (
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{selectedProfile.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedProfile.type === 'artist' ? 'Roster' : 'Contacto'}
                  </Badge>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                  Cambiar
                </Button>
              </div>
              {selectedPersonExistingRoles.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">Ya tiene:</span>
                  {selectedPersonExistingRoles.map((r, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {getRoleLabel(r)}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Command className="rounded-lg border">
              <CommandInput placeholder="Buscar artistas, equipo o contactos..." />
              <CommandList className="max-h-[250px]">
                  <CommandEmpty>No se encontraron perfiles.</CommandEmpty>
                  
                  {/* Artistas del Roster */}
                  {artists.length > 0 && (
                    <CommandGroup heading={
                      <span className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-amber-500" />
                        Artistas del Roster
                      </span>
                    }>
                      {artists.map((artist) => (
                        <CommandItem
                          key={`artist-${artist.id}`}
                          value={`artist-${artist.id}-${getDisplayName(artist)}`}
                          onSelect={() => handleSelectProfile(artist.id, getDisplayName(artist), 'artist')}
                          className="cursor-pointer"
                        >
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
                    </CommandGroup>
                  )}

                  <CommandSeparator />

                  {/* Equipo del Artista (si hay artista asociado) */}
                  {artistTeam.length > 0 && (
                    <>
                      <CommandGroup heading={
                        <span className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-primary" />
                          Equipo del Artista
                        </span>
                      }>
                        {artistTeam.map((contact) => (
                          <CommandItem
                            key={`team-${contact.id}`}
                            value={`team-${contact.id}-${getDisplayName(contact)}`}
                            onSelect={() => handleSelectProfile(contact.id, getDisplayName(contact), 'contact')}
                            className="cursor-pointer"
                          >
                            <Users className="mr-2 h-4 w-4 text-primary" />
                            <div className="flex flex-col flex-1">
                              <span>{getDisplayName(contact)}</span>
                              {contact.category && (
                                <span className="text-xs text-muted-foreground capitalize">{contact.category}</span>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary border-primary/20">
                              Equipo
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  )}

                  {/* Equipo Artístico General */}
                  {teamContacts.length > 0 && (
                    <CommandGroup heading={
                      <span className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Equipo Artístico
                      </span>
                    }>
                      {teamContacts.slice(0, 10).map((contact) => (
                        <CommandItem
                          key={`teamgeneral-${contact.id}`}
                          value={`teamgeneral-${contact.id}-${getDisplayName(contact)}`}
                          onSelect={() => handleSelectProfile(contact.id, getDisplayName(contact), 'contact')}
                          className="cursor-pointer"
                        >
                          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col flex-1">
                            <span>{getDisplayName(contact)}</span>
                            {contact.category && (
                              <span className="text-xs text-muted-foreground capitalize">{contact.category}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  <CommandSeparator />

                  {/* Agenda */}
                  {otherContacts.length > 0 && (
                    <CommandGroup heading={
                      <span className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Agenda
                      </span>
                    }>
                      {otherContacts.slice(0, 10).map((contact) => (
                        <CommandItem
                          key={`agenda-${contact.id}`}
                          value={`agenda-${contact.id}-${getDisplayName(contact)}`}
                          onSelect={() => handleSelectProfile(contact.id, getDisplayName(contact), 'contact')}
                          className="cursor-pointer"
                        >
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col flex-1">
                            <span>{getDisplayName(contact)}</span>
                            {contact.email && (
                              <span className="text-xs text-muted-foreground">{contact.email}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
              </CommandList>
            </Command>
          )}
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <div>
            <Label htmlFor="credit_name">Nombre *</Label>
            <Input
              id="credit_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del colaborador"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Puedes vincular este crédito a un perfil después
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div>
        <Label htmlFor="credit_role">Rol *</Label>
        <GroupedRoleSelect value={role} onValueChange={(v) => { setRole(v); if (v !== 'otro_instrumento') setCustomInstrument(''); }} filterType={filterCategory} />
      </div>

      {role === 'otro_instrumento' && (
        <div>
          <Label htmlFor="custom_instrument">Nombre del instrumento *</Label>
          <Input
            id="custom_instrument"
            value={customInstrument}
            onChange={(e) => setCustomInstrument(e.target.value)}
            placeholder="Ej: Theremin, Kalimba, Didgeridoo..."
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Se guardará para futuros créditos
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="credit_publishing">% Autoría</Label>
          <Input
            id="credit_publishing"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={publishingPct}
            onChange={(e) => setPublishingPct(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <Label htmlFor="credit_master">% Master</Label>
          <Input
            id="credit_master"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={masterPct}
            onChange={(e) => setMasterPct(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button 
          type="submit" 
          disabled={isLoading || (!selectedProfile && !name.trim()) || !role || (role === 'otro_instrumento' && !customInstrument.trim())}
        >
          {isLoading ? 'Guardando...' : 'Añadir Crédito'}
        </Button>
      </div>
    </form>
  );
}
