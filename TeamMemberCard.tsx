import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Star, UserCheck, MoreVertical, Edit2, UserMinus, Pencil, Tags, Check } from 'lucide-react';

export type MemberType = 'artist' | 'user' | 'profile';

interface TeamMemberCardProps {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  type: MemberType;
  onClick?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onEditRole?: () => void;
  onCategoryChange?: (category: string) => void;
  onToggleCategory?: (category: string) => void;
  categories?: Array<{ value: string; label: string }>;
  currentCategory?: string;
  memberCategories?: string[];
  showActions?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const getTypeStyles = (type: MemberType) => {
  switch (type) {
    case 'artist':
      return {
        ring: 'ring-2 ring-primary ring-offset-2',
        bg: 'bg-primary/10',
        text: 'text-primary',
        badge: 'bg-primary/20 text-primary border-primary/30',
        indicator: Star,
      };
    case 'user':
      return {
        ring: 'ring-2 ring-green-500 ring-offset-2',
        bg: 'bg-green-50 dark:bg-green-950/30',
        text: 'text-green-700 dark:text-green-400',
        badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        indicator: UserCheck,
      };
    case 'profile':
    default:
      return {
        ring: '',
        bg: 'bg-secondary',
        text: 'text-muted-foreground',
        badge: 'bg-secondary text-muted-foreground border-border',
        indicator: null,
      };
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TeamMemberCard({
  id,
  name,
  email,
  role,
  avatarUrl,
  type,
  onClick,
  onEdit,
  onRemove,
  onEditRole,
  onCategoryChange,
  onToggleCategory,
  categories = [],
  currentCategory,
  memberCategories = [],
  showActions = true,
  selectable = false,
  selected = false,
  onSelect,
}: TeamMemberCardProps) {
  const styles = getTypeStyles(type);
  const Indicator = styles.indicator;
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  // Determine if we use the new toggle system or the old move system
  const useToggleSystem = !!onToggleCategory;

  return (
    <TooltipProvider>
      <div 
        className="group relative flex flex-col items-center p-3 rounded-xl hover:bg-accent/50 transition-all cursor-pointer"
        onClick={onClick}
      >
        {/* Selection indicator */}
        {selectable && (
          <div 
            className="absolute top-0 left-0 z-10"
            onClick={(e) => { e.stopPropagation(); onSelect?.(id); }}
          >
            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected 
                ? 'bg-primary border-primary' 
                : 'border-muted-foreground/40 bg-background/80 hover:border-primary/60'
            }`}>
              {selected && (
                <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Avatar with type indicator */}
        <div className="relative">
          <Avatar className={`h-14 w-14 ${styles.ring} ${styles.bg} ${selected ? 'ring-primary ring-2 ring-offset-2' : ''}`}>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className={`text-sm font-semibold ${styles.bg} ${styles.text}`}>
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          
          {/* Type indicator badge */}
          {Indicator && (
            <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${type === 'artist' ? 'bg-primary' : 'bg-green-500'}`}>
              <Indicator className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Name */}
        <Tooltip>
          <TooltipTrigger asChild>
            <h4 className="mt-2 text-sm font-medium text-center truncate max-w-[100px]">
              {name}
            </h4>
          </TooltipTrigger>
          <TooltipContent>
            <p>{name}</p>
            {email && <p className="text-xs text-muted-foreground">{email}</p>}
          </TooltipContent>
        </Tooltip>

        {/* Role */}
        {role && (
          <p className="text-xs text-muted-foreground text-center truncate max-w-[100px]">
            {role}
          </p>
        )}

        {/* Actions dropdown - visible on hover */}
        {showActions && (onEdit || onRemove || onEditRole || onToggleCategory || onCategoryChange) && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                {onEditRole && type === 'user' && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditRole(); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar rol
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                
                {/* New toggle category submenu */}
                {useToggleSystem && categories.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                        <Tags className="h-4 w-4 mr-2" />
                        Categorías
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-popover border shadow-md z-50">
                        {categories.map(cat => {
                          const isActive = memberCategories.includes(cat.value);
                          const isOnlyCategory = isActive && memberCategories.length <= 1;
                          return (
                            <DropdownMenuItem
                              key={cat.value}
                              onSelect={(e) => {
                                e.preventDefault();
                                if (isOnlyCategory) return;
                                onToggleCategory(cat.value);
                              }}
                              className={`flex items-center gap-2 ${isActive ? 'bg-primary/10 font-medium' : ''} ${isOnlyCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center border ${isActive ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                                {isActive && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                              </div>
                              {cat.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}

                {/* Legacy move category (fallback) */}
                {!useToggleSystem && onCategoryChange && categories.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {categories.map(cat => (
                      <DropdownMenuItem
                        key={cat.value}
                        onClick={(e) => { e.stopPropagation(); onCategoryChange(cat.value); }}
                        className={currentCategory === cat.value ? 'bg-accent' : ''}
                      >
                        Mover a {cat.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setConfirmRemoveOpen(true); }}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Quitar del equipo
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Confirm remove dialog */}
        <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Quitar del equipo?</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres eliminar a <strong>{name}</strong> del equipo? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.();
                  setConfirmRemoveOpen(false);
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
