import { useMemo } from 'react';
import { Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTeamMembersByArtist } from '@/hooks/useTeamMembersByArtist';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';

interface TeamSelectorByArtistProps {
  selectedArtistIds: string[];
  selectedTeamMemberIds: string[];
  onSelectionChange: (ids: string[]) => void;
  label?: string;
  className?: string;
}

export function TeamSelectorByArtist({
  selectedArtistIds,
  selectedTeamMemberIds,
  onSelectionChange,
  label = 'Equipo',
  className,
}: TeamSelectorByArtistProps) {
  const { groupedByCategory, filteredMembers, loading } = useTeamMembersByArtist(selectedArtistIds);

  const toggleMember = (memberId: string) => {
    if (selectedTeamMemberIds.includes(memberId)) {
      onSelectionChange(selectedTeamMemberIds.filter(id => id !== memberId));
    } else {
      onSelectionChange([...selectedTeamMemberIds, memberId]);
    }
  };

  const toggleCategory = (categoryValue: string) => {
    const categoryMembers = groupedByCategory.find(c => c.value === categoryValue)?.members || [];
    const categoryMemberIds = categoryMembers.map(m => m.id);
    
    // Check if all members in this category are already selected
    const allSelected = categoryMemberIds.every(id => selectedTeamMemberIds.includes(id));
    
    if (allSelected) {
      // Deselect all in category
      onSelectionChange(selectedTeamMemberIds.filter(id => !categoryMemberIds.includes(id)));
    } else {
      // Select all in category
      const newSelection = [...new Set([...selectedTeamMemberIds, ...categoryMemberIds])];
      onSelectionChange(newSelection);
    }
  };

  const isCategoryFullySelected = (categoryValue: string) => {
    const categoryMembers = groupedByCategory.find(c => c.value === categoryValue)?.members || [];
    return categoryMembers.length > 0 && categoryMembers.every(m => selectedTeamMemberIds.includes(m.id));
  };

  const isCategoryPartiallySelected = (categoryValue: string) => {
    const categoryMembers = groupedByCategory.find(c => c.value === categoryValue)?.members || [];
    const selectedCount = categoryMembers.filter(m => selectedTeamMemberIds.includes(m.id)).length;
    return selectedCount > 0 && selectedCount < categoryMembers.length;
  };

  // Get selected member objects for display
  const selectedMembers = useMemo(() => {
    return filteredMembers.filter(m => selectedTeamMemberIds.includes(m.id));
  }, [filteredMembers, selectedTeamMemberIds]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <Users className="h-4 w-4" />
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            {selectedTeamMemberIds.length > 0 
              ? `${selectedTeamMemberIds.length} miembro(s) seleccionado(s)`
              : "Seleccionar equipo..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <ScrollArea className="h-[300px]">
            <div className="p-2 space-y-1">
              {loading ? (
                <p className="text-sm text-muted-foreground p-2">Cargando...</p>
              ) : groupedByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No hay miembros</p>
              ) : (
                groupedByCategory.map((category) => (
                  <div key={category.value} className="mb-2">
                    {/* Category header - clickable to select/deselect all */}
                    <div
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted font-medium text-sm border-b",
                        isCategoryFullySelected(category.value) && "bg-primary/10"
                      )}
                      onClick={() => toggleCategory(category.value)}
                    >
                      <Checkbox 
                        checked={isCategoryFullySelected(category.value)}
                        className={cn(
                          isCategoryPartiallySelected(category.value) && "data-[state=unchecked]:bg-primary/30"
                        )}
                      />
                      <span>{category.label}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {category.members.length}
                      </Badge>
                    </div>
                    
                    {/* Individual members in category */}
                    <div className="pl-4 space-y-0.5">
                      {category.members.map((member) => (
                        <div
                          key={member.id}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm",
                            selectedTeamMemberIds.includes(member.id) && "bg-primary/5"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMember(member.id);
                          }}
                        >
                          <Checkbox checked={selectedTeamMemberIds.includes(member.id)} />
                          <span className="truncate">{member.name}</span>
                          {member.type === 'workspace' && (
                            <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                              Usuario
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      
      {/* Selected badges */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedMembers.map(member => (
            <Badge key={member.id} variant="secondary" className="gap-1">
              {member.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => toggleMember(member.id)} 
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
