import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Pencil, Trash2, Tags, Check, X, GripVertical, Tag, Settings
} from 'lucide-react';
import { TeamCategoryOption, TEAM_CATEGORIES } from '@/lib/teamCategories';
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
import { toast } from '@/hooks/use-toast';

interface SortableCategoryCardProps {
  category: TeamCategoryOption;
  count: number;
  isCustom: boolean;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onDelete: () => void;
}

function SortableCategoryCard({
  category,
  count,
  isCustom,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onEditKeyDown,
  onDelete,
}: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.value });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const Icon = category.icon || Tag;

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'shadow-lg' : ''}>
      <CardContent className="p-3 flex items-center justify-between gap-2">
        {/* Handle de drag - SIEMPRE visible */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {isEditing ? (
          <>
            <Input
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onKeyDown={onEditKeyDown}
              className="h-8 flex-1"
              autoFocus
            />
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onSaveEdit}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onCancelEdit}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-1">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{category.label}</span>
            </div>
            
            {/* Badge del sistema - solo para no-custom */}
            {!isCustom && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Sistema
              </Badge>
            )}
            
            {/* Contador */}
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
            
            {/* Botones editar/eliminar - solo para personalizadas */}
            {isCustom && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onStartEdit}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemCategories: TeamCategoryOption[];
  customCategories: TeamCategoryOption[];
  categoryCounts: Map<string, number>;
  onCreateNew: (name: string) => void;
  onRename: (categoryValue: string, newLabel: string) => void;
  onDelete: (categoryValue: string) => void;
  onReorder?: (orderedCategoryValues: string[]) => void;
}

export function CategoryManagerSheet({
  open,
  onOpenChange,
  systemCategories,
  customCategories,
  categoryCounts,
  onCreateNew,
  onRename,
  onDelete,
  onReorder,
}: CategoryManagerSheetProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localCategories, setLocalCategories] = useState<TeamCategoryOption[]>([]);
  const [showCategoryConfig, setShowCategoryConfig] = useState(false);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [editingSystemCategory, setEditingSystemCategory] = useState<string | null>(null);
  const [editSystemValue, setEditSystemValue] = useState('');

  // Load custom category labels from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('category_label_overrides');
    if (stored) {
      try {
        setCategoryLabels(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading category labels:', e);
      }
    }
  }, []);

  // Combine all categories and apply saved order
  useEffect(() => {
    // Apply label overrides to system categories
    const systemWithLabels = systemCategories.map(cat => ({
      ...cat,
      label: categoryLabels[cat.value] || cat.label,
    }));
    
    const allCategories = [...systemWithLabels, ...customCategories];
    const savedOrder = localStorage.getItem('category_order');
    
    if (savedOrder) {
      try {
        const orderIds: string[] = JSON.parse(savedOrder);
        const ordered = orderIds
          .map(id => allCategories.find(c => c.value === id))
          .filter(Boolean) as TeamCategoryOption[];
        // Add any new categories not in saved order
        const newCats = allCategories.filter(c => !orderIds.includes(c.value));
        setLocalCategories([...ordered, ...newCats]);
      } catch {
        setLocalCategories(allCategories);
      }
    } else {
      setLocalCategories(allCategories);
    }
  }, [systemCategories, customCategories, categoryLabels]);

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

  const handleCreate = () => {
    if (newCategoryName.trim()) {
      onCreateNew(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const handleStartEdit = (category: TeamCategoryOption) => {
    setEditingCategory(category.value);
    setEditValue(category.label);
  };

  const handleSaveEdit = () => {
    if (editingCategory && editValue.trim()) {
      onRename(editingCategory, editValue.trim());
      setEditingCategory(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = localCategories.findIndex(c => c.value === active.id);
      const newIndex = localCategories.findIndex(c => c.value === over.id);
      
      const reordered = arrayMove(localCategories, oldIndex, newIndex);
      setLocalCategories(reordered);
      onReorder?.(reordered.map(c => c.value));
    }
  };

  // System category renaming
  const handleStartSystemEdit = (category: TeamCategoryOption) => {
    setEditingSystemCategory(category.value);
    setEditSystemValue(categoryLabels[category.value] || category.label);
  };

  const handleSaveSystemEdit = () => {
    if (editingSystemCategory && editSystemValue.trim()) {
      const newLabels = { ...categoryLabels, [editingSystemCategory]: editSystemValue.trim() };
      setCategoryLabels(newLabels);
      localStorage.setItem('category_label_overrides', JSON.stringify(newLabels));
      toast({ title: 'Nombre de categoría actualizado' });
      setEditingSystemCategory(null);
      setEditSystemValue('');
    }
  };

  const handleResetSystemCategory = (value: string) => {
    const { [value]: removed, ...rest } = categoryLabels;
    setCategoryLabels(rest);
    localStorage.setItem('category_label_overrides', JSON.stringify(rest));
    toast({ title: 'Nombre restaurado al original' });
  };

  const handleCancelSystemEdit = () => {
    setEditingSystemCategory(null);
    setEditSystemValue('');
  };

  const handleSystemEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveSystemEdit();
    } else if (e.key === 'Escape') {
      handleCancelSystemEdit();
    }
  };

  // If showing config view
  if (showCategoryConfig) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de Categorías
            </SheetTitle>
            <SheetDescription>
              Personaliza los nombres de las categorías del sistema
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCategoryConfig(false)}
              className="mb-2"
            >
              ← Volver al gestor
            </Button>

            <div className="space-y-2">
              {TEAM_CATEGORIES.map((cat) => {
                const isEditing = editingSystemCategory === cat.value;
                const customLabel = categoryLabels[cat.value];
                const Icon = cat.icon || Tag;

                return (
                  <Card key={cat.value}>
                    <CardContent className="p-3 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      
                      {isEditing ? (
                        <>
                          <Input
                            value={editSystemValue}
                            onChange={(e) => setEditSystemValue(e.target.value)}
                            onKeyDown={handleSystemEditKeyDown}
                            className="h-8 flex-1"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={handleSaveSystemEdit}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={handleCancelSystemEdit}
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {customLabel || cat.label}
                            </div>
                            {customLabel && (
                              <div className="text-xs text-muted-foreground">
                                Original: {cat.label}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleStartSystemEdit(cat)}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            {customLabel && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleResetSystemCategory(cat.value)}
                                title="Restaurar nombre original"
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Gestor de Categorías
          </SheetTitle>
          <SheetDescription>
            Arrastra para cambiar el orden. Las personalizadas se pueden editar.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Create new category */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nueva categoría..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={!newCategoryName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Unified Categories List with Drag & Drop */}
          {localCategories.length > 0 ? (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={localCategories.map(c => c.value)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localCategories.map((cat) => {
                    const count = categoryCounts.get(cat.value) || 0;
                    const isEditing = editingCategory === cat.value;
                    const isCustom = cat.isCustom === true;

                    return (
                      <SortableCategoryCard
                        key={cat.value}
                        category={cat}
                        count={count}
                        isCustom={isCustom}
                        isEditing={isEditing}
                        editValue={editValue}
                        onStartEdit={() => handleStartEdit(cat)}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        onEditValueChange={setEditValue}
                        onEditKeyDown={handleEditKeyDown}
                        onDelete={() => onDelete(cat.value)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay categorías</p>
              <p className="text-xs mt-1">Crea una nueva categoría arriba</p>
            </div>
          )}

          {/* Configuration button */}
          <Separator />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCategoryConfig(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuración de categorías
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
