import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit2, Trash2, Copy, Users, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TeamCardProps {
  id: string;
  name: string;
  stageName?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  memberCount: number;
  isManagement?: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isSelected?: boolean;
}

export function TeamCard({
  id,
  name,
  stageName,
  description,
  avatarUrl,
  memberCount,
  isManagement = false,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  isSelected = false,
}: TeamCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const displayName = stageName || name;
  const initials = displayName.substring(0, 2).toUpperCase();

  const handleDelete = () => {
    onDelete(id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      {/* Horizontal chip-style card */}
      <div
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2 rounded-full border cursor-pointer transition-all',
          'hover:shadow-md hover:border-primary/50',
          isSelected 
            ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
            : 'bg-card border-border hover:bg-accent/30'
        )}
        onClick={() => onSelect(id)}
      >
        {/* Avatar */}
        <Avatar className={cn(
          'h-9 w-9 shrink-0',
          isManagement ? 'bg-secondary' : ''
        )}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className={cn(
            'text-xs font-semibold',
            isManagement 
              ? 'bg-secondary text-muted-foreground' 
              : 'bg-primary/10 text-primary'
          )}>
            {isManagement ? <Building className="h-4 w-4" /> : initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Name and count */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            'font-medium truncate max-w-[120px]',
            isSelected ? 'text-primary' : ''
          )}>
            {displayName}
          </span>
          <Badge 
            variant="secondary" 
            className={cn(
              'shrink-0 text-xs px-2 py-0',
              isSelected ? 'bg-primary/20 text-primary' : ''
            )}
          >
            <Users className="h-3 w-3 mr-1" />
            {memberCount}
          </Badge>
        </div>

        {/* Actions - visible on hover for non-management */}
        {!isManagement && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(id); }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(id); }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar equipo "{displayName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Los miembros del equipo no serán eliminados, solo serán desvinculados de este equipo.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
