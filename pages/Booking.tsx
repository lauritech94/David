import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Settings, Edit, Trash2, Folder, FolderPlus, Calendar, Kanban, List, Download, FileText, FolderOpen, AlertTriangle, ExternalLink, Eye, ArrowRight, CheckCircle2, AlertCircle, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CreateBookingDialog } from '@/components/CreateBookingDialog';
import { CreateBookingWizard } from '@/components/CreateBookingWizard';
import { EditBookingTemplateDialog } from '@/components/EditBookingTemplateDialog';
import { EditBookingOfferDialog } from '@/components/EditBookingOfferDialog';
import { usePageTitle } from '@/hooks/useCommon';
import { PermissionBoundary, PermissionWrapper } from '@/components/PermissionBoundary';
import { PermissionChip } from '@/components/PermissionChip';
import { useAuthz } from '@/hooks/useAuthz';
import { useGlobalSearch } from '@/hooks/useKeyboardShortcuts';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { EventFolderDialog } from '@/components/EventFolderDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookingKanban } from '@/components/BookingKanban';
import { BookingFiltersToolbar, BookingFiltersState } from '@/components/BookingFiltersToolbar';
import { ReminderBadge } from '@/components/ReminderBadge';
import { AlertsBadge } from '@/components/AlertsBadge';
import { exportToCSV } from '@/utils/exportUtils';
import { EmptyState } from '@/components/ui/empty-state';
import { validateBookingOffer, ValidationResult } from '@/lib/bookingValidations';
import { useBookingReminders } from '@/hooks/useBookingReminders';
import { useBookingFolders } from '@/hooks/useBookingFolders';
import { getStatusBadgeVariant, getPhaseLabel } from '@/lib/statusColors';
import { BookingTableColumns, useBookingColumns, ColumnConfig } from '@/components/BookingTableColumns';
import { useAutoRealizado } from '@/hooks/useAutoRealizado';

interface BookingOffer {
  id: string;
  fecha?: string;
  festival_ciclo?: string;
  ciudad?: string;
  pais?: string;
  lugar?: string;
  venue?: string;
  capacidad?: number;
  duracion?: string;
  estado?: string;
  phase?: string;
  promotor?: string;
  fee?: number;
  pvp?: number;
  gastos_estimados?: number;
  comision_porcentaje?: number;
  comision_euros?: number;
  es_cityzen?: boolean;
  es_internacional?: boolean;
  estado_facturacion?: string;
  oferta?: string;
  formato?: string;
  contacto?: string;
  invitaciones?: number;
  tour_manager?: string;
  info_comentarios?: string;
  condiciones?: string;
  link_venta?: string;
  inicio_venta?: string;
  contratos?: string;
  publico?: string;
  logistica?: string;
  notas?: string;
  artist_id?: string;
  project_id?: string;
  event_id?: string;
  hora?: string;
  folder_url?: string;
  created_at: string;
  availability_status?: 'all_available' | 'has_conflicts' | 'pending' | null;
}

interface TemplateField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_order: number;
  is_required: boolean;
  is_active: boolean;
}

export default function Booking() {
  usePageTitle('Booking');
  useAutoRealizado();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const artistIdFromUrl = searchParams.get('artistId');
  const { profile } = useAuth();
  const [offers, setOffers] = useState<BookingOffer[]>([]);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<BookingOffer | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const { getRemindersForBooking } = useBookingReminders(offers);
  const { openFolder, checkFolderExists, checkContractExists, backfillEventFolders, createEventFolder, loading: foldersLoading } = useBookingFolders();
  const [folderExists, setFolderExists] = useState<Record<string, boolean>>({});
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedFolderOffer, setSelectedFolderOffer] = useState<BookingOffer | null>(null);
  const [contractStatus, setContractStatus] = useState<Record<string, boolean>>({});
  const [folderErrors, setFolderErrors] = useState<Record<string, string>>({});
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const { columns, setColumns, visibleColumns, getColumnVisibility } = useBookingColumns();
  const [artists, setArtists] = useState<{ id: string; name: string; stage_name?: string }[]>([]);
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
  const [filteredOffers, setFilteredOffers] = useState<BookingOffer[]>([]);
  const [syncing, setSyncing] = useState(false);

  const handleSyncEstados = async () => {
    try {
      setSyncing(true);
      const today = new Date().toISOString().split('T')[0];
      const { data: pastEvents, error: fetchError } = await supabase
        .from('booking_offers')
        .select('id')
        .eq('phase', 'confirmado')
        .lt('fecha', today);

      if (fetchError) throw fetchError;

      if (!pastEvents || pastEvents.length === 0) {
        toast({ title: 'Todo al día', description: 'Sin cambios pendientes' });
        return;
      }

      const ids = pastEvents.map(e => e.id);
      const { error: updateError } = await supabase
        .from('booking_offers')
        .update({ phase: 'realizado', estado: 'realizado' })
        .in('id', ids);

      if (updateError) throw updateError;

      toast({ title: 'Eventos actualizados', description: `${ids.length} evento(s) movido(s) a Realizado` });
      fetchOffers();
    } catch (error) {
      console.error('Sync error:', error);
      toast({ title: 'Error', description: 'No se pudieron sincronizar los estados', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  // Update filter when URL changes
  useEffect(() => {
    if (artistIdFromUrl) {
      setFilters(prev => ({ ...prev, artistFilter: artistIdFromUrl }));
    }
  }, [artistIdFromUrl]);

  useEffect(() => {
    fetchOffers();
    fetchTemplateFields();
    fetchArtists();

    // Subscribe to real-time updates on booking_offers
    const channel = supabase
      .channel('booking-table-realtime')
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
    applyTableFilters();
  }, [offers, filters]);


  const fetchArtists = async () => {
    const { data } = await supabase.from('artists').select('id, name, stage_name').order('name');
    setArtists(data || []);
  };

  const applyTableFilters = () => {
    let filtered = [...offers];
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.venue?.toLowerCase().includes(term) || 
        o.ciudad?.toLowerCase().includes(term) ||
        o.festival_ciclo?.toLowerCase().includes(term)
      );
    }
    if (filters.artistFilter !== 'all') filtered = filtered.filter(o => o.artist_id === filters.artistFilter);
    if (filters.phaseFilter.length > 0) filtered = filtered.filter(o => o.phase != null && filters.phaseFilter.includes(o.phase));
    if (filters.countryFilter !== 'all') filtered = filtered.filter(o => o.pais === filters.countryFilter);
    if (filters.promoterFilter !== 'all') filtered = filtered.filter(o => o.promotor === filters.promoterFilter);
    if (filters.dateFrom) filtered = filtered.filter(o => o.fecha && new Date(o.fecha) >= filters.dateFrom!);
    if (filters.dateTo) filtered = filtered.filter(o => o.fecha && new Date(o.fecha) <= filters.dateTo!);
    if (filters.showInternational !== 'all') filtered = filtered.filter(o => o.es_internacional === filters.showInternational);
    
    setFilteredOffers(filtered);
  };

  const getUniqueValues = (field: keyof BookingOffer) => {
    return [...new Set(offers.map(o => o[field]).filter((v): v is string => typeof v === 'string' && v.length > 0))].sort();
  };

  const clearAllFilters = () => setFilters({
    searchTerm: '', artistFilter: 'all', phaseFilter: [], countryFilter: 'all',
    promoterFilter: 'all', dateFrom: undefined, dateTo: undefined, showInternational: 'all',
  });

  useEffect(() => {
    if (offers.length > 0) {
      validateAllOffers();
      checkAllFolders();
      checkAllContracts();
    }
  }, [offers]);

  const checkAllFolders = async () => {
    const folderStatuses: Record<string, boolean> = {};
    for (const offer of offers) {
      if (offer.id) {
        const exists = await checkFolderExists(offer);
        folderStatuses[offer.id] = exists;
      }
    }
    setFolderExists(folderStatuses);
  };

  const checkAllContracts = async () => {
    const contractStatuses: Record<string, boolean> = {};
    for (const offer of offers) {
      if (offer.id && offer.estado === 'confirmado') {
        const hasContract = await checkContractExists(offer);
        contractStatuses[offer.id] = hasContract;
      }
    }
    setContractStatus(contractStatuses);
  };

  const validateAllOffers = async () => {
    console.log('Validating all offers:', offers.length);
    const results: Record<string, ValidationResult> = {};
    try {
      // Fetch contract info from booking_documents for all offers at once
      const offerIds = offers.map(o => o.id).filter(Boolean) as string[];
      const { data: docsData } = await supabase
        .from('booking_documents')
        .select('booking_id')
        .in('booking_id', offerIds)
        .eq('document_type', 'contract');
      const bookingsWithContract = new Set(docsData?.map(d => d.booking_id) || []);

      for (const offer of offers) {
        if (offer.id) {
          const hasContract = bookingsWithContract.has(offer.id);
          results[offer.id] = await validateBookingOffer(offer, false, hasContract);
        }
      }
      console.log('Validation results:', results);
      setValidationResults(results);
    } catch (error) {
      console.error('Error validating offers:', error);
    }
  };

  const fetchOffers = async () => {
    try {
      console.log('Fetching booking offers...');
      const { data, error } = await supabase
        .from('booking_offers')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('Error fetching offers:', error);
        throw error;
      }
      
      // Fetch availability status for all bookings
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
      
      const mappedOffers = (data || []).map(offer => ({
        ...offer,
        availability_status: availabilityMap[offer.id] || null
      }));
      
      console.log('Fetched offers:', mappedOffers);
      setOffers(mappedOffers);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ofertas.",
        variant: "destructive",
      });
    }
  };

  const fetchTemplateFields = async () => {
    try {
      console.log('Fetching template fields...');
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_template_config')
        .select('*')
        .eq('is_active', true)
        .order('field_order');

      if (error) {
        console.error('Error fetching template fields:', error);
        throw error;
      }
      
      console.log('Fetched template fields:', data);
      setTemplateFields(data || []);
    } catch (error) {
      console.error('Error fetching template fields:', error);
      toast({
        title: "Error", 
        description: "No se pudieron cargar los campos de la plantilla.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      // Snapshot for undo
      const { data: snapshot } = await supabase
        .from('booking_offers')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('booking_offers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchOffers();

      if (snapshot) {
        const { toast: sonnerToast } = await import('sonner');
        sonnerToast.success('Oferta eliminada', {
          duration: 5000,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              const { error: insertError } = await (supabase as any)
                .from('booking_offers')
                .insert(snapshot);
              if (insertError) {
                sonnerToast.error('Error al deshacer');
              } else {
                sonnerToast.success('Acción revertida');
                fetchOffers();
              }
            },
          },
        });
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la oferta.",
        variant: "destructive",
      });
    }
  };

  const handleOpenFolder = (offer: BookingOffer) => {
    setSelectedFolderOffer(offer);
    setShowFolderDialog(true);
  };

  const handleBackfillFolders = async () => {
    try {
      const result = await backfillEventFolders();
      
      toast({
        title: "Backfill completado",
        description: `${result.created} carpetas creadas, ${result.updated} actualizadas.`,
      });

      // Refresh data
      fetchOffers();
      checkAllFolders();
    } catch (error) {
      console.error('Error in backfill:', error);
      toast({
        title: "Error",
        description: "Error durante el backfill de carpetas.",
        variant: "destructive",
      });
    }
  };

  const handleCreateMissingFolder = async (offer: BookingOffer) => {
    // Clear previous error for this offer
    setFolderErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[offer.id];
      return newErrors;
    });

    try {
      const result = await createEventFolder(offer);
      
      if (result.success && result.folderPath) {
        const publicUrl = `https://hptjzbaiclmgbvxlmllo.supabase.co/storage/v1/object/public/documents/${result.folderPath}`;
        await supabase
          .from('booking_offers')
          .update({ folder_url: publicUrl })
          .eq('id', offer.id);

        toast({
          title: "Carpeta creada",
          description: "La carpeta del evento se ha creado exitosamente.",
        });

        // Refresh data
        fetchOffers();
        checkAllFolders();
      } else {
        // Store error for this specific offer
        setFolderErrors(prev => ({
          ...prev,
          [offer.id]: result.error || "Error desconocido"
        }));

        // Show specific error message
        toast({
          title: "Error al crear carpeta",
          description: result.error || "No se pudo crear la carpeta del evento.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      
      // Store error for this specific offer
      setFolderErrors(prev => ({
        ...prev,
        [offer.id]: "Error inesperado al crear la carpeta"
      }));

      toast({
        title: "Error",
        description: "Error inesperado al crear la carpeta.",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const csvHeaders = {
        fecha: 'Fecha',
        festival_ciclo: 'Festival/Ciclo',
        ciudad: 'Ciudad',
        pais: 'País',
        lugar: 'Lugar',
        venue: 'Venue',
        capacidad: 'Capacidad',
        estado: 'Estado',
        phase: 'Fase',
        promotor: 'Promotor',
        fee: 'Fee (€)',
        gastos_estimados: 'Gastos Estimados (€)',
        comision_porcentaje: 'Comisión (%)',
        comision_euros: 'Comisión (€)',
        
        es_internacional: 'Internacional',
        estado_facturacion: 'Estado Facturación',
        oferta: 'Oferta',
        formato: 'Formato',
        contacto: 'Contacto',
        tour_manager: 'Tour Manager',
        created_at: 'Fecha Creación'
      };

      const exportData = offers.map(offer => ({
        fecha: offer.fecha ? new Date(offer.fecha).toLocaleDateString() : '',
        festival_ciclo: offer.festival_ciclo || '',
        ciudad: offer.ciudad || '',
        pais: offer.pais || '',
        lugar: offer.lugar || '',
        venue: offer.venue || '',
        capacidad: offer.capacidad || '',
        estado: offer.estado || '',
        phase: offer.phase || '',
        promotor: offer.promotor || '',
        fee: offer.fee || 0,
        gastos_estimados: offer.gastos_estimados || 0,
        comision_porcentaje: offer.comision_porcentaje || 0,
        comision_euros: offer.comision_euros || 0,
        
        es_internacional: offer.es_internacional ? 'Sí' : 'No',
        estado_facturacion: offer.estado_facturacion || '',
        oferta: offer.oferta || '',
        formato: offer.formato || '',
        contacto: offer.contacto || '',
        tour_manager: offer.tour_manager || '',
        created_at: new Date(offer.created_at).toLocaleDateString()
      }));

      exportToCSV(exportData, 'ofertas_booking', csvHeaders);
      
      toast({
        title: "Exportación exitosa",
        description: "Las ofertas se han exportado correctamente",
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

  const formatValue = (value: any, fieldType: string) => {
    if (!value) return '-';
    
    switch (fieldType) {
      case 'date':
        return new Date(value).toLocaleDateString('es-ES');
      case 'number':
        return value.toLocaleString();
      case 'url':
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Ver enlace
          </a>
        );
      default:
        return value;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Kanban className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Booking</h1>
              <p className="text-muted-foreground">Gestiona ofertas de conciertos por fases</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <PermissionChip />
            <div className="flex gap-3">
              <Button
                onClick={handleSyncEstados}
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizar
              </Button>
              <Button
                onClick={() => handleExportCSV()}
                className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <PermissionWrapper requiredPermission="manage">
                <Button
                  onClick={handleBackfillFolders}
                  disabled={foldersLoading}
                  className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/20"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Backfill Carpetas
                </Button>
              </PermissionWrapper>
              <PermissionWrapper requiredPermission="edit">
                <Button
                  onClick={() => setShowTemplateDialog(true)}
                  className="btn-secondary"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Editar plantilla
                </Button>
              </PermissionWrapper>
            </div>
          </div>
        </div>

        {/* Contract Warning for Confirmed Events without Contracts */}
        {offers.some(offer => offer.estado === 'confirmado' && offer.id && !contractStatus[offer.id]) && (
          <Alert className="border-warning/20 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              <strong>Aviso:</strong> Hay eventos confirmados sin contrato subido. Revisa las ofertas marcadas.
            </AlertDescription>
          </Alert>
        )}

        {/* Realizado Alert Banner */}
        {(() => {
          const realizadoEvents = offers.filter(o => o.phase === 'realizado');
          if (realizadoEvents.length === 0) return null;
          const now = new Date();
          const vencidos = realizadoEvents.filter(o => o.fecha && (now.getTime() - new Date(o.fecha).getTime()) / 86400000 >= 30).length;
          const urgentes = realizadoEvents.filter(o => {
            if (!o.fecha) return false;
            const days = (now.getTime() - new Date(o.fecha).getTime()) / 86400000;
            return days >= 7 && days < 30;
          }).length;
          const recientes = realizadoEvents.length - vencidos - urgentes;
          return (
            <Alert className="border-purple-500/20 bg-purple-500/10">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800 dark:text-purple-300">
                <strong>⚠ {realizadoEvents.length} evento(s) pendientes de facturar</strong>
                {' · '}
                {vencidos > 0 && <Badge variant="destructive" className="text-xs mr-1">{vencidos} vencidos +30d</Badge>}
                {urgentes > 0 && <Badge className="bg-amber-500 text-white text-xs mr-1">{urgentes} urgentes 7-30d</Badge>}
                {recientes > 0 && <Badge variant="outline" className="text-xs">{recientes} recientes &lt;7d</Badge>}
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Main Content Tabs */}
        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Vista Kanban
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Vista Tabla
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="space-y-6">
            <BookingKanban templateFields={templateFields} />
          </TabsContent>

          <TabsContent value="table" className="space-y-6">
            {/* Filters toolbar */}
            <BookingFiltersToolbar
              filters={filters}
              onFiltersChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
              artists={artists}
              phases={[
                { id: 'interes', label: 'Interés' },
                { id: 'oferta', label: 'Oferta' },
                { id: 'negociacion', label: 'Negociación' },
                { id: 'confirmado', label: 'Confirmado' },
                { id: 'realizado', label: 'Realizado' },
                { id: 'facturado', label: 'Facturado' },
                { id: 'cerrado', label: 'Cerrado' },
                { id: 'cancelado', label: 'Cancelado' },
              ]}
              countries={getUniqueValues('pais')}
              promoters={getUniqueValues('promotor')}
              totalCount={offers.length}
              filteredCount={filteredOffers.length}
              onClearFilters={clearAllFilters}
              onExportCSV={handleExportCSV}
              onNewOffer={() => setShowCreateDialog(true)}
            />
            
            {/* Column selector */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {filteredOffers.length} de {offers.length} {offers.length === 1 ? 'booking' : 'bookings'}
              </div>
              <div className="flex gap-2">
                <BookingTableColumns columns={columns} onColumnsChange={setColumns} />
              </div>
            </div>
            
            <div className="card-moodita overflow-hidden">
            <CardContent className="p-0">
              {filteredOffers.length === 0 ? (
                offers.length === 0 ? (
                  <EmptyState
                    icon={<Kanban className="w-10 h-10 text-muted-foreground" />}
                    title="No hay ofertas de booking"
                    description="Crea tu primera oferta para comenzar a gestionar tus bookings y organizar conciertos de manera eficiente."
                    action={{
                      label: "Crear Booking",
                      onClick: () => setShowCreateDialog(true)
                    }}
                    secondaryAction={{
                      label: "Ver documentación",
                      onClick: () => window.open('/docs/booking', '_blank'),
                      variant: "outline"
                    }}
                  />
                ) : (
                  <EmptyState
                    icon={<Filter className="w-10 h-10 text-muted-foreground" />}
                    title="Sin resultados"
                    description="No hay bookings que coincidan con los filtros aplicados."
                    action={{
                      label: "Limpiar filtros",
                      onClick: clearAllFilters
                    }}
                  />
                )
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-0">
                      {/* Default columns */}
                      {getColumnVisibility('fecha') && <TableHead className="font-semibold px-6">FECHA</TableHead>}
                      {getColumnVisibility('festival_ciclo') && <TableHead className="font-semibold">FESTIVAL</TableHead>}
                      {getColumnVisibility('ciudad') && <TableHead className="font-semibold">CIUDAD</TableHead>}
                      {getColumnVisibility('lugar') && <TableHead className="font-semibold">LUGAR</TableHead>}
                      {getColumnVisibility('estado') && <TableHead className="font-semibold">STATUS</TableHead>}
                      {getColumnVisibility('fee') && <TableHead className="font-semibold">OFERTA</TableHead>}
                      {getColumnVisibility('contratos') && <TableHead className="font-semibold">CONTRATO</TableHead>}
                      {/* Secondary columns */}
                      {getColumnVisibility('hora') && <TableHead className="font-semibold">HORA</TableHead>}
                      {getColumnVisibility('capacidad') && <TableHead className="font-semibold">CAPACIDAD</TableHead>}
                      {getColumnVisibility('duracion') && <TableHead className="font-semibold">DURACIÓN</TableHead>}
                      {getColumnVisibility('formato') && <TableHead className="font-semibold">FORMATO</TableHead>}
                      {getColumnVisibility('pvp') && <TableHead className="font-semibold">PVP</TableHead>}
                      {getColumnVisibility('contacto') && <TableHead className="font-semibold">CONTACTO</TableHead>}
                      {getColumnVisibility('invitaciones') && <TableHead className="font-semibold">INVITACIONES</TableHead>}
                      {getColumnVisibility('inicio_venta') && <TableHead className="font-semibold">INICIO VENTA</TableHead>}
                      {getColumnVisibility('link_venta') && <TableHead className="font-semibold">LINK VENTA</TableHead>}
                      {getColumnVisibility('publico') && <TableHead className="font-semibold">PÚBLICO</TableHead>}
                      {getColumnVisibility('logistica') && <TableHead className="font-semibold">LOGÍSTICA</TableHead>}
                      {getColumnVisibility('notas') && <TableHead className="font-semibold">COMENTARIOS</TableHead>}
                      <TableHead className="text-right font-semibold">ACCIONES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOffers.map((offer) => (
                      <TableRow 
                        key={offer.id} 
                        className="cursor-pointer hover:bg-muted/30 transition-colors border-0 group"
                        onClick={() => navigate(`/booking/${offer.id}`)}
                      >
                        {/* FECHA */}
                        {getColumnVisibility('fecha') && (
                          <TableCell className="py-4 px-6">
                            {offer.fecha ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-accent" />
                                <span className="text-sm font-medium">
                                  {new Date(offer.fecha).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        
                        {/* FESTIVAL */}
                        {getColumnVisibility('festival_ciclo') && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {offer.folder_url ? (
                                <button
                                  onClick={() => handleOpenFolder(offer)}
                                  className="text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left font-medium"
                                  title="Abrir carpeta del evento"
                                >
                                  {offer.festival_ciclo || '-'}
                                </button>
                              ) : (
                                <span>{offer.festival_ciclo || '-'}</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        
                        {/* CIUDAD */}
                        {getColumnVisibility('ciudad') && (
                          <TableCell className="py-4">{offer.ciudad || '-'}</TableCell>
                        )}
                        
                        {/* LUGAR */}
                        {getColumnVisibility('lugar') && (
                          <TableCell className="py-4">{offer.lugar || '-'}</TableCell>
                        )}
                        
                        {/* STATUS */}
                        {getColumnVisibility('estado') && (
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getStatusBadgeVariant(offer.phase || offer.estado)}>
                                {getPhaseLabel(offer.phase || offer.estado)}
                              </Badge>
                              {offer.availability_status === 'has_conflicts' && (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                  <AlertCircle className="h-3 w-3 mr-0.5" />
                                  Conflicto
                                </Badge>
                              )}
                              {(offer.phase === 'interes' || offer.phase === 'oferta') && offer.availability_status === 'all_available' && (
                                <Badge className="bg-green-500 text-white text-xs px-1.5 py-0.5 animate-pulse">
                                  <ArrowRight className="h-3 w-3 mr-0.5" />
                                  Listo
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )}
                        
                        {/* OFERTA (fee) */}
                        {getColumnVisibility('fee') && (
                          <TableCell className="py-4 font-medium">
                            {offer.fee ? `${offer.fee.toLocaleString('es-ES')} €` : '-'}
                          </TableCell>
                        )}
                        
                        {/* CONTRATO */}
                        {getColumnVisibility('contratos') && (
                          <TableCell>
                            {offer.contratos ? (
                              <Badge variant={
                                offer.contratos === 'firmado' ? 'default' :
                                offer.contratos === 'enviado' ? 'secondary' : 'outline'
                              }>
                                {offer.contratos === 'ctto_por_hacer' ? 'Por Hacer' :
                                 offer.contratos === 'enviado' ? 'Enviado' :
                                 offer.contratos === 'firmado' ? 'Firmado' : offer.contratos}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Por Hacer</Badge>
                            )}
                          </TableCell>
                        )}
                        
                        {/* HORA */}
                        {getColumnVisibility('hora') && (
                          <TableCell className="py-4">{offer.hora || '-'}</TableCell>
                        )}
                        
                        {/* CAPACIDAD */}
                        {getColumnVisibility('capacidad') && (
                          <TableCell className="py-4">
                            {offer.capacidad ? offer.capacidad.toLocaleString() : '-'}
                          </TableCell>
                        )}
                        
                        {/* DURACIÓN */}
                        {getColumnVisibility('duracion') && (
                          <TableCell className="py-4">{offer.duracion || '-'}</TableCell>
                        )}
                        
                        {/* FORMATO */}
                        {getColumnVisibility('formato') && (
                          <TableCell className="py-4">{offer.formato || '-'}</TableCell>
                        )}
                        
                        {/* PVP */}
                        {getColumnVisibility('pvp') && (
                          <TableCell className="py-4">
                            {offer.pvp ? `${offer.pvp} €` : '-'}
                          </TableCell>
                        )}
                        
                        {/* CONTACTO */}
                        {getColumnVisibility('contacto') && (
                          <TableCell className="py-4">{offer.contacto || '-'}</TableCell>
                        )}
                        
                        {/* INVITACIONES */}
                        {getColumnVisibility('invitaciones') && (
                          <TableCell className="py-4">{offer.invitaciones || '-'}</TableCell>
                        )}
                        
                        {/* INICIO VENTA */}
                        {getColumnVisibility('inicio_venta') && (
                          <TableCell className="py-4">
                            {offer.inicio_venta ? new Date(offer.inicio_venta).toLocaleDateString('es-ES') : '-'}
                          </TableCell>
                        )}
                        
                        {/* LINK VENTA */}
                        {getColumnVisibility('link_venta') && (
                          <TableCell className="py-4">
                            {offer.link_venta ? (
                              <a 
                                href={offer.link_venta} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ver
                              </a>
                            ) : '-'}
                          </TableCell>
                        )}
                        
                        {/* PÚBLICO */}
                        {getColumnVisibility('publico') && (
                          <TableCell className="py-4">{offer.publico || '-'}</TableCell>
                        )}
                        
                        {/* LOGÍSTICA */}
                        {getColumnVisibility('logistica') && (
                          <TableCell className="py-4 max-w-40 truncate" title={offer.logistica || ''}>
                            {offer.logistica || '-'}
                          </TableCell>
                        )}
                        
                        {/* COMENTARIOS */}
                        {getColumnVisibility('notas') && (
                          <TableCell className="py-4 max-w-40 truncate" title={offer.notas || ''}>
                            {offer.notas || '-'}
                          </TableCell>
                        )}
                        
                        {/* ACCIONES */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/booking/${offer.id}`)}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border shadow-md">
                                <DropdownMenuItem 
                                  onClick={() => navigate(`/booking/${offer.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOffer(offer);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                {offer.folder_url && (
                                  <DropdownMenuItem onClick={() => handleOpenFolder(offer)}>
                                    <FolderOpen className="h-4 w-4 mr-2" />
                                    Abrir carpeta
                                  </DropdownMenuItem>
                                )}
                                {!offer.folder_url && offer.fecha && offer.ciudad && offer.festival_ciclo && (
                                  <DropdownMenuItem 
                                    onClick={() => handleCreateMissingFolder(offer)}
                                    disabled={foldersLoading}
                                  >
                                    <FolderPlus className="h-4 w-4 mr-2" />
                                    {folderErrors[offer.id] ? 'Reintentar carpeta' : 'Crear carpeta'}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Seguro que quieres eliminarlo?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Si quieres mantener la información, puedes marcar el evento como cancelado.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteOffer(offer.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Eliminar definitivamente
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </div>
        </TabsContent>
      </Tabs>

      <CreateBookingWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        onOfferCreated={() => {
          fetchOffers();
          checkAllFolders();
          checkAllContracts();
        }}
      />

      <CreateBookingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onBookingCreated={() => {
          fetchOffers();
          checkAllFolders();
          checkAllContracts();
        }}
      />

      <EditBookingTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onTemplateUpdated={() => {
          fetchTemplateFields();
          checkAllFolders();
          checkAllContracts();
        }}
      />

      {selectedOffer && (
        <EditBookingOfferDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          offer={selectedOffer}
          onOfferUpdated={() => {
            fetchOffers();
            checkAllFolders();
            checkAllContracts();
          }}
          templateFields={templateFields}
        />
      )}

      <GlobalSearchDialog 
        open={showGlobalSearch} 
        onOpenChange={setShowGlobalSearch} 
      />

      <EventFolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        offer={selectedFolderOffer}
      />
      </div>
    </div>
  );
}
