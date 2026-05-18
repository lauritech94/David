import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Mail, 
  Phone, 
  MessageSquare,
  Play,
  ExternalLink,
  FileText,
  Calendar,
  MapPin,
  Music,
  Contact
} from 'lucide-react';
import { EPKData, EPKPhoto, EPKVideo, EPKAudio, EPKDocument } from '@/hooks/useEPK';
import { cn } from '@/lib/utils';
import PressKitDownloader from './PressKitDownloader';
import { VCardDownload } from '../ui/vcard-download';
import { EPKTourSection } from './EPKTourSection';

interface EPKPreviewProps {
  epk: Partial<EPKData>;
  photos: EPKPhoto[];
  videos: EPKVideo[];
  audios: EPKAudio[];
  documents: EPKDocument[];
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  artistId?: string;
  projectId?: string;
}

export const EPKPreview: React.FC<EPKPreviewProps> = ({
  epk,
  photos,
  videos,
  audios,
  documents,
  onDownloadStart,
  onDownloadComplete,
  artistId,
  projectId
}) => {
  const theme = epk.tema || 'auto';
  const isDark = theme === 'oscuro' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const renderContactInfo = (contact: any, label: string) => {
    if (!contact?.mostrar) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">{label}</h4>
        <div className="space-y-1">
          {contact.nombre && (
            <p className="text-sm">{contact.nombre}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {contact.email && (
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Mail className="w-3 h-3 mr-1" />
                {contact.email}
              </Button>
            )}
            {contact.telefono && (
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Phone className="w-3 h-3 mr-1" />
                {contact.telefono}
              </Button>
            )}
            {contact.whatsapp && (
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getVideoThumbnail = (video: EPKVideo) => {
    if (video.tipo === 'youtube' && video.video_id) {
      return `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;
    }
    return null;
  };

  if (!epk.titulo) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="font-medium mb-2">Vista previa del EPK</h3>
        <p className="text-sm">
          Completa la información básica para ver la vista previa
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "max-w-4xl mx-auto space-y-8",
      isDark ? "dark" : ""
    )}>
      {/* Header */}
      <div className="text-center space-y-4">
        {epk.imagen_portada && (
          <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-muted">
            <img 
              src={epk.imagen_portada} 
              alt="Imagen de portada"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div>
          <h1 className="text-3xl font-bold">{epk.titulo}</h1>
          <h2 className="text-xl text-muted-foreground mt-1">{epk.artista_proyecto}</h2>
          {epk.tagline && (
            <p className="text-lg text-muted-foreground mt-2">{epk.tagline}</p>
          )}
        </div>

        {epk.etiquetas && epk.etiquetas.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {epk.etiquetas.map((tag, index) => (
              <Badge key={index} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Bio */}
      {epk.bio_corta && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Biografía</h3>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{epk.bio_corta}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tour Dates Section - MOODITA Style */}
      <EPKTourSection 
        artistId={artistId} 
        projectId={projectId || epk.proyecto_id}
      />

      {/* Photos */}
      {photos.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Fotos</h3>
              {epk.permitir_zip && (
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar todas
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={photo.id || index} className="group relative">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={photo.url} 
                      alt={photo.titulo || `Foto ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  {photo.titulo && (
                    <p className="text-xs text-center mt-1 truncate">{photo.titulo}</p>
                  )}
                  {photo.descargable && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos */}
      {videos.filter(v => !v.privado).length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Videos</h3>
            <div className="grid gap-4">
              {videos.filter(v => !v.privado).map((video, index) => (
                <div key={video.id || index} className="group">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                    {getVideoThumbnail(video) ? (
                      <img 
                        src={getVideoThumbnail(video)} 
                        alt={video.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="lg" className="rounded-full">
                        <Play className="w-6 h-6 mr-2" />
                        Reproducir
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h4 className="font-medium">{video.titulo}</h4>
                    <p className="text-sm text-muted-foreground capitalize">{video.tipo}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audios */}
      {audios.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Audio</h3>
            <div className="space-y-3">
              {audios.map((audio, index) => (
                <div key={audio.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Button size="sm" className="flex-shrink-0">
                    <Play className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{audio.titulo}</p>
                    <p className="text-sm text-muted-foreground">Audio track</p>
                  </div>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Documentos</h3>
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <div key={doc.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.titulo}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {doc.tipo && <span className="capitalize">{doc.tipo}</span>}
                      {doc.file_type && <span>• {doc.file_type.toUpperCase()}</span>}
                      {doc.file_size && <span>• {Math.round(doc.file_size / 1024)} KB</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Press Kit Downloads */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Download className="w-5 h-5" />
              Press Kit Downloads
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <PressKitDownloader
                epk={epk}
                photos={photos}
                documents={documents}
                onDownloadStart={onDownloadStart}
                onDownloadComplete={onDownloadComplete}
              />
              
              {photos.length > 0 && (
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Fotos ({photos.length})
                </Button>
              )}
              
              <VCardDownload
                contacts={[
                  { role: 'Tour Manager', data: epk.tour_manager || { nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false } },
                  { role: 'Tour Production', data: epk.tour_production || { nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false } },
                  { role: 'Coordinadora de Booking', data: epk.coordinadora_booking || { nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false } },
                  { role: 'Management', data: epk.management || { nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false } },
                  { role: 'Booking', data: epk.booking || { nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false } }
                ]}
                artistName={epk.artista_proyecto || ''}
              />
            </div>
            
            {epk.nota_prensa_pdf && (
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <FileText className="w-10 h-10 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Nota de Prensa</p>
                  <p className="text-sm text-muted-foreground">Documento PDF</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href={epk.nota_prensa_pdf} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Ver/Descargar
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contacto</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {renderContactInfo(epk.tour_manager, 'Tour Manager')}
            {renderContactInfo(epk.tour_production, 'Producción de Tour')}
            {renderContactInfo(epk.coordinadora_booking, 'Coordinadora de Booking')}
            {renderContactInfo(epk.management, 'Management')}
            {renderContactInfo(epk.booking, 'Booking')}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Footer */}
      {epk.rastrear_analiticas && (
        <div className="text-center text-sm text-muted-foreground py-8 border-t">
          <p className="font-medium mb-2">Analytics</p>
          <div className="flex justify-center items-center gap-6">
            <div className="flex items-center gap-2">
              <span>👁️</span>
              <span>{epk.vistas_totales || 0} vistas totales</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🌐</span>
              <span>Visitantes únicos</span>
            </div>
            <div className="flex items-center gap-2">
              <span>⬇️</span>
              <span>{epk.descargas_totales || 0} descargas</span>
            </div>
          </div>
          <p className="mt-2">Electronic Press Kit • {epk.artista_proyecto}</p>
        </div>
      )}
    </div>
  );
};