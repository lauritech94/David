import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { logAvailabilityEvent } from '@/hooks/useAvailabilityAudit';
import { toast } from 'sonner';
import { undoableDelete } from '@/utils/undoableDelete';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Copy,
  RefreshCw,
  UserPlus,
  Trash2,
  MoreVertical,
  Check,
  X,
  HelpCircle,
  History,
  ChevronDown,
  ChevronRight,
  UserMinus,
  ToggleLeft,
  Edit,
  BookUser,
  Plus,
  ArrowLeft,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailabilityRequest {
  id: string;
  status: string;
  block_confirmation: boolean;
  deadline: string | null;
  notes: string | null;
  share_token: string | null;
  created_at: string;
}

interface AvailabilityResponse {
  id: string;
  contact_id: string | null;
  responder_name: string | null;
  status: string;
  response_notes: string | null;
  responded_at: string | null;
}

interface Contact {
  id: string;
  name: string;
  stage_name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface HistoryEvent {
  id: string;
  event_type: string;
  previous_value: any;
  new_value: any;
  created_at: string;
  actor_user_id: string;
}

interface AvailabilityStatusCardProps {
  bookingId: string;
  artistId?: string | null;
  phase?: string;
  onRequestAvailability: () => void;
  canConfirm: boolean;
  onBlockStatusChange: (blocked: boolean) => void;
  onPhaseChange?: () => void;
}

export function AvailabilityStatusCard({
  bookingId,
  artistId,
  phase = 'interes',
  onRequestAvailability,
  canConfirm,
  onBlockStatusChange,
  onPhaseChange
}: AvailabilityStatusCardProps) {
  const [request, setRequest] = useState<AvailabilityRequest | null>(null);
  const [responses, setResponses] = useState<AvailabilityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dialogMode, setDialogMode] = useState<'menu' | 'team' | 'agenda' | 'new'>('menu');
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  // Collapse details by default once in negociacion or later phases
  const isAdvancedPhase = ['negociacion', 'confirmado', 'facturado', 'cerrado'].includes(phase || '');
  const [detailsOpen, setDetailsOpen] = useState(!isAdvancedPhase);

  useEffect(() => {
    fetchAvailability();
  }, [bookingId]);

  useEffect(() => {
    if (historyOpen && history.length === 0) {
      fetchHistory();
    }
  }, [historyOpen]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const { data: requests } = await supabase
        .from('booking_availability_requests')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (requests && requests.length > 0) {
        const req = requests[0] as unknown as AvailabilityRequest;
        setRequest(req);

        const { data: resps } = await supabase
          .from('booking_availability_responses')
          .select('*')
          .eq('request_id', req.id);

        setResponses((resps || []) as unknown as AvailabilityResponse[]);

        const hasConflicts = (resps || []).some((r: any) => r.status === 'unavailable');
        onBlockStatusChange(req.block_confirmation && hasConflicts);
      } else {
        setRequest(null);
        setResponses([]);
        onBlockStatusChange(false);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('booking_availability_history')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []) as unknown as HistoryEvent[]);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'response_added':
        return <UserPlus className="h-3 w-3 text-green-500" />;
      case 'response_removed':
        return <UserMinus className="h-3 w-3 text-destructive" />;
      case 'status_changed':
        return <Edit className="h-3 w-3 text-blue-500" />;
      case 'block_toggled':
        return <ToggleLeft className="h-3 w-3 text-yellow-500" />;
      case 'request_created':
        return <Users className="h-3 w-3 text-primary" />;
      default:
        return <History className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getEventDescription = (event: HistoryEvent) => {
    const name = event.new_value?.responder_name || event.previous_value?.responder_name || 'Contacto';
    switch (event.event_type) {
      case 'response_added':
        return `${name} añadido a la consulta`;
      case 'response_removed':
        return `${name} eliminado de la consulta`;
      case 'status_changed':
        const oldStatus = event.previous_value?.status || 'pendiente';
        const newStatus = event.new_value?.status || 'pendiente';
        return `${name}: ${getStatusLabel(oldStatus)} → ${getStatusLabel(newStatus)}`;
      case 'block_toggled':
        return event.new_value?.block_confirmation 
          ? 'Bloqueo de confirmación activado'
          : 'Bloqueo de confirmación desactivado';
      case 'request_created':
        return 'Solicitud de disponibilidad creada';
      default:
        return event.event_type;
    }
  };

  const fetchAvailableContacts = async () => {
    if (!artistId || !request) return;
    setLoadingContacts(true);
    try {
      const { data: assignments } = await supabase
        .from('contact_artist_assignments')
        .select('contact_id')
        .eq('artist_id', artistId);

      const contactIds = assignments?.map(a => a.contact_id) || [];
      const existingContactIds = responses.map(r => r.contact_id).filter(Boolean);

      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, stage_name, email, role')
          .in('id', contactIds);

        const available = (contacts || []).filter(c => !existingContactIds.includes(c.id));
        setAvailableContacts(available);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchAllContacts = async () => {
    if (!request) return;
    setLoadingContacts(true);
    try {
      const existingContactIds = responses.map(r => r.contact_id).filter(Boolean);
      
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, stage_name, email, role')
        .order('name');

      const available = (contacts || []).filter(c => !existingContactIds.includes(c.id));
      setAllContacts(available);
    } catch (error) {
      console.error('Error fetching all contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleAddContacts = async () => {
    if (!request || selectedToAdd.length === 0) return;
    try {
      const contactSource = dialogMode === 'agenda' ? allContacts : availableContacts;
      const newResponses = selectedToAdd.map(contactId => {
        const contact = contactSource.find(c => c.id === contactId);
        return {
          request_id: request.id,
          contact_id: contactId,
          responder_name: contact?.stage_name || contact?.name,
          responder_email: contact?.email
        };
      });

      const { data: inserted } = await supabase
        .from('booking_availability_responses')
        .insert(newResponses)
        .select();
      
      // Log audit for each added contact
      for (const resp of (inserted || [])) {
        await logAvailabilityEvent({
          requestId: request.id,
          responseId: resp.id,
          bookingId,
          eventType: 'response_added',
          newValue: { 
            responder_name: resp.responder_name,
            contact_id: resp.contact_id 
          }
        });
      }
      
      toast.success(`${selectedToAdd.length} contacto(s) añadido(s)`);
      resetDialog();
      fetchAvailability();
    } catch (error) {
      console.error('Error adding contacts:', error);
      toast.error('Error al añadir contactos');
    }
  };

  const handleCreateNewContact = async () => {
    if (!request || !newContactName.trim()) return;
    try {
      // Create new contact
      const { data: user } = await supabase.auth.getUser();
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          name: newContactName.trim(),
          email: newContactEmail.trim() || null,
          role: newContactRole.trim() || null,
          created_by: user?.user?.id
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add to availability request
      const { data: inserted } = await supabase
        .from('booking_availability_responses')
        .insert({
          request_id: request.id,
          contact_id: newContact.id,
          responder_name: newContact.name,
          responder_email: newContact.email
        })
        .select()
        .single();

      if (inserted) {
        await logAvailabilityEvent({
          requestId: request.id,
          responseId: inserted.id,
          bookingId,
          eventType: 'response_added',
          newValue: { 
            responder_name: inserted.responder_name,
            contact_id: inserted.contact_id 
          }
        });
      }

      toast.success('Contacto creado y añadido');
      resetDialog();
      fetchAvailability();
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Error al crear el contacto');
    }
  };

  const resetDialog = () => {
    setManageDialogOpen(false);
    setDialogMode('menu');
    setSelectedToAdd([]);
    setSearchQuery('');
    setNewContactName('');
    setNewContactEmail('');
    setNewContactRole('');
  };

  const handleRemoveContact = async (responseId: string) => {
    const responseToRemove = responses.find(r => r.id === responseId);
    
    await undoableDelete({
      table: 'booking_availability_responses',
      id: responseId,
      successMessage: 'Contacto eliminado',
      onComplete: async () => {
        // Log audit for removed contact
        if (request) {
          await logAvailabilityEvent({
            requestId: request.id,
            responseId,
            bookingId,
            eventType: 'response_removed',
            previousValue: responseToRemove ? {
              responder_name: responseToRemove.responder_name,
              status: responseToRemove.status,
              contact_id: responseToRemove.contact_id
            } : undefined
          });
        }
        fetchAvailability();
      },
    });
  };

  const handleUpdateStatus = async (responseId: string, newStatus: 'available' | 'unavailable' | 'tentative') => {
    // Get previous status for audit
    const previousResponse = responses.find(r => r.id === responseId);
    const previousStatus = previousResponse?.status;
    
    try {
      const { error } = await supabase
        .from('booking_availability_responses')
        .update({ 
          status: newStatus,
          responded_at: new Date().toISOString()
        })
        .eq('id', responseId);
      
      if (error) {
        toast.error('Error al actualizar');
        return;
      }
      
      // Log audit for status change
      if (request) {
        await logAvailabilityEvent({
          requestId: request.id,
          responseId,
          bookingId,
          eventType: 'status_changed',
          previousValue: { 
            status: previousStatus,
            responder_name: previousResponse?.responder_name 
          },
          newValue: { 
            status: newStatus,
            responder_name: previousResponse?.responder_name 
          }
        });
      }
      
      toast.success(`Estado actualizado a ${getStatusLabel(newStatus)}`);
      fetchAvailability();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar');
    }
  };

  const openManageDialog = () => {
    setDialogMode('menu');
    setManageDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'unavailable':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'tentative':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'unavailable':
        return 'No disponible';
      case 'tentative':
        return 'Tentativo';
      default:
        return 'Pendiente';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'available':
        return 'default';
      case 'unavailable':
        return 'destructive';
      case 'tentative':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const copyShareLink = () => {
    if (!request?.share_token) return;
    const link = `${PUBLIC_APP_URL}/availability/${request.share_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Enlace copiado');
  };

  const stats = {
    total: responses.length,
    available: responses.filter(r => r.status === 'available').length,
    unavailable: responses.filter(r => r.status === 'unavailable').length,
    pending: responses.filter(r => r.status === 'pending').length,
    tentative: responses.filter(r => r.status === 'tentative').length
  };

  const allAvailable = stats.pending === 0 && stats.unavailable === 0 && stats.total > 0;
  const hasConflicts = stats.unavailable > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Cargando...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Disponibilidad del Equipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No se ha solicitado disponibilidad al equipo para este evento.
          </p>
          <Button onClick={onRequestAvailability} className="w-full" variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Solicitar Disponibilidad
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        hasConflicts && request.block_confirmation && 'border-destructive/50'
      )}>
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Disponibilidad del Equipo
                  {detailsOpen ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {allAvailable && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Todos OK
                    </Badge>
                  )}
                  {hasConflicts && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      {stats.unavailable} conflicto(s)
                    </Badge>
                  )}
                  {stats.pending > 0 && (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {stats.pending} pendiente(s)
                    </Badge>
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Progress summary */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Respuestas</span>
                <span className="font-medium">
                  {stats.available + stats.unavailable + stats.tentative} / {stats.total}
                </span>
              </div>

          {/* Deadline */}
          {request.deadline && (
            <div className="text-xs text-muted-foreground">
              Fecha límite: {format(new Date(request.deadline), 'PPP', { locale: es })}
            </div>
          )}

          <Separator />

          {/* Response list with actions */}
          <ScrollArea className="h-40">
            <div className="space-y-2">
              {responses.map(response => (
                <div
                  key={response.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 group"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(response.status)}
                    <span className="text-sm font-medium">
                      {response.responder_name || 'Sin nombre'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(response.status)}>
                      {getStatusLabel(response.status)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateStatus(response.id, 'available')}>
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                          Marcar disponible
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(response.id, 'unavailable')}>
                          <X className="h-4 w-4 mr-2 text-destructive" />
                          Marcar no disponible
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(response.id, 'tentative')}>
                          <HelpCircle className="h-4 w-4 mr-2 text-yellow-500" />
                          Marcar tentativo
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleRemoveContact(response.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={openManageDialog}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Consultar otro contacto
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={copyShareLink}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar enlace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAvailability}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Block confirmation toggle - only shows when there are conflicts */}
          {hasConflicts && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Bloquear confirmación</p>
                <p className="text-xs text-muted-foreground">
                  No permitir confirmar el booking hasta resolver conflictos
                </p>
              </div>
              <Switch
                checked={request.block_confirmation}
                onCheckedChange={async (checked) => {
                  const previousValue = request.block_confirmation;
                  await supabase
                    .from('booking_availability_requests')
                    .update({ block_confirmation: checked })
                    .eq('id', request.id);
                  
                  // Log audit for block toggle
                  await logAvailabilityEvent({
                    requestId: request.id,
                    bookingId,
                    eventType: 'block_toggled',
                    previousValue: { block_confirmation: previousValue },
                    newValue: { block_confirmation: checked }
                  });
                  
                  toast.success(checked ? 'Bloqueo activado' : 'Bloqueo desactivado');
                  fetchAvailability();
                }}
              />
            </div>
          )}

          {/* Warning if blocking confirmation */}
          {hasConflicts && request.block_confirmation && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-destructive">Confirmación bloqueada</p>
                  <p className="text-muted-foreground">
                    Hay {stats.unavailable} miembro(s) no disponible(s). Resuelve los conflictos para poder confirmar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* History section - expandable */}
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <History className="h-3 w-3" />
                  Historial de cambios
                </span>
                {historyOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {loadingHistory ? (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    Cargando historial...
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    Sin cambios registrados
                  </div>
                ) : (
                  history.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-xs"
                    >
                      <div className="mt-0.5">
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">
                          {getEventDescription(event)}
                        </p>
                        <p className="text-muted-foreground">
                          {format(new Date(event.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Advance to Negociación button - visible in 'interes' or 'oferta' phase when team is available */}
          {(phase === 'interes' || phase === 'oferta') && allAvailable && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from('booking_offers')
                    .update({ phase: 'negociacion' })
                    .eq('id', bookingId);
                  
                  if (error) throw error;
                  
                  toast.success('Booking avanzado a Negociación');
                  onPhaseChange?.();
                } catch (error) {
                  console.error('Error advancing phase:', error);
                  toast.error('Error al avanzar el booking');
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Avanzar a Negociación
            </Button>
          )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Add contacts dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={(open) => {
        if (!open) resetDialog();
        else setManageDialogOpen(true);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode !== 'menu' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 mr-1"
                  onClick={() => {
                    setDialogMode('menu');
                    setSelectedToAdd([]);
                    setSearchQuery('');
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <UserPlus className="h-5 w-5" />
              {dialogMode === 'menu' && 'Consultar otro contacto'}
              {dialogMode === 'team' && 'Equipo del artista'}
              {dialogMode === 'agenda' && 'Contactos de la agenda'}
              {dialogMode === 'new' && 'Nuevo contacto'}
            </DialogTitle>
          </DialogHeader>

          {/* Menu mode - show options */}
          {dialogMode === 'menu' && (
            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => {
                  setDialogMode('team');
                  fetchAvailableContacts();
                }}
              >
                <Users className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Equipo del artista</p>
                  <p className="text-xs text-muted-foreground">Contactos asignados a este artista</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => {
                  setDialogMode('agenda');
                  fetchAllContacts();
                }}
              >
                <BookUser className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Contacto de la agenda</p>
                  <p className="text-xs text-muted-foreground">Buscar en todos tus contactos</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => setDialogMode('new')}
              >
                <Plus className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Crear nuevo contacto</p>
                  <p className="text-xs text-muted-foreground">Añadir un contacto nuevo</p>
                </div>
              </Button>
            </div>
          )}

          {/* Team contacts mode */}
          {dialogMode === 'team' && (
            <>
              <ScrollArea className="h-64">
                {loadingContacts ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Cargando contactos...
                  </div>
                ) : availableContacts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No hay más contactos del equipo disponibles
                  </div>
                ) : (
                  <div className="space-y-2 p-1">
                    {availableContacts.map(contact => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setSelectedToAdd(prev =>
                            prev.includes(contact.id)
                              ? prev.filter(id => id !== contact.id)
                              : [...prev, contact.id]
                          );
                        }}
                      >
                        <Checkbox
                          checked={selectedToAdd.includes(contact.id)}
                          onCheckedChange={() => {
                            setSelectedToAdd(prev =>
                              prev.includes(contact.id)
                                ? prev.filter(id => id !== contact.id)
                                : [...prev, contact.id]
                            );
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {contact.stage_name || contact.name}
                          </p>
                          {contact.role && (
                            <p className="text-xs text-muted-foreground">{contact.role}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleAddContacts} disabled={selectedToAdd.length === 0}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Añadir ({selectedToAdd.length})
                </Button>
              </DialogFooter>
            </>
          )}

          {/* All contacts (agenda) mode */}
          {dialogMode === 'agenda' && (
            <>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contacto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-56">
                {loadingContacts ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Cargando contactos...
                  </div>
                ) : allContacts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No hay contactos disponibles
                  </div>
                ) : (
                  <div className="space-y-2 p-1">
                    {allContacts
                      .filter(c => 
                        !searchQuery || 
                        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(contact => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => {
                            setSelectedToAdd(prev =>
                              prev.includes(contact.id)
                                ? prev.filter(id => id !== contact.id)
                                : [...prev, contact.id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={selectedToAdd.includes(contact.id)}
                            onCheckedChange={() => {
                              setSelectedToAdd(prev =>
                                prev.includes(contact.id)
                                  ? prev.filter(id => id !== contact.id)
                                  : [...prev, contact.id]
                              );
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {contact.stage_name || contact.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {contact.role || contact.email || 'Sin información'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleAddContacts} disabled={selectedToAdd.length === 0}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Añadir ({selectedToAdd.length})
                </Button>
              </DialogFooter>
            </>
          )}

          {/* New contact mode */}
          {dialogMode === 'new' && (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-name">Nombre *</Label>
                  <Input
                    id="new-contact-name"
                    placeholder="Nombre del contacto"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-email">Email</Label>
                  <Input
                    id="new-contact-email"
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-role">Rol</Label>
                  <Input
                    id="new-contact-role"
                    placeholder="Ej: Técnico de sonido"
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateNewContact} disabled={!newContactName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear y añadir
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
