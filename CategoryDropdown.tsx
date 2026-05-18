import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

interface Category {
  value: string;
  label: string;
  count: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  allLabel?: string;
  allCount?: number;
  onManageCategories?: () => void;
}

export function CategoryDropdown({
  categories,
  selectedCategory,
  onCategoryChange,
  allLabel = 'Todas las categorías',
  allCount,
  onManageCategories,
}: CategoryDropdownProps) {
  const totalCount = allCount ?? categories.reduce((sum, cat) => sum + cat.count, 0);
  
  // Apply saved order from localStorage (show all categories including empty ones)
  const sortedCategories = useMemo(() => {
    const savedOrder = localStorage.getItem('category_order');
    
    if (savedOrder) {
      try {
        const orderIds: string[] = JSON.parse(savedOrder);
        return [...categories].sort((a, b) => {
          const aIndex = orderIds.indexOf(a.value);
          const bIndex = orderIds.indexOf(b.value);
          // Categories not in saved order go to the end
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      } catch {
        return categories;
      }
    }
    return categories;
  }, [categories]);

  // Obtener el label de la categoría seleccionada
  const getSelectedLabel = () => {
    if (selectedCategory === 'all') {
      return `Todas (${totalCount})`;
    }
    const cat = categories.find(c => c.value === selectedCategory);
    return cat ? `${cat.label} (${cat.count})` : allLabel;
  };

  const handleValueChange = (value: string) => {
    if (value === '__manage__') {
      onManageCategories?.();
    } else {
      onCategoryChange(value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">
        Categoría:
      </Label>
      <Select value={selectedCategory} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[220px] bg-background">
          <SelectValue placeholder={allLabel}>
            {getSelectedLabel()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span>Todas</span>
              <span className="text-muted-foreground">({totalCount})</span>
            </div>
          </SelectItem>
          {sortedCategories.length > 0 && <SelectSeparator />}
          {sortedCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                  <span>{cat.label}</span>
                  <span className="text-muted-foreground">({cat.count})</span>
                </div>
              </SelectItem>
            );
          })}
          
          {/* Manage Categories Option */}
          {onManageCategories && (
            <>
              <SelectSeparator />
              <SelectItem value="__manage__" className="text-primary">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Editar Categorías</span>
                </div>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}