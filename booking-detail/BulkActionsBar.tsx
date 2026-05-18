import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { X, Trash2, ArrowRight, Download, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BulkActionsBarProps {
  selectedIds: string[];
  offerMetaById?: Record<string, { bookingName: string; artistLabel?: string }>;
  onClear: () => void;
  onRefresh: () => void;
  phases: { id: string; label: string }[];
}

export function BulkActionsBar({ selectedIds, offerMetaById, onClear, onRefresh, phases }: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetPhase, setTargetPhase] = useState<string>('');

  if (selectedIds.length === 0) return null;

  const handleBulkMove = async () => {
    if (!targetPhase) {
      toast({
        title: "Selecciona una fase",
        description: "Elige la fase a la que mover las ofertas.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('booking_offers')
        .update({ phase: targetPhase })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Ofertas movidas",
        description: `${selectedIds.length} ofertas movidas a ${phases.find(p => p.id === targetPhase)?.label}`,
      });
      onClear();
      onRefresh();
    } catch (error: any) {
      console.error('Error moving offers:', error);
      
      // Extract the specific error message from the database
      let errorMessage = "No se pudieron mover las ofertas.";
      let bookingLink: string | null = null;
      
      if (error?.message) {
        if (error.message.includes('AVAILABILITY_CONFLICT|')) {
          // Parse the structured error: AVAILABILITY_CONFLICT|request_id|booking_name|artist_name|booking_id
          const parts = error.message.split('AVAILABILITY_CONFLICT|')[1]?.split('|');
          if (parts && parts.length >= 4) {
            const [, bookingName, artistName, bookingId] = parts;
            const displayName = artistName ? `${bookingName} (${artistName})` : bookingName;
            errorMessage = `Solicitud de disponibilidad pendiente: ${displayName}`;
            bookingLink = `/booking/${bookingId}?scrollTo=availability`;
          } else {
            errorMessage = "Hay conflictos de disponibilidad del equipo sin resolver";
          }
        } else if (error.message.includes('No se puede confirmar:')) {
          const reason = error.message.match(/No se puede confirmar:\s*(.+)/)?.[1] || '';
          if (selectedIds.length === 1) {
            const bookingId = selectedIds[0];
            const meta = offerMetaById?.[bookingId];
            const bookingName = meta?.bookingName || 'Booking';
            const artistLabel = meta?.artistLabel;
            const displayName = artistLabel ? `${bookingName} (${artistLabel})` : bookingName;
            errorMessage = `Solicitud de booking: ${displayName} — ${reason || 'Faltan aprobaciones o hay bloqueos activos.'}`;
            
            // Try to find the associated solicitud in action_center
            const { data: solicitudData } = await supabase
              .from('action_center')
              .select('id')
              .eq('booking_id', bookingId)
              .eq('item_type', 'booking_request')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            bookingLink = solicitudData?.id 
              ? `/solicitudes?id=${solicitudData.id}`
              : `/booking/${bookingId}?scrollTo=viability`;
          } else {
            errorMessage = `No se puede confirmar: ${reason || 'Faltan aprobaciones o hay bloqueos activos.'}`;
          }
        }
      }
      
      toast({
        title: "Error",
        description: bookingLink ? (
          <span>
            {errorMessage}.{' '}
            <a 
              href={bookingLink} 
              className="underline font-medium hover:text-primary"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = bookingLink!;
              }}
            >
              Ver solicitud →
            </a>
          </span>
        ) : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('booking_offers')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Ofertas eliminadas",
        description: `${selectedIds.length} ofertas eliminadas correctamente.`,
      });
      setShowDeleteConfirm(false);
      onClear();
      onRefresh();
    } catch (error) {
      console.error('Error deleting offers:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las ofertas.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDuplicate = async () => {
    setIsProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) throw new Error('No autenticado');

      let successCount = 0;
      for (const bookingId of selectedIds) {
        const { error } = await supabase.rpc('duplicate_booking_deep', {
          p_booking_id: bookingId,
          p_user_id: userData.user.id,
        });
        if (error) {
          console.error(`Error duplicating ${bookingId}:`, error);
        } else {
          successCount++;
        }
      }

      toast({
        title: "Ofertas duplicadas",
        description: `${successCount} de ${selectedIds.length} ofertas duplicadas con todos sus datos.`,
      });
      onClear();
      onRefresh();
    } catch (error) {
      console.error('Error duplicating offers:', error);
      toast({
        title: "Error",
        description: "No se pudieron duplicar las ofertas.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {selectedIds.length} seleccionadas
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Select value={targetPhase} onValueChange={setTargetPhase}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Mover a..." />
            </SelectTrigger>
            <SelectContent>
              {phases.map(phase => (
                <SelectItem key={phase.id} value={phase.id}>
                  {phase.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBulkMove}
            disabled={!targetPhase || isProcessing}
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            Mover
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBulkDuplicate}
          disabled={isProcessing}
        >
          <Copy className="h-4 w-4 mr-1" />
          Duplicar
        </Button>

        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isProcessing}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Eliminar
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.length} ofertas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán permanentemente las ofertas seleccionadas
              junto con todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
