import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, User, Users, Star, CheckSquare, Square, MinusSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface TeamMember {
  id: string;
  name: string;
  role?: string | null;
  category?: string | null;
  type: 'contact' | 'artist' | 'workspace';
  isFromFormat?: boolean; // If this member comes from the booking format crew
}

interface TeamMemberSelectorProps {
  artistId?: string | null;
  bookingId?: string | null; // If provided, will fetch crew from booking's format
  value?: string[]; // Array of contact IDs
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  compact?: boolean;
  // Note: multi-selection is now the default behavior
}

export function TeamMemberSelector({
  artistId,
  bookingId,
  value = [],
  onValueChange,
  placeholder = 'Seleccionar miembros...',
  compact = false,
}: TeamMemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [formatCrewIds, setFormatCrewIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchMembers();
  }, [artistId, bookingId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const allMembers: TeamMember[] = [];
      const crewIdsFromFormat = new Set<string>();

      // 1. If we have a bookingId, fetch the format crew first
      if (bookingId) {
        // Get booking format
        const { data: booking } = await supabase
          .from('booking_offers')
          .select('formato, artist_id')
          .eq('id', bookingId)
          .single();

        if (booking?.formato && (artistId || booking.artist_id)) {
          const targetArtistId = artistId || booking.artist_id;
          
          // Find the booking product for this format
          const { data: product } = await supabase
            .from('booking_products')
            .select('id')
            .eq('artist_id', targetArtistId)
            .ilike('name', booking.formato)
            .eq('is_active', true)
            .limit(1)
            .single();

          if (product) {
            // Get crew members for this format
            const { data: crewData } = await supabase
              .from('booking_product_crew')
              .select('member_id, member_type, role_label')
              .eq('booking_product_id', product.id);

            if (crewData && crewData.length > 0) {
              // Separate contacts and workspace members
              const contactIds = crewData.filter(c => c.member_type === 'contact').map(c => c.member_id);
              const workspaceIds = crewData.filter(c => c.member_type === 'workspace').map(c => c.member_id);

              // Fetch contact details
              if (contactIds.length > 0) {
                const { data: contacts } = await supabase
                  .from('contacts')
                  .select('id, name, stage_name, role')
                  .in('id', contactIds);

                contacts?.forEach(c => {
                  const crewMember = crewData.find(cm => cm.member_id === c.id);
                  crewIdsFromFormat.add(c.id);
                  allMembers.push({
                    id: c.id,
                    name: c.stage_name || c.name,
                    role: crewMember?.role_label || c.role,
                    category: 'formato',
                    type: 'contact',
                    isFromFormat: true,
                  });
                });
              }

              // Fetch workspace member details (artists or profiles)
              if (workspaceIds.length > 0) {
                // Check if any are artists
                const { data: artists } = await supabase
                  .from('artists')
                  .select('id, name, stage_name')
                  .in('id', workspaceIds);

                artists?.forEach(a => {
                  crewIdsFromFormat.add(a.id);
                  allMembers.push({
                    id: a.id,
                    name: a.stage_name || a.name,
                    role: 'Artista principal',
                    category: 'formato',
                    type: 'workspace',
                    isFromFormat: true,
                  });
                });

                // Check profiles for remaining IDs
                const foundArtistIds = new Set(artists?.map(a => a.id) || []);
                const remainingIds = workspaceIds.filter(id => !foundArtistIds.has(id));
                
                if (remainingIds.length > 0) {
                  const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .in('user_id', remainingIds);

                  profiles?.forEach(p => {
                    crewIdsFromFormat.add(p.user_id);
                    allMembers.push({
                      id: p.user_id,
                      name: p.full_name || 'Usuario',
                      role: 'Miembro del equipo',
                      category: 'formato',
                      type: 'workspace',
                      isFromFormat: true,
                    });
                  });
                }
              }
            }
          }
        }
      }

      // 2. Fetch additional contacts (team/management) not already in format
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, stage_name, role, category, artist_id, field_config')
        .or(`category.eq.equipo,category.eq.management,category.eq.artista${artistId ? `,artist_id.eq.${artistId}` : ''}`)
        .order('name');

      if (contactsError) throw contactsError;

      // Filter and map contacts - exclude those already added from format
      (contactsData || [])
        .filter(c => {
          // Skip if already added from format
          if (crewIdsFromFormat.has(c.id)) return false;
          // Include if it's a team/management category
          if (c.category === 'equipo' || c.category === 'management') return true;
          // Include if linked to the specific artist
          if (artistId && c.artist_id === artistId) return true;
          // Check field_config for roster_artist_id
          if (artistId && c.field_config && typeof c.field_config === 'object') {
            const rosterArtistId = (c.field_config as any).roster_artist_id;
            if (rosterArtistId === artistId) return true;
          }
          return false;
        })
        .forEach(c => {
          allMembers.push({
            id: c.id,
            name: c.stage_name || c.name,
            role: c.role,
            category: c.category,
            type: 'contact',
            isFromFormat: false,
          });
        });

      setFormatCrewIds(crewIdsFromFormat);
      setMembers(allMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMembers = useMemo(() => {
    return members.filter(m => value.includes(m.id));
  }, [members, value]);

  const handleSelect = (memberId: string) => {
    // Multi selection mode - toggle
    if (value.includes(memberId)) {
      onValueChange(value.filter(id => id !== memberId));
    } else {
      onValueChange([...value, memberId]);
    }
  };

  const handleRemoveMember = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter(id => id !== memberId));
  };

  const displayValue = useMemo(() => {
    if (selectedMembers.length === 0) return placeholder;
    if (compact && selectedMembers.length > 2) {
      return `${selectedMembers.length} seleccionados`;
    }
    return selectedMembers.map(m => m.name).join(', ');
  }, [selectedMembers, compact, placeholder]);

  // Group members by category
  const groupedMembers = useMemo(() => {
    const groups: Record<string, TeamMember[]> = {};
    members.forEach(m => {
      const cat = m.category || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [members]);

  const categoryLabels: Record<string, string> = {
    formato: 'Equipo del Formato',
    equipo: 'Equipo Artístico',
    management: 'Management',
    artista: 'Artistas',
    otros: 'Otros',
  };

  // Custom sort order for categories - format crew first
  const categoryOrder = ['formato', 'equipo', 'management', 'artista', 'otros'];

  // Check if a category is fully selected, partially selected, or not selected
  const getCategorySelectionState = (category: string): 'all' | 'some' | 'none' => {
    const categoryMembers = groupedMembers[category] || [];
    if (categoryMembers.length === 0) return 'none';
    
    const selectedCount = categoryMembers.filter(m => value.includes(m.id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === categoryMembers.length) return 'all';
    return 'some';
  };

  // Toggle all members in a category
  const handleToggleCategory = (category: string) => {
    const categoryMembers = groupedMembers[category] || [];
    const categoryIds = categoryMembers.map(m => m.id);
    const state = getCategorySelectionState(category);

    if (state === 'all') {
      // Deselect all in this category
      onValueChange(value.filter(id => !categoryIds.includes(id)));
    } else {
      // Select all in this category
      const newValue = [...value];
      categoryIds.forEach(id => {
        if (!newValue.includes(id)) {
          newValue.push(id);
        }
      });
      onValueChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'justify-between font-normal w-full',
              compact ? 'h-8 px-2 text-xs' : 'h-9',
              selectedMembers.length === 0 && 'text-muted-foreground'
            )}
          >
            <span className="truncate flex items-center gap-1">
              {selectedMembers.length > 0 && <Users className="w-3 h-3 shrink-0" />}
              {selectedMembers.length > 0 ? `${selectedMembers.length} seleccionado${selectedMembers.length > 1 ? 's' : ''}` : placeholder}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar miembro..." className="h-9" />
            <CommandList className="max-h-80">
              <CommandEmpty>
                {loading ? 'Cargando...' : 'No se encontraron miembros'}
              </CommandEmpty>
              {categoryOrder
                .filter(cat => groupedMembers[cat]?.length > 0)
                .map(category => {
                  const selectionState = getCategorySelectionState(category);
                  const categoryMemberCount = groupedMembers[category]?.length || 0;
                  const selectedInCategory = groupedMembers[category]?.filter(m => value.includes(m.id)).length || 0;
                  
                  return (
                    <CommandGroup key={category}>
                      {/* Category header with group selection checkbox */}
                      <div 
                        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm mx-1"
                        onClick={() => handleToggleCategory(category)}
                      >
                        {selectionState === 'all' ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : selectionState === 'some' ? (
                          <MinusSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          {category === 'formato' && <Star className="w-3 h-3 text-amber-500" />}
                          {categoryLabels[category] || category}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {selectedInCategory}/{categoryMemberCount}
                        </span>
                      </div>
                      
                      {/* Individual members */}
                      {groupedMembers[category].map(member => (
                        <CommandItem
                          key={member.id}
                          value={member.name}
                          onSelect={() => handleSelect(member.id)}
                          className="pl-6"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {member.isFromFormat ? (
                              <Star className="w-3 h-3 text-amber-500" />
                            ) : (
                              <User className="w-3 h-3 text-muted-foreground" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm">{member.name}</span>
                              {member.role && (
                                <span className="text-xs text-muted-foreground">{member.role}</span>
                              )}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              'ml-auto h-4 w-4',
                              value.includes(member.id) ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected members as removable badges */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMembers.map(m => (
            <Badge 
              key={m.id} 
              variant="secondary" 
              className="text-xs gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
            >
              {m.isFromFormat && <Star className="w-2.5 h-2.5 text-amber-500" />}
              {m.name}
              <button
                onClick={(e) => handleRemoveMember(m.id, e)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component for displaying selected members as badges
export function SelectedMembersBadges({
  memberIds,
  members,
}: {
  memberIds: string[];
  members: TeamMember[];
}) {
  const selected = members.filter(m => memberIds.includes(m.id));
  if (selected.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {selected.map(m => (
        <Badge key={m.id} variant="secondary" className="text-xs">
          {m.name}
        </Badge>
      ))}
    </div>
  );
}
