import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Archive, Trash2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SolicitudesBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onUpdate: () => void;
}

export function SolicitudesBulkActions({ 
  selectedIds, 
  onClearSelection, 
  onUpdate 
}: SolicitudesBulkActionsProps) {
  const { profile } = useAuth();

  if (selectedIds.length === 0) return null;

  const handleBulkApprove = async () => {
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({ 
          estado: 'aprobada', 
          fecha_actualizacion: new Date().toISOString(),
          decision_por: profile?.user_id,
          decision_fecha: new Date().toISOString(),
        } as any)
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: '¡Solicitudes aprobadas!',
        description: `Se han aprobado ${selectedIds.length} solicitudes`,
      });
      onClearSelection();
      onUpdate();
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron aprobar las solicitudes',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDeny = async () => {
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({ 
          estado: 'denegada', 
          fecha_actualizacion: new Date().toISOString(),
          decision_por: profile?.user_id,
          decision_fecha: new Date().toISOString(),
        } as any)
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: 'Solicitudes denegadas',
        description: `Se han denegado ${selectedIds.length} solicitudes`,
      });
      onClearSelection();
      onUpdate();
    } catch (error) {
      console.error('Error bulk denying:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron denegar las solicitudes',
        variant: 'destructive',
      });
    }
  };

  const handleBulkArchive = async () => {
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({ 
          archived: true, 
          fecha_actualizacion: new Date().toISOString() 
        } as any)
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: 'Solicitudes archivadas',
        description: `Se han archivado ${selectedIds.length} solicitudes`,
      });
      onClearSelection();
      onUpdate();
    } catch (error) {
      console.error('Error bulk archiving:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron archivar las solicitudes',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 flex items-center gap-3">
        <Badge variant="secondary" className="px-3 py-1">
          {selectedIds.length} seleccionadas
        </Badge>
        
        <div className="h-6 w-px bg-border" />
        
        <Button size="sm" variant="outline" onClick={handleBulkApprove} className="gap-1.5">
          <Check className="w-4 h-4 text-green-600" />
          Aprobar
        </Button>
        
        <Button size="sm" variant="outline" onClick={handleBulkDeny} className="gap-1.5">
          <X className="w-4 h-4 text-red-600" />
          Denegar
        </Button>
        
        <Button size="sm" variant="outline" onClick={handleBulkArchive} className="gap-1.5">
          <Archive className="w-4 h-4" />
          Archivar
        </Button>
        
        <div className="h-6 w-px bg-border" />
        
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <XCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
