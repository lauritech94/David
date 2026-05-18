import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  isTeam: boolean;
}

interface ContactLinkerProps {
  itemId: string;
  artistId: string;
  artistName: string;
  onLinked: (contactId: string, contactName: string) => void;
}

export function ContactLinker({ itemId, artistId, artistName, onLinked }: ContactLinkerProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const fetchContacts = async () => {
      // Fetch all contacts and team assignments in parallel
      const [contactsRes, teamRes] = await Promise.all([
        supabase.from('contacts').select('id, name').order('name'),
        artistId
          ? supabase.from('contact_artist_assignments').select('contact_id').eq('artist_id', artistId)
          : Promise.resolve({ data: [] }),
      ]);

      const teamSet = new Set((teamRes.data || []).map((r: any) => r.contact_id));
      setTeamIds(teamSet);

      const mapped = (contactsRes.data || []).map(c => ({
        id: c.id,
        name: c.name,
        isTeam: teamSet.has(c.id),
      }));

      // Sort: team first, then alphabetical
      mapped.sort((a, b) => {
        if (a.isTeam !== b.isTeam) return a.isTeam ? -1 : 1;
        return a.name.localeCompare(b.name, 'es');
      });

      setContacts(mapped);
      setLoading(false);
    };

    fetchContacts();
  }, [open, artistId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [contacts, search]);

  const teamContacts = filtered.filter(c => c.isTeam);
  const otherContacts = filtered.filter(c => !c.isTeam);

  const handleSelect = async (contact: Contact) => {
    const { error } = await supabase
      .from('budget_items')
      .update({ contact_id: contact.id })
      .eq('id', itemId);

    if (error) {
      toast.error('Error al vincular contacto');
      return;
    }

    toast.success(`Contacto "${contact.name}" vinculado`);
    onLinked(contact.id, contact.name);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
          <UserPlus className="h-3 w-3" />
          Vincular
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <input
          type="text"
          placeholder="Buscar contacto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background mb-2 outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {loading ? (
            <p className="text-xs text-muted-foreground p-2 text-center">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2 text-center">Sin resultados</p>
          ) : (
            <>
              {teamContacts.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1">
                    Equipo de {artistName}
                  </p>
                  {teamContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent truncate"
                    >
                      {c.name}
                    </button>
                  ))}
                </>
              )}
              {otherContacts.length > 0 && (
                <>
                  {teamContacts.length > 0 && (
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2">
                      Otros contactos
                    </p>
                  )}
                  {otherContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent truncate"
                    >
                      {c.name}
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
