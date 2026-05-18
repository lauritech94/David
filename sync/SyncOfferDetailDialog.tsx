import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SyncOffer } from '@/pages/Sincronizaciones';
import {
  Film,
  Tv,
  Video,
  Radio,
  Gamepad2,
  Music,
  Calendar,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  DollarSign,
  FileText,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
  X,
  Percent,
  UserCircle,
  MapPin,
  Clapperboard,
  Timer,
  FileSignature,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SyncOfferDetailDialogProps {
  offer: SyncOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onEdit?: (offer: SyncOffer) => void;
}

const PHASES = [
  { id: 'solicitud', label: 'Solicitud / Lead', color: 'bg-blue-500' },
  { id: 'cotizacion', label: 'Cotización', color: 'bg-amber-500' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-purple-500' },
  { id: 'licencia_firmada', label: 'Licencia Firmada', color: 'bg-green-500' },
  { id: 'facturado', label: 'Facturado / Cobrado', color: 'bg-emerald-500' },
];

function getProductionIcon(type: string) {
  const iconClass = "h-5 w-5";
  switch (type) {
    case 'cine':
      return <Film className={iconClass} />;
    case 'serie':
      return <Tv className={iconClass} />;
    case 'publicidad':
      return <Video className={iconClass} />;
    case 'podcast':
      return <Radio className={iconClass} />;
    case 'videojuego':
      return <Gamepad2 className={iconClass} />;
    default:
      return <Music className={iconClass} />;
  }
}

function getProductionTypeName(type: string): string {
  const types: Record<string, string> = {
    cine: 'Película / Cine',
    serie: 'Serie de TV',
    publicidad: 'Publicidad',
    podcast: 'Podcast',
    videojuego: 'Videojuego',
    documental: 'Documental',
    cortometraje: 'Cortometraje',
    otro: 'Otro',
  };
  return types[type] || type;
}

function getPhaseInfo(phase: string) {
  return PHASES.find(p => p.id === phase) || PHASES[0];
}

function getPhaseBadgeClass(phase: string): string {
  switch (phase) {
    case 'solicitud':
      return 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/30';
    case 'cotizacion':
      return 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/30';
    case 'negociacion':
      return 'border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/30';
    case 'licencia_firmada':
      return 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/30';
    case 'facturado':
      return 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30';
    default:
      return 'border-muted-foreground text-muted-foreground';
  }
}

export function SyncOfferDetailDialog({
  offer,
  open,
  onOpenChange,
  onUpdate,
  onEdit,
}: SyncOfferDetailDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!offer) return null;

  const phaseInfo = getPhaseInfo(offer.phase);
  const totalFees = (offer.sync_fee || 0) + (offer.master_fee || 0) + (offer.publishing_fee || 0);

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta oferta de sincronización?')) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('sync_offers')
        .delete()
        .eq('id', offer.id);

      if (error) throw error;

      toast({
        title: "Oferta eliminada",
        description: "La oferta de sincronización ha sido eliminada.",
      });
      
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error('Error deleting sync offer:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la oferta.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const InfoRow = ({ icon: Icon, label, value, className = "" }: { 
    icon: React.ElementType; 
    label: string; 
    value?: string | number | null;
    className?: string;
  }) => {
    if (!value) return null;
    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 space-y-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className={`p-3 rounded-xl ${phaseInfo.color}`}>
                {getProductionIcon(offer.production_type)}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <DialogTitle className="text-2xl font-bold truncate">
                  {offer.production_title}
                </DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getPhaseBadgeClass(offer.phase)}>
                    {phaseInfo.label}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {getProductionIcon(offer.production_type)}
                    {getProductionTypeName(offer.production_type)}
                  </Badge>
                  {offer.territory && (
                    <Badge variant="secondary" className="gap-1">
                      <Globe className="h-3 w-3" />
                      {offer.territory}
                    </Badge>
                  )}
                  {offer.priority && (
                    <Badge 
                      variant="outline" 
                      className={
                        offer.priority === 'alta' ? 'border-red-500 text-red-600 bg-red-50' :
                        offer.priority === 'media' ? 'border-amber-500 text-amber-600 bg-amber-50' :
                        'border-gray-500 text-gray-600 bg-gray-50'
                      }
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Prioridad {offer.priority}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  {offer.song_title}
                  {offer.song_artist && (
                    <span className="text-muted-foreground/60">- {offer.song_artist}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(offer)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <Tabs defaultValue="general" className="w-full">
            <div className="px-6 pt-4 border-b bg-muted/30">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="general" className="gap-2">
                  <FileText className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="produccion" className="gap-2">
                  <Clapperboard className="h-4 w-4" />
                  Producción
                </TabsTrigger>
                <TabsTrigger value="financiero" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financiero
                </TabsTrigger>
                <TabsTrigger value="contacto" className="gap-2">
                  <User className="h-4 w-4" />
                  Contacto
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 space-y-6">
              {/* General Tab */}
              <TabsContent value="general" className="m-0 space-y-6">
                {/* Música */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      Información de la Canción
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={Music} label="Título" value={offer.song_title} />
                    <InfoRow icon={UserCircle} label="Artista" value={offer.song_artist} />
                    <InfoRow icon={Timer} label="Tipo de Uso" value={offer.usage_type} />
                    <InfoRow icon={Clock} label="Duración del Uso" value={offer.usage_duration} />
                  </CardContent>
                </Card>

                {/* Descripción de la escena */}
                {offer.scene_description && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Descripción de la Escena
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {offer.scene_description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Notas */}
                {(offer.notes || offer.internal_notes) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Notas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {offer.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Notas públicas</p>
                          <p className="text-sm whitespace-pre-wrap">{offer.notes}</p>
                        </div>
                      )}
                      {offer.internal_notes && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Notas internas</p>
                          <p className="text-sm whitespace-pre-wrap">{offer.internal_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Fechas */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Fechas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoRow 
                      icon={Calendar} 
                      label="Fecha de Creación" 
                      value={format(new Date(offer.created_at), "d 'de' MMMM, yyyy", { locale: es })} 
                    />
                    {offer.deadline && (
                      <InfoRow 
                        icon={Clock} 
                        label="Fecha Límite" 
                        value={format(new Date(offer.deadline), "d 'de' MMMM, yyyy", { locale: es })} 
                      />
                    )}
                    <InfoRow 
                      icon={Clock} 
                      label="Última Actualización" 
                      value={format(new Date(offer.updated_at), "d 'de' MMMM, yyyy HH:mm", { locale: es })} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Producción Tab */}
              <TabsContent value="produccion" className="m-0 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clapperboard className="h-4 w-4 text-primary" />
                      Detalles de la Producción
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={Film} label="Título" value={offer.production_title} />
                    <InfoRow icon={Tv} label="Tipo" value={getProductionTypeName(offer.production_type)} />
                    <InfoRow icon={Building2} label="Productora" value={offer.production_company} />
                    <InfoRow icon={User} label="Director" value={offer.director} />
                    <InfoRow icon={Globe} label="Territorio" value={offer.territory} />
                    <InfoRow icon={Clock} label="Duración Licencia" value={offer.duration_years ? `${offer.duration_years} años` : undefined} />
                  </CardContent>
                </Card>

                {/* Medios */}
                {offer.media && offer.media.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary" />
                        Medios de Explotación
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {offer.media.map((medio, index) => (
                          <Badge key={index} variant="secondary">
                            {medio}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contrato */}
                {offer.contract_url && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileSignature className="h-4 w-4 text-primary" />
                        Contrato
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="gap-2" asChild>
                        <a href={offer.contract_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Ver Contrato
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Financiero Tab */}
              <TabsContent value="financiero" className="m-0 space-y-6">
                {/* Resumen Financiero */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="text-center p-4 bg-background rounded-lg shadow-sm">
                        <p className="text-xs text-muted-foreground">Total Budget</p>
                        <p className="text-2xl font-bold text-primary">
                          €{(offer.total_budget || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg shadow-sm">
                        <p className="text-xs text-muted-foreground">Music Budget</p>
                        <p className="text-2xl font-bold">
                          €{(offer.music_budget || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg shadow-sm">
                        <p className="text-xs text-muted-foreground">Sync Fee</p>
                        <p className="text-2xl font-bold text-green-600">
                          €{(offer.sync_fee || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg shadow-sm">
                        <p className="text-xs text-muted-foreground">Total Fees</p>
                        <p className="text-2xl font-bold">
                          €{totalFees.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Desglose */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Desglose de Fees
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Master Fee</span>
                          <span className="text-lg font-bold">€{(offer.master_fee || 0).toLocaleString()}</span>
                        </div>
                        {offer.master_percentage && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Percent className="h-3 w-3" />
                            {offer.master_percentage}%
                          </div>
                        )}
                        {offer.master_holder && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Titular: {offer.master_holder}
                          </p>
                        )}
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Publishing Fee</span>
                          <span className="text-lg font-bold">€{(offer.publishing_fee || 0).toLocaleString()}</span>
                        </div>
                        {offer.publishing_percentage && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Percent className="h-3 w-3" />
                            {offer.publishing_percentage}%
                          </div>
                        )}
                        {offer.publishing_holder && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Titular: {offer.publishing_holder}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contacto Tab */}
              <TabsContent value="contacto" className="m-0 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Información del Solicitante
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={User} label="Nombre" value={offer.requester_name} />
                    <InfoRow icon={Building2} label="Empresa" value={offer.requester_company} />
                    <InfoRow icon={Mail} label="Email" value={offer.requester_email} />
                    <InfoRow icon={Phone} label="Teléfono" value={offer.requester_phone} />
                  </CardContent>
                </Card>

                {/* Acciones de contacto */}
                {(offer.requester_email || offer.requester_phone) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Acciones Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2 flex-wrap">
                      {offer.requester_email && (
                        <Button variant="outline" className="gap-2" asChild>
                          <a href={`mailto:${offer.requester_email}`}>
                            <Mail className="h-4 w-4" />
                            Enviar Email
                          </a>
                        </Button>
                      )}
                      {offer.requester_phone && (
                        <Button variant="outline" className="gap-2" asChild>
                          <a href={`tel:${offer.requester_phone}`}>
                            <Phone className="h-4 w-4" />
                            Llamar
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
