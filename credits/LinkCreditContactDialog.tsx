import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Link2, Check, User, Users, Star, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { undoableDeleteCustom } from '@/utils/undoableDelete';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { TrackCredit } from '@/hooks/useReleases';

interface LinkCreditContactDialogProps {
  credit: TrackCredit;
  onLinked?: () => void;
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

export function LinkCreditContactDialog({ credit, onLinked }: LinkCreditContactDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

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

  const linkToContact = useMutation({
    mutationFn: async ({ contactId, contactName }: { contactId: string; contactName: string }) => {
      const { error } = await supabase
        .from('track_credits')
        .update({ 
          contact_id: contactId,
          artist_id: null,
          name: contactName
        })
        .eq('id', credit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits'] });
      toast.success('Crédito vinculado al contacto');
      setOpen(false);
      onLinked?.();
    },
    onError: (error) => {
      toast.error('Error al vincular: ' + error.message);
    },
  });

  const linkToArtist = useMutation({
    mutationFn: async ({ artistId, artistName }: { artistId: string; artistName: string }) => {
      const { error } = await supabase
        .from('track_credits')
        .update({ 
          artist_id: artistId,
          contact_id: null,
          name: artistName
        })
        .eq('id', credit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits'] });
      toast.success('Crédito vinculado al artista');
      setOpen(false);
      onLinked?.();
    },
    onError: (error) => {
      toast.error('Error al vincular: ' + error.message);
    },
  });

  const unlinkContact = useMutation({
    mutationFn: async () => {
      const previousContactId = credit.contact_id;
      const previousArtistId = credit.artist_id;
      
      await undoableDeleteCustom({
        deleteAction: async () => {
          const { error } = await supabase
            .from('track_credits')
            .update({ contact_id: null, artist_id: null })
            .eq('id', credit.id);
          if (error) throw error;
        },
        undoAction: async () => {
          const { error } = await supabase
            .from('track_credits')
            .update({ contact_id: previousContactId, artist_id: previousArtistId })
            .eq('id', credit.id);
          if (error) throw error;
        },
        successMessage: 'Vínculo eliminado',
        onComplete: () => {
          queryClient.invalidateQueries({ queryKey: ['track-credits'] });
        },
      });
      
      setOpen(false);
      onLinked?.();
    },
  });

  const getDisplayName = (item: Contact | Artist) => {
    return item.stage_name || item.name;
  };

  const isLinked = !!credit.contact_id || !!credit.artist_id;

  // Group contacts by team categories
  const teamContacts = contacts.filter(c => 
    c.category && ['banda', 'artistico', 'tecnico', 'productor', 'compositor', 'letrista'].includes(c.category)
  );
  const otherContacts = contacts.filter(c => 
    !c.category || !['banda', 'artistico', 'tecnico', 'productor', 'compositor', 'letrista'].includes(c.category)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          title={isLinked ? "Vinculado a perfil" : "Vincular con perfil"}
        >
          {isLinked ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular "{credit.name}" con Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vincula este crédito con un perfil existente para mantener la trazabilidad en liquidaciones y pagos.
          </p>

          <Command className="rounded-lg border">
            <CommandInput placeholder="Buscar perfiles..." />
            <CommandList className="max-h-[300px]">
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
                      onSelect={() => linkToArtist.mutate({ 
                        artistId: artist.id, 
                        artistName: getDisplayName(artist)
                      })}
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

              {/* Equipo Artístico */}
              {teamContacts.length > 0 && (
                <CommandGroup heading={
                  <span className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Equipo Artístico
                  </span>
                }>
                  {teamContacts.map((contact) => (
                    <CommandItem
                      key={`team-${contact.id}`}
                      onSelect={() => linkToContact.mutate({ 
                        contactId: contact.id, 
                        contactName: getDisplayName(contact)
                      })}
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

              {/* Otros Contactos / Agenda */}
              {otherContacts.length > 0 && (
                <CommandGroup heading={
                  <span className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Agenda
                  </span>
                }>
                  {otherContacts.map((contact) => (
                    <CommandItem
                      key={`contact-${contact.id}`}
                      onSelect={() => linkToContact.mutate({ 
                        contactId: contact.id, 
                        contactName: getDisplayName(contact)
                      })}
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

          {isLinked && (
            <div className="flex justify-between items-center p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Vinculado a un perfil</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => unlinkContact.mutate()}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Desvincular
              </Button>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
