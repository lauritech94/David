import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, User, UserCog } from 'lucide-react';

export default function RoleSelector() {
  const { profile, switchRole, addRole, hasRole } = useAuth();
  
  if (!profile) return null;

  const getRoleIcon = (role: 'artist' | 'management') => {
    return role === 'artist' ? <User className="h-4 w-4" /> : <UserCog className="h-4 w-4" />;
  };

  const getRoleLabel = (role: 'artist' | 'management') => {
    return role === 'artist' ? 'Artista' : 'Management';
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            {getRoleIcon(profile.active_role)}
            <span className="ml-2">{getRoleLabel(profile.active_role)}</span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {profile.roles.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => switchRole(role)}
              className={profile.active_role === role ? 'bg-muted' : ''}
            >
              {getRoleIcon(role)}
              <span className="ml-2">{getRoleLabel(role)}</span>
              {profile.active_role === role && (
                <Badge variant="secondary" className="ml-2">Activo</Badge>
              )}
            </DropdownMenuItem>
          ))}
          
          {!hasRole('artist') && (
            <DropdownMenuItem onClick={() => addRole('artist')}>
              <User className="h-4 w-4" />
              <span className="ml-2">Agregar rol de Artista</span>
            </DropdownMenuItem>
          )}
          
          {!hasRole('management') && (
            <DropdownMenuItem onClick={() => addRole('management')}>
              <UserCog className="h-4 w-4" />
              <span className="ml-2">Agregar rol de Management</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}