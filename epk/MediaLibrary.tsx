import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Search,
  Filter,
  Plus,
  Clock,
  Download,
  Tag,
  X
} from 'lucide-react';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { cn } from '@/lib/utils';

interface MediaLibraryProps {
  onSelect: (item: any) => void;
  selectedType?: 'photo' | 'video' | 'audio' | 'document';
  className?: string;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  onSelect,
  selectedType,
  className
}) => {
  const { items, loading, filters, setFilters } = useMediaLibrary();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get unique tags from all items
  const allTags = Array.from(
    new Set(items.flatMap(item => item.tags || []))
  ).sort();

  const typeIcons = {
    image: ImageIcon,
    video: Video,
    audio: Music,
    document: FileText
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, search: value });
  };

  const handleTypeFilter = (type: string) => {
    setFilters({ ...filters, type: type === 'all' ? undefined : type });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    setFilters({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
  };

  const handleItemSelect = (item: any) => {
    // Convert library item to EPK format
    const epkFormat = {
      id: item.id,
      type: item.file_type === 'image' ? 'photo' : item.file_type,
      titulo: item.title,
      url: item.file_url,
      descargable: true, // default for library items
      orden: 0,
      
      // Video specific
      ...(item.file_type === 'video' && {
        tipo: item.platform || 'archivo',
        video_id: item.video_id,
        privado: false
      }),
      
      // Document specific
      ...(item.file_type === 'document' && {
        tipo: item.subcategory || 'otros',
        file_type: item.mime_type,
        file_size: item.file_size
      })
    };

    onSelect(epkFormat);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1024).toFixed(0)}KB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Cargando librería...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en librería..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filters.type || 'all'} onValueChange={handleTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="image">Imágenes</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documentos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tag className="w-3 h-3" />
              Etiquetas:
            </div>
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Clear filters */}
        {(filters.search || filters.type || selectedTags.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setSelectedTags([]);
              setFilters({});
            }}
            className="h-8 px-2 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Items Grid */}
      <ScrollArea className="h-[400px]">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">No hay archivos en la librería</p>
            <p className="text-xs text-muted-foreground">
              Los archivos que subas se guardarán aquí para reutilizar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => {
              const Icon = typeIcons[item.file_type as keyof typeof typeIcons];
              
              return (
                <Card
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md group",
                    "border-2 border-transparent hover:border-primary/20"
                  )}
                  onClick={() => handleItemSelect(item)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(item));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  <CardContent className="p-3">
                    <div className="space-y-3">
                      {/* Preview */}
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                        {item.file_type === 'image' ? (
                          <img
                            src={item.file_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Usage counter */}
                        {item.usage_count > 0 && (
                          <Badge
                            variant="secondary"
                            className="absolute top-2 right-2 text-xs"
                          >
                            {item.usage_count}x
                          </Badge>
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium truncate" title={item.title}>
                          {item.title}
                        </h4>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDate(item.created_at)}</span>
                          {item.file_size && (
                            <span>{formatFileSize(item.file_size)}</span>
                          )}
                        </div>

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Usage hint */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        💡 <strong>Tip:</strong> Arrastra elementos desde la librería al EPK para reutilizarlos.
        Los archivos duplicados se reutilizan automáticamente.
      </div>
    </div>
  );
};