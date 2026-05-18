import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Category {
  value: string;
  label: string;
  count: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface CategoryPillsProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showAll?: boolean;
  allLabel?: string;
  allCount?: number;
}

export function CategoryPills({
  categories,
  selectedCategory,
  onCategoryChange,
  showAll = true,
  allLabel = 'Todos',
  allCount,
}: CategoryPillsProps) {
  const totalCount = allCount ?? categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="flex flex-wrap gap-2">
      {showAll && (
        <Badge
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer transition-all px-3 py-1.5 text-sm font-medium',
            selectedCategory === 'all' 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'hover:bg-accent'
          )}
          onClick={() => onCategoryChange('all')}
        >
          {allLabel}
          <span className="ml-1.5 opacity-70">({totalCount})</span>
        </Badge>
      )}
      
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Badge
            key={category.value}
            variant={selectedCategory === category.value ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-all px-3 py-1.5 text-sm font-medium',
              selectedCategory === category.value 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'hover:bg-accent'
            )}
            onClick={() => onCategoryChange(category.value)}
          >
            {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
            {category.label}
            <span className="ml-1.5 opacity-70">({category.count})</span>
          </Badge>
        );
      })}
    </div>
  );
}
