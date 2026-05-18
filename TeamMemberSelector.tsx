import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, User, Users, X } from 'lucide-react';
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
import { useTeamMembersByArtist } from '@/hooks/useTeamMembersByArtist';

interface TeamMemberSelectorProps {
  selectedMembers: string[];
  onSelectionChange: (memberIds: string[]) => void;
  artistId?: string; // Optional: filter by artist
  placeholder?: string;
  className?: string;
}

export function TeamMemberSelector({ 
  selectedMembers, 
  onSelectionChange, 
  artistId,
  placeholder = "Seleccionar miembros del equipo...",
  className
}: TeamMemberSelectorProps) {
  const [open, setOpen] = useState(false);
  
  // Use the hook to get team members filtered by artist
  const { filteredMembers, loading } = useTeamMembersByArtist(
    artistId ? [artistId] : []
  );

  // Transform to the format needed for display
  const teamMembers = useMemo(() => {
    return filteredMembers.map(member => ({
      id: member.id,
      full_name: member.name,
      type: member.type,
      category: member.category,
    }));
  }, [filteredMembers]);

  const handleSelect = (memberId: string) => {
    if (memberId === 'all') {
      const allMemberIds = teamMembers.map(m => m.id);
      if (selectedMembers.length === allMemberIds.length) {
        onSelectionChange([]);
      } else {
        onSelectionChange(allMemberIds);
      }
    } else {
      if (selectedMembers.includes(memberId)) {
        onSelectionChange(selectedMembers.filter(id => id !== memberId));
      } else {
        onSelectionChange([...selectedMembers, memberId]);
      }
    }
  };

  const removeMember = (memberId: string) => {
    onSelectionChange(selectedMembers.filter(id => id !== memberId));
  };

  const getSelectedNames = () => {
    const names = teamMembers
      .filter(member => selectedMembers.includes(member.id))
      .map(member => member.full_name);
    
    if (names.length === 0) return placeholder;
    if (names.length === 1) return names[0];
    if (names.length === teamMembers.length && teamMembers.length > 0) return "Todo el equipo";
    return `${names.length} miembros seleccionados`;
  };

  const allMemberIds = teamMembers.map(m => m.id);
  const allSelected = selectedMembers.length === allMemberIds.length && allMemberIds.length > 0;

  if (loading) {
    return (
      <div className={className}>
        <Button variant="outline" className="w-full justify-between" disabled>
          <span className="text-muted-foreground">Cargando equipo...</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

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
        <PopoverContent className="w-full p-0 bg-background border shadow-lg z-50" align="start">
          <Command>
            <CommandInput placeholder="Buscar miembros del equipo..." />
            <CommandEmpty>
              {artistId 
                ? "No hay miembros asignados a este artista." 
                : "No se encontraron miembros."}
            </CommandEmpty>
            <CommandList>
              <CommandGroup>
                {teamMembers.length > 1 && (
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
                    <span>Todo el equipo</span>
                  </CommandItem>
                )}
                
                {teamMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => handleSelect(member.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedMembers.includes(member.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{member.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {member.type === 'workspace' ? 'Cuenta' : 'Contacto'}
                        {member.category && ` · ${member.category}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {teamMembers
            .filter(member => selectedMembers.includes(member.id))
            .map(member => (
              <Badge
                key={member.id}
                variant="secondary"
                className="text-xs flex items-center gap-1"
              >
                {member.full_name}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeMember(member.id)}
                />
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}