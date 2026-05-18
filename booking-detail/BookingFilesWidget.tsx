import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Folder, 
  FileText, 
  ExternalLink, 
  FolderOpen,
  File,
  Image,
  Video,
  Music
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface BookingFilesWidgetProps {
  bookingId: string;
  artistId?: string | null;
}

interface LinkedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  subcategory: string | null;
  created_at: string;
}

interface LinkedSubfolder {
  id: string;
  name: string;
  category: string;
  artist_id: string;
}

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function BookingFilesWidget({ bookingId, artistId }: BookingFilesWidgetProps) {
  const navigate = useNavigate();

  // Fetch linked files
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['booking-linked-files', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_files')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LinkedFile[];
    },
    enabled: !!bookingId,
  });

  // Fetch linked subfolder
  const { data: subfolder, isLoading: subfolderLoading } = useQuery({
    queryKey: ['booking-linked-subfolder', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_subfolders')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as LinkedSubfolder | null;
    },
    enabled: !!bookingId,
  });

  const isLoading = filesLoading || subfolderLoading;
  const hasContent = files.length > 0 || subfolder;

  const handleOpenFolder = () => {
    if (subfolder) {
      // Navigate to the folder in Carpetas with artist and category pre-selected
      navigate(`/carpetas?artist=${subfolder.artist_id}&category=${subfolder.category}&subfolder=${subfolder.name}`);
    }
  };

  const handleOpenFile = (file: LinkedFile) => {
    if (file.file_url && file.file_url !== 'placeholder') {
      window.open(file.file_url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            Archivos Vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasContent) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            Archivos Vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No hay archivos vinculados</p>
            <p className="text-xs mt-1 opacity-75">
              Se crean al confirmar el evento
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            Archivos
          </CardTitle>
          {subfolder && (
            <Button variant="outline" size="sm" onClick={handleOpenFolder} className="h-7 text-xs">
              <FolderOpen className="w-3 h-3 mr-1" />
              Abrir
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {subfolder && (
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              <Folder className="w-3 h-3 text-primary" />
              <span className="font-medium">CONCIERTOS</span>
              <span className="text-muted-foreground">/</span>
              <span className="truncate">{subfolder.name}</span>
            </div>
          </div>
        )}

        {files.length > 0 ? (
          <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
            {files.slice(0, 5).map((file) => {
              const FileIcon = getFileIcon(file.file_type);
              const isPlaceholder = file.file_url === 'placeholder';

              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    isPlaceholder 
                      ? 'bg-muted/30 border-dashed' 
                      : 'hover:bg-muted/50 cursor-pointer'
                  }`}
                  onClick={() => !isPlaceholder && handleOpenFile(file)}
                >
                  <div className="w-7 h-7 rounded bg-background flex items-center justify-center flex-shrink-0">
                    <FileIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPlaceholder ? (
                        <span className="text-warning">Pendiente</span>
                      ) : (
                        formatFileSize(file.file_size)
                      )}
                    </p>
                  </div>
                  {!isPlaceholder && (
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
            {files.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                +{files.length - 5} más
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Carpeta vacía
          </p>
        )}
      </CardContent>
    </Card>
  );
}
