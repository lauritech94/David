import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Settings, Eye } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  stageName?: string | null;
  avatarUrl?: string | null;
  memberCount: number;
  isManagement?: boolean;
}

interface TeamDropdownProps {
  teams: Team[];
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  managementMemberCount?: number;
  onManageTeams?: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TeamDropdown({
  teams,
  selectedTeamId,
  onTeamChange,
  managementMemberCount = 0,
  onManageTeams,
}: TeamDropdownProps) {
  const getSelectedLabel = () => {
    if (selectedTeamId === 'all') {
      return 'Ver todo';
    }
    if (selectedTeamId === '00-management') {
      return '00 Management';
    }
    const team = teams.find(t => t.id === selectedTeamId);
    return team?.stageName || team?.name || 'Seleccionar equipo';
  };

  const handleValueChange = (value: string) => {
    if (value === '__manage__') {
      onManageTeams?.();
    } else {
      onTeamChange(value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">
        Equipo:
      </Label>
      <Select value={selectedTeamId} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[220px] bg-background">
          <SelectValue placeholder="Seleccionar equipo">
            {getSelectedLabel()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {/* Ver todo - View All */}
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span>Ver todo</span>
            </div>
          </SelectItem>
          
          <SelectSeparator />
          
          {/* Management Team */}
          <SelectItem value="00-management">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>00 Management</span>
              <span className="text-muted-foreground">({managementMemberCount})</span>
            </div>
          </SelectItem>
          
          {teams.length > 0 && <SelectSeparator />}
          
          {/* Artist Teams */}
          {teams.map(team => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  {team.avatarUrl && <AvatarImage src={team.avatarUrl} alt={team.name} />}
                  <AvatarFallback className="text-[10px] bg-secondary">
                    {getInitials(team.stageName || team.name)}
                  </AvatarFallback>
                </Avatar>
                <span>{team.stageName || team.name}</span>
                <span className="text-muted-foreground">({team.memberCount})</span>
              </div>
            </SelectItem>
          ))}
          
          {/* Manage Teams Option */}
          {onManageTeams && (
            <>
              <SelectSeparator />
              <SelectItem value="__manage__" className="text-primary">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Editar Equipos</span>
                </div>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
