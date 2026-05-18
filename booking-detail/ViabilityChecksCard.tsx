import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  Circle, 
  Users, 
  Truck, 
  Wrench,
  Lock,
  Unlock,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface ViabilityChecksCardProps {
  bookingId: string;
  phase: string;
  viabilityManagerApproved?: boolean;
  viabilityManagerAt?: string;
  viabilityManagerBy?: string;
  viabilityTourManagerApproved?: boolean;
  viabilityTourManagerAt?: string;
  viabilityTourManagerBy?: string;
  viabilityProductionApproved?: boolean;
  viabilityProductionAt?: string;
  viabilityProductionBy?: string;
  viabilityNotes?: string;
  onUpdate: () => void;
}

export function ViabilityChecksCard({
  bookingId,
  phase,
  viabilityManagerApproved = false,
  viabilityManagerAt,
  viabilityManagerBy,
  viabilityTourManagerApproved = false,
  viabilityTourManagerAt,
  viabilityTourManagerBy,
  viabilityProductionApproved = false,
  viabilityProductionAt,
  viabilityProductionBy,
  viabilityNotes = '',
  onUpdate
}: ViabilityChecksCardProps) {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [notes, setNotes] = useState(viabilityNotes);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Dialog state for approval with comment
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    field: 'manager' | 'tour_manager' | 'production' | null;
    label: string;
    currentValue: boolean;
  }>({ open: false, field: null, label: '', currentValue: false });
  const [approvalComment, setApprovalComment] = useState('');

  const allApproved = viabilityManagerApproved && viabilityTourManagerApproved && viabilityProductionApproved;
  const approvalCount = [viabilityManagerApproved, viabilityTourManagerApproved, viabilityProductionApproved].filter(Boolean).length;
  
  // Only show for negociación phase or later
  const isNegociacion = phase === 'negociacion';
  const canEdit = isNegociacion;

  const openApprovalDialog = (field: 'manager' | 'tour_manager' | 'production', label: string, currentValue: boolean) => {
    if (!canEdit) {
      toast({
        title: "No se puede modificar",
        description: "Las aprobaciones solo se pueden modificar en fase de negociación.",
        variant: "destructive"
      });
      return;
    }
    setApprovalDialog({ open: true, field, label, currentValue });
    setApprovalComment('');
  };

  const handleApprovalWithComment = async () => {
    if (!approvalDialog.field) return;
    
    setIsUpdating(approvalDialog.field);
    try {
      const { field, currentValue } = approvalDialog;
      const updateData: Record<string, any> = {};
      const fieldName = `viability_${field}_approved`;
      const timestampField = `viability_${field}_at`;
      const byField = `viability_${field}_by`;
      
      const newApprovalValue = !currentValue;
      updateData[fieldName] = newApprovalValue;
      updateData[timestampField] = newApprovalValue ? new Date().toISOString() : null;
      updateData[byField] = newApprovalValue ? user?.id : null;
      
      // Add comment to internal notes if provided and approving
      if (newApprovalValue && approvalComment.trim()) {
        // Get user profile name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, stage_name')
          .eq('user_id', user?.id)
          .maybeSingle();
        
        const userName = profileData?.stage_name || profileData?.full_name || 'Usuario';
        const roleLabel = field === 'manager' ? 'Manager' : field === 'tour_manager' ? 'Tour Manager' : 'Producción';
        
        // Get existing notes
        const { data: bookingData } = await supabase
          .from('booking_offers')
          .select('notas')
          .eq('id', bookingId)
          .single();
        
        let existingNotes: any[] = [];
        if (bookingData?.notas) {
          try {
            const parsed = JSON.parse(bookingData.notas);
            if (Array.isArray(parsed)) {
              existingNotes = parsed;
            }
          } catch {
            // If it's not JSON, convert to array format
            existingNotes = [{
              id: 'legacy',
              booking_id: bookingId,
              content: bookingData.notas,
              created_by: 'unknown',
              created_at: new Date().toISOString(),
              author_name: 'Sistema'
            }];
          }
        }
        
        // Add new note
        const newNote = {
          id: crypto.randomUUID(),
          booking_id: bookingId,
          content: `✅ Aprobación de ${roleLabel}: ${approvalComment.trim()}`,
          created_by: user?.id || 'unknown',
          created_at: new Date().toISOString(),
          author_name: userName
        };
        
        updateData.notas = JSON.stringify([...existingNotes, newNote]);
      }

      const { error } = await supabase
        .from('booking_offers')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: newApprovalValue ? "Aprobación registrada" : "Aprobación retirada",
        description: `Viabilidad ${approvalDialog.label} ${newApprovalValue ? 'aprobada' : 'pendiente'}.`
      });
      setApprovalDialog({ open: false, field: null, label: '', currentValue: false });
      onUpdate();
    } catch (error) {
      console.error('Error updating viability:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la aprobación.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('booking_offers')
        .update({ viability_notes: notes })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Notas guardadas",
        description: "Las notas de viabilidad se han guardado correctamente."
      });
      setHasChanged(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las notas.",
        variant: "destructive"
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!allApproved) {
      toast({
        title: "No se puede confirmar",
        description: "Faltan aprobaciones de viabilidad.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('booking_offers')
        .update({ 
          phase: 'confirmado',
          estado: 'confirmado'
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "¡Booking confirmado!",
        description: "El concierto ha sido confirmado exitosamente."
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error confirming booking:', error);

      let errorMessage = error?.message || "No se pudo confirmar el booking.";
      let bookingLink = `/booking/${bookingId}?scrollTo=viability`;

      try {
        if (error?.message?.includes('AVAILABILITY_CONFLICT|')) {
          const parts = error.message.split('AVAILABILITY_CONFLICT|')[1]?.split('|');
          if (parts && parts.length >= 4) {
            const [, bookingName, artistName] = parts;
            const displayName = artistName ? `${bookingName} (${artistName})` : bookingName;
            errorMessage = `Solicitud de disponibilidad pendiente: ${displayName}`;
            bookingLink = `/booking/${bookingId}?scrollTo=availability`;
          }
        } else if (error?.message?.includes('No se puede confirmar:')) {
          const reason = error.message.match(/No se puede confirmar:\s*(.+)/)?.[1] || '';
          
          const { data: solicitudData } = await supabase
            .from('action_center')
            .select('id')
            .eq('booking_id', bookingId)
            .eq('item_type', 'booking_request')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (solicitudData?.id) {
            bookingLink = `/solicitudes?id=${solicitudData.id}`;
          }
          
          const { data } = await supabase
            .from('booking_offers')
            .select('festival_ciclo, venue, lugar, artist:artists(stage_name,name)')
            .eq('id', bookingId)
            .maybeSingle();

          const bookingName = (data as any)?.festival_ciclo || (data as any)?.venue || (data as any)?.lugar || 'Booking';
          const artistLabel = (data as any)?.artist?.stage_name || (data as any)?.artist?.name || '';
          const displayName = artistLabel ? `${bookingName} (${artistLabel})` : bookingName;
          errorMessage = `Solicitud de booking: ${displayName} — ${reason || 'Faltan aprobaciones o hay bloqueos activos.'}`;
        }
      } catch {
        // ignore secondary fetch errors
      }

      toast({
        title: "Error al confirmar",
        description: (
          <span>
            {errorMessage}.{' '}
            <a
              href={bookingLink}
              className="underline font-medium hover:text-primary"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = bookingLink;
              }}
            >
              Ver solicitud →
            </a>
          </span>
        ),
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null;
    return format(new Date(timestamp), "d MMM, HH:mm", { locale: es });
  };

  const CheckItem = ({ 
    label, 
    icon: Icon, 
    approved, 
    timestamp,
    approvedBy,
    field,
    color
  }: { 
    label: string; 
    icon: any; 
    approved: boolean; 
    timestamp?: string;
    approvedBy?: string;
    field: 'manager' | 'tour_manager' | 'production';
    color: string;
  }) => (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        approved 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-muted/30 border-border hover:bg-muted/50'
      } ${canEdit ? 'cursor-pointer' : 'opacity-75'}`}
      onClick={() => openApprovalDialog(field, label, approved)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${approved ? 'bg-green-500/20' : `bg-${color}/20`}`}>
          <Icon className={`h-4 w-4 ${approved ? 'text-green-600' : `text-${color}`}`} />
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          {timestamp && approved && (
            <p className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isUpdating === field ? (
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : approved ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  // Don't show if not in negociación or later phases
  if (!['negociacion', 'confirmado', 'facturado'].includes(phase)) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Las verificaciones de viabilidad estarán disponibles cuando el booking pase a fase de <strong>Negociación</strong>.
          </p>
        </CardContent>
      </Card>
    );
  }

  // If all approved, render as collapsible
  if (allApproved) {
    return (
      <>
        <Card>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Unlock className="h-5 w-5 text-green-600" />
                    Viabilidad
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <Badge variant="default" className="bg-green-600">
                    {approvalCount}/3
                  </Badge>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                <CheckItem 
                  label="Manager" 
                  icon={Users} 
                  approved={viabilityManagerApproved} 
                  timestamp={viabilityManagerAt}
                  approvedBy={viabilityManagerBy}
                  field="manager"
                  color="primary"
                />
                <CheckItem 
                  label="Tour Manager" 
                  icon={Truck} 
                  approved={viabilityTourManagerApproved} 
                  timestamp={viabilityTourManagerAt}
                  approvedBy={viabilityTourManagerBy}
                  field="tour_manager"
                  color="blue-600"
                />
                <CheckItem 
                  label="Producción" 
                  icon={Wrench} 
                  approved={viabilityProductionApproved} 
                  timestamp={viabilityProductionAt}
                  approvedBy={viabilityProductionBy}
                  field="production"
                  color="orange-600"
                />

                {/* Confirm button */}
                {isNegociacion && (
                  <div className="pt-3 border-t">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={handleConfirmBooking}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirmar Booking
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Approval Dialog */}
        <Dialog open={approvalDialog.open} onOpenChange={(open) => {
          if (!open) {
            setApprovalDialog({ open: false, field: null, label: '', currentValue: false });
            setApprovalComment('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {approvalDialog.currentValue ? (
                  <>
                    <Circle className="h-5 w-5 text-muted-foreground" />
                    Retirar aprobación de {approvalDialog.label}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Aprobar {approvalDialog.label}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {!approvalDialog.currentValue && (
              <div className="space-y-3">
                <Label htmlFor="approval-comment" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentario (opcional)
                </Label>
                <Textarea
                  id="approval-comment"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder={`Añade un comentario sobre la aprobación de ${approvalDialog.label}...`}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  El comentario se guardará como nota interna con tu nombre.
                </p>
              </div>
            )}

            {approvalDialog.currentValue && (
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que deseas retirar la aprobación de {approvalDialog.label}?
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setApprovalDialog({ open: false, field: null, label: '', currentValue: false });
                  setApprovalComment('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleApprovalWithComment}
                disabled={isUpdating !== null}
                className={approvalDialog.currentValue ? '' : 'bg-green-600 hover:bg-green-700'}
              >
                {isUpdating !== null ? 'Guardando...' : approvalDialog.currentValue ? 'Retirar' : 'Aprobar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Viabilidad
            </CardTitle>
            <Badge variant="secondary">
              {approvalCount}/3
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <CheckItem 
            label="Manager" 
            icon={Users} 
            approved={viabilityManagerApproved} 
            timestamp={viabilityManagerAt}
            approvedBy={viabilityManagerBy}
            field="manager"
            color="primary"
          />
          <CheckItem 
            label="Tour Manager" 
            icon={Truck} 
            approved={viabilityTourManagerApproved} 
            timestamp={viabilityTourManagerAt}
            approvedBy={viabilityTourManagerBy}
            field="tour_manager"
            color="blue-600"
          />
          <CheckItem 
            label="Producción" 
            icon={Wrench} 
            approved={viabilityProductionApproved} 
            timestamp={viabilityProductionAt}
            approvedBy={viabilityProductionBy}
            field="production"
            color="orange-600"
          />

          {/* Confirm button */}
          {isNegociacion && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Faltan {3 - approvalCount} aprobación(es) para confirmar</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog with Comment */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => {
        if (!open) {
          setApprovalDialog({ open: false, field: null, label: '', currentValue: false });
          setApprovalComment('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalDialog.currentValue ? (
                <>
                  <Circle className="h-5 w-5 text-muted-foreground" />
                  Retirar aprobación de {approvalDialog.label}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Aprobar {approvalDialog.label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {!approvalDialog.currentValue && (
            <div className="space-y-3">
              <Label htmlFor="approval-comment" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentario (opcional)
              </Label>
              <Textarea
                id="approval-comment"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={`Añade un comentario sobre la aprobación de ${approvalDialog.label}...`}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                El comentario se guardará como nota interna con tu nombre.
              </p>
            </div>
          )}

          {approvalDialog.currentValue && (
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que deseas retirar la aprobación de {approvalDialog.label}?
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialog({ open: false, field: null, label: '', currentValue: false });
                setApprovalComment('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprovalWithComment}
              disabled={isUpdating !== null}
              className={approvalDialog.currentValue ? '' : 'bg-green-600 hover:bg-green-700'}
            >
              {isUpdating ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {approvalDialog.currentValue ? 'Retirar aprobación' : 'Confirmar aprobación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
