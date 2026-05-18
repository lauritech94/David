import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText,
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import { EPKData, ContactInfo, EPKPhoto, EPKVideo, EPKAudio, EPKDocument } from '@/hooks/useEPK';

interface EPKFormProps {
  epk: Partial<EPKData>;
  photos: EPKPhoto[];
  videos: EPKVideo[];
  audios: EPKAudio[];
  documents: EPKDocument[];
  activeSection: 'basic' | 'content' | 'media' | 'contacts' | 'settings';
  onUpdate: (updates: Partial<EPKData>) => void;
  onShowMediaSelector: () => void;
}

export const EPKForm: React.FC<EPKFormProps> = ({
  epk,
  photos,
  videos,
  audios,
  documents,
  activeSection,
  onUpdate,
  onShowMediaSelector
}) => {
  const [newTag, setNewTag] = useState('');

  const handleContactUpdate = (
    field: 'tour_manager' | 'tour_production' | 'coordinadora_booking' | 'management' | 'booking',
    updates: Partial<ContactInfo>
  ) => {
    const currentContact = epk[field] || {
      nombre: '',
      email: '',
      telefono: '',
      whatsapp: '',
      mostrar: false
    };
    
    onUpdate({
      [field]: {
        ...currentContact,
        ...updates
      }
    });
  };

  const addTag = () => {
    if (newTag.trim() && !epk.etiquetas?.includes(newTag.trim())) {
      onUpdate({
        etiquetas: [...(epk.etiquetas || []), newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onUpdate({
      etiquetas: epk.etiquetas?.filter(tag => tag !== tagToRemove) || []
    });
  };

  const handleFileUpload = (file: File, type: 'image' | 'video' | 'audio' | 'document') => {
    // This would typically upload to Supabase Storage
    console.log('Uploading file:', file, 'Type:', type);
    // For now, just show a placeholder
  };

  const renderBasicForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Información básica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            value={epk.titulo || ''}
            onChange={(e) => onUpdate({ titulo: e.target.value })}
            placeholder="Nombre del EPK"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Artista del roster</Label>
          <SingleArtistSelector
            value={epk.artist_id || null}
            onValueChange={async (artistId) => {
              if (artistId) {
                const { data } = await supabase
                  .from('artists')
                  .select('name, stage_name')
                  .eq('id', artistId)
                  .single();
                onUpdate({ 
                  artist_id: artistId, 
                  artista_proyecto: data?.stage_name || data?.name || '' 
                });
              } else {
                onUpdate({ artist_id: null });
              }
            }}
            placeholder="Seleccionar artista del roster..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="artista_proyecto">Nombre mostrado *</Label>
          <Input
            id="artista_proyecto"
            value={epk.artista_proyecto || ''}
            onChange={(e) => onUpdate({ artista_proyecto: e.target.value })}
            placeholder="Nombre del artista o proyecto"
          />
          <p className="text-xs text-muted-foreground">
            Se auto-rellena al seleccionar artista. Puedes personalizarlo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL) *</Label>
          <Input
            id="slug"
            value={epk.slug || ''}
            onChange={(e) => onUpdate({ slug: e.target.value })}
            placeholder="url-amigable-del-epk"
          />
          <p className="text-xs text-muted-foreground">
            La URL será: /epk/{epk.slug || 'tu-slug'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={epk.tagline || ''}
            onChange={(e) => onUpdate({ tagline: e.target.value })}
            placeholder="Descripción corta y atractiva"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tema">Tema visual</Label>
          <Select
            value={epk.tema || 'auto'}
            onValueChange={(value: 'auto' | 'claro' | 'oscuro') => onUpdate({ tema: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automático</SelectItem>
              <SelectItem value="claro">Claro</SelectItem>
              <SelectItem value="oscuro">Oscuro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Etiquetas</Label>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Añadir etiqueta"
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button onClick={addTag} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {epk.etiquetas && epk.etiquetas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {epk.etiquetas.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderContentForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Contenido textual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bio_corta">Biografía</Label>
          <Textarea
            id="bio_corta"
            value={epk.bio_corta || ''}
            onChange={(e) => onUpdate({ bio_corta: e.target.value })}
            placeholder="Biografía del artista o proyecto..."
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imagen_portada">Imagen de portada</Label>
          <div className="flex gap-2">
            <Input
              id="imagen_portada"
              value={epk.imagen_portada || ''}
              onChange={(e) => onUpdate({ imagen_portada: e.target.value })}
              placeholder="URL de la imagen de portada"
            />
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nota_prensa_pdf">Nota de prensa (PDF)</Label>
          <div className="flex gap-2">
            <Input
              id="nota_prensa_pdf"
              value={epk.nota_prensa_pdf || ''}
              onChange={(e) => onUpdate({ nota_prensa_pdf: e.target.value })}
              placeholder="URL del PDF de nota de prensa"
            />
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderMediaForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Material multimedia
        </CardTitle>
      </CardHeader>
      <CardContent 
        className="space-y-6"
        onDrop={(e) => {
          e.preventDefault();
          const data = e.dataTransfer.getData('application/json');
          if (data) {
            try {
              const item = JSON.parse(data);
              console.log('Dropped library item:', item);
              // This would need to be handled by parent component
            } catch (error) {
              console.error('Error parsing dropped data:', error);
            }
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
      >
        {/* Quick Add Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={onShowMediaSelector}
            className="h-20 flex-col gap-2"
          >
            <ImageIcon className="w-6 h-6" />
            Añadir fotos
          </Button>
          <Button
            variant="outline"
            onClick={onShowMediaSelector}
            className="h-20 flex-col gap-2"
          >
            <Video className="w-6 h-6" />
            Añadir videos
          </Button>
          <Button
            variant="outline"
            onClick={onShowMediaSelector}
            className="h-20 flex-col gap-2"
          >
            <Music className="w-6 h-6" />
            Añadir audio
          </Button>
          <Button
            variant="outline"
            onClick={onShowMediaSelector}
            className="h-20 flex-col gap-2"
          >
            <FileText className="w-6 h-6" />
            Añadir documentos
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border-2 border-dashed border-muted-foreground/25">
          💡 <strong>Tip:</strong> Arrastra elementos desde la Librería aquí para reutilizarlos sin duplicar archivos.
        </div>

        <Separator />

        {/* Current Media List */}
        <div className="space-y-4">
          {photos.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Fotos ({photos.length})
              </h4>
              <div className="space-y-2">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id || index}
                    className="flex items-center gap-3 p-2 border rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {photo.titulo || 'Sin título'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {photo.url}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {photo.descargable ? (
                        <Badge variant="secondary" className="text-xs">Descargable</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Solo vista</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                Videos ({videos.length})
              </h4>
              <div className="space-y-2">
                {videos.map((video, index) => (
                  <div
                    key={video.id || index}
                    className="flex items-center gap-3 p-2 border rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {video.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {video.tipo} {video.privado && '• Privado'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {video.privado ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(photos.length === 0 && videos.length === 0 && audios.length === 0 && documents.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm">No hay material multimedia</p>
              <p className="text-xs">Haz clic en los botones de arriba para añadir contenido</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderContactForm = (
    title: string,
    field: 'tour_manager' | 'tour_production' | 'coordinadora_booking' | 'management' | 'booking',
    contact: ContactInfo
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{title}</h4>
        <Switch
          checked={contact.mostrar}
          onCheckedChange={(checked) => handleContactUpdate(field, { mostrar: checked })}
        />
      </div>
      {contact.mostrar && (
        <div className="space-y-3 pl-4 border-l-2 border-muted">
          <Input
            placeholder="Nombre"
            value={contact.nombre}
            onChange={(e) => handleContactUpdate(field, { nombre: e.target.value })}
          />
          <Input
            placeholder="Email"
            type="email"
            value={contact.email}
            onChange={(e) => handleContactUpdate(field, { email: e.target.value })}
          />
          <Input
            placeholder="Teléfono"
            value={contact.telefono}
            onChange={(e) => handleContactUpdate(field, { telefono: e.target.value })}
          />
          <Input
            placeholder="WhatsApp"
            value={contact.whatsapp}
            onChange={(e) => handleContactUpdate(field, { whatsapp: e.target.value })}
          />
        </div>
      )}
    </div>
  );

  const renderContactsForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Información de contacto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderContactForm('Tour Manager', 'tour_manager', epk.tour_manager || {
          nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false
        })}
        
        <Separator />
        
        {renderContactForm('Producción de Tour', 'tour_production', epk.tour_production || {
          nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false
        })}
        
        <Separator />
        
        {renderContactForm('Coordinadora de Booking', 'coordinadora_booking', epk.coordinadora_booking || {
          nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false
        })}
        
        <Separator />
        
        {renderContactForm('Management', 'management', epk.management || {
          nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false
        })}
        
        <Separator />
        
        {renderContactForm('Booking', 'booking', epk.booking || {
          nombre: '', email: '', telefono: '', whatsapp: '', mostrar: false
        })}
      </CardContent>
    </Card>
  );

  const renderSettingsForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Configuración y acceso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Visibilidad</Label>
          <Select
            value={epk.visibilidad || 'privado'}
            onValueChange={(value: 'publico' | 'privado' | 'protegido_password') => 
              onUpdate({ visibilidad: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publico">Público</SelectItem>
              <SelectItem value="privado">Privado</SelectItem>
              <SelectItem value="protegido_password">Protegido por contraseña</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {epk.visibilidad === 'protegido_password' && (
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Contraseña de acceso"
              onChange={(e) => onUpdate({ password_hash: e.target.value })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="expira_el">Fecha de expiración (opcional)</Label>
          <Input
            id="expira_el"
            type="datetime-local"
            value={epk.expira_el || ''}
            onChange={(e) => onUpdate({ expira_el: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Permitir descarga ZIP</Label>
            <p className="text-sm text-muted-foreground">
              Permite descargar todo el material en un archivo ZIP
            </p>
          </div>
          <Switch
            checked={epk.permitir_zip ?? true}
            onCheckedChange={(checked) => onUpdate({ permitir_zip: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Rastrear analíticas</Label>
            <p className="text-sm text-muted-foreground">
              Registra las visitas y descargas del EPK
            </p>
          </div>
          <Switch
            checked={epk.rastrear_analiticas ?? true}
            onCheckedChange={(checked) => onUpdate({ rastrear_analiticas: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'basic':
        return renderBasicForm();
      case 'content':
        return renderContentForm();
      case 'media':
        return renderMediaForm();
      case 'contacts':
        return renderContactsForm();
      case 'settings':
        return renderSettingsForm();
      default:
        return renderBasicForm();
    }
  };

  return <div className="space-y-4">{renderCurrentSection()}</div>;
};