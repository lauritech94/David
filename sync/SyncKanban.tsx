import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SyncOffer } from '@/pages/Sincronizaciones';
import { SyncOfferDetailDialog } from './SyncOfferDetailDialog';
import { 
  Film, Tv, Video, Radio, Gamepad2, Music, 
  FileText, MessageSquare, PenLine, CheckCircle, DollarSign,
  GripVertical, Plus
} from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';

interface SyncKanbanProps {
  offers: SyncOffer[];
  onUpdate: () => void;
}

const PHASES = [
  { id: 'solicitud', label: 'Solicitud / Lead', icon: FileText, color: 'bg-blue-50 border-blue-200' },
  { id: 'cotizacion', label: 'Cotización', icon: PenLine, color: 'bg-amber-50 border-amber-200' },
  { id: 'negociacion', label: 'Negociación', icon: MessageSquare, color: 'bg-purple-50 border-purple-200' },
  { id: 'licencia_firmada', label: 'Licencia Firmada', icon: CheckCircle, color: 'bg-green-50 border-green-200' },
  { id: 'facturado', label: 'Facturado / Cobrado', icon: DollarSign, color: 'bg-emerald-50 border-emerald-200' },
];

function getProductionIcon(type: string) {
  switch (type) {
    case 'cine': return <Film className="h-3.5 w-3.5" />;
    case 'serie': return <Tv className="h-3.5 w-3.5" />;
    case 'publicidad': return <Video className="h-3.5 w-3.5" />;
    case 'podcast': return <Radio className="h-3.5 w-3.5" />;
    case 'videojuego': return <Gamepad2 className="h-3.5 w-3.5" />;
    default: return <Music className="h-3.5 w-3.5" />;
  }
}

function DraggableSyncCard({ offer, onClick }: { offer: SyncOffer; onClick: () => void }) {
  const [hasDragged, setHasDragged] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: offer.id,
    data: offer,
  });

  useEffect(() => {
    if (isDragging) setHasDragged(true);
  }, [isDragging]);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && !hasDragged) onClick();
    setHasDragged(false);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className="cursor-pointer hover:shadow-md transition-all duration-150 bg-card border group"
        onClick={handleCardClick}
      >
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground leading-tight truncate">
                {offer.production_title}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                🎵 {offer.song_title}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={() => setHasDragged(false)}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
              {getProductionIcon(offer.production_type)}
              {offer.production_type}
            </Badge>
            {offer.territory && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                🌍 {offer.territory}
              </Badge>
            )}
            {offer.sync_fee && (
              <span className="text-xs font-semibold text-primary ml-auto">
                €{offer.sync_fee.toLocaleString()}
              </span>
            )}
          </div>

          {offer.requester_company && (
            <p className="text-xs text-muted-foreground truncate">
              📍 {offer.requester_company}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({ 
  phase, 
  offers,
  onOfferClick 
}: { 
  phase: typeof PHASES[0]; 
  offers: SyncOffer[];
  onOfferClick: (offer: SyncOffer) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase.id });

  return (
    <Card className={`${phase.color} border-2 transition-all duration-200 hover:shadow-sm ${
      isOver ? 'ring-2 ring-primary' : ''
    }`}>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold text-foreground">
            {phase.label}
          </CardTitle>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-medium">
            {offers.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3" ref={setNodeRef}>
        {offers.map((offer) => (
          <DraggableSyncCard 
            key={offer.id} 
            offer={offer} 
            onClick={() => onOfferClick(offer)}
          />
        ))}
        {offers.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-xs">
            <div className="w-6 h-6 bg-muted/50 rounded flex items-center justify-center mx-auto mb-1.5">
              <Plus className="w-3 h-3" />
            </div>
            <p className="font-medium">Sin ofertas</p>
            <p className="text-xs opacity-70 mt-0.5">Arrastra aquí</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SyncKanban({ offers, onUpdate }: SyncKanbanProps) {
  const [activeOffer, setActiveOffer] = useState<SyncOffer | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SyncOffer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const handleDragStart = (event: DragStartEvent) => {
    const offer = offers.find(o => o.id === event.active.id);
    if (offer) setActiveOffer(offer);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveOffer(null);
    const { active, over } = event;
    if (!over) return;
    
    const offerId = active.id as string;
    const newPhase = over.id as string;
    const offer = offers.find(o => o.id === offerId);
    if (!offer || offer.phase === newPhase) return;

    try {
      const { error } = await supabase
        .from('sync_offers')
        .update({ phase: newPhase, updated_at: new Date().toISOString() })
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `La oferta se movió a "${PHASES.find(p => p.id === newPhase)?.label}"`,
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating sync offer phase:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la oferta.",
        variant: "destructive",
      });
    }
  };

  const handleOfferClick = (offer: SyncOffer) => {
    setSelectedOffer(offer);
    setShowDetailDialog(true);
  };

  const getOffersByPhase = (phaseId: string) => 
    offers.filter(o => o.phase === phaseId);

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-3 min-h-[500px]">
          {PHASES.map((phase) => (
            <DroppableColumn
              key={phase.id}
              phase={phase}
              offers={getOffersByPhase(phase.id)}
              onOfferClick={handleOfferClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOffer && (
            <Card className="cursor-grabbing shadow-xl rotate-3 scale-105">
              <CardContent className="p-3 space-y-1">
                <p className="font-semibold text-sm">{activeOffer.production_title}</p>
                <p className="text-xs text-muted-foreground">
                  🎵 {activeOffer.song_title}
                </p>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      <SyncOfferDetailDialog
        offer={selectedOffer}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onUpdate={onUpdate}
      />
    </>
  );
}
