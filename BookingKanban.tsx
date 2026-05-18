import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, ShieldCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CompactBookingCard } from './CompactBookingCard';
import { CreateBookingWizard } from './CreateBookingWizard';
import { exportToCSV, generateOfferNumber } from '@/utils/exportUtils';
import { exportToExcel, generateBookingExportData, BOOKING_EXPORT_HEADERS } from '@/utils/excelExport';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { useGlobalSearch } from '@/hooks/useKeyboardShortcuts';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { UpcomingEventsWidget } from './booking-detail/UpcomingEventsWidget';
import { BulkActionsBar } from './booking-detail/BulkActionsBar';
import { BookingFiltersToolbar, BookingFiltersState } from './BookingFiltersToolbar';
import { useAutoRealizado } from '@/hooks/useAutoRealizado';
import { PagoDialog } from './PagoDialog';
import { Progress } from '@/components/ui/progress';
import { Check, Clock, Handshake } from 'lucide-react';
import { useBookingBuddy } from '@/hooks/useBookingBuddy';
import { BuddyPanel } from './booking-detail/BuddyPanel';
import { BookingAlertBanners } from './booking-detail/BookingAlertBanners';
import { KpiStatsBar } from './booking-detail/KpiStatsBar';

/*
  BOOKING PHASE STATE MACHINE
  ════════════════════════════

  MANUAL transitions (drag & drop or button):
  Interés → Oferta → Negociación → Confirmado*
  Any phase → Cerrado
  Any phase → Cancelado
  Realizado → Facturado (via MarcarCobradoDialog)

  * Confirmado requires viability guard:
    viability_manager + tour_manager + production = true
    (can be bypassed with explicit confirmation)

  AUTOMATIC transitions (cron + client fallback):
  Confirmado → Realizado: when fecha < CURRENT_DATE

  AUTOMATIC alerts (not transitions):
  Realizado + 7 days: cobro_pendiente_7d notification
  Realizado + 30 days: cobro_vencido_30d notification
  Oferta/Negociación + 30 days no activity: stale alert
*/
export interface BookingOffer {
  id: string;
  phase: string;
  promotor?: string;
  ciudad?: string;
  pais?: string;
  fecha?: string;
  venue?: string;
  fee?: number;
  gastos_estimados?: number;
  comision_porcentaje?: number;
  comision_euros?: number;
  es_cityzen?: boolean;
  es_internacional?: boolean;
  estado_facturacion?: string;
  adjuntos?: any;
  notas?: string;
  sort_order?: number;
  festival_ciclo?: string;
  lugar?: string;
  capacidad?: number;
  estado?: string;
  oferta?: string;
  formato?: string;
  contacto?: string;
  tour_manager?: string;
  info_comentarios?: string;
  condiciones?: string;
  link_venta?: string;
  inicio_venta?: string;
  contratos?: string;
  artist_id?: string;
  project_id?: string;
  event_id?: string;
  hora?: string;
  folder_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Payment fields
  anticipo_porcentaje?: number;
  anticipo_importe?: number;
  anticipo_fecha_esperada?: string;
  anticipo_fecha_cobro?: string;
  anticipo_estado?: string;
  anticipo_referencia?: string;
  liquidacion_importe?: number;
  liquidacion_fecha_esperada?: string;
  liquidacion_fecha_cobro?: string;
  liquidacion_estado?: string;
  liquidacion_referencia?: string;
  cobro_estado?: string;
  // Joined fields
  artist?: {
    id: string;
    name: string;
    stage_name?: string;
  };
  // Availability status for pending action indicator
  availability_status?: 'all_available' | 'has_conflicts' | 'pending' | null;
  // Viability approvals
  viability_manager_approved?: boolean | null;
  viability_tour_manager_approved?: boolean | null;
  viability_production_approved?: boolean | null;
}

function needsConfirmGuard(offer: BookingOffer): boolean {
  return !(offer.viability_manager_approved &&
           offer.viability_tour_manager_approved &&
           offer.viability_production_approved);
}

// Main pipeline phases - displayed prominently
const MAIN_PHASES = [
  { id: 'interes', label: 'Interés', color: 'bg-slate-50 border-slate-200' },
  { id: 'oferta', label: 'Oferta', color: 'bg-blue-50 border-blue-200' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-amber-50 border-amber-200' },
  { id: 'confirmado', label: 'Confirmado', color: 'bg-green-50 border-green-200' },
  { id: 'realizado', label: 'Realizado', color: 'bg-purple-50 border-purple-200' },
  { id: 'facturado', label: 'Facturado', color: 'bg-emerald-50 border-emerald-200' },
];

// Archive phases - displayed in a compact section
const ARCHIVE_PHASES = [
  { id: 'cerrado', label: 'Cerrado', color: 'bg-purple-50 border-purple-200' },
  { id: 'cancelado', label: 'Cancelado', color: 'bg-red-50 border-red-200' }
];

// Combined for filtering and other operations
const PHASES = [...MAIN_PHASES, ...ARCHIVE_PHASES];

interface BookingKanbanProps {
  templateFields: any[];
}

interface Artist {
  id: string;
  name: string;
  stage_name?: string;
}

export function BookingKanban({ templateFields }: BookingKanbanProps) {
  const [searchParams] = useSearchParams();
  const artistIdFromUrl = searchParams.get('artistId');
  
  const [offers, setOffers] = useState<BookingOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<BookingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [pendingConfirmOffer, setPendingConfirmOffer] = useState<string | null>(null);
  const [cobradoBooking, setCobradoBooking] = useState<BookingOffer | null>(null);
  const [buddyOpen, setBuddyOpen] = useState(() => {
    try { return localStorage.getItem('buddy-panel-open') === 'true'; } catch { return false; }
  });

  // Buddy system
  const { urgentAlerts, upcomingActions, pipelineSummary, alertBanners, dismissAlert, markCheckpointDone } = useBookingBuddy(offers);

  const toggleBuddy = () => {
    setBuddyOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('buddy-panel-open', String(next)); } catch {}
      return next;
    });
  };
  
  // Auto-transition confirmado → realizado on page load
  useAutoRealizado();
  
  const [filters, setFilters] = useState<BookingFiltersState>({
    searchTerm: '',
    artistFilter: artistIdFromUrl || 'all',
    phaseFilter: [],
    countryFilter: 'all',
    promoterFilter: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    showInternational: 'all',
  });
  
  const { showGlobalSearch, setShowGlobalSearch } = useGlobalSearch();

  const offerMetaById = useMemo(() => {
    return Object.fromEntries(
      offers.map((o) => {
        const bookingName = o.festival_ciclo || o.venue || o.lugar || 'Booking';
        const artistLabel = o.artist?.stage_name || o.artist?.name || '';
        return [o.id, { bookingName, artistLabel }];
      })
    ) as Record<string, { bookingName: string; artistLabel: string }>;
  }, [offers]);
  useEffect(() => {
    if (artistIdFromUrl) {
      setFilters(prev => ({ ...prev, artistFilter: artistIdFromUrl }));
    }
  }, [artistIdFromUrl]);

  useEffect(() => {
    fetchOffers();
    fetchArtists();

    // Subscribe to real-time updates on booking_offers
    const channel = supabase
      .channel('booking-offers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_offers'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Refetch all offers when any change happens
          fetchOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [offers, filters]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_offers')
        .select(`
          *,
          artist:artists(id, name, stage_name)
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Fetch availability status for all bookings (not just interes phase)
      const allBookingIds = (data || []).map(o => o.id);
      
      let availabilityMap: Record<string, 'all_available' | 'has_conflicts' | 'pending' | null> = {};
      
      if (allBookingIds.length > 0) {
        const { data: requests } = await supabase
          .from('booking_availability_requests')
          .select('booking_id, id')
          .in('booking_id', allBookingIds);
        
        if (requests && requests.length > 0) {
          const requestIds = requests.map(r => r.id);
          const { data: responses } = await supabase
            .from('booking_availability_responses')
            .select('request_id, status')
            .in('request_id', requestIds);
          
          // Build availability status per booking
          for (const req of requests) {
            const bookingResponses = (responses || []).filter(r => r.request_id === req.id);
            if (bookingResponses.length === 0) {
              availabilityMap[req.booking_id] = null;
            } else {
              const hasConflicts = bookingResponses.some(r => r.status === 'unavailable');
              const allResponded = bookingResponses.every(r => r.status !== 'pending');
              const allAvailable = allResponded && !hasConflicts;
              
              if (allAvailable) {
                availabilityMap[req.booking_id] = 'all_available';
              } else if (hasConflicts) {
                availabilityMap[req.booking_id] = 'has_conflicts';
              } else {
                availabilityMap[req.booking_id] = 'pending';
              }
            }
          }
        }
      }
      
      // Map data to ensure artist is a single object, not an array
      const mappedOffers = (data || []).map(offer => ({
        ...offer,
        artist: Array.isArray(offer.artist) ? offer.artist[0] : offer.artist,
        availability_status: availabilityMap[offer.id] || null
      })) as BookingOffer[];
      
      setOffers(mappedOffers);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ofertas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name', { ascending: true });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...offers];

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(offer => 
        offer.venue?.toLowerCase().includes(term) ||
        offer.ciudad?.toLowerCase().includes(term) ||
        offer.promotor?.toLowerCase().includes(term) ||
        offer.festival_ciclo?.toLowerCase().includes(term) ||
        offer.artist?.name?.toLowerCase().includes(term) ||
        offer.artist?.stage_name?.toLowerCase().includes(term)
      );
    }

    // Phase filter
    if (filters.phaseFilter.length > 0) {
      filtered = filtered.filter(offer => offer.phase != null && filters.phaseFilter.includes(offer.phase));
    }

    // Country filter
    if (filters.countryFilter !== 'all') {
      filtered = filtered.filter(offer => offer.pais === filters.countryFilter);
    }

    // Promoter filter
    if (filters.promoterFilter !== 'all') {
      filtered = filtered.filter(offer => offer.promotor === filters.promoterFilter);
    }

    // Artist filter
    if (filters.artistFilter !== 'all') {
      filtered = filtered.filter(offer => offer.artist_id === filters.artistFilter);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(offer => {
        if (!offer.fecha) return false;
        return new Date(offer.fecha) >= filters.dateFrom!;
      });
    }
    if (filters.dateTo) {
      filtered = filtered.filter(offer => {
        if (!offer.fecha) return false;
        return new Date(offer.fecha) <= filters.dateTo!;
      });
    }

    // International filter
    if (filters.showInternational !== 'all') {
      filtered = filtered.filter(offer => offer.es_internacional === filters.showInternational);
    }


    setFilteredOffers(filtered);
  };

  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      artistFilter: 'all',
      phaseFilter: [],
      countryFilter: 'all',
      promoterFilter: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      showInternational: 'all',
      
    });
  };

  const handleFiltersChange = (newFilters: Partial<BookingFiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const getUniqueValues = (field: keyof BookingOffer) => {
    const values = offers
      .map(offer => offer[field])
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    return [...new Set(values)].sort();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || active.id === over.id) return;

    const activeOffer = offers.find(offer => offer.id === active.id);
    if (!activeOffer) return;

    // Check if dropping in a different phase
    const newPhase = over.id as string;
    if (PHASES.some(phase => phase.id === newPhase)) {
      // Intercept drag to confirmado - show confirmation dialog
      if (newPhase === 'confirmado' && activeOffer.phase !== 'confirmado' && needsConfirmGuard(activeOffer)) {
        setPendingConfirmOffer(activeOffer.id);
        return;
      }
      await updateOfferPhase(activeOffer.id, newPhase);
    } else {
      // Reordering within the same phase
      const oldIndex = offers.findIndex(offer => offer.id === active.id);
      const newIndex = offers.findIndex(offer => offer.id === over.id);
      
      if (oldIndex !== newIndex) {
        const newOffers = arrayMove(offers, oldIndex, newIndex);
        setOffers(newOffers);
        await updateSortOrder(newOffers);
      }
    }
  };

  const updateOfferPhase = async (offerId: string, newPhase: string) => {
    try {
      const updateData: Record<string, any> = { phase: newPhase, estado: newPhase };
      if (newPhase === 'confirmado') {
        updateData.viability_manager_approved = true;
        updateData.viability_tour_manager_approved = true;
        updateData.viability_production_approved = true;
      }
      const { error } = await supabase
        .from('booking_offers')
        .update(updateData)
        .eq('id', offerId);

      if (error) throw error;

      // Validate commission for international shows
      const offer = offers.find(o => o.id === offerId);
      if (offer?.es_internacional && offer?.comision_porcentaje && offer?.comision_porcentaje > 10) {
        toast({
          title: "Aviso: Comisión alta",
          description: "Para shows internacionales, las comisiones totales no deberían superar el 10% del caché bruto.",
          variant: "destructive",
        });
      }

      fetchOffers();
      toast({
        title: "Fase actualizada",
        description: `La oferta se movió a ${PHASES.find(p => p.id === newPhase)?.label}`,
      });
    } catch (error: any) {
      console.error('Error updating phase:', error);
      
      // Extract the specific error message from the database
      let errorMessage = "No se pudo actualizar la fase.";
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
          const offer = offers.find(o => o.id === offerId);
          if (offer) {
            const bookingName = offer.festival_ciclo || offer.venue || offer.lugar || 'Booking';
            const artistLabel = offer.artist?.stage_name || offer.artist?.name;
            const displayName = artistLabel ? `${bookingName} (${artistLabel})` : bookingName;
            errorMessage = `Solicitud de booking: ${displayName} — ${reason || 'Faltan aprobaciones o hay bloqueos activos.'}`;
            
            // Try to find the associated solicitud in action_center
            const { data: solicitudData } = await supabase
              .from('action_center')
              .select('id')
              .eq('booking_id', offerId)
              .eq('item_type', 'booking_request')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            bookingLink = solicitudData?.id 
              ? `/solicitudes?id=${solicitudData.id}`
              : `/booking/${offerId}?scrollTo=viability`;
          } else {
            errorMessage = error.message;
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
    }
  };

  const updateSortOrder = async (newOffers: BookingOffer[]) => {
    try {
      const updates = newOffers.map((offer, index) => ({
        id: offer.id,
        sort_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('booking_offers')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error updating sort order:', error);
    }
  };

  const deleteOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('booking_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      fetchOffers();
      toast({
        title: "Oferta eliminada",
        description: "La oferta se ha eliminado correctamente.",
      });
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la oferta.",
        variant: "destructive",
      });
    }
  };

  const duplicateOffer = async (offerId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) throw new Error('No autenticado');

      const { data, error } = await supabase.rpc('duplicate_booking_deep', {
        p_booking_id: offerId,
        p_user_id: userData.user.id,
      });

      if (error) throw error;

      fetchOffers();
      toast({
        title: "Oferta duplicada",
        description: "Se duplicó la oferta con presupuesto, hoja de ruta, documentos, gastos e itinerario.",
      });
    } catch (error) {
      console.error('Error duplicating offer:', error);
      toast({
        title: "Error",
        description: "No se pudo duplicar la oferta.",
        variant: "destructive",
      });
    }
  };

  const getOffersByPhase = (phase: string) => {
    return filteredOffers.filter(offer => offer.phase === phase);
  };

  // Removed duplicate getUniqueValues - now defined earlier in the component

  const toggleSelection = (offerId: string) => {
    setSelectedIds(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleExportExcel = () => {
    try {
      const exportData = generateBookingExportData(filteredOffers, PHASES);
      exportToExcel(exportData, {
        filename: 'booking_kanban',
        sheetName: 'Ofertas',
        headers: BOOKING_EXPORT_HEADERS,
      });
      toast({
        title: "Exportación exitosa",
        description: `${exportData.length} ofertas exportadas a Excel`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar a Excel",
        variant: "destructive",
      });
    }
  };

  const handleExportFiltered = () => {
    try {
      const csvHeaders = {
        phase: 'Fase',
        fecha: 'Fecha',
        promotor: 'Promotor',
        ciudad: 'Ciudad',
        pais: 'País',
        venue: 'Venue',
        fee: 'Fee (€)',
        gastos_estimados: 'Gastos Estimados (€)',
        comision_porcentaje: 'Comisión (%)',
        es_internacional: 'Internacional',
        estado_facturacion: 'Estado Facturación',
        offer_number: 'Número Oferta'
      };

      const exportData = filteredOffers.map(offer => ({
        phase: PHASES.find(p => p.id === offer.phase)?.label || offer.phase,
        fecha: offer.fecha ? new Date(offer.fecha).toLocaleDateString() : '',
        promotor: offer.promotor || '',
        ciudad: offer.ciudad || '',
        pais: offer.pais || '',
        venue: offer.venue || '',
        fee: offer.fee || 0,
        gastos_estimados: offer.gastos_estimados || 0,
        comision_porcentaje: offer.comision_porcentaje || 0,
        es_internacional: offer.es_internacional ? 'Sí' : 'No',
        estado_facturacion: offer.estado_facturacion || '',
        offer_number: generateOfferNumber(offer)
      }));

      const filterSuffix = filters.phaseFilter.length > 0 || filters.countryFilter !== 'all' || filters.promoterFilter !== 'all' || filters.searchTerm 
        ? '_filtrado' 
        : '';
      
      exportToCSV(exportData, `kanban_booking${filterSuffix}`, csvHeaders);
      
      toast({
        title: "Exportación exitosa",
        description: `${exportData.length} ofertas exportadas correctamente`,
      });
    } catch (error) {
      console.error('Error exporting offers:', error);
      toast({
        title: "Error de exportación",
        description: "No se pudieron exportar las ofertas",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-40 h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="w-32 h-10 bg-muted rounded animate-pulse" />
            <div className="w-32 h-10 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {MAIN_PHASES.map(phase => (
            <Card key={phase.id} className={`${phase.color} border-2`}>
              <CardSkeleton contentLines={3} />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Buddy toggle + Alert banners */}
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={toggleBuddy}
        >
          <Handshake className="h-4 w-4" />
          Buddy
          {urgentAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5 ml-1">{urgentAlerts.length}</Badge>
          )}
        </Button>
      </div>

      <BookingAlertBanners
        banners={alertBanners}
        onAction={(action) => {
          if (action === 'cobros') {
            // Scroll to realizado column
            const el = document.querySelector('[data-phase="realizado"]');
            el?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Filters Toolbar */}
      <BookingFiltersToolbar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={clearAllFilters}
        artists={artists}
        phases={PHASES}
        countries={getUniqueValues('pais')}
        promoters={getUniqueValues('promotor')}
        filteredCount={filteredOffers.length}
        totalCount={offers.length}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportFiltered}
        onNewOffer={() => setShowCreateWizard(true)}
        selectionMode={selectionMode}
        onToggleSelection={() => {
          setSelectionMode(!selectionMode);
          if (selectionMode) clearSelection();
        }}
      />

      {/* Configurable KPI Stats Bar */}
      <KpiStatsBar filteredOffers={filteredOffers} />

      {/* Kanban Board - Main Phases */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-3 min-h-[500px]">
          {MAIN_PHASES.map(phase => {
            const phaseOffers = getOffersByPhase(phase.id);
            const isRealizado = phase.id === 'realizado';
            const pendingTotal = isRealizado
              ? phaseOffers.reduce((s, o) => s + (o.fee || 0), 0)
              : 0;
            
            return (
              <Card key={phase.id} data-phase={phase.id} className={`${phase.color} border-2 transition-all duration-200 hover:shadow-sm`}>
                <CardHeader className="pb-2 px-3 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold text-foreground">
                      {phase.label}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-medium">
                        {phaseOffers.length}
                      </Badge>
                      {!isRealizado && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-primary/10"
                          onClick={() => setShowCreateWizard(true)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {isRealizado && pendingTotal > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      €{pendingTotal.toLocaleString('es-ES')} pendiente de cobro
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  <SortableContext items={phaseOffers.map(offer => offer.id)}>
                    {phaseOffers.map(offer => {
                      // Days counter for Realizado cards
                      const daysSinceEvent = isRealizado && offer.fecha
                        ? Math.floor((Date.now() - new Date(offer.fecha).getTime()) / 86400000)
                        : null;

                      return (
                        <div key={offer.id} className="relative">
                          {/* Days counter badge for Realizado */}
                          {daysSinceEvent !== null && (
                            <div className="absolute -top-1 -right-1 z-10">
                              <Badge className={`text-xs px-1.5 py-0.5 ${
                                daysSinceEvent >= 30
                                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                                  : daysSinceEvent >= 7
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-500 text-white'
                              }`}>
                                {daysSinceEvent}d{daysSinceEvent >= 7 ? (daysSinceEvent >= 30 ? ' 🔴' : ' ⚠') : ''}
                              </Badge>
                            </div>
                          )}
                          <CompactBookingCard
                            offer={offer}
                            onDuplicate={duplicateOffer}
                            onDelete={deleteOffer}
                            onChangePhase={(id, newPhase) => {
                              if (newPhase === 'confirmado' && offer.phase !== 'confirmado' && needsConfirmGuard(offer)) {
                                setPendingConfirmOffer(id);
                              } else {
                                updateOfferPhase(id, newPhase);
                              }
                            }}
                            isDragging={draggedItem === offer.id}
                            selectionMode={selectionMode}
                            isSelected={selectedIds.includes(offer.id)}
                            onToggleSelect={toggleSelection}
                          />
                          {/* Realizado payment status */}
                          {isRealizado && (
                            <div className="mt-1.5">
                              {offer.cobro_estado === 'cobrado_completo' ? (
                                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                                  <Check className="h-3 w-3" />
                                  Cobrado completo
                                </div>
                              ) : offer.cobro_estado === 'anticipo_cobrado' ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="text-primary">Anticipo ✓</span>
                                    <span>·</span>
                                    <span>Liquidación <Clock className="h-3 w-3 inline" /></span>
                                  </div>
                                  <Progress value={50} className="h-1.5" />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCobradoBooking(offer);
                                    }}
                                  >
                                    + Registrar liquidación
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCobradoBooking(offer);
                                  }}
                                >
                                  💰 Registrar cobro
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </SortableContext>
                  
                  {phaseOffers.length === 0 && (
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
          })}
        </div>

        {/* Archive Section - Cerrado & Cancelado */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Archivo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ARCHIVE_PHASES.map(phase => {
              const phaseOffers = getOffersByPhase(phase.id);
              
              return (
                <Card key={phase.id} className={`${phase.color} border transition-all duration-200`}>
                  <CardHeader className="pb-2 px-3 pt-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold text-foreground">
                        {phase.label}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-medium">
                        {phaseOffers.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {phaseOffers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <SortableContext items={phaseOffers.map(offer => offer.id)}>
                          {phaseOffers.map(offer => (
                            <CompactBookingCard
                              key={offer.id}
                              offer={offer}
                              onDuplicate={duplicateOffer}
                              onDelete={deleteOffer}
                              onChangePhase={(id, newPhase) => {
                                if (newPhase === 'confirmado' && offer.phase !== 'confirmado' && needsConfirmGuard(offer)) {
                                  setPendingConfirmOffer(id);
                                } else {
                                  updateOfferPhase(id, newPhase);
                                }
                              }}
                              isDragging={draggedItem === offer.id}
                              selectionMode={selectionMode}
                              isSelected={selectedIds.includes(offer.id)}
                              onToggleSelect={toggleSelection}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">Sin eventos</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DndContext>

      {/* Sidebar with Upcoming Events */}
      <div className="fixed right-4 top-32 w-72 hidden 2xl:block">
        <UpcomingEventsWidget offers={offers} maxItems={6} />
      </div>

      <CreateBookingWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        onOfferCreated={fetchOffers}
      />
      
      <GlobalSearchDialog 
        open={showGlobalSearch} 
        onOpenChange={setShowGlobalSearch} 
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedIds={selectedIds}
        offerMetaById={offerMetaById}
        onClear={clearSelection}
        onRefresh={fetchOffers}
        phases={PHASES}
      />
      <AlertDialog open={!!pendingConfirmOffer} onOpenChange={(open) => !open && setPendingConfirmOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              ¿Confirmar directamente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Recomendamos consultar la disponibilidad de todas las partes y verificar la viabilidad antes de confirmar un evento.
              </p>
              <p className="text-muted-foreground text-xs">
                La opción recomendada mantiene el booking en su fase actual para que puedas gestionar disponibilidad y viabilidad desde el detalle.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (pendingConfirmOffer) {
                  updateOfferPhase(pendingConfirmOffer, 'confirmado');
                }
                setPendingConfirmOffer(null);
              }}
            >
              Confirmar directamente
            </Button>
            <Button
              onClick={() => {
                setPendingConfirmOffer(null);
                toast({
                  title: "Acción cancelada",
                  description: "Puedes consultar disponibilidad y viabilidad desde el detalle del booking.",
                });
              }}
            >
              Consultar disponibilidad y viabilidad
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pago Dialog */}
      {cobradoBooking && (
        <PagoDialog
          open={!!cobradoBooking}
          onOpenChange={(open) => !open && setCobradoBooking(null)}
          booking={cobradoBooking}
          onSuccess={fetchOffers}
        />
      )}

      {/* Buddy Panel */}
      <BuddyPanel
        open={buddyOpen}
        onClose={toggleBuddy}
        urgentAlerts={urgentAlerts}
        upcomingActions={upcomingActions}
        pipelineSummary={pipelineSummary}
        onDismissAlert={dismissAlert}
        onMarkDone={markCheckpointDone}
        onOpenPago={(bookingId) => {
          const offer = offers.find(o => o.id === bookingId);
          if (offer) setCobradoBooking(offer);
        }}
      />
    </div>
  );
}