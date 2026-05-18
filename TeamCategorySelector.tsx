import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Check, Plus, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEAM_CATEGORIES, TeamCategoryOption } from '@/lib/teamCategories';

export type { TeamCategoryOption } from '@/lib/teamCategories';

const DEFAULT_CATEGORIES = TEAM_CATEGORIES;
interface TeamCategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  customCategories?: TeamCategoryOption[];
  onAddCustomCategory?: (category: TeamCategoryOption) => void;
  placeholder?: string;
}

export function TeamCategorySelector({
  selectedCategories,
  onCategoriesChange,
  customCategories = [],
  onAddCustomCategory,
  placeholder = "Seleccionar etiquetas...",
}: TeamCategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const toggleCategory = (value: string) => {
    if (selectedCategories.includes(value)) {
      onCategoriesChange(selectedCategories.filter(c => c !== value));
    } else {
      onCategoriesChange([...selectedCategories, value]);
    }
  };

  const removeCategory = (value: string) => {
    onCategoriesChange(selectedCategories.filter(c => c !== value));
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const value = newCategoryName.toLowerCase().replace(/\s+/g, '_');
    const newCategory: TeamCategoryOption = {
      value,
      label: newCategoryName.trim(),
      icon: Tag,
      isCustom: true,
    };

    onAddCustomCategory?.(newCategory);
    onCategoriesChange([...selectedCategories, value]);
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  const getCategoryLabel = (value: string) => {
    return allCategories.find(c => c.value === value)?.label || value;
  };

  const getCategoryIcon = (value: string) => {
    return allCategories.find(c => c.value === value)?.icon || Tag;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-left font-normal h-auto min-h-10 bg-background hover:bg-background/80"
          >
            {selectedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat);
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-background border border-border/50 text-sm font-medium text-foreground shadow-sm transition-all hover:shadow-md"
                    >
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      {getCategoryLabel(cat)}
                      <button
                        type="button"
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCategory(cat);
                        }}
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar etiqueta..." />
            <CommandList>
              <CommandEmpty>No se encontró ninguna etiqueta.</CommandEmpty>
              <CommandGroup heading="Etiquetas">
                {allCategories.map((category) => {
                  const Icon = category.icon || Tag;
                  const isSelected = selectedCategories.includes(category.value);
                  return (
                    <CommandItem
                      key={category.value}
                      value={category.value}
                      onSelect={() => toggleCategory(category.value)}
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{category.label}</span>
                      {category.isCustom && (
                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                          Personalizada
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                {showNewCategory ? (
                  <div className="p-2 space-y-2">
                    <Input
                      placeholder="Nombre de la etiqueta..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCategory();
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleAddNewCategory}
                        disabled={!newCategoryName.trim()}
                      >
                        Crear
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategoryName('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <CommandItem onSelect={() => setShowNewCategory(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear nueva etiqueta...
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DEFAULT_CATEGORIES };
