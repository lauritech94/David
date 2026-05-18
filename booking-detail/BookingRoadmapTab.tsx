import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MapIcon, 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Plane, 
  Hotel, 
  Clock, 
  ExternalLink,
  ChevronRight 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingRoadmapTabProps {
  bookingId: string;
  artistId?: string | null;
  eventName?: string;
  eventDate?: string | null;
  eventVenue?: string | null;
  eventCity?: string | null;
}

interface LinkedRoadmap {
  id: string;
  name: string;
  promoter: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
  blocks?: {
    block_type: string;
    data: Record<string, unknown>;
  }[];
}

export function BookingRoadmapTab({ bookingId, artistId, eventName, eventDate, eventVenue, eventCity }: BookingRoadmapTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoadmapName, setNewRoadmapName] = useState('');

  // Build suggested roadmap name: "19.02.2026 PLAYGRXVND (La Nau, Barcelona)"
  const buildSuggestedName = () => {
    const parts: string[] = [];
    if (eventDate) {
      const d = new Date(eventDate);
      parts.push(format(d, 'dd.MM.yyyy'));
    }
    if (eventName) parts.push(eventName);
    const locationParts = [eventVenue, eventCity].filter(Boolean);
    if (locationParts.length > 0) {
      parts.push(`(${locationParts.join(', ')})`);
    }
    return parts.join(' ') || 'Nueva Hoja de Ruta';
  };

  // Fetch roadmaps linked to this booking
  const { data: linkedRoadmaps, isLoading } = useQuery({
    queryKey: ['booking-roadmaps', bookingId],
    queryFn: async () => {
      // Check junction table first
      const { data: links, error: linksError } = await supabase
        .from('tour_roadmap_bookings')
        .select('roadmap_id')
        .eq('booking_id', bookingId);
      
      if (linksError) throw linksError;
      
      // Also check legacy direct reference
      const { data: legacyRoadmaps, error: legacyError } = await supabase
        .from('tour_roadmaps')
        .select('id')
        .eq('booking_id', bookingId);
      
      if (legacyError) throw legacyError;
      
      // Combine unique roadmap IDs
      const roadmapIds = new Set([
        ...(links || []).map(l => l.roadmap_id),
        ...(legacyRoadmaps || []).map(r => r.id)
      ]);
      
      if (roadmapIds.size === 0) return [];
      
      // Fetch full roadmap data with blocks
      const { data: roadmaps, error } = await supabase
        .from('tour_roadmaps')
        .select(`
          id,
          name,
          promoter,
          start_date,
          end_date,
          status,
          created_at
        `)
        .in('id', Array.from(roadmapIds))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch blocks for each roadmap
      const roadmapsWithBlocks = await Promise.all(
        (roadmaps || []).map(async (roadmap) => {
          const { data: blocks } = await supabase
            .from('tour_roadmap_blocks')
            .select('block_type, data')
            .eq('roadmap_id', roadmap.id)
            .order('sort_order', { ascending: true });
          
          return { ...roadmap, blocks: blocks || [] };
        })
      );
      
      return roadmapsWithBlocks as LinkedRoadmap[];
    },
    enabled: !!bookingId && !!user,
  });

  // Get unique promoter IDs that are UUIDs
  const promoterIds = (linkedRoadmaps || [])
    .map((r) => r.promoter)
    .filter((p): p is string => !!p && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p));

  // Fetch promoter names from contacts
  const { data: promoterContacts } = useQuery({
    queryKey: ['promoter-contacts', promoterIds],
    queryFn: async () => {
      if (promoterIds.length === 0) return {};
      const { data } = await supabase
        .from('contacts')
        .select('id, name, company')
        .in('id', promoterIds);
      
      const map: Record<string, { name: string | null; company: string | null }> = {};
      data?.forEach(c => {
        map[c.id] = { name: c.name, company: c.company };
      });
      return map;
    },
    enabled: promoterIds.length > 0,
  });

  const getPromoterName = (promoter: string | null): string | null => {
    if (!promoter) return null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promoter);
    if (isUUID && promoterContacts?.[promoter]) {
      return promoterContacts[promoter].name || promoterContacts[promoter].company || null;
    }
    return promoter;
  };

  // Create roadmap mutation
  const createRoadmap = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Create roadmap
      const { data: roadmap, error: createError } = await supabase
        .from('tour_roadmaps')
        .insert({
          name: newRoadmapName || eventName || 'Nueva Hoja de Ruta',
          artist_id: artistId,
          created_by: user.id,
          start_date: eventDate,
          end_date: eventDate,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Link booking to roadmap via junction table
      const { error: linkError } = await supabase
        .from('tour_roadmap_bookings')
        .insert({
          roadmap_id: roadmap.id,
          booking_id: bookingId,
          sort_order: 0,
        });
      
      if (linkError) throw linkError;
      
      return roadmap;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking-roadmaps', bookingId] });
      toast({ title: 'Hoja de ruta creada' });
      setShowCreateDialog(false);
      setNewRoadmapName('');
      navigate(`/roadmaps/${data.id}`);
    },
    onError: (error) => {
      toast({ 
        title: 'Error al crear hoja de ruta', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
      confirmed: { label: 'Confirmado', className: 'bg-green-100 text-green-700 border-green-300' },
      completed: { label: 'En Revisión', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      cancelled: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    };
    const variant = variants[status] || variants.draft;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  const getBlockSummary = (blocks: LinkedRoadmap['blocks']) => {
    if (!blocks || blocks.length === 0) return null;
    
    const summary: { travel: number; hotel: number; schedule: number } = { travel: 0, hotel: 0, schedule: 0 };
    
    blocks.forEach(block => {
      if (block.block_type === 'travel') {
        const data = block.data as { trips?: unknown[] };
        summary.travel = data.trips?.length || 0;
      }
      if (block.block_type === 'hospitality') {
        const data = block.data as { hotels?: unknown[] };
        summary.hotel = data.hotels?.length || 0;
      }
      if (block.block_type === 'schedule') {
        const data = block.data as { days?: unknown[] };
        summary.schedule = data.days?.length || 0;
      }
    });
    
    return summary;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!linkedRoadmaps || linkedRoadmaps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<MapIcon className="h-8 w-8 text-muted-foreground" />}
            title="Sin hoja de ruta"
            description="Este evento aún no tiene una hoja de ruta vinculada. Crea una para gestionar viajes, hospedaje y horarios."
            action={{
              label: "Crear Hoja de Ruta",
              onClick: () => { setNewRoadmapName(buildSuggestedName()); setShowCreateDialog(true); },
            }}
          />
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Hoja de Ruta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="roadmap-name">Nombre</Label>
                  <Input
                    id="roadmap-name"
                    placeholder={eventName || 'Nombre de la gira'}
                    value={newRoadmapName}
                    onChange={(e) => setNewRoadmapName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createRoadmap.mutate()}
                  disabled={createRoadmap.isPending}
                >
                  {createRoadmap.isPending ? 'Creando...' : 'Crear Hoja de Ruta'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          Hojas de Ruta
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { setNewRoadmapName(buildSuggestedName()); setShowCreateDialog(true); }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedRoadmaps.map((roadmap) => {
          const summary = getBlockSummary(roadmap.blocks);
          
          return (
            <div
              key={roadmap.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => navigate(`/roadmaps/${roadmap.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{roadmap.name}</h3>
                    {getStatusBadge(roadmap.status)}
                  </div>
                  
                  {getPromoterName(roadmap.promoter) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {getPromoterName(roadmap.promoter)}
                    </p>
                  )}
                  
                  {(roadmap.start_date || roadmap.end_date) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {roadmap.start_date && format(new Date(roadmap.start_date), "d MMM yyyy", { locale: es })}
                      {roadmap.start_date && roadmap.end_date && roadmap.start_date !== roadmap.end_date && ' → '}
                      {roadmap.end_date && roadmap.start_date !== roadmap.end_date && format(new Date(roadmap.end_date), "d MMM yyyy", { locale: es })}
                    </p>
                  )}
                  
                  {/* Block summary */}
                  {summary && (summary.travel > 0 || summary.hotel > 0 || summary.schedule > 0) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      {summary.travel > 0 && (
                        <span className="flex items-center gap-1">
                          <Plane className="h-3 w-3" />
                          {summary.travel} viaje{summary.travel > 1 ? 's' : ''}
                        </span>
                      )}
                      {summary.hotel > 0 && (
                        <span className="flex items-center gap-1">
                          <Hotel className="h-3 w-3" />
                          {summary.hotel} hotel{summary.hotel > 1 ? 'es' : ''}
                        </span>
                      )}
                      {summary.schedule > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {summary.schedule} día{summary.schedule > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/roadmaps/${roadmap.id}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
      
      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Hoja de Ruta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roadmap-name">Nombre</Label>
              <Input
                id="roadmap-name"
                placeholder={eventName || 'Nombre de la gira'}
                value={newRoadmapName}
                onChange={(e) => setNewRoadmapName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createRoadmap.mutate()}
              disabled={createRoadmap.isPending}
            >
              {createRoadmap.isPending ? 'Creando...' : 'Crear Hoja de Ruta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
