import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';

interface MediaSelectorProps {
  onClose: () => void;
  onSelect: (media: any) => void;
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({
  onClose,
  onSelect
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library');
  const [newMediaData, setNewMediaData] = useState({
    type: 'image' as 'image' | 'video' | 'audio' | 'document',
    title: '',
    url: '',
    videoId: '',
    platform: 'youtube' as 'youtube' | 'vimeo',
    downloadable: true,
    private: false
  });

  const { items, loading, filters, setFilters } = useMediaLibrary();
  
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleUploadNew = () => {
    // Create media object based on type
    const mediaItem = {
      id: `temp_${Date.now()}`,
      titulo: newMediaData.title,
      url: newMediaData.url,
      tipo: newMediaData.platform,
      video_id: newMediaData.videoId,
      descargable: newMediaData.downloadable,
      privado: newMediaData.private,
      orden: 0
    };

    onSelect(mediaItem);
    onClose();
  };

  const handleSelectFromLibrary = (item: any) => {
    onSelect(item);
    onClose();
  };

  const filteredItems = items.filter(item => {
    if (filters.type && item.file_type !== filters.type) return false;
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar multimedia</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">Librería de medios</TabsTrigger>
            <TabsTrigger value="upload">Subir nuevo</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            {/* Filter Controls */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Buscar en librería..."
                  value={filters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="w-full"
                />
              </div>
              <Select 
                value={filters.type || 'all'} 
                onValueChange={(value) => updateFilters({ type: value === 'all' ? undefined : value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de archivo" />
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

            {/* Media Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Cargando librería...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <p>No se encontraron elementos</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectFromLibrary(item)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                        {item.file_type === 'image' ? (
                          <img 
                            src={item.file_url} 
                            alt={item.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : item.file_type === 'video' ? (
                          <Video className="w-8 h-8 text-muted-foreground" />
                        ) : item.file_type === 'audio' ? (
                          <Music className="w-8 h-8 text-muted-foreground" />
                        ) : (
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <h4 className="text-sm font-medium truncate mb-1">{item.title}</h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {item.file_type}
                        </Badge>
                        <span>{item.usage_count || 0} usos</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de contenido</Label>
                <Select 
                  value={newMediaData.type} 
                  onValueChange={(value: any) => setNewMediaData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Imagen</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newMediaData.title}
                  onChange={(e) => setNewMediaData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título del elemento"
                />
              </div>

              {newMediaData.type === 'video' && (
                <>
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select 
                      value={newMediaData.platform} 
                      onValueChange={(value: any) => setNewMediaData(prev => ({ ...prev, platform: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="vimeo">Vimeo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoId">ID del video</Label>
                    <Input
                      id="videoId"
                      value={newMediaData.videoId}
                      onChange={(e) => setNewMediaData(prev => ({ ...prev, videoId: e.target.value }))}
                      placeholder={newMediaData.platform === 'youtube' ? 'ID de YouTube' : 'ID de Vimeo'}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="private"
                      checked={newMediaData.private}
                      onCheckedChange={(checked) => setNewMediaData(prev => ({ ...prev, private: checked }))}
                    />
                    <Label htmlFor="private">Video privado</Label>
                  </div>
                </>
              )}

              {newMediaData.type !== 'video' && (
                <div className="space-y-2">
                  <Label htmlFor="url">URL del archivo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      value={newMediaData.url}
                      onChange={(e) => setNewMediaData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="URL directa del archivo"
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {newMediaData.type === 'image' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="downloadable"
                    checked={newMediaData.downloadable}
                    onCheckedChange={(checked) => setNewMediaData(prev => ({ ...prev, downloadable: checked }))}
                  />
                  <Label htmlFor="downloadable">Permitir descarga</Label>
                </div>
              )}

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUploadNew}
                  disabled={!newMediaData.title || (!newMediaData.url && !newMediaData.videoId)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir al EPK
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};