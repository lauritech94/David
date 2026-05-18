import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, Upload, Download, Eye, Filter, File, Image, Music, Video, 
  ExternalLink, FolderOpen, LayoutGrid, List, BarChart3, Plus, Trash2, FileEdit 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DraftStatusBanner } from '@/components/contract-drafts/DraftStatusBanner';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArtistSelector } from '@/components/ArtistSelector';
import { DocumentFilters, DocumentFiltersState } from '@/components/DocumentFilters';
import { DocumentStats } from '@/components/DocumentStats';
import { ContractGenerator } from '@/components/ContractGenerator';
import { ContractTypeSelector } from '@/components/ContractTypeSelector';
import { IPLicenseGenerator } from '@/components/IPLicenseGenerator';
import { HubGate } from '@/components/permissions/HubGate';
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

interface Document {
  id: string;
  title: string;
  category: string;
  file_type: string;
  file_size: number;
  file_url: string;
  artist_id: string;
  uploaded_by: string;
  created_at: string;
  is_draft?: boolean;
  draft_status?: string;
  share_token?: string;
  draft_type?: string;
}

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
}

const CATEGORIES = [
  { value: 'contract', label: 'Contratos' },
  { value: 'rider', label: 'Riders Técnicos' },
  { value: 'setlist', label: 'Setlists' },
  { value: 'press', label: 'Material de Prensa' },
  { value: 'legal', label: 'Documentos Legales' },
  { value: 'financial', label: 'Documentos Financieros' },
  { value: 'other', label: 'Otros' },
];

function DocumentsInner() {
  usePageTitle('Documentos');
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showContractGenerator, setShowContractGenerator] = useState(false);
  const [showContractSelector, setShowContractSelector] = useState(false);
  const [showIPLicenseGenerator, setShowIPLicenseGenerator] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'stats'>('grid');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  
  const [filters, setFilters] = useState<DocumentFiltersState>({
    search: '',
    category: 'all',
    fileType: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const resolveStoragePath = (fileUrl: string) => {
    const supabaseUrl = 'https://hptjzbaiclmgbvxlmllo.supabase.co/storage/v1/object/public/documents/';
    if (fileUrl.startsWith(supabaseUrl)) return fileUrl.replace(supabaseUrl, '');
    return fileUrl;
  };

  const handleDownloadDocument = async (doc: Document) => {
    const path = resolveStoragePath(doc.file_url);
    const { data, error } = await supabase.storage.from('documents').download(path);
    if (error || !data) {
      toast({ title: 'Error al descargar', description: error?.message, variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = doc.title.endsWith('.pdf') ? doc.title : `${doc.title}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewDocument = async (doc: Document) => {
    const path = resolveStoragePath(doc.file_url);
    const { data, error } = await supabase.storage.from('documents').download(path);
    if (error || !data) {
      toast({ title: 'Error al previsualizar', description: error?.message, variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(data);
    window.open(url, '_blank');
  };

  const [newDocument, setNewDocument] = useState({
    title: '',
    category: '',
    artist_id: '',
    file: null as File | null,
  });

  useEffect(() => {
    if (profile) {
      setSelectedArtists([profile.id]);
      fetchArtists();
    }
  }, [profile]);

  useEffect(() => {
    if (profile && selectedArtists.length > 0) {
      fetchDocuments();
    }
  }, [selectedArtists]);

  const fetchArtists = async () => {
    try {
      const { data: artistsData } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name', { ascending: true });
      setArtists(artistsData || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      // Fetch regular documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .in('artist_id', selectedArtists)
        .order('created_at', { ascending: false });

      // Fetch contract drafts
      const { data: draftsData } = await supabase
        .from('contract_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      const draftDocs: Document[] = (draftsData || []).map((d: any) => ({
        id: d.id,
        title: d.title || 'Borrador sin título',
        category: 'contract',
        file_type: 'draft',
        file_size: JSON.stringify(d.form_data || {}).length,
        file_url: '',
        artist_id: d.artist_id || '',
        uploaded_by: d.created_by,
        created_at: d.created_at,
        is_draft: true,
        draft_status: d.status,
        share_token: d.share_token,
        draft_type: d.draft_type,
      }));

      setDocuments([...(documentsData || []), ...draftDocs]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(doc => 
        doc.title.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      result = result.filter(doc => doc.category === filters.category);
    }

    // File type filter
    if (filters.fileType !== 'all') {
      result = result.filter(doc => {
        if (filters.fileType === 'pdf') return doc.file_type?.includes('pdf');
        if (filters.fileType === 'doc') return doc.file_type?.includes('word') || doc.file_type?.includes('doc');
        if (filters.fileType === 'image') return doc.file_type?.startsWith('image/');
        if (filters.fileType === 'audio') return doc.file_type?.startsWith('audio/');
        if (filters.fileType === 'video') return doc.file_type?.startsWith('video/');
        return true;
      });
    }

    // Date filters
    if (filters.dateFrom) {
      result = result.filter(doc => new Date(doc.created_at) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      result = result.filter(doc => new Date(doc.created_at) <= filters.dateTo!);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'name') {
        comparison = a.title.localeCompare(b.title);
      } else if (filters.sortBy === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (filters.sortBy === 'size') {
        comparison = (a.file_size || 0) - (b.file_size || 0);
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [documents, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.fileType !== 'all') count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDocument.title || !newDocument.category || !newDocument.file) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos y selecciona un archivo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = newDocument.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, newDocument.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          title: newDocument.title,
          category: newDocument.category,
          file_type: newDocument.file.type,
          file_size: newDocument.file.size,
          file_url: publicUrl,
          artist_id: profile?.active_role === 'management' ? newDocument.artist_id : profile?.id,
          uploaded_by: profile?.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Éxito",
        description: "Documento subido correctamente.",
      });

      setNewDocument({
        title: '',
        category: '',
        artist_id: '',
        file: null,
      });
      setShowUploadForm(false);
      fetchDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir el documento.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      const table = documentToDelete.is_draft ? 'contract_drafts' : 'documents';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', documentToDelete.id);

      if (error) throw error;

      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado correctamente.",
      });

      setDocuments(docs => docs.filter(d => d.id !== documentToDelete.id));
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType?.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (fileType?.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (fileType?.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'contract': return 'bg-blue-500';
      case 'rider': return 'bg-green-500';
      case 'setlist': return 'bg-purple-500';
      case 'press': return 'bg-orange-500';
      case 'legal': return 'bg-red-500';
      case 'financial': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="p-6">Cargando documentos...</div>;
  }

  return (
    <div className="container-moodita section-spacing space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-xl">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Gestión de Documentos</h1>
            <p className="text-muted-foreground">Organiza y accede a toda tu documentación profesional</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'stats' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('stats')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Contract generator */}
          <Button variant="outline" onClick={() => setShowContractSelector(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Generar Contrato
          </Button>
          
          {/* Upload button */}
          <Button onClick={() => setShowUploadForm(true)} className="btn-primary">
            <Upload className="w-4 h-4 mr-2" />
            Subir Documento
          </Button>
        </div>
      </div>

      {/* Filters and Artist Selector */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <DocumentFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={CATEGORIES}
            activeFiltersCount={activeFiltersCount}
          />
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtrar por Artistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ArtistSelector
              selectedArtists={selectedArtists}
              onSelectionChange={setSelectedArtists}
              placeholder="Seleccionar artistas..."
              showSelfOption={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Stats View */}
      {viewMode === 'stats' && (
        <DocumentStats documents={documents} />
      )}

      {/* Documents Grid/List */}
      {viewMode !== 'stats' && (
        <>
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {documents.length === 0 ? 'No hay documentos' : 'Sin resultados'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {documents.length === 0 
                    ? 'Sube tu primer documento para empezar a organizar tu biblioteca digital'
                    : 'Prueba con otros filtros o términos de búsqueda'}
                </p>
                {documents.length === 0 && (
                  <Button onClick={() => setShowUploadForm(true)} className="btn-primary">
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Documento
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((document) => (
                <Card key={document.id} className="card-interactive hover-glow group">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 text-primary-foreground">
                          {document.is_draft ? <FileEdit className="w-5 h-5" /> : getFileIcon(document.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                            {document.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
{(() => { const a = artists.find(a => a.id === document.artist_id); return a?.stage_name || a?.name || 'Artista'; })()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                        <Badge className={`${getCategoryColor(document.category)} text-white`}>
                          {getCategoryLabel(document.category)}
                        </Badge>
                        {document.is_draft && document.draft_status && (
                          <DraftStatusBanner status={document.draft_status} />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                      {!document.is_draft && <p className="text-sm font-medium">Tamaño: {formatFileSize(document.file_size)}</p>}
                      {document.is_draft && <p className="text-sm font-medium">Tipo: {document.draft_type === 'ip_license' ? 'Licencia IP' : 'Booking'}</p>}
                      <p className="text-sm text-muted-foreground">
                        {document.is_draft ? 'Creado' : 'Subido'}: {format(new Date(document.created_at), 'PPP', { locale: es })}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {document.is_draft ? (
                        <Button variant="outline" size="sm" className="flex-1 hover-lift" onClick={() => navigate(`/contract-draft/${document.share_token}`)}>
                          <FileEdit className="w-4 h-4 mr-2" />
                          Abrir borrador
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" className="flex-1 hover-lift" onClick={() => handlePreviewDocument(document)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 hover-lift" onClick={() => handleDownloadDocument(document)}>
                            <Download className="w-4 h-4 mr-2" />
                            Descargar
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setDocumentToDelete(document);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // List view
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredDocuments.map((document) => (
                    <div 
                      key={document.id} 
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 text-primary-foreground">
                        {document.is_draft ? <FileEdit className="w-5 h-5" /> : getFileIcon(document.file_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{document.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {(() => { const a = artists.find(a => a.id === document.artist_id); return a?.stage_name || a?.name || 'Artista'; })()} • 
                          {document.is_draft ? (document.draft_type === 'ip_license' ? 'Licencia IP' : 'Booking') : formatFileSize(document.file_size)} • 
                          {format(new Date(document.created_at), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {document.is_draft && document.draft_status && (
                          <DraftStatusBanner status={document.draft_status} />
                        )}
                        <Badge className={`${getCategoryColor(document.category)} text-white`}>
                          {getCategoryLabel(document.category)}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-1">
                        {document.is_draft ? (
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/contract-draft/${document.share_token}`)}>
                            <FileEdit className="w-4 h-4" />
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handlePreviewDocument(document)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(document)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setDocumentToDelete(document);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Nuevo Documento</DialogTitle>
            <DialogDescription>
              Sube contratos, riders, setlists y otros documentos importantes
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                placeholder="Nombre del documento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={newDocument.category}
                onValueChange={(value) => setNewDocument({ ...newDocument, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {profile?.active_role === 'management' && (
              <div className="space-y-2">
                <Label htmlFor="artist">Artista</Label>
                <Select
                  value={newDocument.artist_id}
                  onValueChange={(value) => setNewDocument({ ...newDocument, artist_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un artista" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.stage_name || artist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="file">Archivo *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav,.mp4,.mov"
              />
              <p className="text-xs text-muted-foreground">
                Formatos soportados: PDF, DOC, DOCX, TXT, JPG, PNG, MP3, WAV, MP4, MOV
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={uploading} className="btn-primary">
                {uploading ? 'Subiendo...' : 'Subir Documento'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowUploadForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contract Type Selector */}
      <ContractTypeSelector
        open={showContractSelector}
        onOpenChange={setShowContractSelector}
        onSelectBooking={() => setShowContractGenerator(true)}
        onSelectIPLicense={() => setShowIPLicenseGenerator(true)}
      />

      {/* Contract Generator Dialog */}
      <ContractGenerator
        open={showContractGenerator}
        onOpenChange={setShowContractGenerator}
      />

      {/* IP License Generator */}
      <IPLicenseGenerator
        open={showIPLicenseGenerator}
        onOpenChange={setShowIPLicenseGenerator}
        onSave={async (contract) => {
          if (!profile?.id || !contract.pdfBlob) return;
          const artistId = selectedArtists[0];
          if (!artistId) return;
          try {
            const fileName = `${contract.title.replace(/\s+/g, '_')}.pdf`;
            const filePath = `${profile.id}/${Date.now()}_${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, contract.pdfBlob, { contentType: 'application/pdf' });
            if (uploadError) throw uploadError;
            const { error: insertError } = await supabase
              .from('documents')
              .insert({
                title: contract.title,
                category: 'contract',
                file_type: 'application/pdf',
                file_size: contract.pdfBlob.size,
                file_url: filePath,
                artist_id: artistId,
                uploaded_by: profile.id,
              });
            if (insertError) throw insertError;
            toast({ title: 'Contrato guardado', description: 'La licencia IP se ha guardado correctamente' });
            fetchDocuments();
          } catch (err: any) {
            toast({ title: 'Error', description: 'Error al guardar: ' + (err.message || ''), variant: 'destructive' });
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento "{documentToDelete?.title}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Documents() {
  return (
    <HubGate module="contracts" required="view">
      <DocumentsInner />
    </HubGate>
  );
}
