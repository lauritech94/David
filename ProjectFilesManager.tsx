import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Folder,
  Upload,
  FileText,
  Image,
  Calculator,
  Map,
  MoreHorizontal,
  Trash2,
  Download,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  File,
  FileImage,
  FileVideo,
  FileAudio,
} from 'lucide-react';
import { useProjectFiles, PROJECT_FOLDERS, ProjectFile } from '@/hooks/useProjectFiles';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectFilesManagerProps {
  projectId: string;
  projectName: string;
}

const getFolderIcon = (folderId: string) => {
  switch (folderId) {
    case 'presupuestos':
      return Calculator;
    case 'hojas_de_ruta':
      return Map;
    case 'fotos':
      return Image;
    case 'legal':
      return FileText;
    default:
      return Folder;
  }
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.startsWith('video/')) return FileVideo;
  if (fileType.startsWith('audio/')) return FileAudio;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ProjectFilesManager({ projectId, projectName }: ProjectFilesManagerProps) {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [deleteFile, setDeleteFile] = useState<ProjectFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    files,
    filesByFolder,
    isLoading,
    uploadFile,
    deleteFile: confirmDelete,
    isUploading,
    isDeleting,
  } = useProjectFiles(projectId);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, folderType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      droppedFiles.forEach((file) => {
        uploadFile({ file, folderType, projectId });
      });
    }
  }, [uploadFile, projectId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, folderType: string) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      Array.from(selectedFiles).forEach((file) => {
        uploadFile({ file, folderType, projectId });
      });
    }
    e.target.value = '';
  };

  const handleDeleteConfirm = () => {
    if (deleteFile) {
      confirmDelete(deleteFile);
      setDeleteFile(null);
    }
  };

  // Render folder grid view
  if (!currentFolder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Archivos del Proyecto</h2>
            <p className="text-sm text-muted-foreground">
              Arrastra archivos a las carpetas o haz clic para subir
            </p>
          </div>
          <Badge variant="secondary">
            {files.length} archivo{files.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PROJECT_FOLDERS.map((folder) => {
            const FolderIcon = getFolderIcon(folder.id);
            const folderFiles = filesByFolder[folder.id] || [];

            return (
              <Card
                key={folder.id}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30',
                  isDragging && 'border-dashed border-2 border-primary bg-primary/5'
                )}
                onClick={() => setCurrentFolder(folder.id)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, folder.id)}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <FolderIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-sm">{folder.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {folderFiles.length} archivo{folderFiles.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El archivo "{deleteFile?.file_name}" será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Render folder contents view
  const currentFolderInfo = PROJECT_FOLDERS.find((f) => f.id === currentFolder);
  const currentFolderFiles = filesByFolder[currentFolder] || [];
  const CurrentFolderIcon = getFolderIcon(currentFolder);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentFolder(null)}
          className="p-1 h-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Atrás
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <CurrentFolderIcon className="w-4 h-4 text-primary" />
          <span className="font-medium">{currentFolderInfo?.name}</span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-muted-foreground/20 hover:border-primary/50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, currentFolder)}
      >
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-2">
          Arrastra archivos aquí o{' '}
          <label className="text-primary cursor-pointer hover:underline">
            selecciona archivos
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, currentFolder)}
            />
          </label>
        </p>
        {isUploading && (
          <div className="text-xs text-primary animate-pulse">Subiendo...</div>
        )}
      </div>

      {/* File list */}
      {currentFolderFiles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Esta carpeta está vacía</p>
          <p className="text-sm">Arrastra archivos aquí para comenzar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentFolderFiles.map((file) => {
            const FileIcon = getFileIcon(file.file_type);

            return (
              <Card key={file.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{file.file_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)} • {format(new Date(file.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={file.file_url} download={file.file_name}>
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteFile(file)}
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
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo "{deleteFile?.file_name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
