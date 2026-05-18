import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, FileText, Plane, Receipt, Edit, ExternalLink, Copy, Share2, Copy as Duplicate, FolderOpen, AlertTriangle, ShieldCheck, Plus, Link as LinkIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/useCommon';
import { getStatusBadgeVariant } from '@/lib/statusColors';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingOverviewTab } from '@/components/booking-detail/BookingOverviewTab';
import { BookingRoadmapTab } from '@/components/booking-detail/BookingRoadmapTab';
import { BookingPresupuestoTab } from '@/components/booking-detail/BookingPresupuestoTab';
import { BookingExpensesTab } from '@/components/booking-detail/BookingExpensesTab';
import { BookingFilesWidget } from '@/components/booking-detail/BookingFilesWidget';
import { BookingFilesDocsTab } from '@/components/booking-detail/BookingFilesDocsTab';
import { EditBookingDialog } from '@/components/booking-detail/EditBookingDialog';
import { ShareBookingDialog } from '@/components/booking-detail/ShareBookingDialog';
import { ViabilityChecksCard } from '@/components/booking-detail/ViabilityChecksCard';
import { AvailabilityStatusCard } from '@/components/booking-detail/AvailabilityStatusCard';
import { RequestAvailabilityDialog } from '@/components/booking-detail/RequestAvailabilityDialog';
import { BookingHistorySection } from '@/components/booking-detail/BookingHistorySection';
import { BookingTimeline } from '@/components/booking-detail/BookingTimeline';
import { EventAssistantCard } from '@/components/booking-detail/EventAssistantCard';
import { useEventAssistant } from '@/hooks/useEventAssistant';
import { LinkedSolicitudesCard } from '@/components/booking-detail/LinkedSolicitudesCard';
import { ProjectLinkSelector } from '@/components/releases/ProjectLinkSelector';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQueryClient, useQuery } from '@tanstack/react-query';
interface Artist {
  id: string;
  name: string;
  stage_name?: string;
}

interface BookingOffer {
  id: string;
  fecha?: string;
  hora?: string;
  duracion?: string;
  festival_ciclo?: string;
  ciudad?: string;
  pais?: string;
  lugar?: string;
  venue?: string;
  capacidad?: number;
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
  tour_manager?: string;
  tour_manager_new?: string;
  info_comentarios?: string;
  condiciones?: string;
  link_venta?: string;
  inicio_venta?: string;
  contratos?: string;
  logistica?: string;
  publico?: string;
  invitaciones?: number;
  notas?: string;
  artist_id?: string;
  project_id?: string;
  event_id?: string;
  folder_url?: string;
  created_by?: string;
  created_at: string;
  artist?: Artist;
  adjuntos?: any;
  // Viability fields
  viability_manager_approved?: boolean;
  viability_manager_at?: string;
  viability_tour_manager_approved?: boolean;
  viability_tour_manager_at?: string;
  viability_production_approved?: boolean;
  viability_production_at?: string;
  viability_notes?: string;
  // Payment fields
  anticipo_porcentaje?: number;
  anticipo_importe?: number;
  anticipo_estado?: string;
  anticipo_fecha_esperada?: string;
  anticipo_fecha_cobro?: string;
  anticipo_referencia?: string;
  liquidacion_importe?: number;
  liquidacion_estado?: string;
  liquidacion_fecha_esperada?: string;
  liquidacion_fecha_cobro?: string;
  liquidacion_referencia?: string;
  cobro_estado?: string;
  cobro_fecha?: string;
  cobro_importe?: number;
  cobro_referencia?: string;
}
export default function BookingDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollToSection = searchParams.get('scrollTo');
  const sectionParam = searchParams.get('section');
  const availabilityRef = useRef<HTMLDivElement>(null);
  const viabilityRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const [paymentHighlighted, setPaymentHighlighted] = useState(false);
  const [booking, setBooking] = useState<BookingOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [availabilityBlocked, setAvailabilityBlocked] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Primary budget linked to this booking (for header KPI card)
  const { data: primaryBudgetKpi } = useQuery({
    queryKey: ['booking-primary-budget', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: budget } = await supabase
        .from('budgets')
        .select('id, name, fee')
        .eq('booking_offer_id', id!)
        .eq('is_primary_for_booking', true)
        .maybeSingle();
      if (!budget) return null;
      const { data: items } = await supabase
        .from('budget_items')
        .select('quantity, unit_price, iva_percentage')
        .eq('budget_id', budget.id);
      const capital = budget.fee || 0;
      const comprometido = (items || []).reduce((acc, it: any) => {
        const base = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
        const iva = Number(it.iva_percentage) || 0;
        return acc + base * (1 + iva / 100);
      }, 0);
      return {
        id: budget.id,
        name: budget.name,
        capital,
        comprometido,
        disponible: capital - comprometido,
      };
    },
  });

  const fmtEUR = (n: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  
  // Project linking state
  const [showLinkProjectDialog, setShowLinkProjectDialog] = useState(false);
  const [projectOption, setProjectOption] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);

  const eventAssistant = useEventAssistant(booking);

  usePageTitle(booking?.festival_ciclo || booking?.venue || 'Detalle Evento');

  // Scroll to section if requested via URL param
  useEffect(() => {
    if (!loading && scrollToSection) {
      const ref = scrollToSection === 'viability' ? viabilityRef : availabilityRef;
      if (ref.current) {
        setTimeout(() => {
          ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
    // Handle ?section=pagos
    if (!loading && sectionParam === 'pagos' && paymentRef.current) {
      setTimeout(() => {
        paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPaymentHighlighted(true);
        setTimeout(() => setPaymentHighlighted(false), 3000);
      }, 200);
    }
  }, [scrollToSection, sectionParam, loading]);
  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id]);
  const fetchBooking = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('booking_offers').select('*, artist:artists(id, name, stage_name)').eq('id', id).single();
      if (error) throw error;
      // Normalize artist to handle array response
      const normalizedData = data ? {
        ...data,
        artist: Array.isArray(data.artist) ? data.artist[0] : data.artist
      } : null;
      setBooking(normalizedData);
      
      // Fetch linked project name
      if (normalizedData?.project_id) {
        const { data: proj } = await supabase.from('projects').select('name').eq('id', normalizedData.project_id).single();
        setProjectName(proj?.name || null);
      } else {
        setProjectName(null);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el evento.",
        variant: "destructive"
      });
      navigate('/booking');
    } finally {
      setLoading(false);
    }
  };
  const handleBookingUpdate = () => {
    fetchBooking();
  };
  const handleDuplicate = async () => {
    if (!booking) return;
    setIsDuplicating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase.rpc('duplicate_booking_deep', {
        p_booking_id: booking.id,
        p_user_id: user.id
      });
      if (error) throw error;
      toast({
        title: "Evento duplicado",
        description: "El evento se ha duplicado correctamente con presupuestos, roadmaps y documentos. Redirigiendo..."
      });

      if (data) {
        navigate(`/booking/${data}`);
      }
    } catch (error) {
      console.error('Error duplicating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo duplicar el evento.",
        variant: "destructive"
      });
    } finally {
      setIsDuplicating(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="container-moodita section-spacing space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>;
  }
  if (!booking) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Evento no encontrado</p>
          <Button onClick={() => navigate('/booking')} className="mt-4">
            Volver a Booking
          </Button>
        </Card>
      </div>;
  }
  const eventName = booking.festival_ciclo || booking.venue || 'Evento';
  const eventDate = booking.fecha ? format(new Date(booking.fecha), "EEEE d 'de' MMMM, yyyy", {
    locale: es
  }) : null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/booking')} className="mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">
                  {eventName}
                </h1>
                {booking.phase ? (
                  <Badge 
                    variant="outline" 
                    className={
                      booking.phase === 'confirmado' ? 'border-green-500 text-green-600 bg-green-50' :
                      booking.phase === 'negociacion' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                      booking.phase === 'interes' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                      booking.phase === 'oferta' ? 'border-purple-500 text-purple-600 bg-purple-50' :
                      booking.phase === 'descartado' ? 'border-destructive text-destructive bg-destructive/10' :
                      'border-muted-foreground text-muted-foreground'
                    }
                  >
                    {booking.phase === 'interes' ? 'Interés' :
                     booking.phase === 'oferta' ? 'Oferta' :
                     booking.phase === 'negociacion' ? 'Negociación' :
                     booking.phase === 'confirmado' ? 'Confirmado' :
                     booking.phase === 'descartado' ? 'Descartado' :
                     booking.phase}
                  </Badge>
                ) : (
                  <Badge variant={getStatusBadgeVariant(booking.estado || 'pendiente')}>
                    {booking.estado || 'pendiente'}
                  </Badge>
                )}
                {booking.artist && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {booking.artist.stage_name || booking.artist.name}
                  </Badge>
                )}
                {booking.es_internacional && <Badge variant="outline" className="border-blue-500 text-blue-600">
                    Internacional
                  </Badge>}
              </div>
              
              <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
                {eventDate && <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {eventDate}
                    {booking.hora && ` - ${booking.hora}`}
                  </span>}
                {(booking.ciudad || booking.venue) && <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {[booking.venue, booking.ciudad, booking.pais].filter(Boolean).join(', ')}
                  </span>}
                {booking.capacidad && <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {booking.capacidad.toLocaleString()} cap.
                  </span>}
              </div>
              
              {/* Fechas opcionales */}
              {booking.adjuntos?.fechas_opcionales && booking.adjuntos.fechas_opcionales.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-xs text-muted-foreground">Fechas opcionales:</span>
                  {booking.adjuntos.fechas_opcionales.map((fecha: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {format(new Date(fecha), "d MMM yyyy", { locale: es })}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Project badge */}
              <div className="mt-2">
                {booking.project_id && projectName ? (
                  <Link
                    to={`/projects/${booking.project_id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Proyecto: {projectName}
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowLinkProjectDialog(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted/50 transition-colors border border-dashed border-muted-foreground/30"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Vincular a proyecto
                  </button>
                )}
              </div>

              {/* Alertas de incongruencia */}
              {(() => {
                const isPastDate = booking.fecha && new Date(booking.fecha + 'T23:59:59') < new Date();
                const earlyPhases = ['interes', 'interés', 'oferta', 'negociacion', 'negociación'];
                const isEarlyPhase = earlyPhases.includes(booking.phase?.toLowerCase() || '');
                const viabilityCount = [booking.viability_manager_approved, booking.viability_tour_manager_approved, booking.viability_production_approved].filter(Boolean).length;
                const isConfirmado = booking.phase?.toLowerCase() === 'confirmado';
                const missingViability = isConfirmado && viabilityCount < 3;

                return (
                  <>
                    {isPastDate && isEarlyPhase && (
                      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4 !text-amber-600" />
                        <AlertDescription>
                          Este evento ya pasó ({format(new Date(booking.fecha!), "d MMM yyyy", { locale: es })}). Debería estar en fase Confirmado o Facturado.
                        </AlertDescription>
                      </Alert>
                    )}
                    {missingViability && (
                      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4 !text-amber-600" />
                        <AlertDescription>
                          Este evento está confirmado pero faltan aprobaciones de viabilidad ({viabilityCount}/3).
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Info Button */}
            <Button variant="outline" size="sm" onClick={() => {
            const eventName = booking.festival_ciclo || booking.venue || 'Evento';
            const sections = [];
            
            // Header
            sections.push(`📅 ${eventName}`);
            sections.push('═'.repeat(40));
            
            // Fecha y lugar
            const fechaSection = [];
            if (booking.fecha) {
              fechaSection.push(`Fecha: ${format(new Date(booking.fecha), "d 'de' MMMM, yyyy", { locale: es })}${booking.hora ? ` - ${booking.hora}` : ''}`);
            }
            if (booking.venue) fechaSection.push(`Venue: ${booking.venue}`);
            if (booking.lugar) fechaSection.push(`Lugar: ${booking.lugar}`);
            if (booking.ciudad || booking.pais) {
              fechaSection.push(`📍 ${[booking.ciudad, booking.pais].filter(Boolean).join(', ')}`);
            }
            if (booking.capacidad) fechaSection.push(`Capacidad: ${booking.capacidad.toLocaleString()}`);
            if (fechaSection.length > 0) sections.push(fechaSection.join('\n'));
            
            // Promotor y contacto
            const contactoSection = [];
            if (booking.promotor) contactoSection.push(`Promotor: ${booking.promotor}`);
            if (booking.contacto) contactoSection.push(`Contacto: ${booking.contacto}`);
            if (booking.tour_manager) contactoSection.push(`Tour Manager: ${booking.tour_manager}`);
            if (contactoSection.length > 0) {
              sections.push('');
              sections.push('👤 CONTACTOS');
              sections.push(contactoSection.join('\n'));
            }
            
            // Financiero
            const finSection = [];
            if (booking.fee) finSection.push(`Fee: ${booking.fee.toLocaleString()}€`);
            if (booking.oferta) finSection.push(`Oferta: ${booking.oferta}`);
            if (booking.gastos_estimados) finSection.push(`Gastos Estimados: ${booking.gastos_estimados.toLocaleString()}€`);
            if (booking.comision_porcentaje) finSection.push(`Comisión: ${booking.comision_porcentaje}%`);
            if (booking.comision_euros) finSection.push(`Comisión (€): ${booking.comision_euros.toLocaleString()}€`);
            if (finSection.length > 0) {
              sections.push('');
              sections.push('💰 FINANCIERO');
              sections.push(finSection.join('\n'));
            }
            
            // Detalles del evento
            const detallesSection = [];
            if (booking.formato) detallesSection.push(`Formato: ${booking.formato}`);
            if (booking.duracion) detallesSection.push(`Duración: ${booking.duracion}`);
            if (booking.publico) detallesSection.push(`Público: ${booking.publico}`);
            if (booking.estado) detallesSection.push(`Estado: ${booking.estado}`);
            if (booking.phase) detallesSection.push(`Fase: ${booking.phase}`);
            if (booking.es_internacional !== null) detallesSection.push(`Internacional: ${booking.es_internacional ? 'Sí' : 'No'}`);
            
            if (detallesSection.length > 0) {
              sections.push('');
              sections.push('🎭 DETALLES');
              sections.push(detallesSection.join('\n'));
            }
            
            // Venta
            const ventaSection = [];
            if (booking.pvp) ventaSection.push(`PVP: ${booking.pvp}€`);
            if (booking.inicio_venta) ventaSection.push(`Inicio Venta: ${booking.inicio_venta}`);
            if (booking.link_venta) ventaSection.push(`Link Venta: ${booking.link_venta}`);
            if (booking.invitaciones) ventaSection.push(`Invitaciones: ${booking.invitaciones}`);
            if (ventaSection.length > 0) {
              sections.push('');
              sections.push('🎟️ VENTA');
              sections.push(ventaSection.join('\n'));
            }
            
            // Condiciones y logística
            const condicionesSection = [];
            if (booking.condiciones) condicionesSection.push(`Condiciones: ${booking.condiciones}`);
            if (booking.logistica) condicionesSection.push(`Logística: ${booking.logistica}`);
            if (booking.contratos) condicionesSection.push(`Contratos: ${booking.contratos}`);
            if (condicionesSection.length > 0) {
              sections.push('');
              sections.push('📋 CONDICIONES');
              sections.push(condicionesSection.join('\n'));
            }
            
            // Notas
            if (booking.notas || booking.info_comentarios) {
              sections.push('');
              sections.push('📝 NOTAS');
              // Parse JSON notes if they exist
              if (booking.notas) {
                try {
                  const notasData = JSON.parse(booking.notas);
                  if (Array.isArray(notasData)) {
                    notasData.forEach((nota: { content?: string; author_name?: string }) => {
                      if (nota.content) {
                        sections.push(`- ${nota.author_name ? `[${nota.author_name}] ` : ''}${nota.content}`);
                      }
                    });
                  }
                } catch {
                  // Legacy note - use as is
                  sections.push(booking.notas);
                }
              }
              if (booking.info_comentarios) sections.push(booking.info_comentarios);
            }
            
            // Links
            if (booking.folder_url) {
              sections.push('');
              sections.push('🔗 ENLACES');
              sections.push(`Carpeta: ${booking.folder_url}`);
            }
            
            const info = sections.join('\n');
            navigator.clipboard.writeText(info);
            toast({
              title: "Copiado",
              description: "Información completa del evento copiada al portapapeles"
            });
          }}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Info
            </Button>
            
            {booking.folder_url && <Button variant="outline" size="sm" onClick={() => window.open(booking.folder_url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Carpeta
              </Button>}
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </Button>
          </div>

          {/* Edit Dialog */}
          <EditBookingDialog open={showEditDialog} onOpenChange={setShowEditDialog} booking={booking} onSuccess={handleBookingUpdate} />

          {/* Share Dialog */}
          <ShareBookingDialog open={showShareDialog} onOpenChange={setShowShareDialog} booking={booking} />
        </div>

        {/* Quick Stats Bar - standardized layout */}
        {(() => {
          const KpiCard = ({
            label,
            value,
            icon: Icon,
            accent,
            sub,
            onClick,
            action,
          }: {
            label: string;
            value: React.ReactNode;
            icon: React.ComponentType<{ className?: string }>;
            accent?: string;
            sub?: React.ReactNode;
            onClick?: () => void;
            action?: React.ReactNode;
          }) => (
            <Card
              className={`bg-card ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
              onClick={onClick}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <Icon className={`h-4 w-4 shrink-0 ${accent ?? 'text-muted-foreground'}`} />
                </div>
                <p className={`mt-1 text-2xl font-semibold leading-tight ${accent ?? 'text-foreground'}`}>
                  {value}
                </p>
                {sub && <p className="mt-1 text-[11px] text-muted-foreground truncate">{sub}</p>}
                {action && <div className="mt-2">{action}</div>}
              </CardContent>
            </Card>
          );

          const viabilityCount = [
            booking.viability_manager_approved,
            booking.viability_tour_manager_approved,
            booking.viability_production_approved,
          ].filter(Boolean).length;
          const showViability = ['negociacion', 'confirmado', 'facturado'].includes(
            booking.phase?.toLowerCase() || ''
          );

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Fee"
                icon={DollarSign}
                value={booking.fee ? fmtEUR(booking.fee) : '—'}
              />

              {primaryBudgetKpi ? (
                <KpiCard
                  label="Disponible · Presupuesto"
                  icon={Receipt}
                  value={fmtEUR(primaryBudgetKpi.disponible)}
                  accent={primaryBudgetKpi.disponible >= 0 ? undefined : 'text-destructive'}
                  sub={`Capital ${fmtEUR(primaryBudgetKpi.capital)} · Comprometido ${fmtEUR(primaryBudgetKpi.comprometido)}`}
                  onClick={() => setActiveTab('presupuesto')}
                />
              ) : booking.gastos_estimados ? (
                <KpiCard
                  label="Gastos estimados"
                  icon={Receipt}
                  value={fmtEUR(booking.gastos_estimados)}
                />
              ) : (
                <KpiCard
                  label="Gastos estimados"
                  icon={Receipt}
                  value="—"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditDialog(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Estimar
                    </Button>
                  }
                />
              )}

              <KpiCard
                label="Comisión"
                icon={DollarSign}
                value={
                  booking.comision_euros
                    ? fmtEUR(booking.comision_euros)
                    : booking.comision_porcentaje
                      ? `${booking.comision_porcentaje}%`
                      : '—'
                }
              />

              {showViability ? (
                <KpiCard
                  label="Viabilidad"
                  icon={ShieldCheck}
                  value={`${viabilityCount}/3`}
                  accent={
                    viabilityCount === 3
                      ? 'text-green-600'
                      : viabilityCount > 0
                        ? 'text-amber-600'
                        : undefined
                  }
                  onClick={() =>
                    viabilityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                />
              ) : (
                <KpiCard
                  label="Facturación"
                  icon={FileText}
                  value={
                    <span className="capitalize">{booking.estado_facturacion || 'Pendiente'}</span>
                  }
                />
              )}
            </div>
          );
        })()}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Tabs - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="roadmap" className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Hoja de ruta
                </TabsTrigger>
                <TabsTrigger value="presupuesto" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Presupuesto
                </TabsTrigger>
                <TabsTrigger value="expenses" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Imprevistos
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Archivos
                </TabsTrigger>
                <TabsTrigger value="solicitudes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Solicitudes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <BookingOverviewTab
                  booking={booking}
                  onUpdate={handleBookingUpdate}
                  paymentRef={paymentRef}
                  paymentHighlighted={paymentHighlighted}
                />
              </TabsContent>

              <TabsContent value="roadmap">
                <BookingRoadmapTab 
                  bookingId={booking.id} 
                  artistId={booking.artist_id}
                  eventName={booking.festival_ciclo || booking.venue}
                  eventDate={booking.fecha}
                  eventVenue={booking.lugar || booking.venue}
                  eventCity={booking.ciudad}
                />
              </TabsContent>

              <TabsContent value="presupuesto">
                <BookingPresupuestoTab
                  bookingId={booking.id}
                  artistId={booking.artist_id}
                  projectId={booking.project_id}
                  eventName={booking.festival_ciclo || booking.venue}
                  eventDate={booking.fecha}
                  eventCity={booking.ciudad}
                  eventVenue={booking.lugar || booking.venue}
                  fee={booking.fee}
                  formato={booking.formato}
                />
              </TabsContent>

              <TabsContent value="expenses">
                <BookingExpensesTab bookingId={booking.id} booking={booking} />
              </TabsContent>

              <TabsContent value="files">
                <BookingFilesDocsTab booking={booking} artistName={booking.artist?.stage_name || booking.artist?.name} onUpdate={handleBookingUpdate} />
              </TabsContent>

              <TabsContent value="solicitudes">
                <LinkedSolicitudesCard
                  bookingId={booking.id}
                  artistId={booking.artist_id}
                  projectId={booking.project_id}
                  booking={booking}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Availability + Viability Checks + Linked Files Widget */}
          <div className="space-y-6" ref={availabilityRef}>
            <AvailabilityStatusCard
              bookingId={booking.id}
              artistId={booking.artist_id}
              phase={booking.phase || 'interes'}
              onRequestAvailability={() => setShowAvailabilityDialog(true)}
              canConfirm={!availabilityBlocked}
              onBlockStatusChange={setAvailabilityBlocked}
              onPhaseChange={handleBookingUpdate}
            />
            <div ref={viabilityRef} data-viability-card>
              <ViabilityChecksCard
                bookingId={booking.id}
                phase={booking.phase || 'interes'}
                viabilityManagerApproved={booking.viability_manager_approved}
                viabilityManagerAt={booking.viability_manager_at}
                viabilityTourManagerApproved={booking.viability_tour_manager_approved}
                viabilityTourManagerAt={booking.viability_tour_manager_at}
                viabilityProductionApproved={booking.viability_production_approved}
                viabilityProductionAt={booking.viability_production_at}
                viabilityNotes={booking.viability_notes}
                onUpdate={handleBookingUpdate}
              />
            </div>
            <BookingTimeline
              bookingId={booking.id}
              bookingPhase={booking.phase}
              eventDate={booking.fecha}
            />
            <EventAssistantCard
              data={eventAssistant}
              bookingId={booking.id}
              onEdit={() => setShowEditDialog(true)}
              onOpenPago={() => {
                if (paymentRef.current) {
                  paymentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setPaymentHighlighted(true);
                  setTimeout(() => setPaymentHighlighted(false), 3000);
                }
              }}
            />
            <BookingFilesWidget bookingId={booking.id} artistId={booking.artist_id} />
            <BookingHistorySection bookingId={booking.id} />
          </div>
        </div>

        {/* Availability Dialog */}
        <RequestAvailabilityDialog
          open={showAvailabilityDialog}
          onOpenChange={setShowAvailabilityDialog}
          bookingId={booking.id}
          artistId={booking.artist_id}
          eventDate={booking.fecha}
          eventName={booking.festival_ciclo || booking.venue}
          onRequestCreated={handleBookingUpdate}
        />

        {/* Link Project Dialog */}
        <Dialog open={showLinkProjectDialog} onOpenChange={setShowLinkProjectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular a proyecto</DialogTitle>
            </DialogHeader>
            <ProjectLinkSelector
              selectedOption={projectOption}
              onOptionChange={setProjectOption}
              selectedProjectId={selectedProjectId}
              onProjectIdChange={setSelectedProjectId}
              newProjectName={newProjectName}
              onNewProjectNameChange={setNewProjectName}
              newProjectDescription={newProjectDescription}
              onNewProjectDescriptionChange={setNewProjectDescription}
              artistId={booking.artist_id}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowLinkProjectDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!id || !user?.id) return;
                  let projId: string | null = null;

                  if (projectOption === 'existing' && selectedProjectId) {
                    projId = selectedProjectId;
                  } else if (projectOption === 'new' && newProjectName.trim()) {
                    try {
                      const { data: newProject, error } = await supabase
                        .from('projects')
                        .insert({
                          name: newProjectName.trim(),
                          description: newProjectDescription.trim() || null,
                          artist_id: booking.artist_id || null,
                          created_by: user.id,
                          status: 'en_curso',
                        } as any)
                        .select('id')
                        .single();
                      if (error) throw error;
                      projId = newProject.id;
                    } catch {
                      toast({ title: 'Error', description: 'No se pudo crear el proyecto', variant: 'destructive' });
                      return;
                    }
                  }

                  try {
                    await supabase.from('booking_offers').update({ project_id: projId }).eq('id', id);
                    toast({ title: projId ? 'Proyecto vinculado' : 'Proyecto desvinculado' });
                    setShowLinkProjectDialog(false);
                    setProjectOption('none');
                    setSelectedProjectId(null);
                    setNewProjectName('');
                    setNewProjectDescription('');
                    fetchBooking();
                  } catch {
                    toast({ title: 'Error', description: 'No se pudo vincular', variant: 'destructive' });
                  }
                }}
                disabled={
                  (projectOption === 'existing' && !selectedProjectId) ||
                  (projectOption === 'new' && !newProjectName.trim())
                }
              >
                Vincular
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}