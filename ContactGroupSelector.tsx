import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Users, Music, Building2, Mic2, Wrench, Newspaper, Scale, Palette, Headphones, Video, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ContactGroup {
  id: string;
  name: string;
  color: string | null;
  group_type: string | null;
  member_count?: number;
}

interface ContactGroupSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const ICON_MAP: Record<string, any> = {
  general: Users,
  banda: Music,
  sello: Building2,
  management: Mic2,
  tecnico: Wrench,
  prensa: Newspaper,
  legal: Scale,
  artistico: Palette,
  produccion: Headphones,
  audiovisual: Video,
  contabilidad: DollarSign,
};

export function ContactGroupSelector({ value, onValueChange, placeholder = "Seleccionar grupo...", className }: ContactGroupSelectorProps) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select(`
          id, name, color, group_type,
          contact_group_members(count)
        `)
        .order('name');

      if (error) throw error;

      const groupsWithCount = (data || []).map(group => ({
        ...group,
        member_count: group.contact_group_members?.[0]?.count || 0,
      }));

      setGroups(groupsWithCount);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedGroup = groups.find(g => g.id === value);

  const getIcon = (groupType: string | null) => {
    return ICON_MAP[groupType || 'general'] || Users;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedGroup ? (
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = getIcon(selectedGroup.group_type);
                return <Icon className="w-4 h-4" style={{ color: selectedGroup.color || '#3b82f6' }} />;
              })()}
              <span>{selectedGroup.name}</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {selectedGroup.member_count}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar grupo..." />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Cargando...' : 'No se encontraron grupos'}
            </CommandEmpty>
            <CommandGroup>
              {groups.map((group) => {
                const Icon = getIcon(group.group_type);
                return (
                  <CommandItem
                    key={group.id}
                    value={group.name}
                    onSelect={() => {
                      onValueChange(group.id === value ? '' : group.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === group.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center mr-2"
                      style={{ backgroundColor: `${group.color || '#3b82f6'}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: group.color || '#3b82f6' }} />
                    </div>
                    <div className="flex-1">
                      <span>{group.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {group.member_count}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Multi-select version for adding multiple groups
interface ContactGroupMultiSelectorProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function ContactGroupMultiSelector({ value, onValueChange, placeholder = "Seleccionar grupos...", className }: ContactGroupMultiSelectorProps) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select(`
          id, name, color, group_type,
          contact_group_members(count)
        `)
        .order('name');

      if (error) throw error;

      const groupsWithCount = (data || []).map(group => ({
        ...group,
        member_count: group.contact_group_members?.[0]?.count || 0,
      }));

      setGroups(groupsWithCount);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedGroups = groups.filter(g => value.includes(g.id));

  const toggleGroup = (groupId: string) => {
    if (value.includes(groupId)) {
      onValueChange(value.filter(id => id !== groupId));
    } else {
      onValueChange([...value, groupId]);
    }
  };

  const getIcon = (groupType: string | null) => {
    return ICON_MAP[groupType || 'general'] || Users;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between min-h-[40px] h-auto", className)}
        >
          {selectedGroups.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedGroups.map(group => {
                const Icon = getIcon(group.group_type);
                return (
                  <Badge key={group.id} variant="secondary" className="flex items-center gap-1">
                    <Icon className="w-3 h-3" style={{ color: group.color || '#3b82f6' }} />
                    {group.name}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar grupo..." />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Cargando...' : 'No se encontraron grupos'}
            </CommandEmpty>
            <CommandGroup>
              {groups.map((group) => {
                const Icon = getIcon(group.group_type);
                const isSelected = value.includes(group.id);
                return (
                  <CommandItem
                    key={group.id}
                    value={group.name}
                    onSelect={() => toggleGroup(group.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center mr-2"
                      style={{ backgroundColor: `${group.color || '#3b82f6'}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: group.color || '#3b82f6' }} />
                    </div>
                    <div className="flex-1">
                      <span>{group.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {group.member_count}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
