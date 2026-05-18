import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Star, CheckCircle, User } from 'lucide-react';
import { MemberType } from './TeamMemberCard';

export interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  type: MemberType;
  currentCategory?: string;
  rawData?: any;
}

interface TeamMemberListProps {
  members: Member[];
  onMemberClick?: (member: Member) => void;
  onMemberEdit?: (member: Member) => void;
  onMemberRemove?: (member: Member) => void;
  onMemberEditRole?: (member: Member) => void;
  categories?: Array<{ value: string; label: string }>;
  showActions?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

export function TeamMemberList({
  members,
  onMemberClick,
  onMemberEdit,
  onMemberRemove,
  showActions = true,
  selectable = false,
  selectedIds = new Set(),
  onSelect,
}: TeamMemberListProps) {
  if (members.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getTypeStyles = (type: MemberType) => {
    switch (type) {
      case 'artist':
        return { ring: 'ring-2 ring-primary', icon: <Star className="h-3 w-3 text-primary" /> };
      case 'user':
        return { ring: 'ring-2 ring-green-500', icon: <CheckCircle className="h-3 w-3 text-green-500" /> };
      default:
        return { ring: 'ring-1 ring-border', icon: <User className="h-3 w-3 text-muted-foreground" /> };
    }
  };

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const typeStyles = getTypeStyles(member.type);
        
        return (
          <Card 
            key={member.id} 
            className={`hover:bg-muted/50 transition-colors cursor-pointer ${selectedIds.has(member.id) ? 'ring-2 ring-primary' : ''}`}
            onClick={() => onMemberClick?.(member)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              {selectable && (
                <div
                  className="shrink-0"
                  onClick={(e) => { e.stopPropagation(); onSelect?.(member.id); }}
                >
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                    selectedIds.has(member.id) 
                      ? 'bg-primary border-primary' 
                      : 'border-muted-foreground/40 hover:border-primary/60'
                  }`}>
                    {selectedIds.has(member.id) && (
                      <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              )}
              <div className="relative">
                <Avatar className={`h-10 w-10 ${typeStyles.ring}`}>
                  {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                  <AvatarFallback className="text-sm bg-primary/10 text-primary">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                  {typeStyles.icon}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{member.name}</div>
                {member.role && (
                  <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                )}
                {member.email && (
                  <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                )}
              </div>

              {member.currentCategory && (
                <Badge variant="secondary" className="text-xs hidden sm:flex">
                  {member.currentCategory}
                </Badge>
              )}

              {showActions && member.type === 'profile' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    {onMemberEdit && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onMemberEdit(member);
                      }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {onMemberRemove && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onMemberRemove(member);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar del equipo
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
