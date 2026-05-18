import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, MoreVertical, Pencil, Copy, Trash2, Users, Music, GripVertical 
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Team {
  id: string;
  name: string;
  stageName?: string | null;
  avatarUrl?: string | null;
  memberCount: number;
  description?: string | null;
}

interface SortableTeamCardProps {
  team: Team;
  onEdit: (teamId: string) => void;
  onDuplicate: (teamId: string) => void;
  onDelete: (teamId: string) => void;
}

function SortableTeamCard({ team, onEdit, onDuplicate, onDelete }: SortableTeamCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'shadow-lg' : ''}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Avatar>
            {team.avatarUrl && (
              <AvatarImage src={team.avatarUrl} alt={team.name} />
            )}
            <AvatarFallback className="bg-secondary">
              {(team.stageName || team.name).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {team.stageName || team.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {team.memberCount} {team.memberCount === 1 ? 'miembro' : 'miembros'}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => onEdit(team.id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(team.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(team.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

interface TeamManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  onCreateNew: () => void;
  onEdit: (teamId: string) => void;
  onDuplicate: (teamId: string) => void;
  onDelete: (teamId: string) => void;
  onReorder?: (orderedTeamIds: string[]) => void;
}

export function TeamManagerSheet({
  open,
  onOpenChange,
  teams,
  onCreateNew,
  onEdit,
  onDuplicate,
  onDelete,
  onReorder,
}: TeamManagerSheetProps) {
  const [localTeams, setLocalTeams] = useState<Team[]>(teams);

  useEffect(() => {
    setLocalTeams(teams);
  }, [teams]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = localTeams.findIndex(t => t.id === active.id);
      const newIndex = localTeams.findIndex(t => t.id === over.id);
      
      const reordered = arrayMove(localTeams, oldIndex, newIndex);
      setLocalTeams(reordered);
      onReorder?.(reordered.map(t => t.id));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestor de Equipos
          </SheetTitle>
          <SheetDescription>
            Administra, edita o elimina equipos. Arrastra para reordenar.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Button onClick={onCreateNew} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Equipo
          </Button>

          <div className="space-y-3">
            {localTeams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay equipos creados</p>
              </div>
            ) : (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={localTeams.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localTeams.map((team) => (
                    <SortableTeamCard
                      key={team.id}
                      team={team}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
