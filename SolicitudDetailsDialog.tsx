import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  MapPin, 
  MessageSquare, 
  StickyNote,
  Building2,
  Radio,
  Users,
  Edit,
  Check,
  X,
  Archive,
  Mic,
  FileText,
  Download
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { useAuth } from '@/hooks/useAuth';
import { StatusCommentDialog } from '@/components/StatusCommentDialog';
import { ScheduleEncounterDialog } from '@/components/ScheduleEncounterDialog';
import { SolicitudHistory } from '@/components/SolicitudHistory';
import { DecisionChat } from '@/components/DecisionChat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import AssociateProjectDialog from '@/components/AssociateProjectDialog';
import CreateProjectDialog from '@/components/CreateProjectDialog';
import { useNavigate } from 'react-router-dom';
import { InlineEdit } from '@/components/ui/inline-edit';
import { ArtistProfileSelector } from '@/components/ArtistProfileSelector';

interface SolicitudDetails {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro';
  nombre_solicitante: string;
  email?: string;
  telefono?: string;
  medio?: string;
  nombre_programa?: string;
  nombre_entrevistador?: string;
  nombre_festival?: string;
  lugar_concierto?: string;
  ciudad?: string;
  hora_entrevista?: string;
  hora_show?: string;
  informacion_programa?: string;
  observaciones?: string;
  notas_internas?: string;
  descripcion_libre?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  fecha_creacion: string;
  fecha_actualizacion: string;
  artist_id?: string;
  contact_id?: string;
  archivos_adjuntos?: any[];
  comentario_estado?: string | null;
  decision_por?: string | null;
  decision_fecha?: string | null;
  artists?: {
    id: string;
    name: string;
    stage_name?: string;
  } | null;
  project_id?: string | null;
  project?: { id: string; name: string } | null;
  // New booking-related fields
  booking_id?: string | null;
  booking_status?: string | null;
  required_approvers?: string[] | null;
  current_approvals?: string[] | null;
}

interface SolicitudDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudId: string | null;
  onUpdate?: () => void;
}

export function SolicitudDetailsDialog({ 
  open, 
  onOpenChange, 
  solicitudId, 
  onUpdate 
}: SolicitudDetailsDialogProps) {
const { fireCelebration } = useConfetti();
const { profile } = useAuth();
const [solicitud, setSolicitud] = useState<SolicitudDetails | null>(null);
const [loading, setLoading] = useState(true);
const [statusDialogOpen, setStatusDialogOpen] = useState(false);
const [pendingStatus, setPendingStatus] = useState<'aprobada' | 'denegada' | 'pendiente'>('aprobada');
const [encuentroOpen, setEncuentroOpen] = useState(false);
const [showHistory, setShowHistory] = useState(false);
const [associateOpen, setAssociateOpen] = useState(false);
const [createOpen, setCreateOpen] = useState(false);
const navigate = useNavigate();

  useEffect(() => {
    if (open && solicitudId) {
      fetchSolicitudDetails();
    }
  }, [open, solicitudId]);

  const fetchSolicitudDetails = async () => {
    if (!solicitudId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes')
        .select(`
          *,
          artists:artist_id(id, name, stage_name),
          project:project_id(id, name)
        `)
        .eq('id', solicitudId)
        .single();

      if (error) throw error;
      setSolicitud(data as any);
      // Resetear indicador de nuevo comentario al abrir
      await supabase.from('solicitudes').update({ decision_has_new_comment: false }).eq('id', solicitudId);
      onUpdate?.();
    } catch (error) {
      console.error('Error fetching solicitud details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la solicitud",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

const updateSolicitudStatus = async (newStatus: 'aprobada' | 'denegada', comment?: string) => {
  if (!solicitud || !profile?.user_id) return;

  const previousEstado = solicitud.estado;
  const userId = profile.user_id;

  try {
    // Check if this is a multi-approver scenario
    const requiredApprovers = solicitud.required_approvers || [];
    const currentApprovals = solicitud.current_approvals || [];
    
    let finalStatus = newStatus;
    let newApprovals = [...currentApprovals];

    // If there are required approvers and this is an approval
    if (requiredApprovers.length > 0 && newStatus === 'aprobada') {
      // Add current user to approvals if not already there
      if (!currentApprovals.includes(userId)) {
        newApprovals = [...currentApprovals, userId];
      }
      
      // Check if all required approvers have approved
      const strictMatch = requiredApprovers.every(approverId => newApprovals.includes(approverId));
      const allApproved = strictMatch || newApprovals.length >= requiredApprovers.length;
      
      if (!allApproved) {
        // Not all approvers have approved yet - update approvals but keep status pending
        const { error } = await supabase
          .from('solicitudes')
          .update({
            current_approvals: newApprovals,
            fecha_actualizacion: new Date().toISOString(),
          } as any)
          .eq('id', solicitud.id);

        if (error) throw error;

        const approvedCount = requiredApprovers.filter(id => newApprovals.includes(id)).length;
        const totalRequired = requiredApprovers.length;
        
        setSolicitud(prev => prev ? { ...prev, current_approvals: newApprovals } : null);
        onUpdate?.();
        
        toast({
          title: "Aprobación registrada",
          description: `${approvedCount}/${totalRequired} aprobaciones completadas. Faltan ${totalRequired - approvedCount} aprobador(es).`,
        });
        return;
      }
      // All approved - continue with full approval
      finalStatus = 'aprobada';
    }

    // If denied, just proceed with denial
    if (newStatus === 'denegada') {
      finalStatus = 'denegada';
    }

    // Update solicitud status
    const { error } = await supabase
      .from('solicitudes')
      .update({
        estado: finalStatus,
        current_approvals: finalStatus === 'aprobada' ? newApprovals : currentApprovals,
        fecha_actualizacion: new Date().toISOString(),
        comentario_estado: comment || null,
        decision_por: userId,
        decision_fecha: new Date().toISOString(),
      } as any)
      .eq('id', solicitud.id);

    if (error) throw error;

    // Sync booking status if this is a booking solicitud
    if (solicitud.tipo === 'booking' && solicitud.booking_id) {
      const bookingStatus = finalStatus === 'aprobada' ? 'confirmado' : finalStatus === 'denegada' ? 'cancelado' : solicitud.booking_status;
      // Also update the phase for Kanban positioning
      const bookingPhase = finalStatus === 'aprobada' ? 'confirmado' : finalStatus === 'denegada' ? 'cancelado' : undefined;
      
      const updateData: any = {
        estado: bookingStatus,
        updated_at: new Date().toISOString(),
      };
      
      // Only update phase if we have a new phase value
      if (bookingPhase) {
        updateData.phase = bookingPhase;
      }
      
      const { error: bookingError } = await supabase
        .from('booking_offers')
        .update(updateData)
        .eq('id', solicitud.booking_id);

      if (bookingError) {
        console.error('Error syncing booking status:', bookingError);
      } else {
        toast({
          title: "Booking actualizado",
          description: `El estado del booking se ha actualizado a "${bookingStatus}"`,
        });
      }
    }

    setSolicitud(prev => prev ? { ...prev, estado: finalStatus, comentario_estado: comment || null, current_approvals: newApprovals } : null);
    onUpdate?.();
    
    toast({
      title: "¡Éxito!",
      description: finalStatus === 'aprobada' ? "¡Solicitud aprobada! 🎉" : "Solicitud denegada correctamente",
    });

    if (previousEstado !== 'aprobada' && finalStatus === 'aprobada') {
      setTimeout(() => {
        fireCelebration();
        onOpenChange(false);
      }, 300);
    } else if (finalStatus === 'denegada') {
      setTimeout(() => onOpenChange(false), 1000);
    }
  } catch (error) {
    console.error('Error updating solicitud status:', error);
    toast({
      title: "Error",
      description: "No se pudo actualizar el estado de la solicitud",
      variant: "destructive"
    });
  }
};

const updateSolicitudToPending = async (comment?: string) => {
  if (!solicitud) return;

  try {
    const { error } = await supabase
      .from('solicitudes')
      .update({
        estado: 'pendiente',
        fecha_actualizacion: new Date().toISOString(),
        comentario_estado: comment || null,
        decision_por: profile?.user_id || null,
        decision_fecha: new Date().toISOString(),
      } as any)
      .eq('id', solicitud.id);

    if (error) throw error;

    setSolicitud(prev => prev ? { ...prev, estado: 'pendiente', comentario_estado: comment || null } : null);
    onUpdate?.();

    toast({
      title: 'Solicitud reabierta',
      description: 'Estado cambiado a pendiente',
    });
  } catch (error) {
    console.error('Error reopening solicitud:', error);
    toast({
      title: 'Error',
      description: 'No se pudo reabrir la solicitud',
      variant: 'destructive'
    });
  }
};

  const updateLinkedProfile = async (
    id: string | null,
    type: 'artist' | 'contact' | null
  ) => {
    if (!solicitud) return;
    try {
      const updateData =
        !id || !type
          ? { artist_id: null, contact_id: null }
          : type === 'artist'
            ? { artist_id: id, contact_id: null }
            : { artist_id: null, contact_id: id };

      const { error } = await supabase
        .from('solicitudes')
        .update(updateData as any)
        .eq('id', solicitud.id);

      if (error) throw error;

      // Refetch to get the new linked data
      fetchSolicitudDetails();
      onUpdate?.();
      toast({
        title: 'Perfil actualizado',
        description: 'Se ha actualizado el perfil asociado',
      });
    } catch (error) {
      console.error('Error updating linked profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'aprobada':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Check className="w-3 h-3 mr-1" />
            Aprobada
          </Badge>
        );
      case 'denegada':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <X className="w-3 h-3 mr-1" />
            Denegada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrevista':
        return <Radio className="w-5 h-5 text-blue-600" />;
      case 'booking':
        return <Mic className="w-5 h-5 text-purple-600" />;
      case 'consulta':
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      case 'informacion':
        return <StickyNote className="w-5 h-5 text-orange-600" />;
      default:
        return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrevista':
        return 'from-blue-500 to-blue-600';
      case 'booking':
        return 'from-purple-500 to-purple-600';
      case 'consulta':
        return 'from-green-500 to-green-600';
      case 'informacion':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  // Formatea "YYYY-MM-DD" a "Lunes, 4 de Agosto de 2025" en español
  const formatFechaLargaEs = (dateStr: string) => {
    try {
      const d = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (isNaN(d.getTime())) return dateStr;
      let s = format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
      // Capitalizar primera letra y mes
      s = s.charAt(0).toUpperCase() + s.slice(1);
      const parts = s.split(' de ');
      if (parts.length >= 3) {
        parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        s = parts.join(' de ');
      }
      return s;
    } catch {
      return dateStr;
    }
  };

  // Acepta "YYYY-MM-DDTHH:mm" o "YYYY-MM-DD HH:mm" y devuelve formato largo
  const formatFechaHoraLargaEs = (dateTimeStr: string) => {
    try {
      const hasTime = /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?/.test(dateTimeStr);
      if (!hasTime) return formatFechaLargaEs(dateTimeStr);
      const normalized = dateTimeStr.replace(' ', 'T');
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return dateTimeStr;
      let s = format(d, "EEEE, d 'de' MMMM 'de' yyyy HH:mm", { locale: es });
      s = s.charAt(0).toUpperCase() + s.slice(1);
      const parts = s.split(' de ');
      if (parts.length >= 3) {
        parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        s = parts.join(' de ');
      }
      return s;
    } catch {
      return dateTimeStr;
    }
  };

  const formatHoraEs = (dateOrTimeStr: string) => {
    try {
      const withTime = /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?/.test(dateOrTimeStr);
      if (withTime) {
        const d = new Date(dateOrTimeStr.replace(' ', 'T'));
        if (!isNaN(d.getTime())) {
          return format(d, 'HH:mm', { locale: es });
        }
      }
      const m = dateOrTimeStr.match(/\b(\d{2}:\d{2})/);
      return m ? m[1] : dateOrTimeStr;
    } catch {
      return dateOrTimeStr;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando detalles</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando detalles...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!solicitud) {
    return null;
  }

  // Descripción con fechas legibles para cualquier tipo (no altera datos guardados)
  const processedDescripcionLibre =
    solicitud.descripcion_libre
      ? solicitud.descripcion_libre
          .replace(
            /(^|\n)\s*Fecha\s*y\s*hora(?:[^:\n]*)?:\s*(\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?))/gi,
            (_m, p1, d) => {
              const datePart = (d.match(/^\d{4}-\d{2}-\d{2}/)?.[0]) || d;
              const fecha = formatFechaLargaEs(datePart);
              const hora = formatHoraEs(d);
              return `${p1}Fecha: ${fecha}\nHora: ${hora}`;
            }
          )
          .replace(
            /(^|\n)\s*Fecha\s*y\s*hora[^:\n]*:\s*([^\n]*?)\s+(\d{1,2}:\d{2}(?::\d{2})?)/gi,
            (_m, p1, fechaTexto, horaTexto) => `${p1}Fecha: ${fechaTexto.trim()}\nHora: ${horaTexto}`
          )
          .replace(
            /(^|\n)\s*Fecha:\s*(\d{4}-\d{2}-\d{2})/gi,
            (_m, p1, d) => `${p1}Fecha: ${formatFechaLargaEs(d)}`
          )
      : solicitud.descripcion_libre;

  // Prioridad actual y cambio rápido
  const extractPriority = (text?: string | null): 'urgente' | 'alta' | 'media' | 'baja' | null => {
    if (!text) return null;
    const m = text.match(/prioridad:\s*(urgente|alta|media|baja)/i);
    return m ? (m[1].toLowerCase() as any) : null;
  };
  const priorityDays: Record<'urgente' | 'alta' | 'media' | 'baja', number> = { urgente: 1, alta: 3, media: 7, baja: 14 };
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const currentPriority = extractPriority(solicitud.descripcion_libre) || 'media';

  const updatePriorityQuick = async (p: 'urgente' | 'alta' | 'media' | 'baja') => {
    if (!solicitud) return;
    try {
      const days = priorityDays[p];
      const newDue = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      let desc = solicitud.descripcion_libre || '';
      if (/prioridad\s*:/i.test(desc)) {
        desc = desc.replace(/(^|\n)\s*Prioridad:\s*(Urgente|Alta|Media|Baja)/i, (_m, p1) => `${p1}Prioridad: ${capitalize(p)}`);
      } else {
        desc = `Prioridad: ${capitalize(p)}\n\n` + desc;
      }

      const { error } = await supabase
        .from('solicitudes')
        .update({ descripcion_libre: desc, fecha_limite_respuesta: newDue, fecha_actualizacion: new Date().toISOString() })
        .eq('id', solicitud.id);
      if (error) throw error;

      setSolicitud(prev => prev ? { ...prev, descripcion_libre: desc, fecha_limite_respuesta: newDue, fecha_actualizacion: new Date().toISOString() } : prev);
      onUpdate?.();
      toast({ title: 'Prioridad actualizada', description: `Establecida en ${capitalize(p)} — nueva fecha límite creada.` });
    } catch (e) {
      console.error('Error updating priority:', e);
      toast({ title: 'Error', description: 'No se pudo actualizar la prioridad', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Detalles de la Solicitud
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                ID: {solicitud.id.slice(0, 8)}... • Creada el {new Date(solicitud.fecha_creacion).toLocaleDateString()}
              </p>
            </div>
            {getStatusBadge(solicitud.estado)}
          </div>
        </DialogHeader>

        <div className="space-y-6">

          {/* Header Card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getTipoColor(solicitud.tipo)} flex items-center justify-center`}>
                  {getTipoIcon(solicitud.tipo)}
                </div>
                <div className="flex-1">
                  <InlineEdit
                    value={solicitud.nombre_solicitante}
                    onSave={async (newValue) => {
                      const { error } = await supabase
                        .from('solicitudes')
                        .update({ nombre_solicitante: newValue, fecha_actualizacion: new Date().toISOString() })
                        .eq('id', solicitud.id);
                      
                      if (error) throw error;
                      
                      setSolicitud(prev => prev ? { ...prev, nombre_solicitante: newValue } : prev);
                      onUpdate?.();
                      toast({
                        title: "Asunto actualizado",
                        description: "El nombre de la solicitud se ha actualizado correctamente",
                      });
                    }}
                    displayComponent={(value) => (
                      <h3 className="text-xl font-semibold text-foreground">
                        {value}
                      </h3>
                    )}
                    placeholder="Nombre de la solicitud"
                  />
                  <p className="text-muted-foreground capitalize mb-2 mt-1">
                    Solicitud de {solicitud.tipo.replace('_', ' ')}
                  </p>
                  <div className="mt-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">Artista</Label>
                    <ArtistProfileSelector
                      value={solicitud.artist_id || solicitud.contact_id || null}
                      onValueChange={(value, type) => updateLinkedProfile(value, type)}
                      placeholder="Seleccionar artista..."
                      disabled={solicitud.estado !== 'pendiente'}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

           {/* Proyecto */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center justify-between">
                 <span>Proyecto</span>
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="outline">
                       {solicitud.project?.name || 'Proyecto'}
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                     <DropdownMenuItem disabled={!solicitud.project_id} onClick={() => solicitud.project_id && navigate(`/projects/${solicitud.project_id}`)}>
                       Ir al proyecto
                     </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => setAssociateOpen(true)}>
                       Asociar a proyecto
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                       Nuevo proyecto
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
               </CardTitle>
             </CardHeader>
           </Card>

           {/* Información de Contacto - Solo si hay datos */}
          {(solicitud.email || solicitud.telefono) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {solicitud.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{solicitud.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.telefono && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{solicitud.telefono}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalles por Tipo */}
          {solicitud.tipo === 'entrevista' && (solicitud.medio || solicitud.nombre_programa || solicitud.nombre_entrevistador || solicitud.hora_entrevista || solicitud.informacion_programa) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5" />
                  Detalles de la Entrevista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {solicitud.medio && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Medio</p>
                        <p className="font-medium">{solicitud.medio}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.nombre_programa && (
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Programa</p>
                        <p className="font-medium">{solicitud.nombre_programa}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.nombre_entrevistador && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Entrevistador</p>
                        <p className="font-medium">{solicitud.nombre_entrevistador}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.hora_entrevista && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha de la Entrevista</p>
                        <p className="font-medium">
                          {formatFechaLargaEs((solicitud.hora_entrevista.match(/^\d{4}-\d{2}-\d{2}/)?.[0]) || solicitud.hora_entrevista)}
                        </p>
                      </div>
                    </div>
                  )}
                  {solicitud.hora_entrevista && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hora de la Entrevista</p>
                        <p className="font-medium">
                          {formatHoraEs(solicitud.hora_entrevista)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {solicitud.informacion_programa && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Información del Programa</p>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-sm">{solicitud.informacion_programa}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {solicitud.tipo === 'booking' && (solicitud.nombre_festival || solicitud.lugar_concierto || solicitud.ciudad || solicitud.hora_show) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Detalles del Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {solicitud.nombre_festival && (
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Festival/Evento</p>
                        <p className="font-medium">{solicitud.nombre_festival}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.lugar_concierto && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Lugar</p>
                        <p className="font-medium">{solicitud.lugar_concierto}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.ciudad && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ciudad</p>
                        <p className="font-medium">{solicitud.ciudad}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.hora_show && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha del Show</p>
                        <p className="font-medium">
                          {formatFechaLargaEs((solicitud.hora_show.match(/^\d{4}-\d{2}-\d{2}/)?.[0]) || solicitud.hora_show)}
                        </p>
                      </div>
                    </div>
                  )}
                  {solicitud.hora_show && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hora del Show</p>
                        <p className="font-medium">
                          {formatHoraEs(solicitud.hora_show)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Progress - For booking solicitudes with multi-approvers */}
          {solicitud.tipo === 'booking' && (solicitud.required_approvers?.length || 0) > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Progreso de Aprobación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Aprobaciones completadas</span>
                    <span className="font-medium">
                      {(solicitud.current_approvals?.length || 0)} / {(solicitud.required_approvers?.length || 0)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ 
                        width: `${((solicitud.current_approvals?.length || 0) / (solicitud.required_approvers?.length || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(solicitud.current_approvals?.length || 0) === (solicitud.required_approvers?.length || 0)
                      ? "Todos los aprobadores han aprobado"
                      : `Faltan ${(solicitud.required_approvers?.length || 0) - (solicitud.current_approvals?.length || 0)} aprobación(es)`
                    }
                  </p>
                </div>

                {solicitud.booking_status && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estado del booking objetivo:</span>
                      <Badge variant="outline" className="capitalize">
                        {solicitud.booking_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Al aprobar, el booking pasará a "confirmado". Al denegar, pasará a "cancelado".
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prioridad de respuesta (editable mientras está pendiente) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Prioridad de respuesta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select
                  value={currentPriority}
                  onValueChange={(v) => updatePriorityQuick(v as 'urgente' | 'alta' | 'media' | 'baja')}
                  disabled={solicitud.estado !== 'pendiente'}
                >
                  <SelectTrigger className="mt-1" id="prioridad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">
                      <span className="inline-flex items-center gap-1">
                        <span>🔴 Urgente</span>
                        <span className="text-muted-foreground">— 1 día</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="alta">
                      <span className="inline-flex items-center gap-1">
                        <span>🟠 Alta</span>
                        <span className="text-muted-foreground">— 3 días</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="media">
                      <span className="inline-flex items-center gap-1">
                        <span>🟡 Media</span>
                        <span className="text-muted-foreground">— 7 días</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="baja">
                      <span className="inline-flex items-center gap-1">
                        <span>🟢 Baja</span>
                        <span className="text-muted-foreground">— 14 días</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {solicitud.estado !== 'pendiente' && (
                  <p className="text-xs text-muted-foreground mt-2">Solo editable cuando el estado es Pendiente.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observaciones y Notas */}
          {(solicitud.observaciones || solicitud.descripcion_libre || solicitud.notas_internas || solicitud.comentario_estado) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Observaciones y Notas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              {(solicitud.observaciones || solicitud.descripcion_libre) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Resumen</p>
                    {solicitud.observaciones?.startsWith('<!--LABEL_COPY_JSON-->') ? (() => {
                      try {
                        const jsonStr = solicitud.observaciones.replace('<!--LABEL_COPY_JSON-->', '');
                        const data = JSON.parse(jsonStr);
                        return (
                          <div className="space-y-4">
                            {/* Release Header */}
                            <div className="bg-muted/50 border border-border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-foreground">{data.release?.title}</h3>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary uppercase">{data.release?.type}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                <span>Artista: <strong className="text-foreground">{data.release?.artist}</strong></span>
                                {data.release?.upc && <span>UPC: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{data.release.upc}</code></span>}
                              </div>
                            </div>

                            {/* Tracks */}
                            <div className="space-y-3">
                              {(data.tracks || []).map((track: any, idx: number) => (
                                <div key={idx} className="border border-border rounded-lg overflow-hidden">
                                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b border-border">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold">{track.number}</span>
                                    <span className="font-medium text-foreground flex-1">{track.title}</span>
                                    {track.isrc && (
                                      <code className="text-[11px] bg-accent/10 text-accent-foreground px-2 py-0.5 rounded font-mono">ISRC: {track.isrc}</code>
                                    )}
                                  </div>
                                  <div className="px-4 py-3">
                                    {track.credits?.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {track.credits.map((credit: any, cIdx: number) => (
                                          <div key={cIdx} className="flex items-center gap-2 text-sm">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground min-w-[90px] justify-center">{credit.role}</span>
                                            <span className="text-foreground">{credit.name}</span>
                                            {credit.percentage != null && (
                                              <span className="text-muted-foreground text-xs">({credit.percentage}%)</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic">Sin créditos asignados</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } catch {
                        return (
                          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{solicitud.observaciones}</p>
                          </div>
                        );
                      }
                    })() : (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        {solicitud.observaciones && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-blue-900 mb-1">Comentarios de la solicitante:</p>
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{solicitud.observaciones}</p>
                          </div>
                        )}
                        {solicitud.descripcion_libre && (
                          <div>
                            <p className="text-sm font-medium text-blue-900 mb-1">Descripción:</p>
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{processedDescripcionLibre}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {solicitud.notas_internas && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Notas Internas</p>
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <p className="text-sm text-yellow-800 whitespace-pre-wrap">{solicitud.notas_internas}</p>
                    </div>
                  </div>
                )}

                {solicitud.comentario_estado && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Comentario de decisión</p>
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <p className="text-sm text-green-800 whitespace-pre-wrap">{solicitud.comentario_estado}</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

          {/* Chat de decisión */}
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Chat de decisión</p>
            <DecisionChat solicitudId={solicitud.id} />
          </div>

          {/* Información de Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Información de Fechas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                  <p className="font-medium">
                    {new Date(solicitud.fecha_creacion).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Actualización</p>
                  <p className="font-medium">
                    {new Date(solicitud.fecha_actualizacion).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historial de respuestas */}
          <div>
            <Button variant="outline" className="w-full" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? 'Ocultar historial' : 'Ver historial'}
            </Button>
          </div>
          {showHistory && <SolicitudHistory solicitudId={solicitud.id} />}


          {/* Acciones */}
          {solicitud.estado === 'pendiente' && (
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      Acciones de la Solicitud
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Aprueba o deniega esta solicitud para continuar con el proceso
                    </p>
                  </div>
                  <div className="flex gap-2">
<Button
  onClick={() => { setPendingStatus('denegada'); setStatusDialogOpen(true); }}
  variant="outline"
  className="border-red-200 text-red-700 hover:bg-red-50"
>
  <X className="w-4 h-4 mr-1" />
  Denegar
</Button>
<Button
  onClick={() => { setPendingStatus('aprobada'); setStatusDialogOpen(true); }}
  className="bg-green-600 hover:bg-green-700 text-white"
>
  <Check className="w-4 h-4 mr-1" />
  Aprobar
</Button>
<Button
  variant="outline"
  onClick={() => setEncuentroOpen(true)}
>
  <Calendar className="w-4 h-4 mr-1" />
  Organizar encuentro
</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {solicitud.estado !== 'pendiente' && (
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Reabrir solicitud</h4>
                    <p className="text-sm text-muted-foreground">Vuelve el estado a pendiente para solicitar una nueva respuesta</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setPendingStatus('pendiente'); setStatusDialogOpen(true); }}>
                      Volver a pendiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogos auxiliares */}
        <StatusCommentDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          status={pendingStatus}
          onSubmit={(comment) => {
            setStatusDialogOpen(false);
            if (pendingStatus === 'pendiente') {
              updateSolicitudToPending(comment);
            } else {
              updateSolicitudStatus(pendingStatus as 'aprobada' | 'denegada', comment);
            }
          }}
        />

        <ScheduleEncounterDialog
          open={encuentroOpen}
          onOpenChange={setEncuentroOpen}
          solicitud={{
            id: solicitud.id,
            artist_id: solicitud.artist_id,
            tipo: solicitud.tipo,
            nombre_solicitante: solicitud.nombre_solicitante,
            ciudad: solicitud.ciudad,
            medio: solicitud.medio,
            lugar_concierto: solicitud.lugar_concierto,
          }}
          onCreated={onUpdate}
        />

        <AssociateProjectDialog
          open={associateOpen}
          onOpenChange={setAssociateOpen}
          solicitudId={solicitud.id}
          artistId={solicitud.artist_id ?? null}
          onLinked={async () => { await fetchSolicitudDetails(); onUpdate?.(); }}
        />
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultArtistId={solicitud.artist_id ?? undefined}
          onSuccess={() => {}}
          onCreated={async (newId) => {
            try {
              const { error } = await supabase.from('solicitudes').update({ project_id: newId }).eq('id', solicitud.id);
              if (error) throw error;
              toast({ title: 'Proyecto vinculado', description: 'La solicitud fue asociada al nuevo proyecto.' });
              await fetchSolicitudDetails();
              onUpdate?.();
            } catch (e) {
              console.error(e);
              toast({ title: 'Error', description: 'No se pudo asociar al nuevo proyecto', variant: 'destructive' });
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}