import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Intelligent category detection ────────────────────────────────────────
function detectCategory(file: File): {
  category: string | null;
  reason: string;
  confidence: 'alta' | 'media' | 'baja';
} {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  // 1. MIME / extension — máxima fiabilidad
  if (mime.startsWith('audio/') || /\.(wav|aif|aiff|flac|stem|stems|mp3|ogg|aac)$/.test(name)) {
    if (/stem|master|mix|vocal|instrumental|session/.test(name))
      return { category: 'musica', reason: 'El nombre sugiere archivo de producción o audio profesional', confidence: 'alta' };
    return { category: 'musica', reason: 'Es un archivo de audio', confidence: 'alta' };
  }
  if (mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(name)) {
    return { category: 'audiovisuales', reason: 'Es un archivo de vídeo', confidence: 'alta' };
  }
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/.test(name)) {
    if (/logo|arte|flyer|cartel|banner|poster|artwork/.test(name))
      return { category: 'diseno', reason: 'El nombre sugiere material de diseño gráfico', confidence: 'alta' };
    if (/foto|photo|promo|portrait|press|prensa|epk/.test(name))
      return { category: 'imagenes', reason: 'El nombre sugiere fotografía de prensa o EPK', confidence: 'alta' };
    return { category: 'imagenes', reason: 'Es una imagen', confidence: 'media' };
  }
  if (/\.(ai|psd|svg|eps|indd)$/.test(name))
    return { category: 'diseno', reason: 'Es un archivo de diseño gráfico', confidence: 'alta' };

  // 2. Palabras clave en el nombre del archivo
  if (/contrato|contract|acuerdo|agreement|nda|legal/.test(name))
    return { category: 'contratos', reason: 'El nombre incluye términos legales o contractuales', confidence: 'alta' };
  if (/rider|hospitality|hoja.de.ruta|roadmap|backline/.test(name))
    return { category: 'conciertos', reason: 'El nombre sugiere documentos de concierto o rider técnico', confidence: 'alta' };
  if (/factura|invoice|presupuesto|budget|liquidaci/.test(name))
    return { category: 'economia', reason: 'El nombre sugiere un documento financiero', confidence: 'alta' };
  if (/prensa|dossier|nota.de.prensa|press.release/.test(name))
    return { category: 'prensa', reason: 'El nombre sugiere material de prensa', confidence: 'alta' };
  if (/marketing|rrss|social|campa|contenido/.test(name))
    return { category: 'marketing', reason: 'El nombre sugiere material de marketing', confidence: 'alta' };
  if (/merch|merchandise|tienda|shop/.test(name))
    return { category: 'merch', reason: 'El nombre sugiere material de merchandising', confidence: 'alta' };
  if (/distribuci|upc|isrc|pitch|spotify|apple.music/.test(name))
    return { category: 'distribucion', reason: 'El nombre sugiere documentos de distribución digital', confidence: 'alta' };
  if (/stem|master|mix|vocal|instrumental|session/.test(name))
    return { category: 'musica', reason: 'El nombre sugiere archivo de audio o producción', confidence: 'alta' };
  if (/nif|pasaporte|passport|dni|documento/.test(name))
    return { category: 'personal', reason: 'El nombre sugiere documento personal del artista', confidence: 'alta' };
  if (/clip|videoclip|making|teaser|trailer/.test(name))
    return { category: 'audiovisuales', reason: 'El nombre sugiere contenido audiovisual', confidence: 'alta' };

  // 3. Tipo de archivo genérico
  if (mime.includes('spreadsheet') || /\.(xlsx|xls|csv|ods)$/.test(name))
    return { category: 'economia', reason: 'Es una hoja de cálculo, probablemente financiera', confidence: 'media' };
  if (mime.includes('pdf') || name.endsWith('.pdf'))
    return { category: 'contratos', reason: 'Es un PDF sin palabras clave claras en el nombre', confidence: 'baja' };

  return { category: null, reason: 'No se pudo detectar la categoría automáticamente', confidence: 'baja' };
}
// ───────────────────────────────────────────────────────────────────────────
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArtistFiles, ARTIST_FOLDER_CATEGORIES, ArtistFile } from '@/hooks/useArtistFiles';
import { useArtistSubfolders, DEFAULT_SUBFOLDERS } from '@/hooks/useArtistSubfolders';
import { FileExplorer } from '@/components/drive/FileExplorer';
import { ConciertosView } from '@/components/drive/ConciertosView';
import { usePublicFileSharing } from '@/hooks/usePublicFileSharing';
import { DriveBudgetsSection } from '@/components/drive/DriveBudgetsSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  ArrowLeft,
  Upload,
  MoreVertical,
  Folder,
  FileText,
  Image,
  Video,
  Music,
  File,
  Download,
  Trash2,
  ExternalLink,
  Search,
  Grid3X3,
  List,
  User,
  Palette,
  Share2,
  Calculator,
  Megaphone,
  ShoppingBag,
  Disc,
  Newspaper,
  Plus,
  FolderPlus,
  Link as LinkIcon,
  Pencil,
  FolderInput,
  Clock,
  Upload as UploadIcon,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Icon mapping for categories
const getCategoryIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    Video: Video,
    Music: Music,
    FileText: FileText,
    Palette: Palette,
    Share2: Share2,
    Calculator: Calculator,
    Image: Image,
    Megaphone: Megaphone,
    ShoppingBag: ShoppingBag,
    Disc: Disc,
    User: User,
    Newspaper: Newspaper,
  };
  return icons[iconName] || Folder;
};

// Get file icon based on type
const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

// Format file size
const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  workspace_id: string;
  artist_type?: string | null;
}

// All categories support infinite nested folders now
const CATEGORIES_WITH_FOLDERS = ARTIST_FOLDER_CATEGORIES.map(c => c.id);

export default function Carpetas() {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Now we track folder by ID for proper nesting
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  // Track if we're viewing a storage_nodes folder directly (e.g., booking folders)
  const [storageNodeFolderId, setStorageNodeFolderId] = useState<string | null>(null);
  const [storageNodeArtistId, setStorageNodeArtistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [artistViewMode, setArtistViewMode] = useState<'grid' | 'list'>('grid');
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ArtistFile | null>(null);
  const [fileToRename, setFileToRename] = useState<ArtistFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fabFileRef = useRef<HTMLInputElement>(null);

  // FAB state
  const [showFABDialog, setShowFABDialog] = useState(false);
  const [fabCategory, setFabCategory] = useState<string>('');
  const [fabFile, setFabFile] = useState<File | null>(null);
  const [fabSuggestion, setFabSuggestion] = useState<{
    category: string | null;
    reason: string;
    confidence: 'alta' | 'media' | 'baja';
  } | null>(null);
  const [fabDragOver, setFabDragOver] = useState(false);

  const isManagement = profile?.active_role === 'management';

  // Fetch artists
  const { data: artists = [], isLoading: artistsLoading } = useQuery({
    queryKey: ['artists-for-folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name, workspace_id, artist_type')
        .order('name');

      if (error) throw error;
      return data as Artist[];
    },
  });

  // Fetch recent files for selected artist
  const { data: recentFiles = [] } = useQuery({
    queryKey: ['artist-recent-files', selectedArtist?.id],
    queryFn: async () => {
      if (!selectedArtist?.id) return [];
      const { data, error } = await supabase
        .from('artist_files')
        .select('*')
        .eq('artist_id', selectedArtist.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as ArtistFile[];
    },
    enabled: !!selectedArtist?.id,
  });


  useEffect(() => {
    const artistId = searchParams.get('artist');
    const category = searchParams.get('category');
    const folderId = searchParams.get('folder');

    // If we have a folder ID but no artist/category, it's a direct storage_node link
    if (folderId && !artistId && !category) {
      // Look up the storage_node to get the artist_id
      supabase
        .from('storage_nodes')
        .select('id, artist_id')
        .eq('id', folderId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setStorageNodeFolderId(data.id);
            setStorageNodeArtistId(data.artist_id);
          }
        });
      return;
    }

    // Reset storage node view if we have explicit artist/category
    setStorageNodeFolderId(null);
    setStorageNodeArtistId(null);

    if (artistId && artists.length > 0) {
      const artist = artists.find(a => a.id === artistId);
      if (artist) {
        setSelectedArtist(artist);
        if (category) {
          setSelectedCategory(category);
          if (folderId) {
            setCurrentFolderId(folderId);
          }
        }
      }
    }
  }, [searchParams, artists]);

  // Get files for selected artist and category
  const {
    files,
    fileCounts,
    isLoading: filesLoading,
    uploadFiles,
    deleteFile,
    renameFile,
    moveFile,
    isUploading,
    isDeleting,
  } = useArtistFiles(selectedArtist?.id || null, selectedCategory || undefined);

  // Get subfolders for current category
  const {
    subfolders,
    isLoading: subfoldersLoading,
    getSubfoldersForParent,
    getFolderById,
    getBreadcrumbPath,
    ensureDefaultSubfolders,
    createSubfolder,
    deleteSubfolder,
    isCreating: isCreatingFolder,
  } = useArtistSubfolders(selectedArtist?.id || null, selectedCategory || undefined);

  // Public sharing hook
  const { generateShareLink, isGenerating } = usePublicFileSharing();

  // Get current folder info and child folders
  const currentFolder = currentFolderId ? getFolderById(currentFolderId) : null;
  const childFolders = getSubfoldersForParent(currentFolderId);
  const breadcrumbPath = getBreadcrumbPath(currentFolderId);

  // Ensure default subfolders exist when entering a category
  useEffect(() => {
    if (selectedArtist && selectedCategory) {
      ensureDefaultSubfolders({ artistId: selectedArtist.id, category: selectedCategory });
    }
  }, [selectedArtist, selectedCategory, ensureDefaultSubfolders]);

  // Filter files by search and current folder
  // We use the folder ID path to match files (stored as subcategory with folder names)
  const currentFolderPath = currentFolder 
    ? breadcrumbPath.map(f => f.name).join('/') + (breadcrumbPath.length > 0 ? '' : currentFolder.name)
    : null;
  
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    // Match files in current folder (subcategory stores the folder path or folder ID)
    const matchesFolder = currentFolderId 
      ? file.subcategory === currentFolderId || file.subcategory === currentFolderPath
      : !file.subcategory; // Show root files when no folder selected
    return matchesSearch && matchesFolder;
  });

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!selectedArtist || !selectedCategory) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await uploadFiles(droppedFiles, selectedArtist.id, selectedCategory, currentFolderId || undefined);
    }
  }, [selectedArtist, selectedCategory, currentFolderId, uploadFiles]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedArtist || !selectedCategory || !e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      await uploadFiles(selectedFiles, selectedArtist.id, selectedCategory, currentFolderId || undefined);
    }
    e.target.value = '';
  };

  const handleDownload = (file: ArtistFile) => {
    window.open(file.file_url, '_blank');
  };

  const handleDeleteConfirm = () => {
    if (fileToDelete) {
      deleteFile(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  const handleCreateFolder = () => {
    if (!selectedArtist || !selectedCategory || !newFolderName.trim()) return;

    createSubfolder({
      artistId: selectedArtist.id,
      category: selectedCategory,
      name: newFolderName.trim(),
      parentId: currentFolderId,
    });

    setNewFolderName('');
    setShowCreateFolderDialog(false);
  };

  const handleShareFile = (file: ArtistFile) => {
    generateShareLink({ fileId: file.id, expiresInDays: 30 });
  };

  // Render Level 1: Artist Selection
  const renderArtistSelection = () => {
    const rosterArtists = artists.filter(a => !a.artist_type || a.artist_type === 'roster');
    const collaboratorArtists = artists.filter(a => a.artist_type === 'collaborator');

    const renderArtistCard = (artist: Artist) => (
      <Card
        key={artist.id}
        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
        onClick={() => setSelectedArtist(artist)}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold truncate w-full">
            {artist.stage_name || artist.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {artist.stage_name ? artist.name : ''}
          </p>
        </CardContent>
      </Card>
    );

    const renderArtistRow = (artist: Artist) => (
      <Card
        key={artist.id}
        className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
        onClick={() => setSelectedArtist(artist)}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
            <h3 className="font-semibold truncate">{artist.stage_name || artist.name}</h3>
            {artist.stage_name && (
              <p className="text-xs text-muted-foreground truncate">{artist.name}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );

    const renderSection = (title: string, list: Artist[], emptyMsg?: string) => (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {list.length === 0 ? (
          emptyMsg ? <p className="text-sm text-muted-foreground">{emptyMsg}</p> : null
        ) : artistViewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {list.map(renderArtistCard)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map(renderArtistRow)}
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Carpetas</h1>
            <p className="text-muted-foreground">Biblioteca Maestra de Archivos por Artista</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const pending = artists.filter((a: any) => !a.drive_folder_id);
                if (pending.length === 0) {
                  toast.success('Todos los artistas ya tienen carpeta en Drive');
                  return;
                }
                toast.info(`Sincronizando ${pending.length} carpeta(s) en Drive…`);
                let ok = 0, fail = 0;
                for (const a of pending) {
                  const { error } = await supabase.functions.invoke('create-artist-drive-folder', { body: { artist_id: a.id } });
                  if (error) fail++; else ok++;
                }
                toast.success(`Drive: ${ok} creadas${fail ? `, ${fail} con error` : ''}`);
                queryClient.invalidateQueries({ queryKey: ['artists-for-folders'] });
              }}
            >
              Sincronizar Drive
            </Button>
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={artistViewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setArtistViewMode('grid')}
                aria-label="Vista cuadrícula"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={artistViewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setArtistViewMode('list')}
                aria-label="Vista lista"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {artistsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : artists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No hay artistas</h3>
              <p className="text-sm text-muted-foreground">
                Crea un artista para comenzar a organizar tus archivos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {renderSection('Artistas del roster', rosterArtists, 'No hay artistas en el roster.')}
            {collaboratorArtists.length > 0 && renderSection('Artistas colaboradores', collaboratorArtists)}
          </div>
        )}
      </div>
    );
  };

  // FAB — reset helper
  const resetFAB = () => {
    setFabFile(null);
    setFabSuggestion(null);
    setFabCategory('');
  };

  // FAB — file selected via input or drop
  const processFABFile = (file: File) => {
    const suggestion = detectCategory(file);
    setFabFile(file);
    setFabSuggestion(suggestion);
    setFabCategory(suggestion.category || '');
  };

  const handleFABFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFABFile(file);
    e.target.value = '';
  };

  const handleFABDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFabDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFABFile(file);
  };

  const handleFABConfirmUpload = async () => {
    if (!selectedArtist || !fabCategory || !fabFile) return;
    await uploadFiles([fabFile], selectedArtist.id, fabCategory);
    setShowFABDialog(false);
    resetFAB();
  };

  // Category label lookup for recent files section
  const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    ARTIST_FOLDER_CATEGORIES.map(c => [c.id, c.name])
  );

  // Render Level 2: Category Folders
  const renderCategoryFolders = () => {
    // Sort: categories with files first, empty ones last
    const sortedCategories = [...ARTIST_FOLDER_CATEGORIES].sort((a, b) => {
      const countA = fileCounts[a.id] || 0;
      const countB = fileCounts[b.id] || 0;
      return countB - countA;
    });

    return (
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedArtist(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {selectedArtist?.stage_name || selectedArtist?.name}
              </h1>
              <p className="text-muted-foreground">Categorías de Archivos</p>
            </div>
          </div>
        </div>

        {/* Recent Files Section — only when there are files */}
        {recentFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Archivos Recientes
              </h3>
            </div>
            <Card>
              <CardContent className="p-0 divide-y">
                {recentFiles.map((file) => {
                  const FileIconComp = getFileIcon(file.file_type);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileIconComp className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[file.category] || file.category}
                          {' · '}
                          {format(new Date(file.created_at), 'd MMM', { locale: es })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(file.file_url, '_blank')}
                      >
                        Abrir
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {sortedCategories.map((category) => {
            const IconComponent = getCategoryIcon(category.icon);
            const count = fileCounts[category.id] || 0;
            const isEmpty = count === 0;

            return (
              <Card
                key={category.id}
                className={`cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group ${
                  isEmpty ? 'opacity-60 border-dashed' : ''
                }`}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setCurrentFolderId(null);
                }}
              >
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-xs leading-tight mb-1 w-full text-center line-clamp-2">
                    {category.name}
                  </h3>
                  <p className="text-xs text-muted-foreground/70 mb-1 line-clamp-1 w-full text-center">
                    {(category as any).description}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mt-auto">
                    {count} {count === 1 ? 'archivo' : 'archivos'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAB */}
        <div className="fixed bottom-8 right-8 z-50">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => { resetFAB(); setShowFABDialog(true); }}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        {/* FAB Dialog — Intelligent upload */}
        <Dialog
          open={showFABDialog}
          onOpenChange={(open) => {
            if (!open) resetFAB();
            setShowFABDialog(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {fabFile ? 'Confirmar subida' : 'Subir archivo inteligente'}
              </DialogTitle>
            </DialogHeader>

            {/* STATE 1: Drop zone */}
            {!fabFile && (
              <div className="py-2 space-y-4">
                <div
                  className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
                    fabDragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setFabDragOver(true); }}
                  onDragLeave={() => setFabDragOver(false)}
                  onDrop={handleFABDrop}
                  onClick={() => fabFileRef.current?.click()}
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <UploadIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      o haz clic para seleccionarlo desde disco
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground/60">
                    PDF, Word, Excel, imágenes, audio, vídeo…
                  </p>
                </div>
              </div>
            )}

            {/* STATE 2: File detected */}
            {fabFile && fabSuggestion && (
              <div className="py-2 space-y-4">
                {/* File info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const Icon = getFileIcon(fabFile.type);
                      return <Icon className="w-5 h-5 text-muted-foreground" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fabFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(fabFile.size)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground shrink-0"
                    onClick={() => { resetFAB(); }}
                  >
                    Cambiar
                  </Button>
                </div>

                {/* Detection result */}
                {fabSuggestion.category && fabSuggestion.confidence !== 'baja' ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold flex-1">
                        {CATEGORY_LABELS[fabSuggestion.category]}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        fabSuggestion.confidence === 'alta'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        Confianza {fabSuggestion.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-7">{fabSuggestion.reason}</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <p className="text-sm font-medium text-yellow-800">
                        No pudimos detectar la categoría automáticamente
                      </p>
                    </div>
                    <p className="text-xs text-yellow-700 pl-7">Por favor, selecciona dónde quieres guardar este archivo.</p>
                  </div>
                )}

                {/* Category override */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">
                    {fabSuggestion.category && fabSuggestion.confidence !== 'baja'
                      ? '¿No es correcta? Cambiar categoría:'
                      : 'Selecciona la categoría:'}
                  </p>
                  <Select value={fabCategory} onValueChange={setFabCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ARTIST_FOLDER_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowFABDialog(false); resetFAB(); }}
              >
                Cancelar
              </Button>
              {fabFile && (
                <Button
                  onClick={handleFABConfirmUpload}
                  disabled={!fabCategory || isUploading}
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  {isUploading
                    ? 'Subiendo…'
                    : `Subir a ${CATEGORY_LABELS[fabCategory] || 'categoría seleccionada'}`}
                </Button>
              )}
            </DialogFooter>

            {/* Hidden input — triggered from drop zone click and Cambiar button */}
            <input
              type="file"
              hidden
              ref={fabFileRef}
              onChange={handleFABFileInputChange}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  const renderFilesView = () => {
    const currentCategoryObj = ARTIST_FOLDER_CATEGORIES.find(c => c.id === selectedCategory);

    // For "conciertos" category, use ConciertosView with custom HISTORIAL logic
    if (selectedCategory === 'conciertos' && selectedArtist) {
      return (
        <ConciertosView
          artistId={selectedArtist.id}
          artistName={selectedArtist.stage_name || selectedArtist.name}
          onBack={() => setSelectedCategory(null)}
        />
      );
    }

    // Build breadcrumb text
    const breadcrumbText = breadcrumbPath.length > 0 
      ? `${currentCategoryObj?.name} / ${breadcrumbPath.map(f => f.name).join(' / ')}`
      : currentCategoryObj?.name;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (currentFolderId) {
                  // Go up one level
                  const parentId = currentFolder?.parent_id || null;
                  setCurrentFolderId(parentId);
                } else {
                  setSelectedCategory(null);
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {currentFolder?.name || currentCategoryObj?.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {selectedArtist?.stage_name || selectedArtist?.name}
                {currentFolderId && ` / ${breadcrumbText}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="outline" onClick={() => setShowCreateFolderDialog(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Nueva Carpeta
            </Button>

            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Subiendo...' : 'Subir'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Folders */}
        {childFolders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Carpetas</h3>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {childFolders.map((folder) => (
                  <Card
                    key={folder.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Folder className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{folder.name}</p>
                        {folder.is_default && (
                          <p className="text-xs text-muted-foreground">Por defecto</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {childFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Folder className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {folder.is_default ? 'Carpeta por defecto' : 'Carpeta'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Budgets section for economia category */}
        {selectedCategory === 'economia' && selectedArtist && !currentFolderId && (
          <DriveBudgetsSection artistId={selectedArtist.id} viewMode={viewMode} />
        )}

        {/* Files */}
        {filesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Carpeta vacía</h3>
              <p className="text-sm text-muted-foreground">
                Sube archivos para comenzar a organizar esta categoría.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.file_type);
              const isImage = file.file_type?.startsWith('image/');
              const canShare = selectedCategory === 'audiovisuales';

              return (
                <Card key={file.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="relative aspect-square rounded-lg bg-muted mb-2 flex items-center justify-center overflow-hidden">
                      {isImage && file.file_url !== 'placeholder' ? (
                        <img
                          src={file.file_url}
                          alt={file.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileIcon className="w-12 h-12 text-muted-foreground" />
                      )}

                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.file_url !== 'placeholder' && (
                              <>
                                <DropdownMenuItem onClick={() => handleDownload(file)}>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Abrir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(file)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Descargar
                                </DropdownMenuItem>
                              </>
                            )}
                            {canShare && file.file_url !== 'placeholder' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleShareFile(file)}>
                                  <LinkIcon className="w-4 h-4 mr-2" />
                                  Compartir Enlace
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setFileToRename(file);
                                setNewFileName(file.file_name);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Renombrar
                            </DropdownMenuItem>
                            {subfolders.length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FolderInput className="w-4 h-4 mr-2" />
                                  Mover a...
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {!currentFolderId && (
                                    <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                      Raíz (actual)
                                    </DropdownMenuItem>
                                  )}
                                  {currentFolderId && (
                                    <DropdownMenuItem
                                      onClick={() => moveFile({ fileId: file.id, subcategory: null })}
                                    >
                                      <Folder className="w-4 h-4 mr-2" />
                                      Raíz
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  {subfolders.map((sf) => (
                                    <DropdownMenuItem
                                      key={sf.id}
                                      disabled={sf.id === currentFolderId}
                                      onClick={() => moveFile({ fileId: file.id, subcategory: sf.id })}
                                    >
                                      <Folder className="w-4 h-4 mr-2" />
                                      {sf.name}
                                      {sf.id === currentFolderId && ' (actual)'}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setFileToDelete(file)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <p className="text-xs font-medium truncate" title={file.file_name}>
                      {file.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file.file_url === 'placeholder' ? (
                        <span className="text-warning">Pendiente</span>
                      ) : (
                        formatFileSize(file.file_size)
                      )}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.file_type);
                  const canShare = selectedCategory === 'audiovisuales';

                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.file_url === 'placeholder' ? (
                            <span className="text-warning">Pendiente de subir</span>
                          ) : (
                            <>
                              {formatFileSize(file.file_size)} •{' '}
                              {format(new Date(file.created_at), 'dd MMM yyyy', { locale: es })}
                            </>
                          )}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.file_url !== 'placeholder' && (
                            <>
                              <DropdownMenuItem onClick={() => handleDownload(file)}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Abrir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(file)}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                            </>
                          )}
                          {canShare && file.file_url !== 'placeholder' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleShareFile(file)}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Compartir Enlace
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setFileToRename(file);
                              setNewFileName(file.file_name);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Renombrar
                          </DropdownMenuItem>
                          {subfolders.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <FolderInput className="w-4 h-4 mr-2" />
                                Mover a...
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {!currentFolderId && (
                                  <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                    Raíz (actual)
                                  </DropdownMenuItem>
                                )}
                                {currentFolderId && (
                                  <DropdownMenuItem
                                    onClick={() => moveFile({ fileId: file.id, subcategory: null })}
                                  >
                                    <Folder className="w-4 h-4 mr-2" />
                                    Raíz
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {subfolders.map((sf) => (
                                  <DropdownMenuItem
                                    key={sf.id}
                                    disabled={sf.id === currentFolderId}
                                    onClick={() => moveFile({ fileId: file.id, subcategory: sf.id })}
                                  >
                                    <Folder className="w-4 h-4 mr-2" />
                                    {sf.name}
                                    {sf.id === currentFolderId && ' (actual)'}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setFileToDelete(file)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Main content based on navigation level
  const renderContent = () => {
    // If viewing a storage_node folder directly (e.g., from booking)
    if (storageNodeFolderId && storageNodeArtistId) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setStorageNodeFolderId(null);
                setStorageNodeArtistId(null);
                // Navigate back to base carpetas
                window.history.pushState({}, '', '/carpetas');
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Archivos del Evento</h1>
              <p className="text-muted-foreground">Navega por los archivos vinculados</p>
            </div>
          </div>
          <FileExplorer
            artistId={storageNodeArtistId}
            initialFolderId={storageNodeFolderId}
            showBreadcrumbs={true}
          />
        </div>
      );
    }

    if (!selectedArtist) {
      return renderArtistSelection();
    }
    if (!selectedCategory) {
      return renderCategoryFolders();
    }
    return renderFilesView();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {renderContent()}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo "{fileToDelete?.file_name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Carpeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Introduce un nombre para la carpeta
                {currentFolder && ` dentro de "${currentFolder.name}"`}
              </p>
              <Input
                placeholder="Nombre de la carpeta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              {isCreatingFolder ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={!!fileToRename} onOpenChange={(open) => !open && setFileToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar archivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">Nombre del archivo</Label>
              <Input
                id="file-name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFileName.trim() && fileToRename) {
                    renameFile({ fileId: fileToRename.id, newName: newFileName.trim() });
                    setFileToRename(null);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToRename(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (fileToRename && newFileName.trim()) {
                  renameFile({ fileId: fileToRename.id, newName: newFileName.trim() });
                  setFileToRename(null);
                }
              }}
              disabled={!newFileName.trim()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
