import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Eye, 
  Share2, 
  ArrowLeft, 
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Users,
  Settings,
  BarChart3
} from 'lucide-react';
import { useEPK } from '@/hooks/useEPK';
import { toast } from '@/hooks/use-toast';
import { EPKForm } from '@/components/epk/EPKForm';
import { EPKPreview } from '@/components/epk/EPKPreview';
import { MediaSelector } from '@/components/epk/MediaSelector';
import { EPKAnalyticsCard } from '@/components/epk/EPKAnalyticsCard';
import { EPKQuickActions } from '@/components/epk/EPKQuickActions';
import { cn } from '@/lib/utils';

export default function EPKBuilder() {
  const { id: epkId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const budgetId = searchParams.get('budget');
  
  const {
    epk,
    photos,
    videos,
    audios,
    documents,
    loading,
    saving,
    updateEPK,
    saveEPK,
    validateEPK,
    generateSlug,
    generateLink,
    copyToClipboard
  } = useEPK(epkId);

  const [activeSection, setActiveSection] = useState<'basic' | 'content' | 'media' | 'contacts' | 'settings'>('basic');
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'preview' | 'analytics'>('preview');

  // Auto-generate slug when title changes
  useEffect(() => {
    if (epk.titulo && !epk.slug) {
      updateEPK({ slug: generateSlug(epk.titulo) });
    }
  }, [epk.titulo, epk.slug, generateSlug, updateEPK]);

  // Set project/budget from URL params
  useEffect(() => {
    if (projectId && !epk.proyecto_id) {
      updateEPK({ proyecto_id: projectId });
    }
    if (budgetId && !epk.presupuesto_id) {
      updateEPK({ presupuesto_id: budgetId });
    }
  }, [projectId, budgetId, epk.proyecto_id, epk.presupuesto_id, updateEPK]);

  const handleSave = async () => {
    const validation = validateEPK();
    
    if (!validation.isValid) {
      toast({
        title: "Error de validación",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    const savedId = await saveEPK();
    if (savedId && !epkId) {
      // Redirect to edit mode after creating
      navigate(`/epk-builder/${savedId}`, { replace: true });
    }
  };

  const handlePreview = () => {
    if (epk.slug) {
      window.open(`/epk/${epk.slug}`, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Guarda el EPK primero para poder previsualizarlo",
        variant: "destructive"
      });
    }
  };

  const handleGenerateLink = async () => {
    if (!epk.id) {
      toast({
        title: "Error",
        description: "Debes guardar el EPK primero",
        variant: "destructive"
      });
      return;
    }

    const result = await generateLink();
    if (result.success && result.url) {
      const copied = await copyToClipboard(result.url);
      if (copied) {
        toast({
          title: "Enlace generado y copiado",
          description: `El enlace del EPK se ha copiado al portapapeles: ${result.url}`
        });
      } else {
        toast({
          title: "Enlace generado",
          description: `Enlace: ${result.url}`,
        });
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo generar el enlace",
        variant: "destructive"
      });
    }
  };

  const sections = [
    { id: 'basic', label: 'Información básica', icon: FileText },
    { id: 'content', label: 'Contenido', icon: FileText },
    { id: 'media', label: 'Material multimedia', icon: ImageIcon },
    { id: 'contacts', label: 'Contactos', icon: Users },
    { id: 'settings', label: 'Configuración', icon: Settings }
  ];

  const getMediaCount = () => {
    return photos.length + videos.length + audios.length + documents.length;
  };

  const validation = validateEPK();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando EPK...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/epks')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">
                  {epk.titulo || 'Nuevo EPK'}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {epk.slug && (
                    <>
                      <span>/{epk.slug}</span>
                      <Separator orientation="vertical" className="h-3" />
                    </>
                  )}
                  <span>{getMediaCount()} elementos multimedia</span>
                  {!validation.isValid && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Requiere atención</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={!epk.slug}
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista previa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateLink}
                disabled={!epk.id}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !validation.isValid}
                className="min-w-[100px]"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          {/* Left Panel - Forms */}
          <div className="col-span-5 space-y-4 overflow-y-auto">
            {/* Section Navigation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Secciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setActiveSection(section.id as any)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {section.label}
                      {section.id === 'media' && getMediaCount() > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {getMediaCount()}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Form Content */}
            <EPKForm
              epk={epk}
              photos={photos}
              videos={videos}
              audios={audios}
              documents={documents}
              activeSection={activeSection}
              onUpdate={updateEPK}
              onShowMediaSelector={() => setShowMediaSelector(true)}
            />

            {/* Validation Errors */}
            {!validation.isValid && (
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Errores de validación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-destructive">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions (only when EPK is saved) */}
            {epk.id && epk.slug && (
              <EPKQuickActions
                epkSlug={epk.slug}
                epkTitle={epk.titulo || 'EPK'}
                artistName={epk.artista_proyecto || 'Artista'}
              />
            )}
          </div>

          {/* Right Panel - Preview/Analytics */}
          <div className="col-span-7 overflow-y-auto space-y-4">
            {/* Tab Switcher */}
            {epk.id && (
              <div className="flex items-center gap-2 border rounded-lg p-1 w-fit">
                <Button
                  variant={rightPanelTab === 'preview' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setRightPanelTab('preview')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista previa
                </Button>
                <Button
                  variant={rightPanelTab === 'analytics' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setRightPanelTab('analytics')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </div>
            )}

            {rightPanelTab === 'preview' ? (
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Vista previa</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Tema: {epk.tema}
                      </Badge>
                      <Badge 
                        variant={epk.visibilidad === 'publico' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {epk.visibilidad}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <EPKPreview
                    epk={epk}
                    photos={photos}
                    videos={videos}
                    audios={audios}
                    documents={documents}
                    onDownloadStart={() => {
                      console.log('Press kit download started');
                    }}
                    onDownloadComplete={() => {
                      console.log('Press kit download completed');
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <EPKAnalyticsCard
                epkId={epk.id!}
                epkSlug={epk.slug}
              />
            )}
          </div>
        </div>
      </div>

      {/* Media Selector Modal */}
      {showMediaSelector && (
        <MediaSelector
          onClose={() => setShowMediaSelector(false)}
          onSelect={(media) => {
            // Handle media selection
            setShowMediaSelector(false);
          }}
        />
      )}
    </div>
  );
}