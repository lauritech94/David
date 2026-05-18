import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  ArrowLeft,
  Calculator,
  Music,
  DollarSign,
  CreditCard,
  Users,
  Car,
  UtensilsCrossed,
  BedDouble,
  FileText,
  Lightbulb,
  Utensils,
  Bed,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Settings,
  Pencil,
  GripVertical,
  PieChart as PieChartIcon,
  BarChart2,
  TrendingDown,
  CalendarIcon,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FolderOpen,
  ExternalLink,
  Database,
  Upload,
  Sparkles,
  Link2,
  Eraser,
  Info
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useInvoiceAutoLink } from '@/hooks/useInvoiceAutoLink';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import EnhancedBudgetItemsView from '@/components/EnhancedBudgetItemsView';
import LiquidarFacturasDialog from '@/components/LiquidarFacturasDialog';
import { AttachInvoiceToItemDialog } from '@/components/AttachInvoiceToItemDialog';
import { BudgetContactSelector } from '@/components/BudgetContactSelector';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LinkInvoiceGroupDialog, unlinkFromInvoiceGroup } from '@/components/LinkInvoiceGroupDialog';
import { ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getIrpfForArtist, type ArtistFiscalProfile } from '@/utils/irpf';

interface Budget {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  venue: string;
  budget_status: string;
  show_status: string;
  internal_notes: string;
  created_at: string;
  artist_id: string;
  parent_folder_id?: string;
  booking_offer_id?: string;
  event_date: string;
  event_time: string;
  fee: number;
  expense_budget?: number;
  formato?: string;
  profiles?: { full_name: string };
  projects?: { id: string; name: string };
}

interface BudgetItem {
  id: string;
  budget_id: string;
  category: string;
  subcategory?: string;
  name: string;
  quantity: number;
  unit_price: number;
  iva_percentage: number;
  irpf_percentage: number;
  is_attendee: boolean;
  billing_status: 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada' | 'cancelado' | 'agrupada' | 'pagado_sin_factura';
  invoice_link?: string;
  supplier_invoice_number?: string | null;
  supplier_invoice_total?: number | null;
  invoice_group_parent_id?: string | null;
  observations?: string;
  category_id?: string;
  fecha_emision?: string;
  contact_id?: string;
  is_commission_percentage?: boolean;
  commission_percentage?: number;
  is_provisional?: boolean;
  sort_order?: number;
  contacts?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    iban?: string;
    role?: string;
  };
  budget_categories?: {
    id: string;
    name: string;
    icon_name: string;
  };
}

interface BudgetCategory {
  id: string;
  name: string;
  icon_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
  budget_cap: number | null;
}

interface BudgetDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onUpdate: () => void;
  onDelete?: () => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Music: Music,
  Calculator: Calculator,
  DollarSign: DollarSign,
  Users: Users,
  Car: Car,
  UtensilsCrossed: UtensilsCrossed,
  BedDouble: BedDouble,
  CreditCard: CreditCard,
  FileText: FileText,
  Lightbulb: Lightbulb,
  Utensils: Utensils,
  Bed: Bed,
  Settings: Settings,
  FolderOpen: FolderOpen,
  Sparkles: Sparkles,
  Download: Download,
  Database: Database,
};

// Global category sort function - Artista Principal first, Músicos second, then others, Comisiones always last
const getCategorySortPriority = (categoryName: string): number => {
  const name = categoryName.toLowerCase();
  if (name === 'artista principal' || name === 'artista') return 0;
  if (name === 'músicos' || name === 'musicos') return 1;
  if (name.includes('equipo') || name.includes('técnico') || name.includes('producción') || name.includes('produccion')) return 2;
  if (name.includes('transporte')) return 3;
  if (name.includes('dieta')) return 4;
  if (name.includes('hospedaje') || name.includes('alojamiento')) return 5;
  if (name.includes('alquiler') || name.includes('instrumento')) return 6;
  if (name.includes('promoción') || name.includes('promocion')) return 7;
  if (name.includes('booking')) return 97;
  if (name.includes('management')) return 98;
  if (name.includes('comisi')) return 999; // Always last
  // Everything else in the middle
  return 50;
};

const sortCategoriesWithPriority = (categories: BudgetCategory[]): BudgetCategory[] => {
  return [...categories].sort((a, b) => {
    const priorityA = getCategorySortPriority(a.name);
    const priorityB = getCategorySortPriority(b.name);
    if (priorityA !== priorityB) return priorityA - priorityB;
    // If same priority, use database sort_order
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
};

// Default categories for concert budgets
const CONCERT_DEFAULT_CATEGORIES = [
  { name: 'Artista Principal', icon_name: 'Music', sort_order: 0 },
  { name: 'Músicos', icon_name: 'Users', sort_order: 1 },
  { name: 'Equipo Técnico', icon_name: 'Lightbulb', sort_order: 2 },
  { name: 'Transporte', icon_name: 'Car', sort_order: 3 },
  { name: 'Dietas', icon_name: 'Utensils', sort_order: 4 },
  { name: 'Hospedaje', icon_name: 'Bed', sort_order: 5 },
  { name: 'Alquiler instrumentos', icon_name: 'Music', sort_order: 6 },
  { name: 'Promoción', icon_name: 'Music', sort_order: 7 },
  { name: 'Booking', icon_name: 'DollarSign', sort_order: 97 },
  { name: 'Management', icon_name: 'DollarSign', sort_order: 98 },
];

// Default categories for release/music production budgets (alineado con documento industria Vol.II — Bloque E)
// Fases del proceso: A&R → Producción → Mezcla → Mastering → Visual → Campaña → Distribución → Registro
const RELEASE_DEFAULT_CATEGORIES = [
  { name: 'Avance al Artista',       icon_name: 'Music',      sort_order: 0  }, // El pago inicial al artista antes de que existan facturas
  { name: 'Producción y Grabación',  icon_name: 'Music',      sort_order: 1  }, // Sesiones de estudio, co-escritura, producción del beat/arreglos
  { name: 'Mezcla',                  icon_name: 'Settings',   sort_order: 2  }, // Balance final, stems
  { name: 'Mastering',               icon_name: 'Settings',   sort_order: 3  }, // Masterización para streaming (-14 LUFS), WAV/distribución
  { name: 'Diseño y Arte Visual',    icon_name: 'FileText',   sort_order: 4  }, // Artwork (3000x3000px), fotografías, variantes stories
  { name: 'Vídeo Musical',           icon_name: 'FileText',   sort_order: 5  }, // Videoclip oficial si está presupuestado
  { name: 'Prensa y PR',             icon_name: 'DollarSign', sort_order: 6  }, // Nota de prensa, publicista, blogs, medios
  { name: 'Campaña Digital',         icon_name: 'DollarSign', sort_order: 7  }, // Meta Ads, TikTok Ads, Spotify Marquee, SubmitHub
  { name: 'Distribución',            icon_name: 'CreditCard', sort_order: 8  }, // Distribuidor (DistroKid, AWAL, TuneCore, etc.)
  { name: 'Registro SGAE / AIE',     icon_name: 'FileText',   sort_order: 9  }, // Registro composición (SGAE) + intérprete (AIE)
  { name: 'Dietas y Alojamiento',    icon_name: 'Utensils',   sort_order: 10 }, // Dietas de estudio, alojamiento durante grabación
  { name: 'Contingencia',            icon_name: 'Calculator', sort_order: 11 }, // Fondo de reserva (~10-15% del total)
];

// Default categories for promotional campaign budgets (alineado con B3 — Tipos de Promoción)
const CAMPAIGN_DEFAULT_CATEGORIES = [
  { name: 'Meta Ads (IG + FB)',      icon_name: 'DollarSign', sort_order: 0 }, // 4 sem antes, 200-500€ por show/lanzamiento
  { name: 'TikTok Ads',              icon_name: 'DollarSign', sort_order: 1 }, // 2-3 sem antes, 100-300€
  { name: 'Google Ads',              icon_name: 'DollarSign', sort_order: 2 }, // 3-6 sem antes, búsquedas [artista] concierto
  { name: 'Spotify (Marquee/Promo)', icon_name: 'Music',      sort_order: 3 }, // Mínimo 250€, semana del show/release
  { name: 'Prensa y PR',             icon_name: 'FileText',   sort_order: 4 }, // Publicista, medios, blogs, radio local
  { name: 'Contenido y Creatividad', icon_name: 'FileText',   sort_order: 5 }, // Diseño, teasers, behind the scenes, fotos
  { name: 'Plataformas de eventos',  icon_name: 'CreditCard', sort_order: 6 }, // Songkick, Bandsintown, ticketeras
  { name: 'Newsletter y Email',      icon_name: 'FileText',   sort_order: 7 }, // Email a lista de fans (muy alta conversión)
  { name: 'Varios',                  icon_name: 'Calculator', sort_order: 8 }, // Cartelería, imprenta, otros
];

// Default categories for videoclip budgets (alineado con producción audiovisual profesional)
const VIDEOCLIP_DEFAULT_CATEGORIES = [
  { name: 'Dirección y Producción',  icon_name: 'FileText',   sort_order: 0 }, // Director, productor ejecutivo, guión
  { name: 'Equipo de Cámara',        icon_name: 'Lightbulb',  sort_order: 1 }, // DP, cámaras, steadicam, dron
  { name: 'Equipo de Luz y Arte',    icon_name: 'Lightbulb',  sort_order: 2 }, // Gaffer, electricistas, dirección de arte
  { name: 'Localizaciones',          icon_name: 'Car',        sort_order: 3 }, // Permisos, alquiler de espacios, transporte a localización
  { name: 'Vestuario y Maquillaje',  icon_name: 'FileText',   sort_order: 4 }, // Estilismo, peluquería, maquillaje
  { name: 'Actores y Figurantes',    icon_name: 'Users',      sort_order: 5 }, // Casting, cachés de actores/bailarines
  { name: 'Postproducción',          icon_name: 'Settings',   sort_order: 6 }, // Montaje, color grading, VFX, motion graphics
  { name: 'Catering',                icon_name: 'Utensils',   sort_order: 7 }, // Comida y bebida para el rodaje
  { name: 'Transporte y Logística',  icon_name: 'Car',        sort_order: 8 }, // Furgonetas, grúas, alquiler de material
  { name: 'Varios',                  icon_name: 'Calculator', sort_order: 9 }, // Imprevistos y gastos menores
];

// Helper functions for billing status mapping
const mapDbToFrontend = (dbStatus: string): 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada' | 'cancelado' => {
  switch (dbStatus) {
    case 'pendiente': return 'pendiente';
    case 'pagado': return 'pagada';
    case 'facturado': return 'factura_recibida';
    case 'factura_solicitada': return 'factura_solicitada';
    case 'cancelado': return 'cancelado';
    default: return 'pendiente';
  }
};

const mapFrontendToDb = (frontendStatus: string): 'pendiente' | 'pagado' | 'facturado' | 'cancelado' | 'factura_solicitada' => {
  switch (frontendStatus) {
    case 'pendiente': return 'pendiente';
    case 'pagada': return 'pagado';
    case 'factura_recibida': return 'facturado';
    case 'factura_solicitada': return 'factura_solicitada';
    case 'cancelado': return 'cancelado';
    default: return 'pendiente';
  }
};

export default function BudgetDetailsDialog({ open, onOpenChange, budget, onUpdate, onDelete }: BudgetDetailsDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [linkInvoiceItem, setLinkInvoiceItem] = useState<BudgetItem | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetData, setBudgetData] = useState(budget);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEmptyCategories, setShowEmptyCategories] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [displayMode, setDisplayMode] = useState<'neto' | 'con_iva' | 'liquido'>('neto');
  const [chartViewMode, setChartViewMode] = useState<'bars' | 'donut' | 'waterfall'>('bars');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryCap, setEditingCategoryCap] = useState<string>('');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  
  // Element movement states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pendingDeleteItem, setPendingDeleteItem] = useState<{ id: string; retentionCount: number } | null>(null);
  const [pendingDeleteBulk, setPendingDeleteBulk] = useState<{ ids: string[]; retentionCount: number } | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [mainTab, setMainTab] = useState('items');

  const navigateToCategory = (categoryId: string) => {
    setMainTab('items');
    setOpenCategories(prev => new Set([...prev, categoryId]));
    setTimeout(() => {
      document.querySelector(`[data-category-id="${categoryId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [hiddenCategoryAlert, setHiddenCategoryAlert] = useState<{
    categoryId: string;
    categoryName: string;
    itemCount: number;
  } | null>(null);
  
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOverElement, setDragOverElement] = useState<string | null>(null);
  const [isDuplicateDrag, setIsDuplicateDrag] = useState(false);
  const [editingItemValues, setEditingItemValues] = useState<Partial<BudgetItem>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'fecha_emision' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingBudgetAmount, setEditingBudgetAmount] = useState(false);
  const [editingExpenseBudget, setEditingExpenseBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState<number>(budget.fee || 0);
  const [expenseBudget, setExpenseBudget] = useState<number>(budget.expense_budget || 0);
  const [avancePagado, setAvancePagado] = useState<number>((budget as any)?.metadata?.avance_pagado ?? 0);
  const [editingAvance, setEditingAvance] = useState(false);
  const [expandedQuantity, setExpandedQuantity] = useState<string | null>(null);
  const [showLiquidarDialog, setShowLiquidarDialog] = useState(false);
  const [attachInvoiceDialog, setAttachInvoiceDialog] = useState<{ open: boolean; fileUrl: string; fileName: string }>({ open: false, fileUrl: '', fileName: '' });
  const [sharedReleases, setSharedReleases] = useState<{ id: string; title: string }[]>([]);
  const [showLoadFromFormatDialog, setShowLoadFromFormatDialog] = useState(false);
  const [loadDialogTab, setLoadDialogTab] = useState<'formats' | 'team'>('formats');
  const [availableFormats, setAvailableFormats] = useState<Array<{
    id: string;
    name: string;
    artist_name: string;
    artist_id: string;
    crew_count: number;
    fee_national: number | null;
    fee_international: number | null;
  }>>([]);
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{
    id: string;
    name: string;
    role?: string;
    category?: string;
    type: 'workspace' | 'contact';
  }>>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  
  // Booking context for invoice folder saving
  const [bookingContext, setBookingContext] = useState<{ artistId: string; bookingId: string } | null>(null);
  
  // Artist fiscal profile for dynamic IRPF
  const [artistIrpfDefault, setArtistIrpfDefault] = useState<number>(15);
  
  // Invoice auto-link hook
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const {
    isUploading: isUploadingInvoice,
    autoLinkSuggestions,
    uploadInvoice,
    confirmAutoLink,
    dismissAutoLink,
    scanAndAutoLink
  } = useInvoiceAutoLink(budget.id);
  
  // Fetch booking context for saving invoices to correct folder
  useEffect(() => {
    const fetchBookingContext = async () => {
      try {
        setBookingContext(null);

        // The booking folder doesn't store budget_id in metadata; instead, the "Presupuesto" subfolder
        // stores metadata.budget_name like "Presupuesto - <budget.name>".
        const escapedBudgetName = budget.name.replace(/[%_]/g, '\\$&');

        const { data: presupuestoFolder, error: presupuestoError } = await supabase
          .from('storage_nodes')
          .select('id, parent_id, artist_id')
          .eq('node_type', 'folder')
          .eq('name', 'Presupuesto')
          .ilike('metadata->>budget_name', `%${escapedBudgetName}%`)
          .limit(1)
          .maybeSingle();

        if (presupuestoError || !presupuestoFolder?.parent_id) return;

        const { data: bookingFolder, error: bookingError } = await supabase
          .from('storage_nodes')
          .select('metadata')
          .eq('id', presupuestoFolder.parent_id)
          .maybeSingle();

        if (bookingError || !bookingFolder?.metadata) return;

        const metadata = bookingFolder.metadata as Record<string, unknown>;
        const bookingId = typeof metadata.booking_id === 'string' ? metadata.booking_id : null;

        if (bookingId) {
          setBookingContext({
            artistId: presupuestoFolder.artist_id,
            bookingId,
          });
        }
      } catch (e) {
        console.error('Error fetching booking context:', e);
      }
    };

    if (open && budget?.name) {
      fetchBookingContext();
    }
  }, [open, budget.id, budget.name]);

  // Fetch artist fiscal profile for dynamic IRPF defaults
  useEffect(() => {
    if (open && budget?.artist_id) {
      supabase
        .from('artists')
        .select('irpf_type, irpf_porcentaje, actividad_inicio')
        .eq('id', budget.artist_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const result = getIrpfForArtist(data as ArtistFiscalProfile);
            setArtistIrpfDefault(result.percentage);
          }
        });
    }
  }, [open, budget?.artist_id]);

  // Auto-sync from linked booking when dialog opens
  useEffect(() => {
    if (!open || !budget?.booking_offer_id) return;
    (async () => {
      const { data: booking } = await supabase
        .from('booking_offers')
        .select('fecha, ciudad, venue, fee')
        .eq('id', budget.booking_offer_id)
        .maybeSingle();
      if (!booking) return;
      const updates: Record<string, any> = {};
      if (booking.fecha && booking.fecha !== budget.event_date) updates.event_date = booking.fecha;
      if (booking.ciudad && booking.ciudad !== budget.city) updates.city = booking.ciudad;
      if (booking.venue && booking.venue !== budget.venue) updates.venue = booking.venue;
      if (booking.fee != null && booking.fee !== budget.fee) updates.fee = booking.fee;
      if (Object.keys(updates).length > 0) {
        await supabase.from('budgets').update(updates).eq('id', budget.id);
        setBudgetData(prev => ({ ...prev, ...updates }));
        if (updates.fee != null) setBudgetAmount(updates.fee);
      }
    })();
  }, [open, budget?.id, budget?.booking_offer_id]);

  // Fetch shared releases for this budget
  useEffect(() => {
    if (!open || !budget?.id) { setSharedReleases([]); return; }
    (async () => {
      const { data: links } = await supabase
        .from('budget_release_links')
        .select('release_id')
        .eq('budget_id', budget.id);
      if (!links || links.length <= 1) { setSharedReleases([]); return; }
      const releaseIds = links.map((l: any) => l.release_id);
      const { data: releases } = await supabase
        .from('releases')
        .select('id, title')
        .in('id', releaseIds);
      setSharedReleases((releases || []).map((r: any) => ({ id: r.id, title: r.title })));
    })();
  }, [open, budget?.id]);

  useEffect(() => {
    if (open && budget) {
      setBudgetData(budget);
      setBudgetAmount(budget.fee || 0);
      setExpenseBudget(budget.expense_budget || 0);
      fetchBudgetItems();
      fetchBudgetCategories();
      
      // Load hidden categories from budget metadata
      supabase
        .from('budgets')
        .select('metadata')
        .eq('id', budget.id)
        .single()
        .then(({ data: budgetMeta }) => {
          const hidden = (budgetMeta?.metadata as any)?.hidden_categories ?? [];
          setHiddenCategories(new Set(hidden));
          const avance = (budgetMeta?.metadata as any)?.avance_pagado ?? 0;
          setAvancePagado(avance);
        });
      
      // Set up real-time subscription for budget items
      const channel = supabase
        .channel('budget-items-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'budget_items',
            filter: `budget_id=eq.${budget.id}`
          },
          (payload) => {
            console.log('Real-time budget items change:', payload);
            // Refresh items to update charts and tables
            fetchBudgetItems();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'budget_categories'
          },
          (payload) => {
            console.log('Real-time budget categories change:', payload);
            // Refresh categories to update order and data
            fetchBudgetCategories();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, budget]);

  // Auto-load crew from format if budget has formato but no musicians loaded
  useEffect(() => {
    const autoLoadCrewFromFormat = async () => {
      // Only run if we have items loaded (not empty array from initial state), budget has formato, and artist_id
      if (!open || !budget?.formato || !budget?.artist_id || items.length > 0 || loading) return;
      
      // Check if there's a matching booking product for this format
      const { data: bookingProduct } = await supabase
        .from('booking_products')
        .select('id')
        .eq('artist_id', budget.artist_id)
        .ilike('name', budget.formato)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (!bookingProduct) return;
      
      // Check if the format has crew members
      const { data: crewCount } = await supabase
        .from('booking_product_crew')
        .select('id', { count: 'exact', head: true })
        .eq('booking_product_id', bookingProduct.id);
      
      if (!crewCount || (crewCount as unknown as number) === 0) return;
      
      // Determine if international based on budget_status
      const isInternational = budget.budget_status === 'internacional';
      
      // Auto-load the crew
      console.log('🎵 Auto-loading crew from format:', budget.formato);
      await loadCrewFromFormat(bookingProduct.id, isInternational);
    };
    
    autoLoadCrewFromFormat();
  }, [open, budget?.formato, budget?.artist_id, items.length, loading]);

  const saveBudgetAmount = async () => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ fee: budgetAmount })
        .eq('id', budget.id);

      if (error) throw error;
      
      // Recalculate commission-based items
      const commissionItems = items.filter(item => item.is_commission_percentage && item.commission_percentage);
      if (commissionItems.length > 0) {
        for (const item of commissionItems) {
          const newUnitPrice = (budgetAmount * (item.commission_percentage || 0)) / 100;
          await supabase
            .from('budget_items')
            .update({ unit_price: newUnitPrice })
            .eq('id', item.id);
        }
        // Refresh items to show updated values
        await fetchBudgetItems();
      }
      
      setEditingBudgetAmount(false);
      setBudgetData(prev => ({ ...prev, fee: budgetAmount }));
      onUpdate();
      
      const fieldLabel = budget.type === 'concierto' ? 'Caché' : 'Capital';
      toast({
        title: "¡Éxito!",
        description: `${fieldLabel} actualizado${commissionItems.length > 0 ? ` y ${commissionItems.length} comisiones recalculadas` : ''}`
      });
    } catch (error) {
      console.error('Error updating budget amount:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el presupuesto",
        variant: "destructive"
      });
    }
  };

  const saveExpenseBudget = async () => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ expense_budget: expenseBudget })
        .eq('id', budget.id);

      if (error) throw error;
      
      setEditingExpenseBudget(false);
      setBudgetData(prev => ({ ...prev, expense_budget: expenseBudget }));
      onUpdate();
      
      toast({
        title: "¡Éxito!",
        description: "Presupuesto de gastos actualizado correctamente"
      });
    } catch (error) {
      console.error('Error updating expense budget:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el presupuesto de gastos",
        variant: "destructive"
      });
    }
  };

  const saveAvancePagado = async () => {
    try {
      const { data: current } = await supabase
        .from('budgets')
        .select('metadata')
        .eq('id', budget.id)
        .single();
      const existingMeta = (current?.metadata as Record<string, unknown>) || {};
      const { error } = await supabase
        .from('budgets')
        .update({ metadata: { ...existingMeta, avance_pagado: avancePagado } })
        .eq('id', budget.id);
      if (error) throw error;
      setEditingAvance(false);
      onUpdate();
      toast({ title: "¡Éxito!", description: "Avance pagado actualizado correctamente" });
    } catch (error) {
      console.error('Error updating avance pagado:', error);
      toast({ title: "Error", description: "No se pudo actualizar el avance", variant: "destructive" });
    }
  };


  const fetchBudgetCategories = async () => {
    try {
      console.log('Fetching budget categories for user:', user?.id);
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('created_by', user?.id)
        .order('sort_order');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        await createDefaultCategories();
        return;
      }
      
      // Ensure concert budgets have all required categories
      const categoriesWithConcert = await ensureConcertCategories(data);
      
      // Apply priority sorting: Artista Principal first, Músicos second, Comisiones last
      setBudgetCategories(sortCategoriesWithPriority(categoriesWithConcert));
      setOpenCategories(new Set()); // Categories start collapsed
    } catch (error) {
      console.error('Error fetching budget categories:', error);
    }
  };

  const saveHiddenCategoriesToDB = async (newHidden: Set<string>) => {
    try {
      const { data: current } = await supabase
        .from('budgets')
        .select('metadata')
        .eq('id', budget.id)
        .single();
      
      const existingMeta = (current?.metadata as Record<string, unknown>) || {};
      await supabase
        .from('budgets')
        .update({
          metadata: {
            ...existingMeta,
            hidden_categories: Array.from(newHidden)
          }
        })
        .eq('id', budget.id);
    } catch (error) {
      console.error('Error saving hidden categories:', error);
    }
  };

  const toggleHideCategory = (categoryId: string, hide: boolean) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (hide) next.add(categoryId); else next.delete(categoryId);
      saveHiddenCategoriesToDB(next);
      return next;
    });
  };

  const hideEmptyCategories = () => {
    const emptyIds = budgetCategories
      .filter(cat => getCategoryItems(cat.id).length === 0)
      .map(cat => cat.id);

    if (emptyIds.length === 0) {
      toast({ title: "Sin categorías vacías", description: "Todas las categorías tienen al menos un elemento." });
      return;
    }

    const newHidden = new Set(hiddenCategories);
    emptyIds.forEach(id => newHidden.add(id));
    setHiddenCategories(newHidden);
    saveHiddenCategoriesToDB(newHidden);

    toast({
      title: "Listo",
      description: `${emptyIds.length} ${emptyIds.length === 1 ? 'categoría vacía ocultada' : 'categorías vacías ocultadas'}`
    });
  };

  const createDefaultCategories = async () => {
    try {
      const type = budget?.type;
      let defaultCategories;

      if (type === 'concierto') {
        defaultCategories = CONCERT_DEFAULT_CATEGORIES;
      } else if (type === 'produccion_musical') {
        defaultCategories = RELEASE_DEFAULT_CATEGORIES;
      } else if (type === 'campana_promocional') {
        defaultCategories = CAMPAIGN_DEFAULT_CATEGORIES;
      } else if (type === 'videoclip') {
        defaultCategories = VIDEOCLIP_DEFAULT_CATEGORIES;
      } else {
        defaultCategories = [
          { name: 'Gastos generales', icon_name: 'CreditCard', sort_order: 0 },
          { name: 'Comisiones',       icon_name: 'DollarSign', sort_order: 1 },
        ];
      }

      const { data, error } = await supabase
        .from('budget_categories')
        .insert(defaultCategories.map((cat) => ({
          ...cat,
          created_by: user?.id
        })))
        .select();

      if (error) throw error;
      setBudgetCategories(sortCategoriesWithPriority(data || []));
      setOpenCategories(new Set()); // Categories start collapsed
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  // Ensure concert budgets have all required categories
  const ensureConcertCategories = async (existingCategories: BudgetCategory[]) => {
    if (budget?.type !== 'concierto') return existingCategories;
    
    const existingNames = existingCategories.map(c => c.name.toLowerCase());
    const missingCategories = CONCERT_DEFAULT_CATEGORIES.filter(
      cat => !existingNames.includes(cat.name.toLowerCase())
    );
    
    if (missingCategories.length === 0) return existingCategories;
    
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert(missingCategories.map((cat) => ({
          ...cat,
          created_by: user?.id
        })))
        .select();

      if (error) throw error;
      return [...existingCategories, ...(data || [])];
    } catch (error) {
      console.error('Error creating missing concert categories:', error);
      return existingCategories;
    }
  };

  const fetchBudgetItems = async () => {
    try {
      console.log('Fetching budget items for budget:', budget.id);
      const { data, error } = await supabase
        .from('budget_items')
        .select(`
          *,
          budget_categories(id, name, icon_name),
          contacts(id, name, email, phone, iban, role)
        `)
        .eq('budget_id', budget.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const itemsWithDefaults = (data || []).map(item => ({
        ...item,
        irpf_percentage: item.irpf_percentage ?? 15,
        billing_status: mapDbToFrontend(item.billing_status || 'pendiente')
      }));
      console.log('✅ Items fetched:', itemsWithDefaults.length, itemsWithDefaults);
      setItems(itemsWithDefaults);
    } catch (error) {
      console.error('Error fetching budget items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los elementos del presupuesto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (item: BudgetItem) => {
    const subtotal = item.unit_price * (item.quantity || 1);
    const iva = subtotal * (item.iva_percentage / 100);
    const irpf = subtotal * ((item.irpf_percentage ?? 15) / 100);
    return subtotal + iva - irpf;
  };

  /** Returns display total based on mode: neto, con_iva, or liquido (a proveedor) */
  const calculateDisplayTotal = (item: BudgetItem) => {
    const subtotal = item.unit_price * (item.quantity || 1);
    if (displayMode === 'con_iva') {
      const iva = subtotal * (item.iva_percentage / 100);
      return subtotal + iva;
    }
    if (displayMode === 'liquido') {
      const iva = subtotal * (item.iva_percentage / 100);
      const irpf = subtotal * ((item.irpf_percentage ?? 15) / 100);
      return subtotal + iva - irpf; // "A proveedor"
    }
    return subtotal;
  };

  /** Returns the IRPF retention amount for líquido mode */
  const calculateIrpfRetention = (item: BudgetItem) => {
    const subtotal = item.unit_price * (item.quantity || 1);
    return subtotal * ((item.irpf_percentage ?? 15) / 100);
  };

  const calculateGrandTotals = () => {
    const totals = items.reduce(
      (acc, item) => {
        const subtotal = item.unit_price * (item.quantity || 1);
        const iva = subtotal * (item.iva_percentage / 100);
        const irpf = subtotal * ((item.irpf_percentage ?? 15) / 100);
        
        acc.neto += subtotal;
        acc.iva += iva;
        acc.irpf += irpf;
        acc.total += subtotal + iva - irpf;
        
        return acc;
      },
      { neto: 0, iva: 0, irpf: 0, total: 0 }
    );
    
    return totals;
  };

  const getCategoryItems = (categoryId: string) => {
    console.log('🔍 Getting items for category:', categoryId);
    
    if (!items || items.length === 0) {
      console.log('⚠️ No items found in state');
      return [];
    }
    
    const filteredItems = items.filter(item => {
      // Primera prioridad: category_id exacto
      if (item.category_id === categoryId) {
        console.log('✅ Item matched by category_id:', item.name);
        return true;
      }
      
      // Para elementos sin categoría, mostrar en la primera categoría
      if (!item.category_id && budgetCategories.length > 0 && categoryId === budgetCategories[0]?.id) {
        console.log('⚡ Item without category assigned to first category:', item.name);
        return true;
      }
      
      return false;
    });
    
    console.log('📋 Filtered items for category', categoryId, ':', filteredItems.length);
    // Always return sorted by sort_order so drag reorder is visible
    return filteredItems.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  };

  const getFilteredAndSortedItems = (categoryId: string) => {
    let categoryItems = getCategoryItems(categoryId);
    
    // Apply search filter
    if (searchTerm) {
      categoryItems = categoryItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit_price.toString().includes(searchTerm) ||
        (item.unit_price * item.quantity).toString().includes(searchTerm)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      categoryItems = categoryItems.filter(item => item.billing_status === statusFilter);
    }
    
    // Apply sorting
    categoryItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'amount':
          aValue = calculateTotal(a);
          bValue = calculateTotal(b);
          break;
        case 'fecha_emision':
          aValue = a.fecha_emision ? new Date(a.fecha_emision).getTime() : 0;
          bValue = b.fecha_emision ? new Date(b.fecha_emision).getTime() : 0;
          break;
        case 'status':
          aValue = a.billing_status;
          bValue = b.billing_status;
          break;
        default:
          // Default: sort by sort_order
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return categoryItems;
  };

  // Funciones para el gráfico y resumen
  const getCategoryChartData = () => {
    const colors = [
      '#2563eb', // azul
      '#f59e0b', // ámbar
      '#10b981', // esmeralda
      '#ef4444', // rojo
      '#8b5cf6', // violeta
      '#06b6d4', // cyan
      '#ec4899', // rosa
      '#84cc16', // lima
      '#f97316', // naranja
      '#7c3aed', // púrpura oscuro
      '#14b8a6', // teal
      '#e11d48', // rosa fuerte
      '#eab308', // amarillo
      '#0891b2', // cyan oscuro
      '#d946ef', // fucsia
      '#64748b', // slate
    ];
    
    // Sort categories with priority: Artista first, Músicos second, Comisiones last
    const sortedCategories = sortCategoriesWithPriority(budgetCategories);
    
    const chartData = sortedCategories.map((category, index) => {
      const categoryItems = getCategoryItems(category.id);
      const total = categoryItems.reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
      
      return {
        name: category.name,
        value: total,
        color: colors[index % colors.length],
        count: categoryItems.length
      };
    }).filter(item => item.value > 0); // Only show categories with value
    
    return chartData;
  };

  const getCategorySummaryData = () => {
    // Sort categories with priority: Artista first, Músicos second, Comisiones last
    const sortedCategories = sortCategoriesWithPriority(budgetCategories);
    
    return sortedCategories.map(category => {
      const categoryItems = getCategoryItems(category.id);
      const total = categoryItems.reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
      const confirmed = categoryItems
        .filter(i => !i.is_provisional)
        .reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
      const provisional = categoryItems
        .filter(i => i.is_provisional)
        .reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
      const allPaid = categoryItems.length > 0 && categoryItems.every(i => i.billing_status === 'pagada');
      
      return {
        id: category.id,
        name: category.name,
        icon: category.icon_name,
        count: categoryItems.length,
        total: total,
        confirmed,
        provisional,
        allPaid,
        budgetCap: category.budget_cap
      };
    }); // Show all categories, even empty ones
  };

  const getGroupedChartData = () => {
    const raw = getCategoryChartData();
    const total = raw.reduce((s, d) => s + d.value, 0);
    if (total === 0) return raw;
    const threshold = 0.03;
    const major: typeof raw = [];
    const minor: typeof raw = [];
    raw.forEach(d => {
      if (d.value / total >= threshold) major.push(d);
      else minor.push(d);
    });
    if (minor.length > 0) {
      major.push({
        name: 'Otros',
        value: minor.reduce((s, d) => s + d.value, 0),
        color: '#9ca3af',
        count: minor.reduce((s, d) => s + d.count, 0),
        _details: minor.map(d => ({ name: d.name, value: d.value }))
      } as any);
    }
    return major;
  };

  const getCategoryBarData = () => {
    const sortedCategories = sortCategoriesWithPriority(budgetCategories);
    return sortedCategories.map(category => {
      const categoryItems = getCategoryItems(category.id);
      const paid = categoryItems
        .filter(i => i.billing_status === 'pagada' && !i.is_provisional)
        .reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
      const confirmed = categoryItems
        .filter(i => i.billing_status !== 'pagada' && !i.is_provisional)
        .reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
      const provisional = categoryItems
        .filter(i => i.is_provisional)
        .reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
      const total = paid + confirmed + provisional;
      return {
        id: category.id,
        name: category.name,
        icon: category.icon_name,
        paid,
        confirmed,
        provisional,
        total,
        budgetCap: category.budget_cap
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  };

  const createTestData = async () => {
    try {
      console.log('🧪 Creating test data for budget:', budget.id);
      
      // Esperar a que las categorías estén cargadas
      if (budgetCategories.length === 0) {
        await createDefaultCategories();
        // Dar tiempo para que se actualice el estado
        setTimeout(() => {
          createTestDataWithCategories();
        }, 1000);
        return;
      }
      
      await createTestDataWithCategories();
    } catch (error) {
      console.error('Error creating test data:', error);
      toast({
        title: "Error",
        description: "No se pudieron crear los datos de prueba",
        variant: "destructive"
      });
    }
  };

  const createTestDataWithCategories = async () => {
    try {
      const testItems = [
        {
          budget_id: budget.id,
          category_id: budgetCategories[0]?.id || null,
          name: 'Honorarios artista',
          quantity: 1,
          unit_price: 2000,
          iva_percentage: 21,
          irpf_percentage: artistIrpfDefault,
          is_attendee: false,
          billing_status: 'pendiente' as const,
          category: '',
          subcategory: '',
          observations: 'Elemento de prueba'
        },
        {
          budget_id: budget.id,
          category_id: budgetCategories[0]?.id || null,
          name: 'Producción técnica',
          quantity: 1,
          unit_price: 500,
          iva_percentage: 21,
          irpf_percentage: artistIrpfDefault,
          is_attendee: false,
          billing_status: 'pendiente' as const,
          category: '',
          subcategory: '',
          observations: 'Elemento de prueba'
        }
      ];

      const { error } = await supabase
        .from('budget_items')
        .insert(testItems);

      if (error) throw error;
      
      await fetchBudgetItems();
      toast({
        title: "¡Datos de prueba creados!",
        description: "Se han añadido elementos de ejemplo al presupuesto"
      });
    } catch (error) {
      console.error('Error creating test items:', error);
    }
  };

  const fetchAvailableFormats = async () => {
    setLoadingFormats(true);
    try {
      const { data, error } = await supabase
        .from('booking_products')
        .select(`
          id,
          name,
          artist_id,
          fee_national,
          fee_international,
          artists!inner(name)
        `)
        .eq('is_active', true)
        .eq('artist_id', budget.artist_id)
        .order('name');

      if (error) throw error;

      // Get crew counts for each format
      const formatsWithCrew = await Promise.all(
        (data || []).map(async (format) => {
          const { count } = await supabase
            .from('booking_product_crew')
            .select('*', { count: 'exact', head: true })
            .eq('booking_product_id', format.id);

          return {
            id: format.id,
            name: format.name,
            artist_id: format.artist_id,
            artist_name: (format.artists as any)?.name || 'Sin artista',
            crew_count: count || 0,
            fee_national: format.fee_national,
            fee_international: format.fee_international
          };
        })
      );

      setAvailableFormats(formatsWithCrew);
    } catch (error) {
      console.error('Error fetching formats:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los formatos",
        variant: "destructive"
      });
    } finally {
      setLoadingFormats(false);
    }
  };

  const fetchTeamMembers = async () => {
    setLoadingTeamMembers(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const members: Array<{id: string; name: string; role?: string; category?: string; type: 'workspace' | 'contact'}> = [];

      // Get user's workspace
      const { data: profileData } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      // Workspace members
      if (profileData?.workspace_id) {
        const { data: memberships } = await supabase
          .from('workspace_memberships')
          .select('user_id, role, team_category')
          .eq('workspace_id', profileData.workspace_id);

        if (memberships && memberships.length > 0) {
          const userIds = memberships.map((m: any) => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, stage_name, roles')
            .in('user_id', userIds);

          const catMap = new Map<string, string>();
          memberships.forEach((m: any) => catMap.set(m.user_id, m.team_category || 'management'));

          (profiles || []).forEach((p: any) => {
            const roles = p.roles as string[] | null;
            let roleLabel: string | undefined;
            if (roles?.includes('management')) roleLabel = 'Manager';
            else if (roles?.includes('artist')) roleLabel = 'Artista';

            members.push({
              id: p.user_id,
              name: p.stage_name || p.full_name || 'Sin nombre',
              role: roleLabel,
              category: catMap.get(p.user_id),
              type: 'workspace',
            });
          });
        }
      }

      // Team contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, stage_name, category, role, field_config')
        .eq('created_by', user.id);

      const teamContacts = (contacts || []).filter((c: any) => {
        const config = c.field_config as Record<string, any> | null;
        return config?.is_team_member === true;
      });

      teamContacts.forEach((c: any) => {
        members.push({
          id: c.id,
          name: c.stage_name || c.name,
          role: c.role,
          category: c.category,
          type: 'contact',
        });
      });

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const addSelectedTeamMembersToBudget = async () => {
    if (selectedTeamMembers.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const itemsToInsert = [];

      for (const memberId of selectedTeamMembers) {
        const member = teamMembers.find(m => m.id === memberId);
        if (!member) continue;

        let contactId: string | null = null;
        
        // Determine budget category based on member's category/role
        let categoryName = 'Músicos / Crew';
        const memberCategory = member.category?.toLowerCase() || '';
        const memberRole = member.role?.toLowerCase() || '';
        
        if (memberCategory === 'management' || memberRole.includes('manager') || memberRole.includes('booker') || memberRole.includes('business')) {
          categoryName = 'Management';
        } else if (memberCategory === 'banda' || memberCategory === 'musicos' || memberRole.includes('músico') || memberRole.includes('musico')) {
          categoryName = 'Músicos / Crew';
        } else if (memberCategory === 'tecnico' || memberRole.includes('técnico') || memberRole.includes('tecnico') || memberRole.includes('sonido') || memberRole.includes('luces')) {
          categoryName = 'Producción';
        } else if (memberCategory === 'artista' || memberRole.includes('artista')) {
          categoryName = 'Artista Principal';
        }

        // If it's already a contact, use directly
        if (member.type === 'contact') {
          contactId = member.id;
        } else {
          // For workspace members, find or create mirror contact
          const { data: existingMirror } = await supabase
            .from('contacts')
            .select('id')
            .eq('field_config->>workspace_user_id', member.id)
            .maybeSingle();

          if (existingMirror?.id) {
            contactId = existingMirror.id;
          } else {
            // Create mirror contact
            const { data: newContact } = await supabase
              .from('contacts')
              .insert({
                name: member.name,
                category: member.category || 'management',
                role: member.role,
                created_by: user.id,
                field_config: {
                  workspace_user_id: member.id,
                  mirror_type: 'workspace_member',
                },
              })
              .select('id')
              .single();

            if (newContact?.id) {
              contactId = newContact.id;
            }
          }
        }

        // Get or ensure category exists
        let categoryId = budgetCategories.find(c => c.name === categoryName)?.id;
        if (!categoryId && budgetCategories.length > 0) {
          categoryId = budgetCategories[0].id;
        }

        itemsToInsert.push({
          budget_id: budget.id,
          name: member.role || member.name,
          category: categoryName,
          category_id: categoryId,
          contact_id: contactId,
          quantity: 1,
          unit_price: 0,
          iva_percentage: 21,
          irpf_percentage: artistIrpfDefault,
          is_attendee: true,
          billing_status: 'pendiente',
        });
      }

      if (itemsToInsert.length > 0) {
        const { error } = await supabase
          .from('budget_items')
          .insert(itemsToInsert);

        if (error) throw error;

        toast({
          title: "Equipo añadido",
          description: `Se añadieron ${itemsToInsert.length} miembros al presupuesto`,
        });

        setSelectedTeamMembers([]);
        setShowLoadFromFormatDialog(false);
        await fetchBudgetItems();
        // Alert if any inserted items landed in hidden categories
        const hiddenCategoryIds = new Set(
          itemsToInsert.map(i => i.category_id).filter(Boolean) as string[]
        );
        for (const catId of hiddenCategoryIds) {
          const count = itemsToInsert.filter(i => i.category_id === catId).length;
          checkAndAlertHiddenCategory(catId, count);
        }
      }
    } catch (error) {
      console.error('Error adding team members:', error);
      toast({
        title: "Error",
        description: "No se pudieron añadir los miembros del equipo",
        variant: "destructive",
      });
    }
  };

  const loadCrewFromFormat = async (formatId: string, isInternational: boolean = false) => {
    try {
      // Get crew members and artist info for this format
      const { data: crewData, error: crewError } = await supabase
        .from('booking_product_crew')
        .select('*')
        .eq('booking_product_id', formatId);

      if (crewError) throw crewError;

      if (!crewData || crewData.length === 0) {
        toast({
          title: "Sin equipo",
          description: "Este formato no tiene miembros del equipo configurados",
          variant: "destructive"
        });
        return;
      }

      // Get the format to know the artist_id
      const { data: formatData } = await supabase
        .from('booking_products')
        .select('artist_id, artists(id, name, legal_name)')
        .eq('id', formatId)
        .single();

      const artistId = formatData?.artist_id;
      const artistInfo = formatData?.artists as { id: string; name: string; legal_name: string | null } | null;

      // Get the booking fee for percentage calculations
      const bookingFee = budgetAmount || 0;

      // Category sort order: Artista Principal=0, Músicos=1, Equipo técnico=2, Comisiones=99 (always last)
      const getCategorySortOrder = (categoryName: string): number => {
        const name = categoryName.toLowerCase();
        if (name === 'artista principal' || name === 'artista') return 0;
        if (name === 'músicos' || name === 'musicos') return 1;
        if (name.includes('técn') || name.includes('tecn') || name.includes('crew')) return 2;
        if (name.includes('comisi')) return 99;
        return 50; // Default for other categories
      };

      const getCategoryIcon = (categoryName: string): string => {
        const name = categoryName.toLowerCase();
        if (name === 'artista principal' || name === 'artista') return 'Music';
        if (name === 'músicos' || name === 'musicos') return 'Users';
        if (name.includes('técn') || name.includes('tecn')) return 'Lightbulb';
        if (name.includes('comisi')) return 'DollarSign';
        return 'Users';
      };

      // Helper to get or create category
      const getOrCreateCategory = async (categoryName: string) => {
        let category = budgetCategories.find(c => 
          c.name.toLowerCase() === categoryName.toLowerCase()
        );
        
        if (!category) {
          // Create the category with proper sort order
          const { data: newCat, error: catError } = await supabase
            .from('budget_categories')
            .insert({
              name: categoryName,
              icon_name: getCategoryIcon(categoryName),
              created_by: user?.id,
              sort_order: getCategorySortOrder(categoryName)
            })
            .select()
            .single();
          
          if (!catError && newCat) {
            setBudgetCategories(prev => [...prev, newCat].sort((a, b) => a.sort_order - b.sort_order));
            return newCat.id;
          }
        }
        return category?.id || budgetCategories[0]?.id;
      };

      // Sort crew data to put the artist first
      const sortedCrewData = [...crewData].sort((a, b) => {
        const aIsArtist = a.member_id === artistId;
        const bIsArtist = b.member_id === artistId;
        if (aIsArtist && !bIsArtist) return -1;
        if (!aIsArtist && bIsArtist) return 1;
        return 0;
      });

      // Create budget items from crew members
      const budgetItems = await Promise.all(
        sortedCrewData.map(async (crew) => {
          // Concept (role) will be stored in 'name' field, member name comes from contact
          let concept = crew.role_label || 'Miembro del equipo'; // This is the role/concept
          let memberCategory = 'Músicos'; // Default category for band members
          let contactId: string | null = null; // To link budget item to contact
          let isArtist = false;

          // Check if this is the artist themselves
          if (crew.member_id === artistId && artistInfo) {
            concept = 'Artista Principal'; // The concept/role for the artist
            memberCategory = 'Artista Principal';
            isArtist = true;
            
            // Find or create a mirror contact for the artist.
            // NOTE: contacts.artist_id points to profiles in this project; for roster artists we store the link in field_config.roster_artist_id
            const { data: existingContact, error: existingContactErr } = await supabase
              .from('contacts')
              .select('id')
              .eq('field_config->>roster_artist_id', artistId)
              .maybeSingle();

            if (existingContactErr) {
              console.error(existingContactErr);
            } else if (existingContact?.id) {
              contactId = existingContact.id;
            } else {
              // Create a mirror contact for this artist
              const { data: newContact, error: insertErr } = await supabase
                .from('contacts')
                .insert({
                  name: artistInfo.name,
                  legal_name: artistInfo.legal_name,
                  stage_name: artistInfo.name,
                  category: 'artista',
                  role: 'Artista',
                  created_by: user?.id,
                  field_config: {
                    roster_artist_id: artistId,
                    mirror_type: 'roster_artist',
                  },
                })
                .select('id')
                .single();

              if (insertErr) {
                console.error(insertErr);
              } else if (newContact?.id) {
                contactId = newContact.id;
              }
            }
          }
          
          // Only look up profiles/contacts if this is NOT the artist
          if (!isArtist) {
            // Try profiles table (workspace members)
            if (crew.member_id && crew.member_type === 'workspace') {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, stage_name, roles')
                .eq('user_id', crew.member_id)
                .maybeSingle();
              
              if (profile) {
                // Use role_label as concept, keep it as is
                // Check if this person has management role (manager/booker = commission)
                const roles = profile.roles as string[] | null;
                if (roles && (roles.includes('management') || roles.includes('manager') || roles.includes('booker'))) {
                  memberCategory = 'Management';
                }
                
                // First, try to find a contact linked to this workspace user via field_config.workspace_user_id
                const { data: existingMirror } = await supabase
                  .from('contacts')
                  .select('id')
                  .eq('field_config->>workspace_user_id', crew.member_id)
                  .maybeSingle();
                
                if (existingMirror?.id) {
                  contactId = existingMirror.id;
                } else if (profile.full_name) {
                  // Fallback: try to find by name match
                  const { data: matchingContact } = await supabase
                    .from('contacts')
                    .select('id')
                    .or(`name.ilike.%${profile.full_name}%,legal_name.ilike.%${profile.full_name}%`)
                    .maybeSingle();
                  
                  if (matchingContact?.id) {
                    contactId = matchingContact.id;
                  } else {
                    // Create a mirror contact for this workspace member
                    const { data: newContact, error: insertErr } = await supabase
                      .from('contacts')
                      .insert({
                        name: profile.stage_name || profile.full_name,
                        legal_name: profile.full_name,
                        category: 'management',
                        role: crew.role_label || 'Management',
                        created_by: user?.id,
                        field_config: {
                          workspace_user_id: crew.member_id,
                          mirror_type: 'workspace_member',
                        },
                      })
                      .select('id')
                      .single();

                    if (insertErr) {
                      console.error('Error creating mirror contact for workspace member:', insertErr);
                    } else if (newContact?.id) {
                      contactId = newContact.id;
                    }
                  }
                }
              }
            } else if (crew.member_id) {
              // Try contacts table - directly link to contact
              const { data: contact } = await supabase
                .from('contacts')
                .select('id, name, legal_name, stage_name, role, category')
                .eq('id', crew.member_id)
                .maybeSingle();
              
              if (contact) {
                // Use contact's role as concept if role_label is generic
                if (!crew.role_label || crew.role_label === 'Miembro del equipo') {
                  concept = contact.role || concept;
                }
                contactId = contact.id; // Link to contact
                
                // Determine category based on contact category/role
                const contactRole = contact.role?.toLowerCase() || '';
                if (contact.category === 'tecnico' || 
                    contactRole.includes('técnico') ||
                    contactRole.includes('sonido') ||
                    contactRole.includes('luces') ||
                    contactRole.includes('backline')) {
                  memberCategory = 'Equipo técnico';
                } else if (contact.category === 'management' ||
                           contactRole.includes('manager') ||
                           contactRole.includes('booker')) {
                  memberCategory = 'Management';
                } else if (contact.category === 'banda' ||
                           contactRole.includes('músico') ||
                           contactRole.includes('guitarra') ||
                           contactRole.includes('bajo') ||
                           contactRole.includes('bateria') ||
                           contactRole.includes('teclado')) {
                  memberCategory = 'Músicos';
                }
              }
            }
          } // End of if (!isArtist)
          
          // Also check: if is_percentage is true, it's likely a commission (manager/booker)
          if (crew.is_percentage) {
            memberCategory = 'Management';
          }

          // Get or create the target category
          const targetCategoryId = await getOrCreateCategory(memberCategory);

          // Calculate unit price
          let unitPrice = 0;
          if (crew.is_percentage) {
            const percentage = isInternational 
              ? (crew.percentage_international || crew.percentage_national || 0)
              : (crew.percentage_national || crew.percentage_international || 0);
            unitPrice = (bookingFee * percentage) / 100;
          } else {
            unitPrice = isInternational
              ? (crew.fee_international || crew.fee_national || 0)
              : (crew.fee_national || crew.fee_international || 0);
          }

          const commissionPercentage = crew.is_percentage
            ? (isInternational 
                ? (crew.percentage_international || crew.percentage_national || 0)
                : (crew.percentage_national || crew.percentage_international || 0))
            : null;

          return {
            budget_id: budget.id,
            category_id: targetCategoryId,
            category: memberCategory,
            name: concept, // Store the role/concept, not the member name
            quantity: 1,
            unit_price: unitPrice,
            iva_percentage: 0,
            irpf_percentage: artistIrpfDefault,
            is_attendee: true,
            billing_status: 'pendiente' as const,
            is_commission_percentage: crew.is_percentage || false,
            commission_percentage: commissionPercentage,
            contact_id: contactId, // Link budget item to contact profile
            subcategory: crew.is_percentage 
              ? `${commissionPercentage}% del fee`
              : undefined,
            observations: 'Cargado desde formato'
          };
        })
      );

      // Insert all items
      const { error: insertError } = await supabase
        .from('budget_items')
        .insert(budgetItems);

      if (insertError) throw insertError;

      // Delete empty categories (categories without any items in this budget)
      const { data: allBudgetItems } = await supabase
        .from('budget_items')
        .select('category_id')
        .eq('budget_id', budget.id);

      const usedCategoryIds = new Set(
        (allBudgetItems || [])
          .map(item => item.category_id)
          .filter(Boolean)
      );

      // Find empty categories to delete
      const emptyCategories = budgetCategories.filter(cat => !usedCategoryIds.has(cat.id));
      
      if (emptyCategories.length > 0) {
        const { error: deleteError } = await supabase
          .from('budget_categories')
          .delete()
          .in('id', emptyCategories.map(c => c.id));

        if (deleteError) {
          console.error('Error deleting empty categories:', deleteError);
        } else {
          await fetchBudgetCategories();
        }
      }

      await fetchBudgetItems();
      setShowLoadFromFormatDialog(false);
      // Alert for each hidden category that received items
      const insertedByCat = new Map<string, number>();
      for (const item of budgetItems) {
        if (item.category_id) {
          insertedByCat.set(item.category_id, (insertedByCat.get(item.category_id) || 0) + 1);
        }
      }
      for (const [catId, count] of insertedByCat) {
        checkAndAlertHiddenCategory(catId, count);
      }
      
      toast({
        title: "¡Equipo cargado!",
        description: `Se han añadido ${crewData.length} miembros del equipo al presupuesto${emptyCategories.length > 0 ? ` y eliminado ${emptyCategories.length} categorías vacías` : ''}`
      });
    } catch (error) {
      console.error('Error loading crew from format:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el equipo del formato",
        variant: "destructive"
      });
    }
  };

  const checkAndAlertHiddenCategory = (categoryId: string, itemCount = 1) => {
    if (hiddenCategories.has(categoryId)) {
      const cat = budgetCategories.find(c => c.id === categoryId);
      if (cat) {
        setHiddenCategoryAlert({ categoryId, categoryName: cat.name, itemCount });
      }
    }
  };

  const addNewItem = async (categoryId: string) => {
    try {
      // Categorías exentas de IRPF por defecto (gastos suplidos)
      const category = budgetCategories.find(c => c.id === categoryId);
      const categoryName = (category?.name || '').toLowerCase().trim();
      const zeroIrpfCategories = ['transporte', 'hospedaje', 'dietas'];
      const defaultIrpf = zeroIrpfCategories.includes(categoryName) ? 0 : artistIrpfDefault;

      // Assign sort_order at the end of this category
      const categoryItems = getCategoryItems(categoryId);
      const maxSortOrder = categoryItems.reduce((max, item) => Math.max(max, item.sort_order ?? 0), -1);

      const { data, error } = await supabase
        .from('budget_items')
        .insert({
          budget_id: budget.id,
          category_id: categoryId,
          category: '',
          subcategory: '',
          name: 'Nuevo elemento',
          quantity: 1,
          unit_price: 0,
          iva_percentage: 21,
          irpf_percentage: defaultIrpf,
          is_attendee: false,
          billing_status: 'pendiente',
          invoice_link: '',
          observations: '',
          fecha_emision: null,
          sort_order: maxSortOrder + 1
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchBudgetItems();
      checkAndAlertHiddenCategory(categoryId, 1);
      setEditingItem(data.id);
      setEditingItemValues({
        ...data,
        billing_status: data.billing_status === 'pagado' ? 'pagada' : 
                       data.billing_status === 'facturado' ? 'factura_recibida' :
                       data.billing_status === 'cancelado' ? 'pendiente' :
                       (data.billing_status as 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada') || 'pendiente'
      });
      
      toast({
        title: "¡Éxito!",
        description: "Elemento agregado correctamente"
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el elemento",
        variant: "destructive"
      });
    }
  };

  const startEditingItem = (item: BudgetItem) => {
    console.log('🔧 Starting edit for item:', item.name, 'billing_status:', item.billing_status);
    setEditingItem(item.id);
    // Ensure all values are properly set with current item data
    setEditingItemValues({
      ...item,
      billing_status: item.billing_status || 'pendiente'
    });
    console.log('✅ Edit values set:', { billing_status: item.billing_status || 'pendiente' });
  };

  const saveItemEdits = async () => {
    if (!editingItem || !editingItemValues) return;

    console.log('💾 Saving item edits:', {
      editingItem,
      editingItemValues,
      originalValues: items.find(item => item.id === editingItem)
    });

    try {
      // Exclude relational fields that don't exist in the table
      const { budget_categories, contacts, ...itemData } = editingItemValues;
      
      const updateData = {
        ...itemData,
        // Map frontend values to database values
        billing_status: (editingItemValues.billing_status === 'pagada' ? 'pagado' :
                        editingItemValues.billing_status === 'factura_recibida' ? 'facturado' :
                        editingItemValues.billing_status === 'factura_solicitada' ? 'factura_solicitada' :
                        editingItemValues.billing_status === 'cancelado' ? 'cancelado' :
                        'pendiente') as 'pendiente' | 'pagado' | 'facturado' | 'cancelado' | 'factura_solicitada'
      };
      
      console.log('📝 Update data to send:', updateData);
      
      const { data, error } = await supabase
        .from('budget_items')
        .update(updateData)
        .eq('id', editingItem)
        .select();

      console.log('🔄 Supabase update response:', { data, error });

      if (error) {
        console.error('❌ Supabase error details:', error);
        throw error;
      }
      
      setEditingItem(null);
      setEditingItemValues({});
      await fetchBudgetItems();
      
      toast({
        title: "¡Éxito!",
        description: "Elemento actualizado correctamente"
      });
    } catch (error) {
      console.error('❌ Error updating item:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el elemento",
        variant: "destructive"
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      // Check for related retentions first
      const { data: retentions } = await supabase
        .from('irpf_retentions')
        .select('id')
        .eq('budget_item_id', itemId);

      if (retentions && retentions.length > 0) {
        setPendingDeleteItem({ id: itemId, retentionCount: retentions.length });
        return; // Wait for user confirmation
      }

      await executeDeleteItem(itemId);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el elemento",
        variant: "destructive"
      });
    }
  };

  const executeDeleteItem = async (itemId: string) => {
    try {
      await supabase.from('irpf_retentions').delete().eq('budget_item_id', itemId);

      const { error } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await fetchBudgetItems();
      toast({
        title: "¡Éxito!",
        description: "Elemento eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el elemento",
        variant: "destructive"
      });
    }
  };

  const updateCategoryName = async (categoryId: string, newName: string) => {
    try {
      const trimmedName = newName.trim();
      if (!trimmedName) {
        toast({
          title: "Error",
          description: "El nombre no puede estar vacío",
          variant: "destructive"
        });
        return;
      }
      
      // Check if name already exists (different category, same user)
      const existingCategory = budgetCategories.find(
        c => c.id !== categoryId && c.name.toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (existingCategory) {
        toast({
          title: "Error",
          description: "Ya existe una categoría con ese nombre",
          variant: "destructive"
        });
        return;
      }
      
      const capValue = editingCategoryCap.trim() === '' ? null : parseFloat(editingCategoryCap);
      const { error } = await supabase
        .from('budget_categories')
        .update({ name: trimmedName, budget_cap: capValue })
        .eq('id', categoryId);

      if (error) throw error;
      
      await fetchBudgetCategories();
      setEditingCategory(null);
      setNewCategoryName('');
      
      toast({
        title: "¡Éxito!",
        description: "Categoría actualizada correctamente"
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive"
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      // Check if category has items
      const itemsInCategory = getCategoryItems(categoryId);
      if (itemsInCategory.length > 0) {
        toast({
          title: "No se puede eliminar",
          description: "La categoría tiene elementos. Muévelos primero a otra categoría.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      await fetchBudgetCategories();
      
      toast({
        title: "¡Éxito!",
        description: "Categoría eliminada correctamente"
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive"
      });
    }
  };

  const addNewCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert({
          name: 'Nueva Categoría',
          icon_name: 'DollarSign',
          created_by: user?.id,
          sort_order: budgetCategories.length
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchBudgetCategories();
      setEditingCategory(data.id);
      setNewCategoryName(data.name);
      
      toast({
        title: "¡Éxito!",
        description: "Nueva categoría creada"
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la categoría",
        variant: "destructive"
      });
    }
  };

  const reorderCategories = async (draggedId: string, targetId: string) => {
    try {
      const draggedIndex = budgetCategories.findIndex(cat => cat.id === draggedId);
      const targetIndex = budgetCategories.findIndex(cat => cat.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      // Create new array with reordered categories
      const newCategories = [...budgetCategories];
      const [removed] = newCategories.splice(draggedIndex, 1);
      newCategories.splice(targetIndex, 0, removed);

      // Update sort_order for all affected categories
      const updates = newCategories.map((category, index) => ({
        id: category.id,
        sort_order: index
      }));

      // Update in database
      for (const update of updates) {
        const { error } = await supabase
          .from('budget_categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      // Refresh categories to get updated order
      await fetchBudgetCategories();
      
      toast({
        title: "Orden actualizado",
        description: "Las categorías se han reordenado exitosamente"
      });
    } catch (error) {
      console.error('Error reordering categories:', error);
      toast({
        title: "Error",
        description: "No se pudo reordenar las categorías",
        variant: "destructive"
      });
    }
  };

  const reorderElements = async (draggedId: string, targetId: string, categoryId: string) => {
    try {
      // Get items for this category sorted by sort_order
      const categoryItems = getCategoryItems(categoryId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      
      const draggedIndex = categoryItems.findIndex(item => item.id === draggedId);
      const targetIndex = categoryItems.findIndex(item => item.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      const newItems = [...categoryItems];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, removed);

      // Build updates
      const updates = newItems.map((item, index) => ({
        id: item.id,
        sort_order: index
      }));

      // Update local state immediately
      setItems(prev => prev.map(item => {
        const update = updates.find(u => u.id === item.id);
        return update ? { ...item, sort_order: update.sort_order } : item;
      }));

      // Persist to database
      for (const update of updates) {
        const { error } = await supabase
          .from('budget_items')
          .update({ sort_order: update.sort_order } as any)
          .eq('id', update.id);
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error reordering elements:', error);
      toast({
        title: "Error",
        description: "No se pudo reordenar los elementos",
        variant: "destructive"
      });
    }
  };

  const duplicateItemAtPosition = async (sourceId: string, targetId: string, categoryId: string) => {
    try {
      const sourceItem = items.find(i => i.id === sourceId);
      if (!sourceItem) return;

      const categoryItems = getCategoryItems(categoryId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const targetIndex = categoryItems.findIndex(i => i.id === targetId);
      const insertOrder = targetIndex >= 0 ? targetIndex : categoryItems.length;

      // Shift sort_order of items at and after the target position
      const updates = categoryItems
        .filter((_, idx) => idx >= insertOrder)
        .map((item, idx) => ({ id: item.id, sort_order: insertOrder + idx + 1 }));

      for (const u of updates) {
        await supabase.from('budget_items').update({ sort_order: u.sort_order } as any).eq('id', u.id);
      }

      // Insert the duplicate
      const { error } = await supabase.from('budget_items').insert({
        budget_id: sourceItem.budget_id,
        category: sourceItem.category,
        category_id: sourceItem.category_id || null,
        subcategory: sourceItem.subcategory || null,
        name: `${sourceItem.name} (copia)`,
        quantity: sourceItem.quantity ?? 1,
        unit_price: sourceItem.unit_price ?? 0,
        iva_percentage: sourceItem.iva_percentage ?? 0,
        irpf_percentage: sourceItem.irpf_percentage ?? 0,
        is_attendee: sourceItem.is_attendee ?? false,
        billing_status: 'pendiente' as any,
        observations: sourceItem.observations || null,
        contact_id: sourceItem.contact_id || null,
        is_commission_percentage: sourceItem.is_commission_percentage ?? false,
        commission_percentage: sourceItem.commission_percentage ?? null,
        is_provisional: sourceItem.is_provisional ?? false,
        sort_order: insertOrder,
      } as any);

      if (error) throw error;

      await fetchBudgetItems();
      toast({ title: "Elemento duplicado", description: `"${sourceItem.name}" duplicado correctamente` });
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast({ title: "Error", description: "No se pudo duplicar el elemento", variant: "destructive" });
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const totals = calculateGrandTotals();
    const beneficio = budgetAmount - totals.neto;
    const margen = budgetAmount > 0 ? ((beneficio / budgetAmount) * 100) : 0;
    
    let yPos = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const fmt = (n: number) => {
      const fixed = Math.abs(n).toFixed(2);
      const [intPart, dec] = fixed.split('.');
      const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${n < 0 ? '-' : ''}${withThousands},${dec}`;
    };
    const fmtInt = (n: number) =>
      Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    const checkPage = (needed: number) => {
      if (yPos + needed > 275) { doc.addPage(); yPos = 15; }
    };
    
    // ── CABECERA ──
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(budgetData.name, margin, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (budgetData.event_date) {
      const eventDate = new Date(budgetData.event_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Fecha: ${eventDate}${budgetData.event_time ? ` a las ${budgetData.event_time}` : ''}`, margin, yPos);
      yPos += 5;
    }
    if (budgetData.venue || budgetData.city) {
      const location = [budgetData.venue, budgetData.city, budgetData.country].filter(Boolean).join(', ');
      doc.text(`Lugar: ${location}`, margin, yPos);
      yPos += 5;
    }
    yPos += 3;
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    // ── RESUMEN FINANCIERO ──
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN FINANCIERO', margin, yPos);
    yPos += 8;
    
    // Fee breakdown for income
    const feeIvaRate = 21;
    const feeIrpfRate = 15;
    const feeNeto = budgetAmount;
    const feeIva = feeNeto * (feeIvaRate / 100);
    const feeBruto = feeNeto + feeIva;
    const feeIrpf = feeNeto * (feeIrpfRate / 100);
    const feeLiquido = feeBruto - feeIrpf;
    
    const summaryData = [
      [budget.type === 'concierto' ? 'Caché (Ingresos)' : 'Capital', `${fmt(budgetAmount)} €`],
      ['Presupuesto Gastos', `${fmt(expenseBudget)} €`],
      ['Gastos Reales (Neto)', `${fmt(totals.neto)} €`],
      ['IVA Repercutido (+)', `${fmt(feeIva)} €`],
      ['IRPF Retenido (-)', `-${fmt(feeIrpf)} €`],
      ['Total a Facturar*', `${fmt(feeLiquido)} €`],
      ['Beneficio', `${fmt(beneficio)} €`],
      ['Margen', `${margen.toFixed(1)}%`],
    ];
    
    autoTable(doc, {
      body: summaryData,
      startY: yPos,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { halign: 'right', cellWidth: 50 } },
      margin: { left: margin },
      didParseCell: (data: any) => {
        const label = data.row.raw?.[0];
        if (label === 'Beneficio' && beneficio < 0) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
        if (label === 'Total a Facturar*') {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // ── INGRESOS ──
    checkPage(40);
    doc.setDrawColor(200);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INGRESOS', margin, yPos);
    yPos += 8;
    
    autoTable(doc, {
      head: [['Concepto', 'Neto', `IVA (${feeIvaRate}%)`, 'Bruto', `IRPF (${feeIrpfRate}%)`, 'Líquido']],
      body: [[
        budget.type === 'concierto' ? 'Caché' : 'Capital',
        `${fmt(feeNeto)} €`, `${fmt(feeIva)} €`, `${fmt(feeBruto)} €`,
        `-${fmt(feeIrpf)} €`, `${fmt(feeLiquido)} €`
      ]],
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 139, 34] },
      margin: { left: margin }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // ── GASTOS POR CATEGORÍA ──
    checkPage(40);
    doc.setDrawColor(200);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('GASTOS POR CATEGORÍA', margin, yPos);
    yPos += 8;
    
    const categoryTotals = items.reduce((acc, item) => {
      const cat = item.budget_categories?.name || item.category || 'Sin categoría';
      if (!acc[cat]) acc[cat] = { neto: 0, pagado: 0, pendiente: 0, count: 0 };
      const itemNeto = item.unit_price * (item.quantity || 1);
      acc[cat].neto += itemNeto;
      acc[cat].count += 1;
      if (item.billing_status === 'pagada') acc[cat].pagado += itemNeto;
      else acc[cat].pendiente += itemNeto;
      return acc;
    }, {} as Record<string, { neto: number; pagado: number; pendiente: number; count: number }>);
    
    const categoryOrder = budgetCategories.reduce((acc, bc, idx) => {
      acc[bc.name] = bc.sort_order ?? idx;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedCatEntries = Object.entries(categoryTotals).sort((a, b) => 
      (categoryOrder[a[0]] ?? 999) - (categoryOrder[b[0]] ?? 999)
    );
    const totalNetoGastos = sortedCatEntries.reduce((s, [_, d]) => s + d.neto, 0);
    
    const catData = sortedCatEntries.map(([cat, data]) => {
      const pct = totalNetoGastos > 0 ? ((data.neto / totalNetoGastos) * 100).toFixed(1) : '0';
      const status = data.pendiente === 0 && data.neto > 0 ? '✓ Pagado' : data.pagado === 0 ? 'Pendiente' : 'Parcial';
      return [cat, String(data.count), `${fmt(data.neto)} €`, `${fmt(data.pagado)} €`, `${fmt(data.pendiente)} €`, `${pct}%`, status];
    });
    
    autoTable(doc, {
      head: [['Categoría', 'Elem.', 'Presupuestado', 'Pagado', 'Pendiente', '%', 'Estado']],
      body: catData,
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [80, 80, 80] },
      margin: { left: margin },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 6) {
          const val = data.cell.raw;
          if (val === '✓ Pagado') data.cell.styles.textColor = [34, 139, 34];
          else if (val === 'Pendiente') data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [200, 150, 0];
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // ── DETALLE DE GASTOS ──
    checkPage(30);
    doc.setDrawColor(200);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE GASTOS', margin, yPos);
    yPos += 8;
    
    const itemsByCategory: Record<string, typeof items> = {};
    items.forEach(item => {
      const cat = item.budget_categories?.name || item.category || 'Sin categoría';
      if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
      itemsByCategory[cat].push(item);
    });
    
    const sortedCategoryNames = Object.keys(itemsByCategory).sort((a, b) =>
      (categoryOrder[a] ?? 999) - (categoryOrder[b] ?? 999)
    );
    
    const tableData: (string | { content: string; colSpan: number; styles: any })[][] = [];
    
    sortedCategoryNames.forEach(categoryName => {
      const categoryItems = itemsByCategory[categoryName];
      const catNeto = categoryItems.reduce((s, i) => s + i.unit_price * (i.quantity || 1), 0);
      const catIva = categoryItems.reduce((s, i) => s + i.unit_price * (i.quantity || 1) * (i.iva_percentage / 100), 0);
      const catIrpf = categoryItems.reduce((s, i) => s + i.unit_price * (i.quantity || 1) * ((i.irpf_percentage ?? 15) / 100), 0);
      const catLiquido = catNeto + catIva - catIrpf;
      const catRetencion = catIrpf;
      
      tableData.push([{
        content: `${categoryName} — Líquido: ${fmt(catLiquido)} € + ${fmt(catRetencion)} € ret.`,
        colSpan: 8,
        styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [40, 40, 40] }
      }]);
      
      categoryItems.forEach(item => {
        const subtotal = item.unit_price * (item.quantity || 1);
        const ivaAmt = subtotal * (item.iva_percentage / 100);
        const irpfAmt = subtotal * ((item.irpf_percentage ?? 15) / 100);
        const liquido = subtotal + ivaAmt - irpfAmt;
        
        let precio = `${item.unit_price.toFixed(2)} €`;
        if (item.is_commission_percentage && item.commission_percentage) {
          precio = `${item.commission_percentage}% → ${item.unit_price.toFixed(2)} €`;
        } else if ((item.quantity || 1) > 1) {
          precio = `${(item.quantity || 1)} x ${item.unit_price.toFixed(2)} €`;
        }
        
        const fechaEmision = item.fecha_emision 
          ? new Date(item.fecha_emision).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '-';
        
        const status = item.billing_status === 'factura_recibida' ? 'Facturado' :
          item.billing_status === 'pendiente' ? 'Pendiente' :
          item.billing_status === 'factura_solicitada' ? 'Solicitada' :
          item.billing_status === 'pagado_sin_factura' ? 'Pagado s/just.' :
          item.billing_status === 'pagada' ? 'Pagada' : (item.billing_status || 'Pendiente');
        
        tableData.push([
          item.name,
          item.contacts?.name || '-',
          fechaEmision,
          precio,
          `${item.iva_percentage}%`,
          `${item.irpf_percentage ?? 15}%`,
          `${fmt(liquido)} €`,
          status
        ]);
      });
    });
    
    autoTable(doc, {
      head: [['Concepto', 'Contacto', 'F. Emisión', 'Precio', 'IVA', 'IRPF', 'Total (€)', 'Estado']],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [0, 0, 0] },
      margin: { left: margin },
      columnStyles: {
        3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'center' },
        6: { halign: 'right' }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // ── RESUMEN FISCAL ──
    checkPage(50);
    doc.setDrawColor(200);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN FISCAL', margin, yPos);
    yPos += 8;
    
    const ivaRepercutido = feeIva; // IVA on income
    const ivaSoportado = totals.iva; // IVA on expenses
    const ivaDiferencia = ivaRepercutido - ivaSoportado;
    const irpfRetenidoIngresos = feeIrpf; // IRPF retained on income
    const irpfSoportadoGastos = totals.irpf; // IRPF on expenses
    
    autoTable(doc, {
      head: [['Concepto', 'Repercutido (Ingresos)', 'Soportado (Gastos)', 'Diferencia']],
      body: [
        ['IVA', `${fmt(ivaRepercutido)} €`, `${fmt(ivaSoportado)} €`, `${fmt(ivaDiferencia)} €`],
        ['IRPF', `-${fmt(irpfRetenidoIngresos)} €`, `-${fmt(irpfSoportadoGastos)} €`, `${fmt(irpfSoportadoGastos - irpfRetenidoIngresos)} €`],
      ],
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 100, 100] },
      margin: { left: margin },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // ── PREVISIÓN DE TESORERÍA ──
    checkPage(40);
    doc.setDrawColor(200);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PREVISIÓN DE TESORERÍA', margin, yPos);
    yPos += 8;
    
    const aCobrar = feeLiquido;
    const aPagar = totals.total; // total líquido gastos
    const flujoCaja = aCobrar - aPagar;
    
    autoTable(doc, {
      body: [
        ['A cobrar (líquido)', `${fmt(aCobrar)} €`],
        ['A pagar (líquido)', `${fmt(aPagar)} €`],
        ['Flujo de caja neto', `${fmt(flujoCaja)} €`],
      ],
      startY: yPos,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right', cellWidth: 50 } },
      margin: { left: margin },
      didParseCell: (data: any) => {
        if (data.row.raw?.[0] === 'Flujo de caja neto') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
          if (flujoCaja < 0) data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [34, 139, 34];
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // ── NOTAS / GLOSARIO ──
    checkPage(32);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60);
    doc.text('Glosario de términos', margin, yPos);
    yPos += 4;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);

    const glossary: Array<[string, string]> = [
      ['Neto', 'Precio base sin impuestos.'],
      ['IVA', 'Impuesto sobre el Valor Añadido aplicado al neto.'],
      ['Bruto', 'Neto + IVA.'],
      ['IRPF', 'Retención fiscal aplicada sobre el neto.'],
      ['Líquido', 'Bruto - IRPF. Importe final a transferir.'],
    ];

    const labelWidth = 18; // mm reservado para el término en negrita
    glossary.forEach(([term, def]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${term}:`, margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(def, margin + labelWidth, yPos);
      yPos += 3.6;
    });

    yPos += 2;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(110);
    doc.text('* Total a Facturar = Neto + IVA - IRPF (Líquido, importe final a transferir).', margin, yPos);
    yPos += 4;
    doc.text(`Generado el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, yPos);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    yPos += 12;

    // ── ANEXO: GRÁFICO DONUT ──
    const chartDataRaw = getGroupedChartData();
    const grandChartTotal = chartDataRaw.reduce((s, d) => s + d.value, 0);
    
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b] as [number, number, number];
    };
    
    doc.addPage();
    yPos = 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('ANEXO: Distribución de Gastos', margin, yPos);
    yPos += 3;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text('Importes netos (sin IVA ni IRPF)', margin, yPos + 4);
    doc.setTextColor(0);
    yPos += 12;
    
    const donutCenterX = margin + 30;
    const donutCenterY = yPos + 30;
    const donutOuterR = 25;
    const donutInnerR = 14;
    const segments = 72;
    let startAngle = -Math.PI / 2;
    
    chartDataRaw.forEach((d) => {
      if (grandChartTotal <= 0) return;
      const sliceAngle = (d.value / grandChartTotal) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const rgb = hexToRgb(d.color);
      
      const points: number[][] = [];
      const steps = Math.max(Math.ceil((sliceAngle / (2 * Math.PI)) * segments), 2);
      
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + (sliceAngle * i) / steps;
        points.push([donutCenterX + Math.cos(a) * donutOuterR, donutCenterY + Math.sin(a) * donutOuterR]);
      }
      for (let i = steps; i >= 0; i--) {
        const a = startAngle + (sliceAngle * i) / steps;
        points.push([donutCenterX + Math.cos(a) * donutInnerR, donutCenterY + Math.sin(a) * donutInnerR]);
      }
      
      doc.setFillColor(...rgb);
      doc.setDrawColor(...rgb);
      doc.setLineWidth(0);
      
      if (points.length > 2) {
        for (let i = 1; i < points.length - 1; i++) {
          doc.triangle(points[0][0], points[0][1], points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], 'F');
        }
      }
      startAngle = endAngle;
    });
    
    doc.setFillColor(255, 255, 255);
    doc.circle(donutCenterX, donutCenterY, donutInnerR - 0.3, 'F');
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60);
    doc.text(`${fmtInt(grandChartTotal)} €`, donutCenterX, donutCenterY + 1, { align: 'center' });
    
    const legendStartX = margin + 65;
    let legendY = yPos + 5;
    
    chartDataRaw.forEach((d) => {
      const pct = grandChartTotal > 0 ? ((d.value / grandChartTotal) * 100).toFixed(1) : '0.0';
      const rgb = hexToRgb(d.color);
      doc.setFillColor(...rgb);
      doc.rect(legendStartX, legendY - 3, 4, 4, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40);
      doc.text(d.name, legendStartX + 6, legendY);
      doc.setTextColor(100);
      doc.text(`${fmt(d.value)} €  (${pct}%)`, legendStartX + 55, legendY);
      legendY += 6;
    });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`Total: ${fmt(grandChartTotal)} €`, legendStartX + 6, legendY + 2);
    
    const finalY = Math.max(donutCenterY + donutOuterR + 15, legendY + 15);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, finalY);
    
    doc.save(`${budgetData.name}.pdf`);
    
    toast({
      title: "PDF descargado",
      description: "El presupuesto completo se ha descargado correctamente",
    });
  };

  // Función para generar Excel del presupuesto
  const downloadExcel = () => {
    const totals = calculateGrandTotals();
    const beneficio = budgetAmount - totals.neto;
    const margen = budgetAmount > 0 ? ((beneficio / budgetAmount) * 100) : 0;
    const fmt = (n: number) => {
      const fixed = Math.abs(n).toFixed(2);
      const [intPart, dec] = fixed.split('.');
      const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${n < 0 ? '-' : ''}${withThousands},${dec}`;
    };
    
    let csv = "\uFEFF";
    
    // Cabecera
    csv += `PRESUPUESTO: ${budgetData.name}\n\n`;
    csv += "INFORMACIÓN DEL EVENTO\n";
    if (budgetData.event_date) {
      const d = new Date(budgetData.event_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      csv += `Fecha,"${d}${budgetData.event_time ? ` a las ${budgetData.event_time}` : ''}"\n`;
    }
    if (budgetData.venue) csv += `Venue,"${budgetData.venue}"\n`;
    if (budgetData.city) csv += `Ciudad,"${budgetData.city}"\n`;
    if (budgetData.country) csv += `País,"${budgetData.country}"\n`;
    csv += "\n";
    
    // Resumen financiero
    csv += "RESUMEN FINANCIERO\n";
    const feeIvaCsv = budgetAmount * 0.21;
    const feeBrutoCsv = budgetAmount + feeIvaCsv;
    const feeIrpfCsv = budgetAmount * 0.15;
    const feeLiquidoCsv = feeBrutoCsv - feeIrpfCsv;
    csv += `${budget.type === 'concierto' ? 'Caché (Ingresos)' : 'Capital'},"${fmt(budgetAmount)} €"\n`;
    csv += `Presupuesto Gastos,"${fmt(expenseBudget)} €"\n`;
    csv += `Gastos Reales (Neto),"${fmt(totals.neto)} €"\n`;
    csv += `IVA Repercutido (+),"${fmt(feeIvaCsv)} €"\n`;
    csv += `IRPF Retenido (-),"-${fmt(feeIrpfCsv)} €"\n`;
    csv += `Total a Facturar*,"${fmt(feeLiquidoCsv)} €"\n`;
    csv += `Beneficio,"${fmt(beneficio)} €"\n`;
    csv += `Margen,"${margen.toFixed(1)}%"\n\n`;
    
    // Ingresos
    csv += "INGRESOS\n";
    csv += "Concepto,Neto,IVA (21%),Bruto,IRPF (15%),Líquido\n";
    csv += `${budget.type === 'concierto' ? 'Caché' : 'Capital'},"${fmt(budgetAmount)} €","${fmt(feeIvaCsv)} €","${fmt(feeBrutoCsv)} €","-${fmt(feeIrpfCsv)} €","${fmt(feeLiquidoCsv)} €"\n\n`;
    
    // Gastos por categoría
    csv += "GASTOS POR CATEGORÍA\n";
    csv += "Categoría,Elementos,Presupuestado,Pagado,Pendiente,Estado\n";
    
    const catTotals = items.reduce((acc, item) => {
      const cat = item.budget_categories?.name || item.category || 'Sin categoría';
      if (!acc[cat]) acc[cat] = { neto: 0, pagado: 0, pendiente: 0, count: 0 };
      const n = item.unit_price * (item.quantity || 1);
      acc[cat].neto += n;
      acc[cat].count += 1;
      if (item.billing_status === 'pagada') acc[cat].pagado += n;
      else acc[cat].pendiente += n;
      return acc;
    }, {} as Record<string, { neto: number; pagado: number; pendiente: number; count: number }>);
    
    const catOrder = budgetCategories.reduce((acc, bc, idx) => {
      acc[bc.name] = bc.sort_order ?? idx;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(catTotals)
      .sort((a, b) => (catOrder[a[0]] ?? 999) - (catOrder[b[0]] ?? 999))
      .forEach(([cat, data]) => {
        const status = data.pendiente === 0 && data.neto > 0 ? 'Pagado' : data.pagado === 0 ? 'Pendiente' : 'Parcial';
        csv += `"${cat}",${data.count},"${fmt(data.neto)} €","${fmt(data.pagado)} €","${fmt(data.pendiente)} €",${status}\n`;
      });
    csv += "\n";
    
    // Detalle alineado con la UI
    csv += "DETALLE DE GASTOS\n";
    csv += "Concepto,Contacto,Fecha Emisión,Precio,IVA (%),IRPF (%),Total Líquido (€),Retención IRPF (€),Estado\n";
    
    const itemsByCat: Record<string, typeof items> = {};
    items.forEach(item => {
      const cat = item.budget_categories?.name || item.category || 'Sin categoría';
      if (!itemsByCat[cat]) itemsByCat[cat] = [];
      itemsByCat[cat].push(item);
    });
    
    Object.keys(itemsByCat)
      .sort((a, b) => (catOrder[a] ?? 999) - (catOrder[b] ?? 999))
      .forEach(categoryName => {
        const catItems = itemsByCat[categoryName];
        const catLiquido = catItems.reduce((s, i) => {
          const sub = i.unit_price * (i.quantity || 1);
          return s + sub + sub * (i.iva_percentage / 100) - sub * ((i.irpf_percentage ?? 15) / 100);
        }, 0);
        const catRet = catItems.reduce((s, i) => s + i.unit_price * (i.quantity || 1) * ((i.irpf_percentage ?? 15) / 100), 0);
        csv += `"${categoryName} — Líquido: ${fmt(catLiquido)} € + ${fmt(catRet)} € ret.",,,,,,,\n`;
        
        catItems.forEach(item => {
          let name = item.name;
          if (item.is_commission_percentage && item.commission_percentage) name += ` (${item.commission_percentage}% del fee)`;
          
          const subtotal = item.unit_price * (item.quantity || 1);
          const ivaAmt = subtotal * (item.iva_percentage / 100);
          const irpfAmt = subtotal * ((item.irpf_percentage ?? 15) / 100);
          const liquido = subtotal + ivaAmt - irpfAmt;
          
          let precio = `${item.unit_price.toFixed(2)} €`;
          if (item.is_commission_percentage && item.commission_percentage) {
            precio = `${item.commission_percentage}% → ${item.unit_price.toFixed(2)} €`;
          } else if ((item.quantity || 1) > 1) {
            precio = `${(item.quantity || 1)} x ${item.unit_price.toFixed(2)} €`;
          }
          
          const fechaEmision = item.fecha_emision 
            ? new Date(item.fecha_emision).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '-';
          
          const status = item.billing_status === 'factura_recibida' ? 'Facturado' :
            item.billing_status === 'pendiente' ? 'Pendiente' :
            item.billing_status === 'factura_solicitada' ? 'Solicitada' :
            item.billing_status === 'pagado_sin_factura' ? 'Pagado (sin justificante)' :
            item.billing_status === 'pagada' ? 'Pagada' : (item.billing_status || 'Pendiente');
          
          csv += [
            `"${name}"`, `"${item.contacts?.name || '-'}"`, `"${fechaEmision}"`,
            `"${precio}"`, `${item.iva_percentage}%`, `${item.irpf_percentage ?? 15}%`,
            `"${fmt(liquido)} €"`, `"${fmt(irpfAmt)} €"`, status
          ].join(',') + "\n";
        });
      });
    
    // Totales
    csv += "\n";
    csv += `Total Neto,,,,,,,"${fmt(totals.neto)} €"\n`;
    csv += `Total IVA,,,,,,,"${fmt(totals.iva)} €"\n`;
    csv += `Total IRPF,,,,,,,"${fmt(totals.irpf)} €"\n`;
    csv += `Total Líquido,,,,,,,"${fmt(totals.total)} €"\n\n`;
    
    // Resumen fiscal
    csv += "RESUMEN FISCAL\n";
    csv += "Concepto,Repercutido (Ingresos),Soportado (Gastos),Diferencia\n";
    csv += `IVA,"${fmt(feeIvaCsv)} €","${fmt(totals.iva)} €","${fmt(feeIvaCsv - totals.iva)} €"\n`;
    csv += `IRPF,"-${fmt(feeIrpfCsv)} €","-${fmt(totals.irpf)} €","${fmt(totals.irpf - feeIrpfCsv)} €"\n\n`;
    
    // Previsión de tesorería
    csv += "PREVISIÓN DE TESORERÍA\n";
    const aCobrar = feeLiquidoCsv;
    const aPagar = totals.total;
    csv += `A cobrar (líquido),"${fmt(aCobrar)} €"\n`;
    csv += `A pagar (líquido),"${fmt(aPagar)} €"\n`;
    csv += `Flujo de caja neto,"${fmt(aCobrar - aPagar)} €"\n\n`;
    
    // Notas
    csv += "NOTAS\n";
    csv += `"Neto = Precio base sin impuestos | Bruto = Neto + IVA | Líquido = Bruto - IRPF (importe final a transferir)"\n`;
    csv += `"Generado el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}"\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${budgetData.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Excel descargado",
      description: "El presupuesto completo se ha exportado a CSV",
    });
  };

  // Función para descargar todas las facturas
  const downloadAllInvoices = async () => {
    const itemsWithInvoices = items.filter(item => item.invoice_link);
    
    if (itemsWithInvoices.length === 0) {
      toast({
        title: "Sin facturas",
        description: "No hay facturas para descargar",
        variant: "destructive",
      });
      return;
    }
    
    itemsWithInvoices.forEach((item, index) => {
      setTimeout(() => {
        window.open(item.invoice_link, '_blank');
      }, index * 500);
    });
    
    toast({
      title: "Descargando facturas",
      description: `Se abrirán ${itemsWithInvoices.length} facturas`,
    });
  };

  // Función para descargar facturas seleccionadas
  const downloadSelectedInvoices = () => {
    const selectedItemsWithInvoices = items.filter(item => 
      selectedItems.has(item.id) && item.invoice_link
    );
    
    if (selectedItemsWithInvoices.length === 0) {
      toast({
        title: "Sin facturas",
        description: "Ningún elemento seleccionado tiene factura",
        variant: "destructive",
      });
      return;
    }
    
    selectedItemsWithInvoices.forEach((item, index) => {
      setTimeout(() => {
        window.open(item.invoice_link, '_blank');
      }, index * 500);
    });
    
    toast({
      title: "Descargando facturas",
      description: `Se abrirán ${selectedItemsWithInvoices.length} facturas`,
    });
  };

  // Element movement functions
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAllItemsInCategory = (categoryId: string) => {
    const categoryItems = getCategoryItems(categoryId);
    const newSelection = new Set(selectedItems);
    categoryItems.forEach(item => newSelection.add(item.id));
    setSelectedItems(newSelection);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const moveSelectedItems = async (targetCategoryId: string) => {
    if (selectedItems.size === 0) return;

    console.log('🔄 moveSelectedItems called with:', {
      targetCategoryId,
      selectedItems: Array.from(selectedItems),
      budgetCategories: budgetCategories.map(c => ({ id: c.id, name: c.name }))
    });

    try {
      // Update items in batch
      const updates = Array.from(selectedItems).map(async (itemId) => {
        const currentItem = items.find(item => item.id === itemId);
        if (!currentItem) {
          console.log('❌ Item not found:', itemId);
          return null;
        }

        const targetCategory = budgetCategories.find(c => c.id === targetCategoryId);
        console.log('📝 Updating item:', {
          itemId,
          currentItem: currentItem.name,
          targetCategoryId,
          targetCategoryName: targetCategory?.name,
          currentCategoryId: currentItem.category_id,
          currentCategory: currentItem.category
        });

        const { data, error } = await supabase
          .from('budget_items')
          .update({ 
            category_id: targetCategoryId,
            category: targetCategory?.name || 'Sin categoría' 
          })
          .eq('id', itemId)
          .select();

        if (error) {
          console.error('❌ Error updating item:', itemId, error);
          return { success: false, error, itemId };
        }

        console.log('✅ Successfully updated item:', itemId, data);
        return { success: true, data, itemId };
      });

      const results = await Promise.all(updates.filter(Boolean));
      console.log('✅ All update results:', results);

      // Check if there were any errors
      const errors = results.filter(r => r && !r.success);
      if (errors.length > 0) {
        console.error('❌ Some updates failed:', errors);
        throw new Error(`Failed to update ${errors.length} items`);
      }

      // Update local state
      const updatedItems = items.map(item => {
        if (selectedItems.has(item.id)) {
          const targetCategory = budgetCategories.find(c => c.id === targetCategoryId);
          return { 
            ...item, 
            category_id: targetCategoryId,
            category: targetCategory?.name || 'Sin categoría' 
          };
        }
        return item;
      });

      setItems(updatedItems);
      setSelectedItems(new Set());

      toast({
        title: "Elementos movidos",
        description: `${selectedItems.size} elemento(s) movidos exitosamente`,
      });
    } catch (error) {
      console.error('❌ Error moving items:', error);
      toast({
        title: "Error",
        description: "No se pudieron mover los elementos",
        variant: "destructive",
      });
    }
  };

  const updateSelectedItemsBillingStatus = async (billingStatus: string) => {
    if (selectedItems.size === 0) return;

    console.log('🔄 updateSelectedItemsBillingStatus called with:', {
      billingStatus,
      selectedItems: Array.from(selectedItems)
    });

    try {
      // Update items in batch
      const updates = Array.from(selectedItems).map(async (itemId) => {
        const { error } = await supabase
          .from('budget_items')
          .update({ billing_status: mapFrontendToDb(billingStatus) as any })
          .eq('id', itemId);
        
        if (error) {
          console.error('Error updating item billing status:', itemId, error);
          throw error;
        }
      });

      await Promise.all(updates);
      
      // Fetch fresh data to ensure consistency
      await fetchBudgetItems();
      
      // Clear selection
      setSelectedItems(new Set());

      const statusLabels = {
        'pendiente': 'Pendiente',
        'factura_solicitada': 'Factura solicitada',
        'factura_recibida': 'Factura recibida',
        'pagada': 'Pagada',
        'pagado': 'Pagada',
        'pagado_sin_factura': 'Pagado (sin justificante)',
        'agrupada': 'Agrupada en factura',
        'facturado': 'Factura recibida',
        'cancelado': 'Cancelado'
      };

      toast({
        title: "Estado de facturación actualizado",
        description: `${selectedItems.size} elemento(s) cambiados a "${statusLabels[billingStatus as keyof typeof statusLabels] || billingStatus}"`,
      });
    } catch (error) {
      console.error('Error updating billing status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de facturación",
        variant: "destructive"
      });
    }
  };

  // Delete selected items with confirmation
  const deleteSelectedItems = async () => {
    if (selectedItems.size === 0) return;

    try {
      const idsToDelete = Array.from(selectedItems);

      // Check for related retentions first
      const { data: retentions } = await supabase
        .from('irpf_retentions')
        .select('id')
        .in('budget_item_id', idsToDelete);

      if (retentions && retentions.length > 0) {
        setPendingDeleteBulk({ ids: idsToDelete, retentionCount: retentions.length });
        return; // Wait for user confirmation
      }

      await executeDeleteBulk(idsToDelete);
    } catch (error) {
      console.error('Error deleting items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los elementos',
        variant: 'destructive',
      });
    }
  };

  const executeDeleteBulk = async (idsToDelete: string[]) => {
    try {
      await supabase.from('irpf_retentions').delete().in('budget_item_id', idsToDelete);

      const { error } = await supabase
        .from('budget_items')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      setItems((prev) => prev.filter((item) => !idsToDelete.includes(item.id)));
      setSelectedItems(new Set());

      toast({
        title: 'Elementos eliminados',
        description: `${idsToDelete.length} elemento(s) eliminados correctamente`,
      });
    } catch (error) {
      console.error('Error deleting items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los elementos',
        variant: 'destructive',
      });
    }
  };

  const moveItemToCategory = async (itemId: string, targetCategoryId: string) => {
    try {
      const targetCategory = budgetCategories.find(c => c.id === targetCategoryId);
      
      await supabase
        .from('budget_items')
        .update({ category: targetCategory?.name || 'Sin categoría' })
        .eq('id', itemId);

      const updatedItems = items.map(item => 
        item.id === itemId 
          ? { ...item, category: targetCategory?.name || 'Sin categoría' }
          : item
      );

      setItems(updatedItems);

      toast({
        title: "Elemento movido",
        description: `Elemento movido a ${targetCategory?.name}`,
      });
    } catch (error) {
      console.error('Error moving item:', error);
      toast({
        title: "Error",
        description: "No se pudo mover el elemento",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-black text-white border-gray-800">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isFullscreen ? 'max-w-screen w-screen max-h-screen h-screen' : 'max-w-[95vw] w-full max-h-[95vh] h-full'} p-0 bg-black text-white border-gray-800`}>
        <div className="flex flex-col h-full overflow-y-auto bg-black">
          {/* Compact Header */}
          <div className="bg-black text-white p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-bold text-white">
                      {(() => {
                        const linkedBookingId = budgetData.booking_offer_id || bookingContext?.bookingId;
                        return linkedBookingId ? (
                          <span
                            className="cursor-pointer hover:underline inline-flex items-center gap-1.5"
                            onClick={() => navigate(`/booking/${linkedBookingId}`)}
                          >
                            {budgetData.name}
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </span>
                        ) : budgetData.name;
                      })()}
                    </DialogTitle>
                    {budgetData.parent_folder_id && budgetData.projects && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/10"
                        onClick={() => window.open(`/projects?folder=${budgetData.parent_folder_id}`, '_blank')}
                      >
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {budgetData.projects.name}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    {sharedReleases.length > 1 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                        <Link2 className="h-2.5 w-2.5" />
                        Compartido
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-400 text-sm">
                      {budgetData.formato ? <span className="text-primary">{budgetData.formato}</span> : 'Presupuesto'}
                    </p>
                    {sharedReleases.length > 1 && (
                      <p className="text-gray-500 text-xs">
                        · También en: {sharedReleases.filter(r => r.title !== budgetData.name).map(r => r.title).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Campos editables compactos — diferenciados por tipo */}
              <div className="flex items-center gap-4">
                {(() => {
                  const isConcert = budget.type === 'concierto';
                  const isProduccion = budget.type === 'produccion_musical';
                  // isCapital = videoclip, campaña, otros

                  return (
                    <>
                      {/* Campo 1: Presupuesto de gastos (solo concierto) / oculto en producción */}
                      {isConcert && (
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Presupuesto:</div>
                          {editingExpenseBudget ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number" step="0.01" value={expenseBudget}
                                onChange={(e) => setExpenseBudget(parseFloat(e.target.value) || 0)}
                                className="h-7 w-20 text-sm bg-white/10 border-white/20 text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveExpenseBudget();
                                  else if (e.key === 'Escape') { setEditingExpenseBudget(false); setExpenseBudget(budget.expense_budget || 0); }
                                }}
                                autoFocus
                              />
                              <Button size="sm" onClick={saveExpenseBudget} className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"><Save className="w-3 h-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingExpenseBudget(false); setExpenseBudget(budget.expense_budget || 0); }} className="h-6 w-6 p-0 bg-white/10 border-white/20 hover:bg-white/20"><X className="w-3 h-3" /></Button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingExpenseBudget(true)} className="text-amber-400 hover:text-amber-300 transition-colors font-medium" aria-label="Editar presupuesto de gastos">
                              {expenseBudget > 0 ? `€${expenseBudget.toFixed(2)}` : 'Sin definir'}<Pencil className="w-3 h-3 ml-1 inline" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Campo 1b: Avance (solo producción musical) */}
                      {isProduccion && (
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Avance:</div>
                          {editingAvance ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number" step="0.01" value={avancePagado}
                                onChange={(e) => setAvancePagado(parseFloat(e.target.value) || 0)}
                                className="h-7 w-20 text-sm bg-white/10 border-white/20 text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveAvancePagado();
                                  else if (e.key === 'Escape') setEditingAvance(false);
                                }}
                                autoFocus
                              />
                              <Button size="sm" onClick={saveAvancePagado} className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"><Save className="w-3 h-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingAvance(false)} className="h-6 w-6 p-0 bg-white/10 border-white/20 hover:bg-white/20"><X className="w-3 h-3" /></Button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingAvance(true)} className="text-amber-400 hover:text-amber-300 transition-colors font-medium" aria-label="Editar avance pagado">
                              {avancePagado > 0 ? `€${avancePagado.toFixed(2)}` : 'Sin definir'}<Pencil className="w-3 h-3 ml-1 inline" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Campo 2: Caché (concierto) / Capital (otros) */}
                      <div className="text-right">
                        <div className="text-xs text-gray-400">
                          {isConcert ? 'Caché:' : 'Capital:'}
                        </div>
                        {editingBudgetAmount ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number" step="0.01" value={budgetAmount}
                              onChange={(e) => setBudgetAmount(parseFloat(e.target.value) || 0)}
                              className="h-7 w-20 text-sm bg-white/10 border-white/20 text-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveBudgetAmount();
                                else if (e.key === 'Escape') { setEditingBudgetAmount(false); setBudgetAmount(budget.fee || 0); }
                              }}
                              autoFocus
                            />
                            <Button size="sm" onClick={saveBudgetAmount} className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"><Save className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingBudgetAmount(false); setBudgetAmount(budget.fee || 0); }} className="h-6 w-6 p-0 bg-white/10 border-white/20 hover:bg-white/20"><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingBudgetAmount(true)} className="text-blue-400 hover:text-blue-300 transition-colors font-medium" aria-label="Editar capital">
                            {budgetAmount > 0 ? `€${budgetAmount.toFixed(2)}` : 'Sin definir'}<Pencil className="w-3 h-3 ml-1 inline" />
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
                
                <div className="flex items-center gap-2">
                  {/* Botón de Descargas */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={downloadPDF}>
                        <FileText className="w-4 h-4 mr-2" />
                        Descargar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={downloadExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Descargar Excel (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={downloadAllInvoices}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar todas las facturas
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={downloadSelectedInvoices}
                        disabled={selectedItems.size === 0}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar facturas seleccionadas ({selectedItems.size})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsFullscreen(!isFullscreen)} 
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 w-8 p-0"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Compact Financial Summary - Industry Standard */}
            <div className="mt-4">
              {(() => {
                const totals = calculateGrandTotals();
                const isConcert = budget.type === 'concierto';
                const isProduccion = budget.type === 'produccion_musical';
                // KPIs concierto
                const beneficio = budgetAmount - totals.neto;
                const margen = budgetAmount > 0 ? ((beneficio / budgetAmount) * 100) : 0;
                const desviacion = expenseBudget > 0 ? totals.neto - expenseBudget : 0;
                const desviacionPct = expenseBudget > 0 ? ((desviacion / expenseBudget) * 100) : 0;
                // KPIs producción/campaña/videoclip
                const saldoPendiente = budgetAmount - avancePagado;
                const pctEjecutado = budgetAmount > 0 ? (totals.neto / budgetAmount) * 100 : 0;
                const campo2 = isProduccion ? avancePagado : expenseBudget;
                // New KPIs for non-concert header
                const pagado = items
                  .filter(i => i.billing_status === 'pagada')
                  .reduce((sum, i) => sum + (i.unit_price ?? 0) * (i.quantity || 1), 0);
                const comprometido = items
                  .filter(i => i.billing_status !== 'pagada' && !i.is_provisional)
                  .reduce((sum, i) => sum + (i.unit_price ?? 0) * (i.quantity || 1), 0);
                const provisionalTotal = items
                  .filter(i => i.billing_status !== 'pagada' && i.is_provisional)
                  .reduce((sum, i) => sum + (i.unit_price ?? 0) * (i.quantity || 1), 0);
                const facturasCobradas = items.filter(i => i.billing_status === 'pagada').length;
                const disponible = budgetAmount - pagado - comprometido - provisionalTotal;
                const disponiblePct = budgetAmount > 0 ? (disponible / budgetAmount) * 100 : 0;
                // Subtotal de ítems en categorías ocultas (con IVA)
                const hiddenTotal = items
                  .filter(item => hiddenCategories.has(item.category_id ?? ''))
                  .reduce((sum, item) => {
                    const sub = (item.unit_price ?? 0) * (item.quantity || 1);
                    return sum + sub + sub * ((item.iva_percentage ?? 0) / 100);
                  }, 0);
                
                return (
                  <>
                  <div className={`grid ${isConcert ? 'grid-cols-6' : 'grid-cols-4'} gap-2`}>
                    {isConcert ? (
                      <>
                        {/* CONCIERTO: CACHÉ | PRESUPUESTO | GASTOS REALES | TOTAL A FACTURAR | BENEFICIO | MARGEN */}
                        <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">CACHÉ</div>
                          <div className="text-xl font-bold text-blue-400">€{budgetAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                          <div className="text-[9px] text-blue-400/70 mt-0.5">Fee del promotor</div>
                        </div>

                        <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">PRESUPUESTO</div>
                          <div className="text-xl font-bold text-amber-400">€{expenseBudget.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                          <div className="text-[9px] text-amber-400/70 mt-0.5">Gastos planif.</div>
                        </div>

                        <div className={`flex flex-col justify-center items-center h-[80px] p-3 rounded-lg border ${expenseBudget > 0 && totals.neto > expenseBudget ? 'bg-destructive/10 border-destructive/20' : 'bg-card/50 border-border'}`}>
                          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${expenseBudget > 0 && totals.neto > expenseBudget ? 'text-destructive' : 'text-foreground/70'}`}>GASTOS REALES</div>
                          <div className={`text-xl font-bold ${expenseBudget > 0 && totals.neto > expenseBudget ? 'text-destructive' : 'text-foreground'}`}>€{totals.neto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                          {expenseBudget > 0 && <div className={`text-[9px] mt-0.5 ${desviacion > 0 ? 'text-destructive' : 'text-green-600'}`}>{desviacion > 0 ? '+' : ''}{desviacionPct.toFixed(0)}% vs presup.</div>}
                        </div>

                        <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">TOTAL A FACTURAR</div>
                          <div className="text-xl font-bold text-primary">€{totals.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                          <div className="flex items-center gap-2 text-[9px] mt-0.5">
                            <span className="text-green-600">+€{totals.iva.toFixed(0)} IVA</span>
                            <span className="text-red-600">-€{totals.irpf.toFixed(0)} IRPF</span>
                          </div>
                        </div>

                        <div className={`flex flex-col justify-center items-center h-[80px] p-3 rounded-lg border ${budgetAmount === 0 ? 'bg-muted/30 border-border' : beneficio >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
                          <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${budgetAmount === 0 ? 'text-muted-foreground' : beneficio >= 0 ? 'text-green-600' : 'text-destructive'}`}>BENEFICIO</div>
                          <div className={`text-xl font-bold ${budgetAmount === 0 ? 'text-muted-foreground' : beneficio >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {budgetAmount === 0 ? '—' : `${beneficio < 0 ? '-' : ''}€${Math.abs(beneficio).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
                          </div>
                          <div className={`text-[9px] mt-0.5 ${beneficio >= 0 ? 'text-green-600/70' : 'text-destructive/70'}`}>Caché - Gastos</div>
                        </div>

                        <div className={`flex flex-col justify-center items-center h-[80px] p-3 rounded-lg border ${budgetAmount === 0 ? 'bg-muted/30 border-border' : margen >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
                          <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${budgetAmount === 0 ? 'text-muted-foreground' : margen >= 0 ? 'text-green-600' : 'text-destructive'}`}>MARGEN</div>
                          <div className={`text-xl font-bold ${budgetAmount === 0 ? 'text-muted-foreground' : margen >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {budgetAmount === 0 ? '—' : `${margen.toFixed(1)}%`}
                          </div>
                          <div className={`text-[9px] mt-0.5 ${margen >= 0 ? 'text-green-600/70' : 'text-destructive/70'}`}>Rentabilidad</div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* PRODUCCIÓN / CAMPAÑA / VIDEOCLIP — 4 métricas */}
                        {/* 1. CAPITAL */}
                        <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">CAPITAL</div>
                          <div className="text-xl font-bold text-blue-400">€{budgetAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                          <div className="flex items-center gap-0.5 text-[9px] text-blue-400/70 mt-0.5">
                            <span>Presupuesto total</span>
                          </div>
                        </div>

                        {/* 2. PAGADO */}
                        <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">PAGADO</div>
                          <div className="text-xl font-bold text-green-500">€{pagado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                          <div className="text-[9px] text-green-500/70 mt-0.5">{facturasCobradas} factura{facturasCobradas !== 1 ? 's' : ''} cobrada{facturasCobradas !== 1 ? 's' : ''}</div>
                        </div>

                        {/* 3. COMPROMETIDO + popover fiscal */}
                        <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">COMPROMETIDO</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="text-amber-400/60 hover:text-amber-400 transition-colors">
                                  <Info className="w-3 h-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="bottom" className="w-56 p-3 text-xs space-y-1.5">
                                <p className="font-semibold text-foreground mb-2">Desglose fiscal</p>
                                <div className="flex justify-between"><span className="text-muted-foreground">IVA soportado</span><span className="text-green-600">+€{totals.iva.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">IRPF retenido</span><span className="text-red-500">−€{totals.irpf.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span></div>
                                <div className="border-t pt-1.5 flex justify-between font-semibold"><span>Total a pagar</span><span>€{totals.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span></div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="text-xl font-bold text-amber-400">€{(comprometido + provisionalTotal).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                          <div className="text-[9px] mt-0.5 flex items-center gap-1">
                            <span className="text-amber-400/70">€{comprometido.toLocaleString('es-ES', { minimumFractionDigits: 0 })} confirmado</span>
                            {provisionalTotal > 0 && (
                              <>
                                <span className="text-amber-400/40">·</span>
                                <span className="text-amber-500 font-medium">€{provisionalTotal.toLocaleString('es-ES', { minimumFractionDigits: 0 })} provisional</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 4. DISPONIBLE — semáforo */}
                        <div className={`flex flex-col justify-center items-center h-[80px] p-3 rounded-lg border ${
                          disponiblePct < 0 ? 'bg-destructive/10 border-destructive/20' :
                          disponiblePct <= 15 ? 'bg-amber-500/10 border-amber-500/20' :
                          'bg-green-500/10 border-green-500/20'
                        }`}>
                          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                            disponiblePct < 0 ? 'text-destructive' :
                            disponiblePct <= 15 ? 'text-amber-400' :
                            'text-green-500'
                          }`}>DISPONIBLE</div>
                          <div className={`text-xl font-bold ${
                            disponiblePct < 0 ? 'text-destructive' :
                            disponiblePct <= 15 ? 'text-amber-400' :
                            'text-green-500'
                          }`}>
                            {disponible < 0 ? '-' : ''}€{Math.abs(disponible).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </div>
                          <div className={`text-[9px] mt-0.5 font-medium ${
                            disponiblePct < 0 ? 'text-destructive/70' :
                            disponiblePct <= 15 ? 'text-amber-400/70' :
                            'text-green-500/70'
                          }`}>
                            {disponible < 0 ? 'EXCEDIDO' : 'Por consumir'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Presupuesto Planif. - only shown when at least one category has a budget cap */}
                  {!isConcert && (() => {
                    const totalCaps = budgetCategories
                      .filter(c => c.budget_cap != null)
                      .reduce((sum, c) => sum + (c.budget_cap ?? 0), 0);
                    if (totalCaps === 0) return null;
                    return (
                      <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 w-fit">
                        <Calculator className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs text-primary font-medium">
                          Presupuesto planif.: €{totalCaps.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-primary/60">
                          (suma de techos por categoría)
                        </span>
                      </div>
                    );
                  })()}

                  {hiddenTotal > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 w-fit">
                      <EyeOff className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="text-xs text-amber-400">
                        €{hiddenTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} en categorías ocultas incluidas en los totales
                      </span>
                    </div>
                  )}
                  </>
                );
              })()}

            </div>
            
            {/* Location and Event info compacto */}
            {(budgetData.city || budgetData.venue || budgetData.event_date) && (
              <div className="flex flex-wrap gap-2 mt-3 text-xs text-white/70">
                {budgetData.event_date && (
                  <span className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-md flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(budgetData.event_date).toLocaleDateString('es-ES', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    {budgetData.event_time && ` • ${budgetData.event_time}`}
                  </span>
                )}
                {budgetData.city && (
                  <span className="px-2 py-1 bg-white/10 rounded-md">📍 {budgetData.city}</span>
                )}
                {budgetData.venue && (
                  <span className="px-2 py-1 bg-white/10 rounded-md">
                    🏛️ {(() => {
                      const match = budgetData.venue.match(/\(([^)]+)\)/);
                      return match ? match[1] : budgetData.venue;
                    })()}
                  </span>
                )}
              </div>
            )}
            
            {/* Recordatorio de solicitud de facturas */}
            {budgetData.event_date && new Date(budgetData.event_date) > new Date() && (
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded-md text-xs text-yellow-200">
                💡 Recuerda solicitar las facturas al día siguiente del evento ({
                  new Date(new Date(budgetData.event_date).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { 
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                })
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <Tabs value={mainTab} onValueChange={setMainTab} className="flex flex-col">
              <div className="border-b bg-background px-4 py-2">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="items" className="flex items-center gap-2 text-sm">
                    <Calculator className="w-4 h-4" />
                    Elementos
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4" />
                    Vista General
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="items" className="flex-1 p-0 m-0">
                <div className="flex flex-col bg-gradient-to-b from-black to-gray-900">
                  {/* Auto-link suggestions banner */}
                  {autoLinkSuggestions.size > 0 && (
                    <div className="bg-amber-500/20 border-b border-amber-500/30 p-3">
                      <div className="flex items-center gap-2 text-amber-200 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">Sugerencias de vinculación automática</span>
                      </div>
                      <div className="space-y-2">
                        {Array.from(autoLinkSuggestions.entries()).map(([fileUrl, suggestion]) => (
                          <div key={fileUrl} className="flex items-center justify-between bg-amber-500/10 rounded p-2">
                            <div className="text-sm text-amber-100">
                              <span className="font-medium">{suggestion.itemName}</span>
                              <span className="text-amber-200/70 ml-2">
                                ({suggestion.matchReasons.join(' • ')})
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-green-600/30 hover:bg-green-600/50 text-green-200 border-green-400/30"
                                onClick={() => {
                                  confirmAutoLink(fileUrl, suggestion.itemId);
                                  fetchBudgetItems();
                                }}
                              >
                                <Link2 className="w-3 h-3 mr-1" />
                                Vincular
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-amber-200 hover:text-amber-100"
                                onClick={() => dismissAutoLink(fileUrl)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                   {/* Category Management Header - Compact */}
                  <div className="bg-gray-900 text-white px-3 py-2 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold tracking-wide">Gestión de Elementos</h2>
                        <div className="w-px h-5 bg-gray-600" />
                        <div className="flex items-center gap-2 bg-white/10 rounded-md px-1 py-0.5">
                          <ToggleGroup type="single" value={displayMode} onValueChange={(v) => { if (v) setDisplayMode(v as any); }} className="gap-0">
                            <ToggleGroupItem value="neto" className="h-6 px-2.5 text-[11px] font-medium rounded-sm data-[state=on]:bg-white data-[state=on]:text-black text-white/60 hover:text-white">Neto</ToggleGroupItem>
                            <ToggleGroupItem value="con_iva" className="h-6 px-2.5 text-[11px] font-medium rounded-sm data-[state=on]:bg-white data-[state=on]:text-black text-white/60 hover:text-white">Con IVA</ToggleGroupItem>
                            <ToggleGroupItem value="liquido" className="h-6 px-2.5 text-[11px] font-medium rounded-sm data-[state=on]:bg-white data-[state=on]:text-black text-white/60 hover:text-white">Líquido</ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                      </div>
                         <div className="flex gap-2">
                           <Button
                             onClick={hideEmptyCategories}
                             size="sm"
                             variant="outline"
                             className="bg-muted/20 hover:bg-muted/40 text-muted-foreground border-border/40 text-xs"
                             title="Ocultar categorías vacías"
                           >
                             <Eraser className="w-3 h-3" />
                           </Button>
                         <Button
                            onClick={() => {
                              fetchAvailableFormats();
                             fetchTeamMembers();
                             setLoadDialogTab('formats');
                             setSelectedTeamMembers([]);
                             setShowLoadFromFormatDialog(true);
                           }}
                           size="sm"
                           variant="outline"
                           className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border-blue-400/20 text-xs"
                         >
                           <Users className="w-3 h-3 mr-1" />
                           Añadir equipo
                         </Button>
                         <Button
                           onClick={() => invoiceInputRef.current?.click()}
                           size="sm"
                           variant="outline"
                           className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border-purple-400/20 text-xs"
                           disabled={isUploadingInvoice}
                         >
                           <Upload className="w-3 h-3 mr-1" />
                           {isUploadingInvoice ? 'Subiendo...' : 'Subir Factura'}
                         </Button>
                         <input
                           ref={invoiceInputRef}
                           type="file"
                           accept=".pdf,.jpg,.jpeg,.png,.webp"
                           multiple
                           className="hidden"
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (!files?.length) return;
                              const unlinked: { fileUrl: string; fileName: string }[] = [];
                              for (const file of Array.from(files)) {
                                const result = await uploadInvoice(
                                  file,
                                  items,
                                  bookingContext?.artistId,
                                  bookingContext?.bookingId
                                );
                                if (result?.fileUrl && !result.autoLinked) {
                                  unlinked.push({ fileUrl: result.fileUrl, fileName: file.name });
                                }
                              }
                              await fetchBudgetItems();
                              e.target.value = '';
                              // Prompt the user to manually link each file that didn't auto-link.
                              if (unlinked.length > 0) {
                                const first = unlinked[0];
                                setAttachInvoiceDialog({ open: true, fileUrl: first.fileUrl, fileName: first.fileName });
                                if (unlinked.length > 1) {
                                  toast({
                                    title: `${unlinked.length} facturas sin vincular`,
                                    description: 'Vincula la primera; las siguientes podrás vincularlas desde el icono ↑ de cada línea.',
                                  });
                                }
                              }
                            }}
                         />
                         <Button
                            onClick={() => setShowLiquidarDialog(true)}
                            size="sm"
                            variant="outline"
                            className="bg-green-600/20 hover:bg-green-600/30 text-green-200 border-green-400/20 text-xs"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Liquidar Facturas
                          </Button>
                         <Button
                           onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                           size="sm"
                           variant="outline"
                           className="bg-gray-600/20 hover:bg-gray-600/30 text-gray-200 border-gray-400/20 text-xs"
                         >
                           <Settings className="w-3 h-3 mr-1" />
                           Categorías
                         </Button>
                       </div>
                    </div>
                   </div>
                   
                   {/* Category Management Interface */}
                   {showCategoryManagement && (
                     <div className="bg-gray-800 text-white p-4 border-b border-gray-600">
                       <h3 className="text-md font-bold mb-3">Gestión de Categorías</h3>
                        <div className="space-y-3">
                          {sortCategoriesWithPriority(budgetCategories).filter(c => !hiddenCategories.has(c.id)).map((category, index) => (
                            <div 
                              key={category.id}
                              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-move
                                ${draggedCategory === category.id 
                                  ? 'bg-gray-600 opacity-60 shadow-lg transform scale-105' 
                                  : dragOverCategory === category.id 
                                    ? 'bg-gray-600 shadow-md border-2 border-blue-400' 
                                    : 'bg-gray-700 hover:bg-gray-650'
                                }`}
                              draggable
                              onDragStart={(e) => {
                                setDraggedCategory(category.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (draggedCategory && draggedCategory !== category.id) {
                                  setDragOverCategory(category.id);
                                }
                              }}
                              onDragLeave={(e) => {
                                // Only clear if leaving the entire item, not just child elements
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                  setDragOverCategory(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedCategory && dragOverCategory && draggedCategory !== dragOverCategory) {
                                  reorderCategories(draggedCategory, dragOverCategory);
                                }
                                setDraggedCategory(null);
                                setDragOverCategory(null);
                              }}
                              onDragEnd={() => {
                                setDraggedCategory(null);
                                setDragOverCategory(null);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <GripVertical 
                                  className={`w-5 h-5 transition-colors duration-200 ${
                                    draggedCategory === category.id 
                                      ? 'text-blue-400 cursor-grabbing' 
                                      : 'text-gray-400 hover:text-gray-200 cursor-grab'
                                  }`} 
                                />
                               {iconMap[category.icon_name as keyof typeof iconMap] && 
                                 React.createElement(iconMap[category.icon_name as keyof typeof iconMap], { 
                                   className: "w-4 h-4" 
                                 })
                               }
                               {editingCategory === category.id ? (
                                 <div className="flex flex-col gap-1.5 flex-1">
                                   <Input
                                     value={newCategoryName}
                                     onChange={(e) => setNewCategoryName(e.target.value)}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter') {
                                         updateCategoryName(category.id, newCategoryName);
                                       } else if (e.key === 'Escape') {
                                         setEditingCategory(null);
                                         setNewCategoryName('');
                                       }
                                     }}
                                     className="bg-gray-600 border-gray-500 text-white h-7 text-sm"
                                     autoFocus
                                     placeholder="Nombre de categoría"
                                   />
                                   <Input
                                     type="number"
                                     value={editingCategoryCap}
                                     onChange={(e) => setEditingCategoryCap(e.target.value)}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter') {
                                         updateCategoryName(category.id, newCategoryName);
                                       } else if (e.key === 'Escape') {
                                         setEditingCategory(null);
                                       }
                                     }}
                                     className="bg-gray-600 border-gray-500 text-white h-7 text-sm"
                                     placeholder="Presupuesto máximo (€) — Sin límite"
                                     min={0}
                                     step={100}
                                   />
                                 </div>
                               ) : (
                                  <span 
                                    className="cursor-pointer hover:text-blue-300"
                                    onClick={() => {
                                      setEditingCategory(category.id);
                                      setNewCategoryName(category.name);
                                      setEditingCategoryCap(category.budget_cap != null ? String(category.budget_cap) : '');
                                    }}
                                  >
                                    {category.name}
                                    {category.budget_cap != null && (
                                      <span className="text-xs text-gray-400 ml-1.5">
                                        (máx. €{category.budget_cap.toLocaleString('es-ES')})
                                      </span>
                                    )}
                                  </span>
                                )}
                             </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-300">
                              {getCategoryItems(category.id).length} elementos
                            </span>
                            {getCategoryItems(category.id).length > 0 && (
                              <Button
                                onClick={() => selectAllItemsInCategory(category.id)}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-gray-600"
                              >
                                Seleccionar todos
                              </Button>
                            )}
                               {editingCategory === category.id ? (
                                 <div className="flex gap-1">
                                   <Button
                                     onClick={() => updateCategoryName(category.id, newCategoryName)}
                                     size="sm"
                                     className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                   >
                                     <Save className="w-3 h-3" />
                                   </Button>
                                   <Button
                                     onClick={() => {
                                       setEditingCategory(null);
                                       setNewCategoryName('');
                                     }}
                                     size="sm"
                                     variant="outline"
                                     className="h-6 w-6 p-0"
                                   >
                                     <X className="w-3 h-3" />
                                   </Button>
                                 </div>
                                ) : (
                                  <div className="flex gap-1">
                                     <Button
                                       onClick={() => {
                                         setEditingCategory(category.id);
                                         setNewCategoryName(category.name);
                                         setEditingCategoryCap(category.budget_cap != null ? String(category.budget_cap) : '');
                                       }}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 hover:bg-gray-600"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      onClick={() => deleteCategory(category.id)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 hover:bg-red-600/50 text-red-400"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                             </div>
                           </div>
                         ))}
                          {/* Hidden categories subsection inside the management panel */}
                          {hiddenCategories.size > 0 && (
                             <div className="pt-1">
                               <Collapsible defaultOpen={false}>
                                 <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-dashed border-gray-600 hover:border-gray-500 bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-white transition-all group">
                                   <div className="flex items-center gap-3">
                                     <div className="w-7 h-7 rounded-md bg-gray-700 group-hover:bg-gray-600 flex items-center justify-center transition-colors flex-shrink-0">
                                       <EyeOff className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-200" />
                                     </div>
                                     <div className="text-left">
                                       <div className="text-sm font-medium">Categorías ocultas</div>
                                       <div className="text-xs text-gray-500">
                                         {hiddenCategories.size} {hiddenCategories.size === 1 ? 'categoría' : 'categorías'} · haz clic para ver y restaurar
                                       </div>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2 flex-shrink-0">
                                     <Badge className="text-xs bg-gray-700 text-gray-300 border-gray-600">
                                       {hiddenCategories.size}
                                     </Badge>
                                     <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]_&]:rotate-180 text-gray-500" />
                                   </div>
                                 </CollapsibleTrigger>
                                 <CollapsibleContent>
                                   <div className="mt-1 rounded-b-lg overflow-hidden border border-t-0 border-dashed border-gray-600 divide-y divide-gray-700/60">
                                     {sortCategoriesWithPriority(budgetCategories)
                                       .filter(c => hiddenCategories.has(c.id))
                                       .map(category => {
                                         const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                                         return (
                                           <div key={category.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 transition-colors duration-200 cursor-pointer">
                                             <div className="flex items-center gap-2 text-gray-400">
                                               <IconComponent className="w-4 h-4" />
                                               <span className="text-sm">{category.name}</span>
                                               <span className="text-xs text-gray-500">({getCategoryItems(category.id).length})</span>
                                               <EyeOff className="w-3 h-3 text-gray-600" />
                                             </div>
                                             <Button
                                               size="sm"
                                               variant="ghost"
                                               className="text-gray-400 hover:text-white hover:bg-white/10 text-xs gap-1 h-7"
                                               onClick={() => toggleHideCategory(category.id, false)}
                                             >
                                               <Eye className="w-3 h-3" /> Mostrar
                                             </Button>
                                           </div>
                                         );
                                       })}
                                   </div>
                                 </CollapsibleContent>
                               </Collapsible>
                             </div>
                           )}
                          <Button
                            onClick={addNewCategory}
                            variant="outline"
                            className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Nueva Categoría
                          </Button>
                       </div>
                     </div>
                   )}
                   
                    {/* Bulk actions bar */}
                    {selectedItems.size > 0 && (
                      <div className="bg-blue-600 text-white p-3 border-b border-blue-700">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {selectedItems.size} elemento(s) seleccionado(s)
                          </span>
                           <div className="flex gap-2">
                              <Select 
                                onValueChange={(categoryId) => moveSelectedItems(categoryId)}
                              >
                                <SelectTrigger className="bg-blue-700 hover:bg-blue-800 text-white border-blue-500 w-48">
                                  <div className="flex items-center">
                                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Mover a categoría..." />
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  {sortCategoriesWithPriority(budgetCategories).map((category) => {
                                    const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                                    return (
                                      <SelectItem key={category.id} value={category.id}>
                                        <div className="flex items-center gap-2">
                                          <IconComponent className="w-4 h-4" />
                                          {category.name}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <Select 
                                onValueChange={(billingStatus) => updateSelectedItemsBillingStatus(billingStatus)}
                              >
                                <SelectTrigger className="bg-blue-700 hover:bg-blue-800 text-white border-blue-500 w-56">
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Cambiar estado facturación..." />
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendiente">Pendiente</SelectItem>
                                  <SelectItem value="factura_solicitada">Factura solicitada</SelectItem>
                                  <SelectItem value="factura_recibida">Factura recibida</SelectItem>
                                  <SelectItem value="pagada">Pagada</SelectItem>
                                  <SelectItem value="pagado_sin_factura">Pagado (sin justificante)</SelectItem>
                                  <SelectItem value="agrupada">Agrupada en factura</SelectItem>
                                </SelectContent>
                              </Select>
                              {/* Delete selected button with confirmation dialog */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-red-700 bg-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Eliminar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará <strong>{selectedItems.size} elemento(s)</strong> de forma permanente.
                                      <br />
                                      <span className="text-destructive font-medium">Los cambios no podrán recuperarse.</span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={deleteSelectedItems}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Sí, eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            <Button
                              onClick={clearSelection}
                              size="sm"
                              variant="ghost"
                              className="text-white hover:bg-blue-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Categories Section */}
                   <div className="flex-1 overflow-auto">
                    {sortCategoriesWithPriority(budgetCategories).filter(c => !hiddenCategories.has(c.id)).map((category) => {
                      const categoryItems = getCategoryItems(category.id);
                      const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                      
                      return (
                        <div key={category.id} data-category-id={category.id} className="mb-6">
                          {/* Category Header */}
                          <div 
                            className="bg-gray-50 border-b-2 border-b-gray-300 px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              setOpenCategories(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(category.id)) {
                                  newSet.delete(category.id);
                                } else {
                                  newSet.add(category.id);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="transform transition-transform duration-200" style={{ transform: openCategories.has(category.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500 rotate-90" />
                              </div>
                              <IconComponent className="w-4 h-4 text-gray-600" />
                              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{category.name}</h3>
                              <span className="text-xs text-gray-400">({categoryItems.length})</span>
                            </div>
                            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-4 text-sm">
                                {(() => {
                                  const provisionalNeto = categoryItems.filter((i: any) => i.is_provisional).reduce((sum, item) => {
                                    return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
                                  }, 0);
                                  const totalNeto = categoryItems.reduce((sum, item) => {
                                    return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
                                  }, 0);
                                  const totalWithIva = categoryItems.reduce((sum, item) => {
                                    const unitPrice = Number(item.unit_price) || 0;
                                    const quantity = Number(item.quantity) || 1;
                                    const subtotal = unitPrice * quantity;
                                    const iva = subtotal * ((Number(item.iva_percentage) || 0) / 100);
                                    return sum + subtotal + iva;
                                  }, 0);
                                  const totalLiquido = categoryItems.reduce((sum, item) => {
                                    const unitPrice = Number(item.unit_price) || 0;
                                    const quantity = Number(item.quantity) || 1;
                                    const subtotal = unitPrice * quantity;
                                    const iva = subtotal * ((Number(item.iva_percentage) || 0) / 100);
                                    const irpf = subtotal * ((Number(item.irpf_percentage) ?? 15) / 100);
                                    return sum + subtotal + iva - irpf;
                                  }, 0);
                                  const totalRetention = categoryItems.reduce((sum, item) => {
                                    const subtotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
                                    return sum + subtotal * ((Number(item.irpf_percentage) ?? 15) / 100);
                                  }, 0);
                                  const displayTotal = displayMode === 'con_iva' ? totalWithIva : displayMode === 'liquido' ? totalLiquido : totalNeto;
                                  const modeLabel = displayMode === 'con_iva' ? 'Con IVA' : displayMode === 'liquido' ? 'Líquido' : 'Neto';
                                  return (
                                    <>
                                      <div className="text-right">
                                        <div className="text-[10px] text-gray-400 mb-0.5">{modeLabel}</div>
                                        <div className="font-semibold font-mono text-sm text-gray-700">
                                          €{displayTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                        </div>
                                        {displayMode === 'liquido' && totalRetention > 0 && (
                                          <div className="text-[10px] text-gray-400">+ €{totalRetention.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ret.</div>
                                        )}
                                        {provisionalNeto > 0 && (
                                          <div className="text-[10px] text-amber-400">⏳ €{provisionalNeto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} prov.</div>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                              {/* Eye button to hide category */}
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleHideCategory(category.id, true);
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 h-7 w-7 p-0"
                                title="Ocultar categoría"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addNewItem(category.id);
                                }}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Agregar
                              </Button>
                            </div>
                          </div>
                          
                          {/* Excel-style Table */}
                          {openCategories.has(category.id) && (
                            <div className="bg-white border-b border-gray-100 overflow-x-auto">
                              {categoryItems.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 bg-white">
                                  <p>No hay elementos en esta categoría</p>
                                  <Button
                                    onClick={() => addNewItem(category.id)}
                                    variant="ghost"
                                    className="mt-2 text-gray-600 hover:text-gray-900"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Agregar elemento a {category.name}
                                  </Button>
                                </div>
                              ) : (
                              <Table>
                                 <TableHeader>
                                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[50px] text-center">
                                        <input
                                          type="checkbox"
                                          className="rounded"
                                          checked={categoryItems.length > 0 && categoryItems.every(item => selectedItems.has(item.id))}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              selectAllItemsInCategory(category.id);
                                            } else {
                                              const newSelection = new Set(selectedItems);
                                              categoryItems.forEach(item => newSelection.delete(item.id));
                                              setSelectedItems(newSelection);
                                            }
                                          }}
                                        />
                                      </TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[200px]">Concepto</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[130px] text-center">Contacto</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[130px] text-center">Fecha Emisión</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[200px] text-right">Precio / Comisión</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[80px] text-center">IVA (%)</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[80px] text-center">IRPF (%)</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[120px] text-right">Total (€)</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[150px] text-center">Estado</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[150px] text-center">Factura</TableHead>
                                      <TableHead className="font-medium text-gray-500 text-xs uppercase w-[100px] text-center">Acciones</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                <TableBody>
                                    {categoryItems.map((item, index) => {
                                      const isEditingRow = editingItem === item.id;
                                      return (
                                     <TableRow 
                                        key={item.id} 
                                        className={`${(item as any).is_provisional ? 'bg-amber-50/40' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')} hover:bg-blue-50/50 transition-colors border-b border-gray-100 ${
                                          selectedItems.has(item.id) ? 'bg-blue-100 border-blue-300' : ''
                                        } ${draggedElement === item.id ? 'opacity-50' : ''} ${
                                          dragOverElement === item.id 
                                            ? isDuplicateDrag 
                                              ? 'border-t-2 border-t-green-500' 
                                              : 'border-t-2 border-t-blue-500' 
                                            : ''
                                        } ${(item as any).is_provisional ? 'opacity-75' : ''}`}
                                       draggable={!isEditingRow}
                                       onKeyDown={(e) => {
                                         if (!isEditingRow) return;
                                         const target = e.target as HTMLElement;
                                         if (e.key === 'Enter' && !e.shiftKey && target.tagName !== 'TEXTAREA') {
                                           e.preventDefault();
                                           void saveItemEdits();
                                         } else if (e.key === 'Escape') {
                                           e.preventDefault();
                                           setEditingItem(null);
                                           setEditingItemValues({});
                                         }
                                       }}
                                       onDragStart={(e) => {
                                         if (isEditingRow) { e.preventDefault(); return; }
                                         setDraggedElement(item.id);
                                         const alt = e.altKey;
                                         setIsDuplicateDrag(alt);
                                         e.dataTransfer.effectAllowed = alt ? 'copy' : 'move';
                                         e.dataTransfer.setData('text/plain', item.id);
                                       }}
                                       onDragOver={(e) => {
                                         if (isEditingRow) return;
                                         e.preventDefault();
                                         const alt = e.altKey;
                                         setIsDuplicateDrag(alt);
                                         e.dataTransfer.dropEffect = alt ? 'copy' : 'move';
                                         setDragOverElement(item.id);
                                       }}
                                       onDragLeave={() => {
                                         if (isEditingRow) return;
                                         setDragOverElement(null);
                                       }}
                                       onDrop={(e) => {
                                         if (isEditingRow) return;
                                         e.preventDefault();
                                         if (draggedElement && draggedElement !== item.id) {
                                           if (e.altKey || isDuplicateDrag) {
                                             duplicateItemAtPosition(draggedElement, item.id, category.id);
                                           } else {
                                             reorderElements(draggedElement, item.id, category.id);
                                           }
                                         }
                                         setDragOverElement(null);
                                         setDraggedElement(null);
                                         setIsDuplicateDrag(false);
                                       }}
                                       onDragEnd={() => {
                                         setDraggedElement(null);
                                         setDragOverElement(null);
                                         setIsDuplicateDrag(false);
                                       }}
                                      >
                                        {/* Checkbox */}
                                        <TableCell className="p-2 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            <input
                                              type="checkbox"
                                              className="rounded"
                                              checked={selectedItems.has(item.id)}
                                              onChange={() => toggleItemSelection(item.id)}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <GripVertical className={`w-4 h-4 ${isEditingRow ? 'text-gray-300 cursor-not-allowed opacity-40' : 'text-gray-400 cursor-grab hover:text-gray-600'}`} />
                                          </div>
                                        </TableCell>

                                        {/* Nombre */}
                                        <TableCell className="p-2">
                                         {editingItem === item.id ? (
                                           <Input
                                             value={editingItemValues.name || item.name}
                                             onChange={(e) => setEditingItemValues(prev => ({ ...prev, name: e.target.value }))}
                                             className="h-8 text-sm border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                             autoFocus
                                           />
                                          ) : (
                                            <div 
                                              className="h-8 flex items-center gap-2 cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
                                              onClick={() => startEditingItem(item)}
                                            >
                                              {item.name}
                                              {(item as any).is_provisional && (
                                                <Badge
                                                  variant="outline"
                                                  className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-300 shrink-0"
                                                >
                                                  Provisional
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                       </TableCell>
                                      
                                        {/* Contacto */}
                                        <TableCell className="p-2 text-center">
                                          <BudgetContactSelector
                                            value={editingItem === item.id ? editingItemValues.contact_id : item.contact_id}
                                            onValueChange={(contactId) => {
                                              if (editingItem === item.id) {
                                                setEditingItemValues(prev => ({ ...prev, contact_id: contactId || undefined }));
                                              } else {
                                                // Direct update without entering edit mode
                                                supabase
                                                  .from('budget_items')
                                                  .update({ contact_id: contactId })
                                                  .eq('id', item.id)
                                                  .then(() => fetchBudgetItems());
                                              }
                                            }}
                                            compact
                                          />
                                        </TableCell>
                                      
                                        {/* Fecha de emisión */}
                                       <TableCell className="p-2 text-center">
                                         {editingItem === item.id ? (
                                           <Popover>
                                             <PopoverTrigger asChild>
                                               <Button
                                                 variant="outline"
                                                 className={cn(
                                                   "h-8 w-[120px] justify-start text-left font-normal text-sm",
                                                   !editingItemValues.fecha_emision && "text-muted-foreground"
                                                 )}
                                               >
                                                 <CalendarIcon className="mr-2 h-3 w-3" />
                                                 {editingItemValues.fecha_emision ? format(new Date(editingItemValues.fecha_emision), "dd/MM/yyyy") : <span>Fecha</span>}
                                               </Button>
                                             </PopoverTrigger>
                                             <PopoverContent className="w-auto p-0" align="start">
                                               <Calendar
                                                 mode="single"
                                                 selected={editingItemValues.fecha_emision ? new Date(editingItemValues.fecha_emision) : undefined}
                                                 onSelect={(date) => setEditingItemValues(prev => ({ ...prev, fecha_emision: date ? format(date, 'yyyy-MM-dd') : undefined }))}
                                                 initialFocus
                                                 className="pointer-events-auto"
                                               />
                                             </PopoverContent>
                                           </Popover>
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
                                             onClick={() => startEditingItem(item)}
                                           >
                                             {item.fecha_emision ? format(new Date(item.fecha_emision), "dd/MM/yyyy") : "-"}
                                           </div>
                                         )}
                                       </TableCell>
                                       
                                        {/* Precio Unitario / Comisión % */}
                                       <TableCell className="p-2 text-right">
                                         {editingItem === item.id ? (
                                           <div className="flex flex-col gap-1">
                                             {/* Toggle between percentage and fixed */}
                                             <div className="flex items-center justify-end gap-1 mb-1">
                                               <button
                                                 type="button"
                                                 onClick={() => {
                                                   const isPercentage = !editingItemValues.is_commission_percentage;
                                                   if (isPercentage) {
                                                     // Switching to percentage: calculate percentage from current price
                                                     const currentPrice = editingItemValues.unit_price ?? item.unit_price;
                                                     const percentage = budgetAmount > 0 ? (currentPrice / budgetAmount) * 100 : 0;
                                                     setEditingItemValues(prev => ({
                                                       ...prev,
                                                       is_commission_percentage: true,
                                                       commission_percentage: Math.round(percentage * 100) / 100
                                                     }));
                                                   } else {
                                                     // Switching to fixed: keep calculated price
                                                     setEditingItemValues(prev => ({
                                                       ...prev,
                                                       is_commission_percentage: false,
                                                       commission_percentage: null
                                                     }));
                                                   }
                                                 }}
                                                 className={`text-xs px-2 py-0.5 rounded ${
                                                   editingItemValues.is_commission_percentage ?? item.is_commission_percentage
                                                     ? 'bg-purple-100 text-purple-700 font-medium'
                                                     : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                 }`}
                                               >
                                                 % Fee
                                               </button>
                                               <button
                                                 type="button"
                                                 onClick={() => {
                                                   setEditingItemValues(prev => ({
                                                     ...prev,
                                                     is_commission_percentage: false,
                                                     commission_percentage: null
                                                   }));
                                                 }}
                                                 className={`text-xs px-2 py-0.5 rounded ${
                                                   !(editingItemValues.is_commission_percentage ?? item.is_commission_percentage)
                                                     ? 'bg-blue-100 text-blue-700 font-medium'
                                                     : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                 }`}
                                               >
                                                 € Fijo
                                               </button>
                                             </div>
                                             {/* Input based on mode */}
                                             {(editingItemValues.is_commission_percentage ?? item.is_commission_percentage) ? (
                                               <div className="flex items-center gap-1">
                                                 <Input
                                                   type="number"
                                                   step="0.1"
                                                   min="0"
                                                   max="100"
                                                   value={editingItemValues.commission_percentage ?? item.commission_percentage ?? 0}
                                                   onChange={(e) => {
                                                     const percentage = parseFloat(e.target.value) || 0;
                                                     const calculatedPrice = (budgetAmount * percentage) / 100;
                                                     setEditingItemValues(prev => ({
                                                       ...prev,
                                                       commission_percentage: percentage,
                                                       unit_price: calculatedPrice
                                                     }));
                                                   }}
                                                   className="h-8 w-20 text-sm text-right border-purple-300 focus:border-purple-500 text-gray-900 bg-white"
                                                 />
                                                 <span className="text-purple-600 text-sm font-medium">%</span>
                                                 <span className="text-gray-400 text-xs">→</span>
                                                 <span className="text-gray-600 text-sm">€{((budgetAmount * (editingItemValues.commission_percentage ?? item.commission_percentage ?? 0)) / 100).toFixed(0)}</span>
                                               </div>
                                             ) : (
                                               <div className="flex items-center gap-1">
                                                 <Input
                                                   type="number"
                                                   step="0.01"
                                                   value={editingItemValues.unit_price ?? item.unit_price}
                                                   onChange={(e) => setEditingItemValues(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                                                   className="h-8 text-sm text-right border-blue-300 focus:border-blue-500 text-gray-900 bg-white flex-1 min-w-[7rem]"
                                                 />
                                                 {(expandedQuantity === item.id || (item.quantity && item.quantity > 1)) && (
                                                   <>
                                                     <span className="text-gray-500 text-sm">×</span>
                                                     <Input
                                                       type="number"
                                                       min="1"
                                                       value={editingItemValues.quantity ?? item.quantity ?? 1}
                                                       onChange={(e) => setEditingItemValues(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                                       className="h-8 w-16 text-sm text-center border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                                     />
                                                   </>
                                                 )}
                                                 <Button
                                                   size="sm"
                                                   variant="ghost"
                                                   onClick={() => setExpandedQuantity(expandedQuantity === item.id ? null : item.id)}
                                                   className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                                 >
                                                   <Plus className="w-3 h-3" />
                                                 </Button>
                                               </div>
                                             )}
                                           </div>
                                         ) : item.is_commission_percentage && item.commission_percentage ? (
                                           // Commission percentage display (view mode)
                                           <div 
                                             className="h-8 flex items-center justify-end px-2 rounded text-purple-700 font-semibold gap-1 cursor-pointer hover:bg-purple-50"
                                             onClick={() => startEditingItem(item)}
                                             title={`${item.commission_percentage}% del caché (€${budgetAmount.toLocaleString('es-ES')})`}
                                           >
                                             <span className="text-purple-600">{item.commission_percentage}%</span>
                                             <span className="text-gray-400 text-xs">→</span>
                                             <span className="text-gray-700">€{item.unit_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                                           </div>
                                         ) : (
                                           // Fixed price display (view mode)
                                           <div 
                                             className="h-8 flex items-center justify-end cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900 gap-1"
                                             onClick={() => startEditingItem(item)}
                                           >
                                             <span>€{item.unit_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                                             {item.quantity && item.quantity > 1 && (
                                               <span className="text-gray-500 text-sm whitespace-nowrap">× {item.quantity}</span>
                                             )}
                                             <Button
                                               size="sm"
                                               variant="ghost"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setExpandedQuantity(expandedQuantity === item.id ? null : item.id);
                                               }}
                                               className="h-4 w-4 p-0 text-blue-600 hover:text-blue-800 ml-1"
                                             >
                                               <Plus className="w-2 h-2" />
                                             </Button>
                                           </div>
                                         )}
                                       </TableCell>
                                      
                                       {/* IVA */}
                                       <TableCell className="p-2 text-center">
                                         {editingItem === item.id ? (
                                           <Input
                                             type="number"
                                             step="0.1"
                                             min="0"
                                             max="100"
                                             value={editingItemValues.iva_percentage || item.iva_percentage}
                                             onChange={(e) => setEditingItemValues(prev => ({ ...prev, iva_percentage: parseFloat(e.target.value) || 0 }))}
                                             className="h-8 text-sm text-center border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                           />
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
                                             onClick={() => startEditingItem(item)}
                                           >
                                             {item.iva_percentage}%
                                           </div>
                                         )}
                                       </TableCell>
                                      
                                       {/* IRPF */}
                                       <TableCell className="p-2 text-center">
                                         {editingItem === item.id ? (
                                           <Input
                                             type="number"
                                             step="0.1"
                                             min="0"
                                             max="100"
                                              value={editingItemValues.irpf_percentage ?? item.irpf_percentage ?? 15}
                                              onChange={(e) => { const v = parseFloat(e.target.value); setEditingItemValues(prev => ({ ...prev, irpf_percentage: isNaN(v) ? 15 : v })); }}
                                             className="h-8 text-sm text-center border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                           />
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
                                             onClick={() => startEditingItem(item)}
                                           >
                                             {item.irpf_percentage ?? 15}%
                                           </div>
                                         )}
                                       </TableCell>
                                      
                                       {/* Total */}
                                        <TableCell className="p-2 text-right">
                                          <div className="px-2 font-medium text-green-700">
                                            <div className="h-6 flex items-center justify-end">
                                              €{calculateDisplayTotal(editingItem === item.id ? { ...item, ...editingItemValues } : item).toFixed(2)}
                                            </div>
                                            {displayMode === 'liquido' && (() => {
                                              const currentItem = editingItem === item.id ? { ...item, ...editingItemValues } : item;
                                              const retention = calculateIrpfRetention(currentItem);
                                              return retention > 0 ? (
                                                <div className="text-[10px] text-muted-foreground leading-tight">
                                                  + €{retention.toFixed(2)} retención
                                                </div>
                                              ) : null;
                                            })()}
                                          </div>
                                        </TableCell>

                                       {/* Estado de facturación */}
                                       <TableCell className="p-2 text-center">
                                         {editingItem === item.id ? (
                                            <Select
                                              value={editingItemValues.billing_status || item.billing_status || 'pendiente'}
                                              onValueChange={(value) => setEditingItemValues(prev => ({ ...prev, billing_status: value as any }))}
                                            >
                                              <SelectTrigger className="h-8 text-sm border-blue-300 focus:border-blue-500">
                                                <SelectValue placeholder="Seleccionar estado" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                                <SelectItem value="factura_solicitada">Factura solicitada</SelectItem>
                                                <SelectItem value="factura_recibida">Factura recibida</SelectItem>
                                                <SelectItem value="pagada">Pagada</SelectItem>
                                                <SelectItem value="pagado_sin_factura">Pagado (sin justificante)</SelectItem>
                                                <SelectItem value="agrupada">Agrupada en factura</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <div 
                                              className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded"
                                              onClick={() => startEditingItem(item)}
                                              title={item.billing_status === 'pagado_sin_factura' ? 'Salida sin factura/recibo. Pendiente de regularizar con gestoría.' : undefined}
                                            >
                                               <Badge variant={
                                                 item.billing_status === 'pagada' ? 'default' :
                                                 item.billing_status === 'pagado_sin_factura' ? 'outline' :
                                                 item.billing_status === 'agrupada' ? 'secondary' :
                                                 item.billing_status === 'factura_recibida' ? 'secondary' :
                                                 item.billing_status === 'factura_solicitada' ? 'outline' : 'destructive'
                                               } className={
                                                 item.billing_status === 'agrupada' ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100' :
                                                 item.billing_status === 'pagado_sin_factura' ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100' : undefined
                                               }>
                                                 {item.billing_status === 'pendiente' ? 'Pendiente' :
                                                  item.billing_status === 'factura_solicitada' ? 'Factura solicitada' :
                                                  item.billing_status === 'factura_recibida' ? 'Factura recibida' :
                                                  item.billing_status === 'pagada' ? 'Pagada' :
                                                  item.billing_status === 'pagado_sin_factura' ? '⚠ Pagado sin justificante' :
                                                  item.billing_status === 'agrupada' ? '🔗 Agrupada' : item.billing_status}
                                               </Badge>
                                             </div>
                                           )}
                                         </TableCell>

                                       {/* Enlace Factura */}
                                       <TableCell className="p-2 text-center">
                                         {item.invoice_group_parent_id ? (
                                           <TooltipProvider>
                                             <Tooltip>
                                               <TooltipTrigger asChild>
                                                 <div className="h-8 flex items-center justify-center">
                                                   <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-mono text-[10px] gap-1">
                                                     <Link2 className="w-3 h-3" />
                                                     ↳ {item.supplier_invoice_number || 'agrupada'}
                                                   </Badge>
                                                 </div>
                                               </TooltipTrigger>
                                               <TooltipContent>
                                                 <p className="text-xs">Esta línea está agrupada en la factura principal del proveedor.</p>
                                                 <p className="text-xs text-muted-foreground">Se pagará junto con ella.</p>
                                               </TooltipContent>
                                             </Tooltip>
                                           </TooltipProvider>
                                         ) : editingItem === item.id ? (
                                          <Input
                                            type="text"
                                            value={editingItemValues.invoice_link || item.invoice_link || ''}
                                            onChange={(e) => setEditingItemValues(prev => ({ ...prev, invoice_link: e.target.value }))}
                                            placeholder="URL de factura"
                                            className="h-8 text-sm border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                          />
                                        ) : (
                                            <div className="h-8 flex items-center justify-center gap-1">
                                              {item.invoice_link ? (
                                                <div className="flex items-center gap-1">
                                                  <a 
                                                    href={item.invoice_link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 underline text-sm truncate max-w-[80px]"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title={item.invoice_link.split('/').pop()}
                                                  >
                                                    {item.invoice_link.split('/').pop()?.substring(0, 12) || 'Ver factura'}
                                                  </a>
                                                  <button
                                                    onClick={async (e) => {
                                                      e.stopPropagation();
                                                      await supabase
                                                        .from('budget_items')
                                                        .update({ invoice_link: null })
                                                        .eq('id', item.id);
                                                      fetchBudgetItems();
                                                      toast({ title: 'Enlace de factura eliminado' });
                                                    }}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-0.5"
                                                    title="Eliminar enlace"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <>
                                                  <label className="cursor-pointer hover:bg-blue-100 p-1 rounded flex items-center gap-1 text-gray-500 hover:text-blue-600">
                                                    <Upload className="w-3 h-3" />
                                                    <input
                                                      type="file"
                                                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                      className="hidden"
                                                      onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        // Upload and link directly to this item, also save to Facturas folder
                                                        const result = await uploadInvoice(
                                                          file, 
                                                          [], 
                                                          bookingContext?.artistId, 
                                                          bookingContext?.bookingId,
                                                          item // Pass item for proper naming
                                                        );
                                                         if (result?.fileUrl) {
                                                           const { error: linkErr } = await supabase
                                                             .from('budget_items')
                                                             .update({ invoice_link: result.fileUrl })
                                                             .eq('id', item.id);
                                                           if (linkErr) {
                                                             console.error('Error linking invoice to item:', linkErr);
                                                             toast({
                                                               title: 'Factura subida pero no vinculada',
                                                               description: linkErr.message,
                                                               variant: 'destructive',
                                                             });
                                                           } else {
                                                             toast({
                                                               title: 'Factura vinculada',
                                                               description: file.name,
                                                             });
                                                           }
                                                           fetchBudgetItems();
                                                         }
                                                        e.target.value = '';
                                                      }}
                                                    />
                                                  </label>
                                                  <span 
                                                    className="text-gray-400 text-sm cursor-pointer hover:bg-blue-100 px-1 rounded"
                                                    onClick={() => startEditingItem(item)}
                                                  >
                                                    -
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                         )}
                                       </TableCell>
                                        
                                         {/* Acciones */}
                                        <TableCell className="p-2 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                             {editingItem === item.id ? (
                                               <>
                                                 <Button
                                                   onClick={saveItemEdits}
                                                   size="sm"
                                                   className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700 text-white"
                                                   title="Guardar cambios"
                                                 >
                                                   <Save className="w-3 h-3 text-white" />
                                                 </Button>
                                                  <Button
                                                    onClick={() => {
                                                      setEditingItem(null);
                                                      setEditingItemValues({});
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 w-6 p-0 hover:bg-gray-100 border-gray-300"
                                                    title="Cancelar edición"
                                                 >
                                                   <ArrowLeft className="w-3 h-3 text-gray-600" />
                                                 </Button>
                                              </>
                                            ) : (
                                               <>
                                                <div className="flex items-center gap-1" title={(item as any).is_provisional ? 'Marcar como real' : 'Marcar como provisional'}>
                                                  <Switch
                                                    checked={!!(item as any).is_provisional}
                                                    onCheckedChange={(checked) => {
                                                      supabase
                                                        .from('budget_items')
                                                        .update({ is_provisional: checked } as any)
                                                        .eq('id', item.id)
                                                        .then(() => fetchBudgetItems());
                                                    }}
                                                    className="h-4 w-7 data-[state=checked]:bg-amber-500 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                                                  />
                                                  {(item as any).is_provisional && <span className="text-[10px] text-amber-600 font-medium">Prov.</span>}
                                                </div>
                                                 <Button
                                                   onClick={() => startEditingItem(item)}
                                                   size="sm"
                                                   variant="ghost"
                                                   className="h-6 w-6 p-0 hover:bg-blue-100 text-blue-600"
                                                   title="Editar elemento"
                                                 >
                                                   <Edit className="w-3 h-3" />
                                                 </Button>
                                                 {item.invoice_group_parent_id ? (
                                                   <Button
                                                     onClick={() => unlinkFromInvoiceGroup({ itemId: item.id, onDone: fetchBudgetItems })}
                                                     size="sm"
                                                     variant="ghost"
                                                     className="h-6 w-6 p-0 hover:bg-purple-100 text-purple-700"
                                                     title="Desagrupar de la factura"
                                                   >
                                                     <Eraser className="w-3 h-3" />
                                                   </Button>
                                                 ) : (
                                                   <Button
                                                     onClick={() => setLinkInvoiceItem(item)}
                                                     size="sm"
                                                     variant="ghost"
                                                     className="h-6 w-6 p-0 hover:bg-purple-100 text-purple-700"
                                                     title={item.contact_id ? 'Agrupar en factura del proveedor' : 'Asigna un proveedor primero'}
                                                     disabled={!item.contact_id}
                                                   >
                                                     <Link2 className="w-3 h-3" />
                                                   </Button>
                                                 )}
                                                 {selectedItems.has(item.id) && (
                                                   <Button
                                                     onClick={() => deleteItem(item.id)}
                                                     size="sm"
                                                     variant="ghost"
                                                     className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                                                     title="Eliminar elemento"
                                                   >
                                                     <Trash2 className="w-3 h-3" />
                                                   </Button>
                                                 )}
                                               </>
                                            )}
                                          </div>
                                        </TableCell>
                                    </TableRow>
                                      );
                                  })}
                                </TableBody>
                              </Table>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                   </div>
                </div>
              </TabsContent>


              <TabsContent value="overview" className="flex-1 overflow-auto p-0 m-0">
                <div className="h-full p-6">
                  {/* Grid con gráfico y resumen por categorías - MOVED TO TOP */}
                  <div className="space-y-6 mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Gráfico circular de categorías */}
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5" />
                            Desglose por Categoría
                          </CardTitle>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant={chartViewMode === 'bars' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setChartViewMode('bars')}>
                                  <BarChart2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Barras</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant={chartViewMode === 'donut' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setChartViewMode('donut')}>
                                  <PieChartIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Donut</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant={chartViewMode === 'waterfall' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setChartViewMode('waterfall')}>
                                  <TrendingDown className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Cascada</TooltipContent></Tooltip>
                            </TooltipProvider>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* VISTA 1: BARRAS HORIZONTALES */}
                          {chartViewMode === 'bars' && (() => {
                            const barData = getCategoryBarData();
                            const maxTotal = Math.max(...barData.map(c => c.total), 1);
                            return (
                              <div className="space-y-2">
                                {barData.map(cat => {
                                  const IconComponent = iconMap[cat.icon as keyof typeof iconMap] || DollarSign;
                                  const totalPct = items.reduce((s, i) => s + (i.unit_price * (i.quantity || 1)), 0);
                                  const pct = totalPct > 0 ? ((cat.total / totalPct) * 100).toFixed(1) : '0';
                                  const exceeded = cat.budgetCap != null && cat.total > cat.budgetCap;
                                  return (
                                    <div key={cat.id} className="flex items-center gap-3 py-1.5 px-1 rounded hover:bg-muted/40 cursor-pointer group">
                                      <div className="flex items-center gap-1.5 w-[160px] shrink-0">
                                        <IconComponent className="h-4 w-4 text-primary shrink-0" />
                                        <span className="text-sm truncate">{cat.name}</span>
                                      </div>
                                      <div className="flex-1 relative">
                                        <div className={`h-5 rounded-full overflow-hidden ${exceeded ? 'bg-red-100 ring-1 ring-red-300' : 'bg-muted'}`}>
                                          <div className="h-full flex" style={{ width: `${(cat.total / maxTotal) * 100}%` }}>
                                            {cat.paid > 0 && (
                                              <div className="h-full bg-green-500" style={{ width: `${(cat.paid / cat.total) * 100}%` }} />
                                            )}
                                            {cat.confirmed > 0 && (
                                              <div className="h-full bg-gray-400" style={{ width: `${(cat.confirmed / cat.total) * 100}%` }} />
                                            )}
                                            {cat.provisional > 0 && (
                                              <div className="h-full bg-amber-400" style={{ width: `${(cat.provisional / cat.total) * 100}%` }} />
                                            )}
                                          </div>
                                        </div>
                                        {cat.budgetCap != null && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div
                                                  className="absolute top-0 h-full w-[2px] bg-red-600/70"
                                                  style={{ left: `${Math.min((cat.budgetCap / maxTotal) * 100, 100)}%` }}
                                                />
                                              </TooltipTrigger>
                                              <TooltipContent>Techo: €{cat.budgetCap.toLocaleString('es-ES')}</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap w-[90px] text-right">
                                        €{cat.total.toLocaleString('es-ES', { minimumFractionDigits: 0 })} · {pct}%
                                      </span>
                                    </div>
                                  );
                                })}
                                {barData.length > 0 && (
                                  <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground border-t">
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Pagado</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Comprometido</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Provisional</div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* VISTA 2: DONUT */}
                          {chartViewMode === 'donut' && (() => {
                            const chartData = getGroupedChartData();
                            const grandTotal = chartData.reduce((s, d) => s + d.value, 0);
                            const barData = getCategoryBarData();
                            const totalPaid = barData.reduce((s, c) => s + c.paid, 0);
                            const totalConfirmed = barData.reduce((s, c) => s + c.confirmed, 0);
                            const totalProvisional = barData.reduce((s, c) => s + c.provisional, 0);
                            const statusTotal = totalPaid + totalConfirmed + totalProvisional || 1;
                            return (
                              <div>
                                <div className="flex items-center gap-4 h-64">
                                  <div className="flex-1 h-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={chartData}
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={55}
                                          outerRadius={85}
                                          paddingAngle={2}
                                          dataKey="value"
                                        >
                                          {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                        </Pie>
                                        <RechartsTooltip
                                          formatter={(value: number, _name: string, props: any) => {
                                            const percentage = grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(1) : '0.0';
                                            const details = (props.payload as any)?._details as { name: string; value: number }[] | undefined;
                                            if (details) {
                                              const breakdown = details.map(d => `${d.name}: €${d.value.toLocaleString('es-ES', { minimumFractionDigits: 0 })}`).join(', ');
                                              return [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${breakdown})`, `Otros (${percentage}%)`];
                                            }
                                            return [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, `${props.payload.name} (${percentage}%)`];
                                          }}
                                          labelFormatter={() => ''}
                                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '14px' }}
                                        />
                                      </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                      <span className="text-lg font-bold">€{grandTotal.toLocaleString('es-ES', { minimumFractionDigits: 0 })}</span>
                                      <span className="text-xs text-muted-foreground">total gastado</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2 min-w-[140px] max-h-full overflow-y-auto">
                                    {chartData.map(d => {
                                      const details = (d as any)?._details as { name: string; value: number }[] | undefined;
                                      return (
                                        <Popover key={d.name}>
                                          <PopoverTrigger asChild disabled={!details}>
                                            <div className={`flex items-center gap-2 ${details ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1' : ''}`}>
                                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                              <div className="min-w-0">
                                                <p className="text-sm font-medium truncate text-foreground">{d.name}</p>
                                                <p className="text-xs text-muted-foreground">€{d.value.toLocaleString('es-ES', { minimumFractionDigits: 0 })} · {grandTotal > 0 ? ((d.value / grandTotal) * 100).toFixed(0) : 0}%</p>
                                              </div>
                                            </div>
                                          </PopoverTrigger>
                                          {details && (
                                            <PopoverContent side="left" className="w-52 p-3 text-xs space-y-1">
                                              <p className="font-semibold mb-1.5">Incluye:</p>
                                              {details.map(dd => (
                                                <div key={dd.name} className="flex justify-between">
                                                  <span className="text-muted-foreground truncate mr-2">{dd.name}</span>
                                                  <span>€{dd.value.toLocaleString('es-ES', { minimumFractionDigits: 0 })}</span>
                                                </div>
                                              ))}
                                            </PopoverContent>
                                          )}
                                        </Popover>
                                      );
                                    })}
                                  </div>
                                </div>
                                {/* Status distribution bar */}
                                <div className="mt-4 space-y-2">
                                  <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
                                    {totalPaid > 0 && <div className="h-full bg-green-500" style={{ width: `${(totalPaid / statusTotal) * 100}%` }} />}
                                    {totalConfirmed > 0 && <div className="h-full bg-gray-400" style={{ width: `${(totalConfirmed / statusTotal) * 100}%` }} />}
                                    {totalProvisional > 0 && <div className="h-full bg-amber-400" style={{ width: `${(totalProvisional / statusTotal) * 100}%` }} />}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Pagado €{totalPaid.toLocaleString('es-ES')}</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Comprometido €{totalConfirmed.toLocaleString('es-ES')}</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Provisional €{totalProvisional.toLocaleString('es-ES')}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* VISTA 3: CASCADA (WATERFALL) */}
                          {chartViewMode === 'waterfall' && (() => {
                            const barData = getCategoryBarData();
                            const capital = budgetAmount;
                            let running = capital;
                            const waterfallData: { name: string; base: number; value: number; fill: string; label: string }[] = [];
                            waterfallData.push({ name: 'Capital', base: 0, value: capital, fill: '#22c55e', label: `€${capital.toLocaleString('es-ES')}` });
                            barData.forEach(cat => {
                              running -= cat.total;
                              waterfallData.push({ name: cat.name, base: running, value: cat.total, fill: '#ef4444', label: `€${cat.total.toLocaleString('es-ES')}` });
                            });
                            const available = capital - barData.reduce((s, c) => s + c.total, 0);
                            waterfallData.push({
                              name: 'Disponible',
                              base: available >= 0 ? 0 : available,
                              value: Math.abs(available),
                              fill: available >= 0 ? '#22c55e' : '#ef4444',
                              label: `€${Math.abs(available).toLocaleString('es-ES')}`
                            });
                            const maxVal = Math.max(capital, ...waterfallData.map(d => d.base + d.value));
                            return (
                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={waterfallData} margin={{ top: 20, right: 10, bottom: 40, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                      dataKey="name"
                                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                      angle={-35}
                                      textAnchor="end"
                                      height={50}
                                      interval={0}
                                    />
                                    <YAxis hide domain={[Math.min(0, available), maxVal * 1.1]} />
                                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                                    {/* Invisible base bar */}
                                    <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
                                    {/* Visible value bar */}
                                    <Bar dataKey="value" stackId="a" radius={[3, 3, 0, 0]} isAnimationActive={true}>
                                      {waterfallData.map((entry, index) => (
                                        <Cell key={`wf-${index}`} fill={entry.fill} />
                                      ))}
                                    </Bar>
                                    <RechartsTooltip
                                      formatter={(value: number, name: string) => {
                                        if (name === 'base') return [null, null];
                                        return [`€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, ''];
                                      }}
                                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '12px' }}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                                {available < 0 && (
                                  <div className="text-center -mt-2">
                                    <Badge variant="destructive" className="text-[10px]">EXCEDIDO</Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>

                    {/* Tabla resumen por categorías */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Resumen por Categoría</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Categoría</TableHead>
                              <TableHead className="text-center">Nº Elementos</TableHead>
                              <TableHead className="text-center">Confirmado / Provisional</TableHead>
                              <TableHead className="text-right">Total (€)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const allData = getCategorySummaryData();
                              const nonEmpty = allData.filter(c => c.count > 0 || c.total > 0);
                              const empty = allData.filter(c => c.count === 0 && c.total === 0);
                              const visible = showEmptyCategories ? allData : nonEmpty;

                              return (
                                <>
                                  {visible.map((category) => {
                                    const IconComponent = iconMap[category.icon as keyof typeof iconMap] || DollarSign;
                                    return (
                                      <TableRow key={category.id} onClick={() => category.count > 0 && navigateToCategory(category.id)} className={category.count > 0 ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}>
                                        <TableCell>
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <IconComponent className="h-4 w-4 text-primary" />
                                              {category.name}
                                              {category.budgetCap != null && category.total > category.budgetCap && (
                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">⚠ Excedido</Badge>
                                              )}
                                            </div>
                                            {category.budgetCap != null && (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <div className="w-full max-w-[160px] ml-6">
                                                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <div
                                                          className={`h-full rounded-full transition-all ${
                                                            category.total / category.budgetCap > 1 ? 'bg-destructive' :
                                                            category.total / category.budgetCap >= 0.75 ? 'bg-amber-500' :
                                                            'bg-green-500'
                                                          }`}
                                                          style={{ width: `${Math.min((category.total / category.budgetCap) * 100, 100)}%` }}
                                                        />
                                                      </div>
                                                    </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    €{category.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} de €{category.budgetCap.toLocaleString('es-ES', { minimumFractionDigits: 2 })} máximo ({category.budgetCap > 0 ? ((category.total / category.budgetCap) * 100).toFixed(0) : 0}%)
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant="outline" className="text-sm">
                                            {category.count}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {category.count === 0 ? (
                                            <span className="text-muted-foreground text-xs">—</span>
                                          ) : category.allPaid ? (
                                            <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs">
                                              €{category.total.toLocaleString('es-ES', { minimumFractionDigits: 0 })} pagado
                                            </span>
                                          ) : (
                                            <div className="space-y-1">
                                              <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                                                <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs">
                                                  €{category.confirmed.toLocaleString('es-ES', { minimumFractionDigits: 0 })} conf.
                                                </span>
                                                {category.provisional > 0 && (
                                                  <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 text-xs">
                                                    €{category.provisional.toLocaleString('es-ES', { minimumFractionDigits: 0 })} prov.
                                                  </span>
                                                )}
                                              </div>
                                              {category.provisional > 0 && (
                                                <div className="h-[3px] w-full rounded-full overflow-hidden bg-gray-300">
                                                  <div
                                                    className="h-full bg-gray-300 float-left"
                                                    style={{ width: `${(category.confirmed / (category.confirmed + category.provisional)) * 100}%` }}
                                                  />
                                                  <div
                                                    className="h-full bg-amber-300 float-left"
                                                    style={{ width: `${(category.provisional / (category.confirmed + category.provisional)) * 100}%` }}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          <span className={category.total > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                                            €{category.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  {!showEmptyCategories && empty.length > 0 && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center py-1">
                                        <button
                                          onClick={() => setShowEmptyCategories(true)}
                                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          Mostrar {empty.length} categoría{empty.length !== 1 ? 's' : ''} vacía{empty.length !== 1 ? 's' : ''} ↓
                                        </button>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                  {showEmptyCategories && empty.length > 0 && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center py-1">
                                        <button
                                          onClick={() => setShowEmptyCategories(false)}
                                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          Ocultar categorías vacías ↑
                                        </button>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })()}
                            {/* Total row */}
                            {(() => {
                              const summaryData = getCategorySummaryData();
                              const totalElements = summaryData.reduce((sum, cat) => sum + cat.count, 0);
                              const totalAmount = summaryData.reduce((sum, cat) => sum + cat.total, 0);
                              const totalConfirmed = summaryData.reduce((sum, cat) => sum + cat.confirmed, 0);
                              const totalProvisional = summaryData.reduce((sum, cat) => sum + cat.provisional, 0);
                              
                              return (
                                <TableRow className="border-t-2 border-primary/20 bg-muted/30 font-semibold">
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calculator className="h-4 w-4 text-primary" />
                                      <span className="font-bold">TOTAL</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className="bg-primary text-primary-foreground">
                                      {totalElements}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="text-xs leading-tight font-semibold">
                                      <span>€{totalConfirmed.toLocaleString('es-ES', { minimumFractionDigits: 0 })} conf.</span>
                                      {totalProvisional > 0 && (
                                        <>
                                          <span className="text-muted-foreground mx-1">·</span>
                                          <span className="text-amber-500">€{totalProvisional.toLocaleString('es-ES', { minimumFractionDigits: 0 })} prov.</span>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary">
                                    €{totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                  </div>
                  
                   {/* Enhanced Budget Items View - MOVED BELOW CHARTS */}
                  <div className="mb-8">
                    <EnhancedBudgetItemsView budgetId={budget.id} />
                  </div>

                  {/* Resumen fiscal - colapsado por defecto */}
                  {(() => {
                    const totals = calculateGrandTotals();
                    return (
                      <Collapsible className="mb-8">
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1 py-2 w-full group">
                          <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                          <Calculator className="w-4 h-4" />
                          <span className="font-medium">Resumen fiscal</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Card className="mt-2">
                            <CardContent className="p-4">
                              <Table>
                                <TableBody>
                                  <TableRow>
                                    <TableCell className="font-medium text-muted-foreground">Total IVA soportado</TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">
                                      +€{totals.iva.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium text-muted-foreground">Total IRPF retenido</TableCell>
                                    <TableCell className="text-right font-semibold text-red-500">
                                      −€{totals.irpf.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow className="border-t-2">
                                    <TableCell className="font-bold">Total a transferir a proveedores</TableCell>
                                    <TableCell className="text-right font-bold text-primary">
                                      €{totals.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                              <p className="text-[11px] text-muted-foreground mt-3">
                                Neto + IVA − IRPF = importe que sale de la cuenta bancaria. El IVA soportado es recuperable si la empresa está dada de alta.
                              </p>
                            </CardContent>
                          </Card>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })()}
                </div>
               </TabsContent>

            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Vincular factura sin auto-match a una línea concreta */}
      <AttachInvoiceToItemDialog
        open={attachInvoiceDialog.open}
        onOpenChange={(open) => setAttachInvoiceDialog((prev) => ({ ...prev, open }))}
        fileUrl={attachInvoiceDialog.fileUrl}
        fileName={attachInvoiceDialog.fileName}
        items={items as any}
        budgetId={budget.id}
        categories={sortCategoriesWithPriority(budgetCategories).map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        hiddenCategoryIds={hiddenCategories}
        onUnhideCategory={(id) => toggleHideCategory(id, false)}
        onLinked={() => fetchBudgetItems()}
      />

      {/* Liquidar Facturas Dialog */}
      <LiquidarFacturasDialog
        open={showLiquidarDialog}
        onOpenChange={setShowLiquidarDialog}
        budgetId={budget.id}
        budgetArtistId={budget.artist_id}
        onSuccess={() => {
          fetchBudgetItems();
          toast({
            title: "Éxito",
            description: "Facturas liquidadas correctamente",
          });
        }}
      />

      {/* Dialog para añadir equipo */}
      <Dialog open={showLoadFromFormatDialog} onOpenChange={setShowLoadFromFormatDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Añadir equipo al presupuesto
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={loadDialogTab} onValueChange={(v) => setLoadDialogTab(v as 'formats' | 'team')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formats">
                <Database className="w-4 h-4 mr-2" />
                Desde formato
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users className="w-4 h-4 mr-2" />
                Miembros
              </TabsTrigger>
            </TabsList>

            <TabsContent value="formats" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Selecciona un formato de artista para cargar automáticamente los miembros del equipo.
              </p>
              
              {loadingFormats ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : availableFormats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay formatos disponibles</p>
                  <p className="text-xs mt-1">Crea un formato en la configuración del artista</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableFormats.map((format) => (
                    <Card 
                      key={format.id} 
                      className="cursor-pointer hover:border-primary transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{format.name}</p>
                            <p className="text-sm text-muted-foreground">{format.artist_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format.crew_count} miembros del equipo
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadCrewFromFormat(format.id, false)}
                              disabled={format.crew_count === 0}
                            >
                              Nacional
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadCrewFromFormat(format.id, true)}
                              disabled={format.crew_count === 0}
                            >
                              Internacional
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="team" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Selecciona miembros del equipo para añadirlos al presupuesto. Su rol será el concepto.
              </p>
              
              {loadingTeamMembers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay miembros del equipo disponibles</p>
                  <p className="text-xs mt-1">Añade miembros en Contactos o en el workspace</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedTeamMembers.includes(member.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => {
                        setSelectedTeamMembers(prev =>
                          prev.includes(member.id)
                            ? prev.filter(id => id !== member.id)
                            : [...prev, member.id]
                        );
                      }}
                    >
                      <Checkbox
                        checked={selectedTeamMembers.includes(member.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTeamMembers(prev =>
                            checked
                              ? [...prev, member.id]
                              : prev.filter(id => id !== member.id)
                          );
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        {member.role && (
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {member.type === 'workspace' ? 'Workspace' : 'Contacto'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {selectedTeamMembers.length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedTeamMembers.length} seleccionados
                  </p>
                  <Button onClick={addSelectedTeamMembersToBudget}>
                    Añadir al presupuesto
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowLoadFromFormatDialog(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: alerta de elementos añadidos a categoría oculta */}
      <Dialog open={!!hiddenCategoryAlert} onOpenChange={() => setHiddenCategoryAlert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-amber-400" />
              Elementos en categoría oculta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {hiddenCategoryAlert?.itemCount === 1
                ? 'Se ha añadido 1 elemento'
                : `Se han añadido ${hiddenCategoryAlert?.itemCount} elementos`}{' '}
              a la categoría{' '}
              <strong>"{hiddenCategoryAlert?.categoryName}"</strong>, que actualmente está oculta.
            </p>
            <p className="text-xs text-muted-foreground p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
              ⚠️ Los elementos existen y se incluyen en los totales del presupuesto, pero no son visibles en la vista principal.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setHiddenCategoryAlert(null)}>
              Mantener oculta
            </Button>
            <Button onClick={() => {
              if (hiddenCategoryAlert) {
                toggleHideCategory(hiddenCategoryAlert.categoryId, false);
                setHiddenCategoryAlert(null);
              }
            }}>
              Mostrar "{hiddenCategoryAlert?.categoryName}"
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>

      {/* Confirmation dialog for deleting item with retentions */}
      <AlertDialog open={!!pendingDeleteItem} onOpenChange={(open) => !open && setPendingDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retenciones asociadas</AlertDialogTitle>
            <AlertDialogDescription>
              Este elemento tiene <strong>{pendingDeleteItem?.retentionCount} retención(es) de IRPF</strong> registradas. 
              Al eliminarlo, también se eliminarán las retenciones asociadas de forma permanente.
              <br />
              <span className="text-destructive font-medium mt-1 block">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingDeleteItem) {
                  await executeDeleteItem(pendingDeleteItem.id);
                  setPendingDeleteItem(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar con retenciones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation dialog for bulk deleting items with retentions */}
      <AlertDialog open={!!pendingDeleteBulk} onOpenChange={(open) => !open && setPendingDeleteBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retenciones asociadas</AlertDialogTitle>
            <AlertDialogDescription>
              Los elementos seleccionados tienen <strong>{pendingDeleteBulk?.retentionCount} retención(es) de IRPF</strong> registradas. 
              Al eliminarlos, también se eliminarán las retenciones asociadas de forma permanente.
              <br />
              <span className="text-destructive font-medium mt-1 block">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingDeleteBulk) {
                  await executeDeleteBulk(pendingDeleteBulk.ids);
                  setPendingDeleteBulk(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar con retenciones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {linkInvoiceItem && (
        <LinkInvoiceGroupDialog
          open={!!linkInvoiceItem}
          onOpenChange={(o) => { if (!o) setLinkInvoiceItem(null); }}
          itemId={linkInvoiceItem.id}
          itemName={linkInvoiceItem.name}
          itemAmount={(linkInvoiceItem.quantity || 1) * (linkInvoiceItem.unit_price || 0)}
          budgetId={linkInvoiceItem.budget_id}
          contactId={linkInvoiceItem.contact_id || null}
          contactName={linkInvoiceItem.contacts?.name}
          onLinked={fetchBudgetItems}
        />
      )}
    </>
  );
}