import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useTracks } from '@/hooks/useReleases';
import { ReleaseBudgetContactField } from '@/components/releases/ReleaseBudgetContactField';
import { ProducerSelector, SingleProducerSelector, type ProducerRef } from '@/components/releases/ProducerSelector';
import { toast } from 'sonner';
import { format, subDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CalendarIcon, ChevronLeft, ChevronRight, Loader2, Plus, X, Check,
  Disc3, Music, Camera, Megaphone, Truck, UtensilsCrossed, BedDouble,
  Clapperboard, Package, ShieldAlert, Settings, Globe, GitMerge, Calculator, Blend, RotateCcw,
  CalendarCheck
} from 'lucide-react';
import type { Release, ReleaseMilestone } from '@/hooks/useReleases';
import { generateTimelineFromConfig, groupTasksByWorkflow, type ReleaseConfig } from '@/lib/releaseTimelineTemplates';

// ─── TERRITORY OPTIONS ────────────────────────────────────────────
const TERRITORY_GROUPS = [
  { label: 'Global', options: [{ value: 'GLOBAL', label: 'Global (todos los territorios)' }] },
  { label: 'Europa', options: [
    { value: 'ES', label: 'España' }, { value: 'FR', label: 'Francia' }, { value: 'DE', label: 'Alemania' },
    { value: 'IT', label: 'Italia' }, { value: 'GB', label: 'Reino Unido' }, { value: 'PT', label: 'Portugal' },
    { value: 'NL', label: 'Países Bajos' }, { value: 'BE', label: 'Bélgica' }, { value: 'SE', label: 'Suecia' },
    { value: 'NO', label: 'Noruega' }, { value: 'CH', label: 'Suiza' }, { value: 'AT', label: 'Austria' },
    { value: 'PL', label: 'Polonia' }, { value: 'IE', label: 'Irlanda' }, { value: 'DK', label: 'Dinamarca' },
    { value: 'FI', label: 'Finlandia' }, { value: 'GR', label: 'Grecia' }, { value: 'CZ', label: 'Rep. Checa' },
    { value: 'RO', label: 'Rumanía' }, { value: 'HU', label: 'Hungría' },
  ]},
  { label: 'Latinoamérica', options: [
    { value: 'MX', label: 'México' }, { value: 'AR', label: 'Argentina' }, { value: 'CO', label: 'Colombia' },
    { value: 'CL', label: 'Chile' }, { value: 'PE', label: 'Perú' }, { value: 'EC', label: 'Ecuador' },
    { value: 'UY', label: 'Uruguay' }, { value: 'BR', label: 'Brasil' }, { value: 'VE', label: 'Venezuela' },
    { value: 'CR', label: 'Costa Rica' }, { value: 'PA', label: 'Panamá' }, { value: 'DO', label: 'Rep. Dominicana' },
    { value: 'GT', label: 'Guatemala' }, { value: 'PY', label: 'Paraguay' }, { value: 'BO', label: 'Bolivia' },
  ]},
  { label: 'Norteamérica', options: [
    { value: 'US', label: 'Estados Unidos' }, { value: 'CA', label: 'Canadá' },
  ]},
  { label: 'Asia-Pacífico', options: [
    { value: 'JP', label: 'Japón' }, { value: 'KR', label: 'Corea del Sur' }, { value: 'AU', label: 'Australia' },
    { value: 'NZ', label: 'Nueva Zelanda' }, { value: 'IN', label: 'India' }, { value: 'CN', label: 'China' },
    { value: 'PH', label: 'Filipinas' }, { value: 'TH', label: 'Tailandia' },
  ]},
  { label: 'África y Oriente Medio', options: [
    { value: 'MA', label: 'Marruecos' }, { value: 'ZA', label: 'Sudáfrica' }, { value: 'AE', label: 'EAU' },
    { value: 'EG', label: 'Egipto' }, { value: 'NG', label: 'Nigeria' }, { value: 'IL', label: 'Israel' },
    { value: 'SA', label: 'Arabia Saudí' }, { value: 'TR', label: 'Turquía' },
  ]},
];

const ALL_TERRITORIES = TERRITORY_GROUPS.flatMap(g => g.options);

// ─── SERVICE OPTIONS ──────────────────────────────────────────────
const SERVICE_OPTIONS = [
  'Grabación', 'Mezcla', 'Mastering', 'Videoclip', 'Shooting', 'PR Nacional',
  'PR Internacional', 'RRSS / Contenidos', 'Diseño gráfico', 'Distribución',
  'Fabricación física', 'Stage / Residencia', 'Evento de lanzamiento',
];

// ─── MASTER TYPE OPTIONS ───────────────────────────────────────────
const MASTER_TYPE_OPTIONS = [
  { value: 'estereo',      label: 'Estéreo',              desc: 'Streaming & descarga digital (estándar universal)' },
  { value: 'vinilo',       label: 'Vinilo',                desc: 'Corte a lacquer, ecualización RIAA para prensado' },
  { value: 'atmos',        label: 'Dolby Atmos',           desc: 'Spatial Audio — Apple Music, Amazon, Tidal' },
  { value: 'stem',         label: 'Stem Master',           desc: 'Masters por stems separados (remix / sync)' },
  { value: 'cd',           label: 'CD (Red Book)',         desc: 'Prensado físico en CD, estándar ISO 9660' },
  { value: 'hires',        label: 'Hi-Res (24-bit/96kHz)', desc: 'Alta resolución — Qobuz, Tidal HiFi, Apple Lossless' },
  { value: 'instrumental', label: 'Instrumental / Karaoke', desc: 'Versión sin voz, obligatorio para sync y muchas distribuidoras' },
  { value: 'surround51',   label: '5.1 Surround',          desc: 'Mezcla surround para Blu-ray y contenido audiovisual' },
  { value: 'cassette',     label: 'Casete',                desc: 'Edición física en casete (nichos y reediciones)' },
  { value: 'tbd',          label: 'Por determinar',        desc: '' },
];

const FORMATOS_FISICOS = [
  { value: 'vinilo',       label: 'Vinilo (LP/12")' },
  { value: 'vinilo_doble', label: 'Vinilo doble (2xLP)' },
  { value: 'cd',           label: 'CD' },
  { value: 'deluxe',       label: 'Edición Deluxe' },
  { value: 'cassete',      label: 'Casete' },
  { value: 'otros',        label: 'Otros formatos' },
];

// ─── VERSION OPTIONS ───────────────────────────────────────────────
const VERSION_OPTIONS = [
  { value: 'original',     label: 'Original' },
  { value: 'explicit',     label: 'Explicit' },
  { value: 'clean',        label: 'Clean (Radio Edit)' },
  { value: 'instrumental', label: 'Instrumental' },
  { value: 'acustica',     label: 'Acústica' },
  { value: 'live',         label: 'Live / En directo' },
  { value: 'remix',        label: 'Remix oficial' },
  { value: 'extended',     label: 'Extended Mix (DJ Edit)' },
  { value: 'deluxe',       label: 'Deluxe / Edición especial' },
  { value: 'remaster',     label: 'Remasterizado' },
  { value: 'ep',           label: 'EP' },
  { value: 'otro',         label: 'Otro' },
];

// ─── PERIODOS PR ──────────────────────────────────────────────────
const PERIODOS_PR = [
  { value: '1m',     label: '1 mes' },
  { value: '2m',     label: '2 meses' },
  { value: '3m',     label: '3 meses' },
  { value: '6m',     label: '6 meses' },
  { value: 'puntual', label: 'Campaña puntual' },
];

interface CreateReleaseBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  release: Release | null;
  trackCount: number;
}

// ─── CATEGORY MAP ──────────────────────────────────────────────────
const RELEASE_BUDGET_CATEGORIES = [
  { key: 'grabacion', name: 'Grabación', icon: 'Music', items: [
    'Producción (productor/es)', 'Ingeniería de grabación', 'Músicos adicionales',
    'Reparaciones / mantenimiento', 'Alquiler de estudio', 'Alquiler de equipo de grabación',
    'Ingeniería / pre / post / edición', 'Mezcla', 'Master'
  ]},
  { key: 'produccion', name: 'Producción', icon: 'Settings', items: [
    'Project management', 'Cuidados / logística personal', 'Making-of (grabación)',
    'Edición de cápsulas / piezas', 'Imprevistos por proyecto'
  ]},
  { key: 'diseno', name: 'Diseño (universo visual)', icon: 'Camera', items: [
    'Dirección de arte', 'Diseño gráfico (pack)', 'Shooting + conceptualización',
    'Piezas visuales (videoclips / visualizers / lyric videos)',
    'Cápsulas promocionales RRSS', 'Vestuario / estilismo'
  ]},
  { key: 'stage', name: 'Stage (residencia técnica)', icon: 'Clapperboard', items: [
    'Tour management', 'Técnica de sonido', 'Dirección creativa',
    'Diseño de luces', 'Vestuario / estilismo', 'Alquiler de material técnico',
    'Escenografía', 'Alquiler de espacio', 'Dietas / hospitality'
  ]},
  { key: 'transporte', name: 'Transporte', icon: 'Car', items: [
    'Combustible', 'Alquiler de vehículo', 'Transporte público / taxi / avión'
  ]},
  { key: 'dietas', name: 'Dietas', icon: 'UtensilsCrossed', items: [
    'Comidas', 'Cenas', 'Mantenimiento / extras'
  ]},
  { key: 'hospedaje', name: 'Hospedaje', icon: 'Bed', items: [
    'Alojamiento', 'Habitación extra', 'Apartamento extra'
  ]},
  { key: 'pr_marketing', name: 'PR & Marketing', icon: 'Megaphone', items: [
    'Sesión de fotos', 'Agencia / PR + pitching (nacional)',
    'Agencia / PR + pitching (internacional)', 'Contenidos / gestión RRSS',
    'Ads', 'Playlisting', 'Radio', 'Influencers / UGC', 'EPK / press kit',
    'Evento de lanzamiento'
  ]},
  { key: 'distribucion', name: 'Distribución & Admin', icon: 'FileText', items: [
    'Distribución / altas / fees', 'Content ID / canales oficiales',
    'Registros (UPC/ISRC)', 'Legal (contratos / cesiones)', 'Contabilidad / gestión'
  ]},
  { key: 'fabricacion', name: 'Fabricación & logística', icon: 'Package', items: [
    'Fabricación (vinilo / CD)', 'Pruebas / test', 'Packaging extra',
    'Envíos / logística', 'Fulfillment'
  ]},
  { key: 'contingencia', name: 'Contingencia', icon: 'ShieldAlert', items: [
    'Reserva / margen de imprevistos'
  ]},
];

// ─── TOGGLE CONFIG ─────────────────────────────────────────────────
// Maps toggle keys to which category keys they activate
const TOGGLE_CATEGORY_MAP: Record<string, string[]> = {
  // Always-on categories (grabacion is always present)
  producers: ['grabacion'],
  externalMix: ['grabacion'],
  master: ['grabacion'],
  // Visual / production
  videoclips: ['diseno'],
  capsulasRRSS: ['diseno'],
  shooting: ['diseno'],
  vestuario: ['diseno'],
  makingOf: ['produccion'],
  edicionCapsulas: ['produccion'],
  // Stage
  stage: ['stage'],
  // PR
  prNacional: ['pr_marketing'],
  prInternacional: ['pr_marketing'],
  gestionRRSS: ['pr_marketing'],
  // Logistics
  transporte: ['transporte'],
  dietas: ['dietas'],
  hospedaje: ['hospedaje'],
  // Physical
  fisico: ['fabricacion'],
};

type Step = 'metadata' | 'dates' | 'variables';

export default function CreateReleaseBudgetDialog({
  open, onOpenChange, onSuccess, release, trackCount
}: CreateReleaseBudgetDialogProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>('metadata');
  const [loading, setLoading] = useState(false);
  const { data: existingTracks = [] } = useTracks(release?.id);

  // ─── Metadata ────────────────────────────────────────────────────
  const [budgetName, setBudgetName] = useState('');
  const [releaseType, setReleaseType] = useState<string>(release?.type || 'single');
  const [version, setVersion] = useState<string>('original');
  const [territories, setTerritories] = useState<string[]>(['ES']);
  const [labelContactId, setLabelContactId] = useState<string | undefined>(undefined);
  const [distributionContactId, setDistributionContactId] = useState<string | undefined>(undefined);
  const [estado, setEstado] = useState('produccion');
  const [services, setServices] = useState<string[]>([]);
  const [ownerContactId, setOwnerContactId] = useState<string | undefined>(undefined);
  const [notasInternas, setNotasInternas] = useState('');

  // ─── Dates ───────────────────────────────────────────────────────
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(
    release?.release_date ? new Date(release.release_date) : undefined
  );
  const [physicalDate, setPhysicalDate] = useState<Date | undefined>();
  const [singles, setSingles] = useState<{ title?: string; trackId?: string; isNew?: boolean; date?: Date }[]>([]);
  const [autoDeadlines, setAutoDeadlines] = useState(true);

  // ─── Cronograma integration ─────────────────────────────────────
  const [existingMilestones, setExistingMilestones] = useState<ReleaseMilestone[]>([]);
  const [deadlineStrategy, setDeadlineStrategy] = useState<'cronograma' | 'autocalcular' | 'mezclar'>('autocalcular');
  const hasCronograma = existingMilestones.length > 0;

  // Extended deadline offsets aligned with cronograma tasks
  const EXTENDED_DEADLINE_OFFSETS: { key: string; name: string; days: number; milestoneTitle: string }[] = [
    { key: 'grabacion', name: 'Grabación', days: 70, milestoneTitle: 'Grabación' },
    { key: 'mezcla', name: 'Mezcla', days: 55, milestoneTitle: 'Mezcla' },
    { key: 'masters', name: 'Masters', days: 45, milestoneTitle: 'Mastering' },
    { key: 'arte', name: 'Arte', days: 42, milestoneTitle: 'Artwork Final' },
    { key: 'entregaDSP', name: 'Entrega DSP', days: 42, milestoneTitle: 'Entrega a Distribuidora' },
    { key: 'preSave', name: 'Pre Save', days: 28, milestoneTitle: 'Pre-save Activo' },
    { key: 'anuncio', name: 'Anuncio', days: 14, milestoneTitle: 'Focus Track / Anuncios' },
    { key: 'salida', name: 'Salida Digital', days: 0, milestoneTitle: 'Salida Digital' },
  ];

  // Compute resolved deadlines based on strategy
  const getResolvedDeadlines = () => {
    if (!releaseDate) return [];
    return EXTENDED_DEADLINE_OFFSETS.map(offset => {
      const calculatedDate = subDays(releaseDate, offset.days);
      const milestone = existingMilestones.find(m => m.title === offset.milestoneTitle);
      const cronogramaDate = milestone?.due_date ? new Date(milestone.due_date) : null;

      let finalDate: Date;
      let source: 'cronograma' | 'calculado';

      switch (deadlineStrategy) {
        case 'cronograma':
          finalDate = cronogramaDate || calculatedDate;
          source = cronogramaDate ? 'cronograma' : 'calculado';
          break;
        case 'mezclar':
          finalDate = cronogramaDate || calculatedDate;
          source = cronogramaDate ? 'cronograma' : 'calculado';
          break;
        case 'autocalcular':
        default:
          finalDate = calculatedDate;
          source = 'calculado';
          break;
      }

      return {
        key: offset.key,
        name: offset.name,
        calculatedDate,
        cronogramaDate,
        finalDate,
        source,
        milestoneStatus: milestone?.status || null,
      };
    });
  };

  // Legacy simple offsets (kept for backward compat in metadata)
  const deadlineOffsets = {
    masters: 45,
    arte: 42,
    pitchDSP: 28,
    anuncio: 14,
    preSave: 28,
  };

  // ─── Variables (toggles) ─────────────────────────────────────────
  const [nTracks, setNTracks] = useState(trackCount || 1);
  const [producers, setProducers] = useState<ProducerRef[]>([]);
  const [includesMix, setIncludesMix] = useState(true);
  const [externalMix, setExternalMix] = useState(false);
  const [externalMixEngineer, setExternalMixEngineer] = useState<ProducerRef | null>(null);
  const [masterTypes, setMasterTypes] = useState<string[]>(['estereo']);
  const [nVideoclips, setNVideoclips] = useState(0);
  const [nCapsulasRRSS, setNCapsulasRRSS] = useState(0);
  const [capsulasManuales, setCapsulasManuales] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [shootingContratado, setShootingContratado] = useState(false);
  const [vestuario, setVestuario] = useState(false);
  const [vestuarioContratado, setVestuarioContratado] = useState(false);
  const [makingOf, setMakingOf] = useState(false);
  const [makingOfContratado, setMakingOfContratado] = useState(false);
  const [edicionCapsulas, setEdicionCapsulas] = useState(false);
  const [edicionCapsulasCont, setEdicionCapsulasCont] = useState(false);
  const [stage, setStage] = useState(false);
  const [stageContratado, setStageContratado] = useState(false);
  const [stageDays, setStageDays] = useState(1);
  const [prNacional, setPrNacional] = useState(false);
  const [prNacionalContratado, setPrNacionalContratado] = useState(false);
  const [prNacionalProveedor, setPrNacionalProveedor] = useState<ProducerRef | null>(null);
  const [prNacionalCoste, setPrNacionalCoste] = useState(0);
  const [prInternacional, setPrInternacional] = useState(false);
  const [prInternacionalCont, setPrInternacionalCont] = useState(false);
  const [prIntProveedor, setPrIntProveedor] = useState<ProducerRef | null>(null);
  const [prIntCoste, setPrIntCoste] = useState(0);
  const [gestionRRSS, setGestionRRSS] = useState(false);
  const [gestionRRSSCont, setGestionRRSSCont] = useState(false);
  const [rrssProveedor, setRrssProveedor] = useState<ProducerRef | null>(null);
  const [rrssCoste, setRrssCoste] = useState(0);
  const [transporte, setTransporte] = useState(false);
  const [transporteCont, setTransporteCont] = useState(false);
  const [dietas, setDietas] = useState(false);
  const [dietasCont, setDietasCont] = useState(false);
  const [hospedaje, setHospedaje] = useState(false);
  const [hospedajeCont, setHospedajeCont] = useState(false);
  const [fisico, setFisico] = useState(false);
  const [fisicoCont, setFisicoCont] = useState(false);
  const [fisicoFormatos, setFisicoFormatos] = useState<string[]>([]);
  const [contingencia, setContingencia] = useState([10]);
  // ─── New states ────────────────────────────────────────────────────────────
  const [masterEngineers, setMasterEngineers] = useState<Record<string, ProducerRef | null>>({});
  const [visualActivo, setVisualActivo] = useState(true);
  const [prNacionalPeriodo, setPrNacionalPeriodo] = useState('');
  const [prInternacionalPeriodo, setPrInternacionalPeriodo] = useState('');
  const [rrssPeriodo, setRrssPeriodo] = useState('');
  const [logisticaActiva, setLogisticaActiva] = useState(false);

  // Reset on open + fetch milestones
  useEffect(() => {
    if (open && release) {
      setBudgetName(`Presupuesto - ${release.title}`);
      setReleaseType(release.type || 'single');
      setLabelContactId(undefined);
      setNTracks(trackCount || 1);
      setReleaseDate(release.release_date ? new Date(release.release_date) : undefined);
      setStep('metadata');
      setServices([]);

      // Fetch existing milestones for this release
      supabase
        .from('release_milestones')
        .select('*')
        .eq('release_id', release.id)
        .order('due_date', { ascending: true, nullsFirst: true })
        .then(({ data }) => {
          const milestones = (data || []) as ReleaseMilestone[];
          setExistingMilestones(milestones);
          setDeadlineStrategy(milestones.length > 0 ? 'cronograma' : 'autocalcular');
          setAutoDeadlines(milestones.length === 0);
        });
    }
  }, [open, release, trackCount]);

  // ─── Auto-calc cápsulas RRSS = videoclips × 3 ───────────────────
  useEffect(() => {
    if (!capsulasManuales) {
      setNCapsulasRRSS(nVideoclips * 3);
    }
  }, [nVideoclips, capsulasManuales]);

  // ─── Determine which categories are active ───────────────────────
  const getActiveCategories = (): string[] => {
    const active = new Set<string>();
    // Grabación is always active
    active.add('grabacion');
    // Producción is always active (project management)
    active.add('produccion');
    // Distribución is always active
    active.add('distribucion');
    // Contingencia is always active
    active.add('contingencia');

    if (visualActivo && (nVideoclips > 0 || nCapsulasRRSS > 0 || shooting || vestuario)) active.add('diseno');
    if (stage) active.add('stage');
    if (prNacional || prInternacional || gestionRRSS) active.add('pr_marketing');
    if (logisticaActiva && transporte) active.add('transporte');
    if (logisticaActiva && dietas) active.add('dietas');
    if (logisticaActiva && hospedaje) active.add('hospedaje');
    if (fisico) active.add('fabricacion');

    return Array.from(active);
  };

  // ─── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!release || !profile?.user_id) return;
    setLoading(true);

    try {
      const resolvedDeadlines = getResolvedDeadlines();
      const metadata = {
        release_type: releaseType,
        version,
        territories,
        label_contact_id: labelContactId || null,
        distribution_contact_id: distributionContactId || null,
        owner_contact_id: ownerContactId || null,
        estado,
        services,
        release_date_digital: releaseDate?.toISOString() || null,
        release_date_physical: physicalDate?.toISOString() || null,
        singles: singles.map(s => ({ title: s.title, trackId: s.trackId, date: s.date?.toISOString() })),
        auto_deadlines: autoDeadlines,
        deadline_strategy: hasCronograma ? deadlineStrategy : 'autocalcular',
        deadlines: resolvedDeadlines.map(d => ({
          name: d.name,
          date: d.finalDate.toISOString(),
          source: d.source,
        })),
        variables: {
          n_tracks: nTracks,
          producers,
          includes_mix: includesMix,
          external_mix: externalMix,
          external_mix_engineer: externalMixEngineer,
          master_types: masterTypes,
          master_engineers: masterEngineers,
          visual_activo: visualActivo,
          n_videoclips: nVideoclips,
          n_capsulas_rrss: nCapsulasRRSS,
          shooting, shooting_contratado: shootingContratado,
          vestuario, vestuario_contratado: vestuarioContratado,
          making_of: makingOf, making_of_contratado: makingOfContratado,
          edicion_capsulas: edicionCapsulas, edicion_capsulas_contratado: edicionCapsulasCont,
          stage, stage_contratado: stageContratado, stage_days: stageDays,
          pr_nacional: prNacional, pr_nacional_contratado: prNacionalContratado,
          pr_nacional_proveedor: prNacionalProveedor, pr_nacional_coste: prNacionalCoste,
          pr_nacional_periodo: prNacionalPeriodo,
          pr_internacional: prInternacional, pr_internacional_contratado: prInternacionalCont,
          pr_int_proveedor: prIntProveedor, pr_int_coste: prIntCoste,
          pr_internacional_periodo: prInternacionalPeriodo,
          gestion_rrss: gestionRRSS, gestion_rrss_contratado: gestionRRSSCont,
          rrss_proveedor: rrssProveedor, rrss_coste: rrssCoste,
          rrss_periodo: rrssPeriodo,
          logistica_activa: logisticaActiva,
          transporte, transporte_contratado: transporteCont,
          dietas, dietas_contratado: dietasCont,
          hospedaje, hospedaje_contratado: hospedajeCont,
          fisico, fisico_contratado: fisicoCont, fisico_formatos: fisicoFormatos,
          contingencia_pct: contingencia[0],
        },
      };

      // 1. Create budget
      const { data: newBudget, error: budgetError } = await (supabase
        .from('budgets')
        .insert({
          name: budgetName,
          type: 'produccion_musical',
          artist_id: release.artist_id,
          release_id: release.id,
          internal_notes: notasInternas,
          fee: 0,
          created_by: profile.user_id,
          metadata,
        } as any)
        .select()
        .single());

      if (budgetError) throw budgetError;
      const budgetId = (newBudget as any).id;

      // 2. Create categories and items
      const activeKeys = getActiveCategories();
      const categoriesToCreate = RELEASE_BUDGET_CATEGORIES.filter(c => activeKeys.includes(c.key));

      for (let i = 0; i < categoriesToCreate.length; i++) {
        const cat = categoriesToCreate[i];

        // Create or get category
        const { data: existingCat } = await supabase
          .from('budget_categories')
          .select('id')
          .eq('name', cat.name)
          .maybeSingle();

        let categoryId: string;
        if (existingCat?.id) {
          categoryId = existingCat.id;
        } else {
          const { data: newCat, error: catError } = await supabase
            .from('budget_categories')
            .insert({
              name: cat.name,
              icon_name: cat.icon,
              created_by: profile.user_id,
              sort_order: i,
            })
            .select('id')
            .single();
          if (catError) throw catError;
          categoryId = newCat.id;
        }

        // Filter items based on active toggles
        const itemsToCreate = getFilteredItems(cat);

        if (itemsToCreate.length === 0) continue;

        // Build budget_items
        const budgetItems = itemsToCreate.map(itemName => {
          const itemData: any = {
            budget_id: budgetId,
            category_id: categoryId,
            category: cat.name,
            name: itemName,
            quantity: getDefaultQuantity(cat.key, itemName),
            unit_price: getDefaultPrice(cat.key, itemName),
            iva_percentage: getDefaultIVA(cat.key),
            irpf_percentage: getDefaultIRPF(cat.key, itemName),
            is_attendee: false,
            billing_status: 'pendiente',
            observations: getDefaultObservations(cat.key, itemName),
          };
          return itemData;
        });

        const { error: itemsError } = await supabase
          .from('budget_items')
          .insert(budgetItems);

        if (itemsError) throw itemsError;
      }

      // ─── 3. Sync Tracks ──────────────────────────────────────────
      let tracksAdded = 0;
      let tracksWarning = false;

      // Insert new tracks from singles that have a new title
      let nextTrackNumber = existingTracks.length + 1;
      for (const single of singles) {
        if (single.isNew && single.title && !single.trackId) {
          const { error: singleTrackError } = await supabase.from('tracks').insert({
            release_id: release.id,
            title: single.title,
            track_number: nextTrackNumber++,
          });
          if (!singleTrackError) tracksAdded++;
        }
      }

      if (nTracks > 0) {
        // Re-fetch current tracks after singles insertion
        const { data: currentTracks } = await supabase
          .from('tracks')
          .select('id, track_number')
          .eq('release_id', release.id)
          .order('track_number');

        const currentCount = currentTracks?.length || 0;

        if (nTracks > currentCount) {
          // Insert missing tracks
          const tracksToInsert = [];
          for (let tn = currentCount + 1; tn <= nTracks; tn++) {
            tracksToInsert.push({
              release_id: release.id,
              title: `Canción ${tn}`,
              track_number: tn,
            });
          }
          const { error: tracksError } = await supabase.from('tracks').insert(tracksToInsert);
          if (!tracksError) {
            tracksAdded += tracksToInsert.length;
          }
        } else if (nTracks < currentCount) {
          tracksWarning = true;
        }
      }

      // ─── 4. Sync Milestones / Generate Cronograma ────────────────
      let milestonesCreated = 0;

      // Check if cronograma already has data
      const { data: existingMilestonesCheck } = await supabase
        .from('release_milestones')
        .select('id')
        .eq('release_id', release.id)
        .limit(1);

      const cronogramaYaExiste = (existingMilestonesCheck?.length || 0) > 0;

      if (!cronogramaYaExiste && releaseDate) {
        // Build ReleaseConfig from budget data
        const config: ReleaseConfig = {
          releaseDate,
          physicalDate: physicalDate || null,
          numSongs: nTracks || 1,
          numSingles: singles.length,
          hasVideo: nVideoclips > 0,
          hasPhysical: fisico === true,
          // Pass exact single dates so the cronograma uses real dates, not generic offsets
          singleDates: singles
            .filter(s => s.date)
            .map(s => ({
              name: s.title || undefined,
              date: s.date!,
            })),
        };

        // Generate full timeline using the same function as the wizard
        const generatedTasks = generateTimelineFromConfig(config);
        const groupedTasks = groupTasksByWorkflow(generatedTasks);
        const numWorkflows = Object.keys(groupedTasks).length;

        // Build milestones in the same format that ReleaseCronograma.tsx expects
        const milestonesToInsert = generatedTasks.map((task, index) => ({
          release_id: release.id,
          title: task.name,
          due_date: format(task.startDate, 'yyyy-MM-dd'),
          status: 'pending',
          category: task.workflowId,
          sort_order: index,
          metadata: {
            estimatedDays: task.estimatedDays,
            anchoredTo: task.anchoredTo || null,
            customStartDate: null,
            subtasks: null,
            responsible_ref: null,
          },
        }));

        if (milestonesToInsert.length > 0) {
          const { error: msError } = await supabase
            .from('release_milestones')
            .insert(milestonesToInsert as any);
          if (!msError) milestonesCreated = milestonesToInsert.length;
        }
      }

      // ─── 5. Summary toast ────────────────────────────────────────
      const summaryLines: string[] = [];
      summaryLines.push(`✓ Presupuesto creado con ${activeKeys.length} categorías`);
      if (milestonesCreated > 0) summaryLines.push(`✓ Cronograma generado automáticamente (${milestonesCreated} tareas)`);
      if (tracksAdded > 0) summaryLines.push(`✓ ${tracksAdded} canción${tracksAdded !== 1 ? 'es' : ''} añadida${tracksAdded !== 1 ? 's' : ''} en Créditos & Audio`);
      if (tracksWarning) summaryLines.push(`⚠ El release tiene más tracks reales que los indicados en el presupuesto`);

      toast.success(summaryLines[0], {
        description: summaryLines.slice(1).join('\n') || undefined,
        duration: summaryLines.length > 1 ? 6000 : 3000,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating release budget:', error);
      toast.error('Error al crear el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  // ─── Item filtering based on toggles ─────────────────────────────
  const getFilteredItems = (cat: typeof RELEASE_BUDGET_CATEGORIES[number]): string[] => {
    switch (cat.key) {
      case 'grabacion': {
        const items = ['Producción (productor/es)', 'Ingeniería de grabación', 'Alquiler de estudio'];
        if (!includesMix || externalMix) items.push('Mezcla');
        items.push('Master');
        return items;
      }
      case 'produccion': {
        const items = ['Project management'];
        if (makingOf) items.push('Making-of (grabación)');
        if (edicionCapsulas) items.push('Edición de cápsulas / piezas');
        items.push('Imprevistos por proyecto');
        return items;
      }
      case 'diseno': {
        const items: string[] = [];
        items.push('Dirección de arte', 'Diseño gráfico (pack)');
        if (shooting) items.push('Shooting + conceptualización');
        if (nVideoclips > 0) items.push('Piezas visuales (videoclips / visualizers / lyric videos)');
        if (nCapsulasRRSS > 0) items.push('Cápsulas promocionales RRSS');
        if (vestuario) items.push('Vestuario / estilismo');
        return items;
      }
      case 'stage':
        return stage ? cat.items : [];
      case 'pr_marketing': {
        const items: string[] = [];
        if (shooting) items.push('Sesión de fotos');
        if (prNacional) items.push('Agencia / PR + pitching (nacional)');
        if (prInternacional) items.push('Agencia / PR + pitching (internacional)');
        if (gestionRRSS) items.push('Contenidos / gestión RRSS');
        // Always include these optional items as rows
        items.push('Ads', 'Playlisting', 'EPK / press kit');
        return items;
      }
      default:
        return cat.items;
    }
  };

  const getDefaultQuantity = (catKey: string, itemName: string): number => {
    if (itemName.includes('videoclip') || itemName.includes('Piezas visuales')) return nVideoclips || 1;
    if (itemName.includes('Cápsulas')) return nCapsulasRRSS || 1;
    if (catKey === 'stage') return stageDays || 1;
    return 1;
  };

  const getDefaultPrice = (catKey: string, itemName: string): number => {
    if (itemName.includes('PR + pitching (nacional)')) return prNacionalCoste;
    if (itemName.includes('PR + pitching (internacional)')) return prIntCoste;
    if (itemName.includes('gestión RRSS')) return rrssCoste;
    return 0;
  };

  const getDefaultIVA = (catKey: string): number => {
    return 21; // Default Spain IVA
  };

  const getDefaultIRPF = (catKey: string, itemName: string): number => {
    if (['grabacion', 'produccion'].includes(catKey)) return 15;
    return 0;
  };

  const getDefaultObservations = (catKey: string, itemName: string): string => {
    if (itemName.includes('PR + pitching (nacional)') && prNacionalProveedor) return `Proveedor: ${prNacionalProveedor.name}`;
    if (itemName.includes('PR + pitching (internacional)') && prIntProveedor) return `Proveedor: ${prIntProveedor.name}`;
    if (itemName.includes('Master')) {
      const labels = masterTypes.map(v => MASTER_TYPE_OPTIONS.find(o => o.value === v)?.label || v);
      return labels.length ? `Tipos: ${labels.join(', ')}` : '';
    }
    if (itemName.includes('Producción (productor')) {
      if (!producers.length) return '';
      return `Productor/es: ${producers.map(p => p.name).join(' & ')}`;
    }
    return '';
  };

  // ─── Navigation ──────────────────────────────────────────────────
  const steps: Step[] = ['metadata', 'dates', 'variables'];
  const stepLabels = { metadata: 'Cabecera', dates: 'Fechas', variables: 'Variables' };
  const currentIndex = steps.indexOf(step);

  const handleClose = () => {
    setStep('metadata');
    onOpenChange(false);
  };

  // ─── Date picker helper ──────────────────────────────────────────
  const DatePicker = ({ value, onChange, label: dateLabel, defaultMonth, highlightDate }: { value?: Date; onChange: (d?: Date) => void; label: string; defaultMonth?: Date; highlightDate?: Date }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{dateLabel}</Label>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? format(value, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-[300] bg-popover border border-border shadow-lg pointer-events-auto"
          align="start"
          avoidCollisions={false}
          style={{ pointerEvents: 'auto' }}
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className="p-3 pointer-events-auto"
            defaultMonth={defaultMonth}
            modifiers={{ digitalRelease: highlightDate ? [highlightDate] : [] }}
            modifiersClassNames={{ digitalRelease: "bg-violet-500/20 text-violet-700 dark:text-violet-300 font-semibold rounded-md ring-1 ring-violet-400/50" }}
          />
        </PopoverContent>
      </Popover>
      {highlightDate && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-primary/40 shrink-0" />
          Fecha digital: {format(highlightDate, "dd MMM yyyy", { locale: es })}
        </p>
      )}
    </div>
  );

  // ─── Toggle row helper ───────────────────────────────────────────
  // `contracted` / `onContractedChange`: optional second toggle "Nosotros lo ejecutamos"
  const ToggleRow = ({ label: toggleLabel, checked, onChange, contracted, onContractedChange, children }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    contracted?: boolean;
    onContractedChange?: (v: boolean) => void;
    children?: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Exists toggle */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Switch checked={checked} onCheckedChange={onChange} />
          <Label className="text-sm cursor-pointer truncate" onClick={() => onChange(!checked)}>{toggleLabel}</Label>
        </div>
        {/* Contracted toggle — only shown when element exists */}
        {onContractedChange && checked && (
          <div className={cn(
            "flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border transition-colors",
            contracted
              ? "bg-primary/10 border-primary/30"
              : "bg-muted border-border"
          )}>
            <Switch
              checked={contracted ?? false}
              onCheckedChange={onContractedChange}
            />
            <span className={cn(
              "text-xs font-medium whitespace-nowrap inline-block w-[110px]",
              contracted ? "text-primary" : "text-muted-foreground"
            )}>
              {contracted ? "Producción propia" : "Derivado"}
            </span>
          </div>
        )}
      </div>
      {checked && children && <div className="pl-4 border-l-2 border-primary/20 space-y-2">{children}</div>}
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-primary" />
            Nuevo Presupuesto de Lanzamiento
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex gap-1 pt-2">
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  i <= currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            {steps.map(s => (
              <span key={s} className={cn(step === s && "text-foreground font-medium")}>{stepLabels[s]}</span>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          {/* ═══ STEP 1: METADATA ═══ */}
          {step === 'metadata' && (
            <div className="space-y-4 pb-4">
              {/* Readonly release info */}
              <Card className="bg-muted/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <Disc3 className="h-8 w-8 text-primary/60" />
                  <div>
                    <p className="font-medium text-sm">{release?.title}</p>
                    <p className="text-xs text-muted-foreground">{release?.artist?.name || 'Sin artista'} · {nTracks} track{nTracks !== 1 ? 's' : ''}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-1.5">
                <Label className="text-xs">Nombre del presupuesto *</Label>
                <Input value={budgetName} onChange={e => setBudgetName(e.target.value)} className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de release</Label>
                <Select value={releaseType} onValueChange={setReleaseType}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="ep">EP</SelectItem>
                    <SelectItem value="album">Álbum</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                    <SelectItem value="reedicion">Re-edición</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Versión single-select radio */}
              <div className="space-y-1.5">
                <Label className="text-xs">Versión</Label>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <RadioGroup value={version} onValueChange={setVersion} className="grid grid-cols-2 gap-2">
                    {VERSION_OPTIONS.map(opt => (
                      <label key={opt.value} className={cn(
                        "flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-colors",
                        version === opt.value ? "bg-primary/10" : "hover:bg-muted/60"
                      )}>
                        <RadioGroupItem value={opt.value} id={`ver-${opt.value}`} className="shrink-0" />
                        <span className="text-sm text-foreground">{opt.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              {/* Territorio multi-select */}
              <div className="space-y-1.5">
                <Label className="text-xs">Territorio objetivo</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-auto min-h-9 text-sm py-1.5">
                      <Globe className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      {territories.length === 0 ? (
                        <span className="text-muted-foreground">Seleccionar territorios...</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {territories.map(t => {
                            const opt = ALL_TERRITORIES.find(o => o.value === t);
                            return (
                              <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-0.5">
                                {opt?.label || t}
                                <X className="h-2.5 w-2.5 cursor-pointer" onClick={(e) => {
                                  e.stopPropagation();
                                  setTerritories(prev => prev.filter(v => v !== t));
                                }} />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-[300] bg-popover border border-border shadow-lg pointer-events-auto" align="start" side="bottom" sideOffset={4} avoidCollisions={false} style={{ pointerEvents: 'auto' }}>
                    <Command>
                      <CommandInput placeholder="Buscar país..." />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>No encontrado</CommandEmpty>
                        {TERRITORY_GROUPS.map(group => (
                          <CommandGroup key={group.label} heading={group.label}>
                            {group.options.map(opt => (
                              <CommandItem
                                key={opt.value}
                                value={opt.label}
                                onSelect={() => {
                                  setTerritories(prev =>
                                    prev.includes(opt.value)
                                      ? prev.filter(v => v !== opt.value)
                                      : [...prev, opt.value]
                                  );
                                }}
                              >
                                <Checkbox
                                  checked={territories.includes(opt.value)}
                                  className="mr-2 h-3.5 w-3.5"
                                />
                                <span className="text-sm">{opt.label}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Estado</Label>
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                      <SelectItem value="mezcla">Mezcla</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                      <SelectItem value="programado">Programado</SelectItem>
                      <SelectItem value="publicado">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sello</Label>
                  <ReleaseBudgetContactField
                    type="sello"
                    artistId={release?.artist_id || null}
                    value={labelContactId}
                    onValueChange={setLabelContactId}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Distribución</Label>
                  <ReleaseBudgetContactField
                    type="distribucion"
                    artistId={release?.artist_id || null}
                    value={distributionContactId}
                    onValueChange={setDistributionContactId}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Owner interno</Label>
                  <ReleaseBudgetContactField
                    type="owner"
                    artistId={release?.artist_id || null}
                    value={ownerContactId}
                    onValueChange={setOwnerContactId}
                  />
                </div>
              </div>

              {/* Servicios contratados - grid checkboxes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Servicios contratados</Label>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICE_OPTIONS.map(svc => (
                      <label key={svc} className={cn(
                        "flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-colors",
                        services.includes(svc) ? "bg-primary/10" : "hover:bg-muted/60"
                      )}>
                        <Checkbox
                          checked={services.includes(svc)}
                          onCheckedChange={(v) => {
                            setServices(prev =>
                              v ? [...prev, svc] : prev.filter(x => x !== svc)
                            );
                          }}
                          className="shrink-0"
                        />
                        <span className="text-sm text-foreground">{svc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notas internas</Label>
                <Textarea value={notasInternas} onChange={e => setNotasInternas(e.target.value)} className="min-h-[60px] text-sm" placeholder="Observaciones..." />
              </div>
            </div>
          )}

          {/* ═══ STEP 2: DATES ═══ */}
          {step === 'dates' && (
            <div className="space-y-4 pb-4">
              <DatePicker label="Fecha de lanzamiento digital (principal) *" value={releaseDate} onChange={setReleaseDate} />
              <DatePicker label="Fecha de lanzamiento físico (opcional)" value={physicalDate} onChange={setPhysicalDate} defaultMonth={!physicalDate && releaseDate ? releaseDate : undefined} highlightDate={releaseDate ?? undefined} />

              {/* Singles previos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Singles previos</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSingles(prev => [...prev, { date: new Date() }])}>
                    <Plus className="h-3 w-3 mr-1" /> Añadir
                  </Button>
                </div>
                {singles.map((s, i) => (
                  <div key={i} className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Single {i + 1}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSingles(prev => prev.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {/* Track selector */}
                    {existingTracks.length > 0 ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Canción</Label>
                        <Select
                          value={s.trackId || (s.isNew ? '__new__' : '')}
                          onValueChange={(val) => {
                            setSingles(prev => {
                              const copy = [...prev];
                              if (val === '__new__') {
                                copy[i] = { ...copy[i], trackId: undefined, isNew: true, title: '' };
                              } else {
                                const track = existingTracks.find(t => t.id === val);
                                copy[i] = { ...copy[i], trackId: val, isNew: false, title: track?.title };
                              }
                              return copy;
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar canción..." />
                          </SelectTrigger>
                          <SelectContent>
                            {existingTracks.map(track => (
                              <SelectItem key={track.id} value={track.id}>
                                {track.track_number}. {track.title}
                              </SelectItem>
                            ))}
                            <SelectItem value="__new__">+ Nuevo título</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    {/* New title input */}
                    {(s.isNew || existingTracks.length === 0) && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Título</Label>
                        <Input
                          value={s.title || ''}
                          onChange={e => setSingles(prev => {
                            const copy = [...prev];
                            copy[i] = { ...copy[i], title: e.target.value, isNew: true };
                            return copy;
                          })}
                          placeholder="Nombre del single..."
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {/* Date picker */}
                    <DatePicker
                      label="Fecha de lanzamiento"
                      value={s.date}
                      onChange={v => setSingles(prev => {
                        const copy = [...prev];
                        copy[i] = { ...copy[i], date: v };
                        return copy;
                      })}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Deadline strategy - depends on whether cronograma exists */}
              {hasCronograma ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium">¿Cómo calcular las fechas clave?</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tu cronograma tiene {existingMilestones.length} hitos definidos.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'cronograma' as const, label: 'Usar el plan', desc: 'Respeta las fechas que ya tienes', icon: CalendarCheck },
                      { value: 'autocalcular' as const, label: 'Calcular desde cero', desc: 'Parte de la fecha de salida', icon: Calculator },
                      { value: 'mezclar' as const, label: 'Completar vacíos', desc: 'Plan donde existe, cálculo el resto', icon: Blend },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDeadlineStrategy(opt.value)}
                        className={cn(
                          "flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors",
                          deadlineStrategy === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <opt.icon className={cn("h-4 w-4", deadlineStrategy === opt.value ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* New clean deadline list */}
                  {releaseDate && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 divide-y divide-border/50">
                        {getResolvedDeadlines().map(d => {
                          const hasDiff = d.cronogramaDate &&
                            Math.abs(differenceInDays(d.cronogramaDate, d.calculatedDate)) > 3;
                          const isFromPlan = d.source === 'cronograma';
                          const isAdjusted = isFromPlan && hasDiff;

                          const pillLabel = isAdjusted ? 'ajustado' : isFromPlan ? 'del plan' : 'auto';
                          const pillClass = isAdjusted
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            : isFromPlan
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border-border';

                          const showPill = isFromPlan || !d.cronogramaDate;

                          return (
                            <div key={d.key} className="flex items-center py-2 gap-2 first:pt-0 last:pb-0">
                              <span className="text-sm text-foreground flex-1 min-w-0 truncate">{d.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-semibold tabular-nums text-foreground">
                                  {format(d.finalDate, "d MMM", { locale: es })}
                                </span>
                                {showPill && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className={cn("text-[10px] px-1.5 py-0 h-4 cursor-default border font-normal", pillClass)}>
                                          {pillLabel}
                                        </Badge>
                                      </TooltipTrigger>
                                      {hasDiff && d.cronogramaDate && (
                                        <TooltipContent side="left" className="text-xs space-y-0.5">
                                          <p>📅 Tu plan: {format(d.cronogramaDate, "d MMM", { locale: es })}</p>
                                          <p>🔢 Cálculo auto: {format(d.calculatedDate, "d MMM", { locale: es })}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <>
                  {/* No cronograma - simple toggle */}
                  <ToggleRow label="Calcular fechas clave automáticamente" checked={autoDeadlines} onChange={setAutoDeadlines} />

                  {releaseDate && autoDeadlines && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 divide-y divide-border/50">
                        {EXTENDED_DEADLINE_OFFSETS.map(offset => (
                          <div key={offset.key} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-2">
                            <span className="text-sm text-foreground flex-1 truncate">{offset.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                {format(subDays(releaseDate, offset.days), "d MMM", { locale: es })}
                              </span>
                              <Badge className="text-[10px] px-1.5 py-0 h-4 border font-normal bg-muted text-muted-foreground border-border">
                                auto
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ STEP 3: VARIABLES ═══ */}
          {step === 'variables' && (
            <div className="space-y-4 pb-4">
              {/* Tracks & Production */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Grabación & Producción</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nº tracks</Label>
                    <Input type="number" min={1} value={nTracks} onChange={e => setNTracks(parseInt(e.target.value) || 1)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Productor/es</Label>
                    <ProducerSelector
                      value={producers}
                      onChange={setProducers}
                      artistId={release?.artist_id}
                    />
                  </div>
                </div>
                {/* Mezcla — agrupado bajo producción */}
                <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mezcla</h5>
                  <ToggleRow
                    label="¿El productor incluye mezcla?"
                    checked={includesMix}
                    onChange={(v) => { setIncludesMix(v); if (v) { setExternalMix(false); setExternalMixEngineer(null); } }}
                  />
                  {!includesMix && (
                    <div className="pl-3 border-l-2 border-border space-y-2">
                      <ToggleRow
                        label="¿Mezcla externa?"
                        checked={externalMix}
                        onChange={(v) => { setExternalMix(v); if (!v) setExternalMixEngineer(null); }}
                      />
                      {externalMix && (
                        <div className="space-y-1.5 pl-4 border-l-2 border-primary/30">
                          <Label className="text-xs">Técnico de mezcla externo</Label>
                          <SingleProducerSelector
                            value={externalMixEngineer}
                            onChange={setExternalMixEngineer}
                            artistId={release?.artist_id}
                            placeholder="Seleccionar técnico..."
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Tipos de master</Label>
                  <div className="rounded-md border border-border bg-muted/30 divide-y divide-border">
                    {MASTER_TYPE_OPTIONS.map(opt => {
                      const checked = masterTypes.includes(opt.value);
                      return (
                        <div key={opt.value} className="px-3 py-2.5 hover:bg-muted/60 transition-colors">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={v => {
                                if (v) {
                                  setMasterTypes(prev => [...prev, opt.value]);
                                } else {
                                  setMasterTypes(prev => prev.filter(x => x !== opt.value));
                                  setMasterEngineers(prev => { const next = { ...prev }; delete next[opt.value]; return next; });
                                }
                              }}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium leading-tight">{opt.label}</span>
                              {opt.desc && <span className="text-xs text-muted-foreground leading-tight mt-0.5">{opt.desc}</span>}
                            </div>
                          </label>
                          {checked && (
                            <div className="mt-2 pl-7 border-l-2 border-primary/20">
                              <Label className="text-xs text-muted-foreground mb-1 block">Técnico de mastering</Label>
                              <SingleProducerSelector
                                value={masterEngineers[opt.value] ?? null}
                                onChange={(ref) => setMasterEngineers(prev => ({ ...prev, [opt.value]: ref }))}
                                artistId={release?.artist_id}
                                placeholder="Seleccionar técnico..."
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {masterTypes.length === 0 && (
                    <p className="text-xs text-destructive">Selecciona al menos un tipo de master.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Visual */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Visual & Contenido</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{visualActivo ? 'Activo' : 'Inactivo'}</span>
                    <Switch
                      checked={visualActivo}
                      onCheckedChange={(v) => {
                        setVisualActivo(v);
                        if (!v) {
                          setNVideoclips(0);
                          setNCapsulasRRSS(0);
                          setCapsulasManuales(false);
                          setShooting(false);
                          setShootingContratado(false);
                          setVestuario(false);
                          setVestuarioContratado(false);
                          setMakingOf(false);
                          setMakingOfContratado(false);
                          setEdicionCapsulas(false);
                          setEdicionCapsulasCont(false);
                        }
                      }}
                    />
                  </div>
                </div>
                {visualActivo && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nº videoclips</Label>
                        <Input type="number" min={0} value={nVideoclips} onChange={e => setNVideoclips(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs">Nº cápsulas RRSS</Label>
                          {capsulasManuales && nCapsulasRRSS !== nVideoclips * 3 && (
                            <button
                              type="button"
                              onClick={() => { setCapsulasManuales(false); setNCapsulasRRSS(nVideoclips * 3); }}
                              title="Restaurar valor automático (videoclips × 3)"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <Input
                          type="number"
                          min={0}
                          value={nCapsulasRRSS}
                          onChange={e => { setCapsulasManuales(true); setNCapsulasRRSS(parseInt(e.target.value) || 0); }}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <ToggleRow label="¿Shooting?" checked={shooting} onChange={setShooting} contracted={shootingContratado} onContractedChange={setShootingContratado} />
                    <ToggleRow label="¿Vestuario / estilismo?" checked={vestuario} onChange={setVestuario} contracted={vestuarioContratado} onContractedChange={setVestuarioContratado} />
                    <ToggleRow label="¿Making of?" checked={makingOf} onChange={setMakingOf} contracted={makingOfContratado} onContractedChange={setMakingOfContratado} />
                    <ToggleRow label="¿Edición de cápsulas?" checked={edicionCapsulas} onChange={setEdicionCapsulas} contracted={edicionCapsulasCont} onContractedChange={setEdicionCapsulasCont} />
                  </>
                )}
              </div>

              <Separator />

              {/* Stage */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Stage / Residencia técnica</h4>
                <ToggleRow label="¿Stage / residencia técnica?" checked={stage} onChange={setStage} contracted={stageContratado} onContractedChange={setStageContratado}>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nº días</Label>
                    <Input type="number" min={1} value={stageDays} onChange={e => setStageDays(parseInt(e.target.value) || 1)} className="h-9 text-sm" />
                  </div>
                </ToggleRow>
              </div>

              <Separator />

              {/* PR & Marketing */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">PR & Marketing</h4>
                <ToggleRow label="¿PR nacional?" checked={prNacional} onChange={setPrNacional} contracted={prNacionalContratado} onContractedChange={setPrNacionalContratado}>
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <SingleProducerSelector value={prNacionalProveedor} onChange={setPrNacionalProveedor} artistId={release?.artist_id} placeholder="Proveedor" />
                    <Input type="number" value={prNacionalCoste || ''} onChange={e => setPrNacionalCoste(parseFloat(e.target.value) || 0)} placeholder="Coste €" className="h-8 text-xs" />
                    <Select value={prNacionalPeriodo} onValueChange={setPrNacionalPeriodo}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Periodo" /></SelectTrigger>
                      <SelectContent>
                        {PERIODOS_PR.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </ToggleRow>
                <ToggleRow label="¿PR internacional?" checked={prInternacional} onChange={setPrInternacional} contracted={prInternacionalCont} onContractedChange={setPrInternacionalCont}>
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <SingleProducerSelector value={prIntProveedor} onChange={setPrIntProveedor} artistId={release?.artist_id} placeholder="Proveedor" />
                    <Input type="number" value={prIntCoste || ''} onChange={e => setPrIntCoste(parseFloat(e.target.value) || 0)} placeholder="Coste €" className="h-8 text-xs" />
                    <Select value={prInternacionalPeriodo} onValueChange={setPrInternacionalPeriodo}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Periodo" /></SelectTrigger>
                      <SelectContent>
                        {PERIODOS_PR.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </ToggleRow>
                <ToggleRow label="¿Gestión RRSS / contenidos?" checked={gestionRRSS} onChange={setGestionRRSS} contracted={gestionRRSSCont} onContractedChange={setGestionRRSSCont}>
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <SingleProducerSelector value={rrssProveedor} onChange={setRrssProveedor} artistId={release?.artist_id} placeholder="Proveedor" />
                    <Input type="number" value={rrssCoste || ''} onChange={e => setRrssCoste(parseFloat(e.target.value) || 0)} placeholder="Coste €" className="h-8 text-xs" />
                    <Select value={rrssPeriodo} onValueChange={setRrssPeriodo}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Periodo" /></SelectTrigger>
                      <SelectContent>
                        {PERIODOS_PR.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </ToggleRow>
              </div>

              <Separator />

              {/* Logistics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Logística</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{logisticaActiva ? 'Activa' : 'Inactiva'}</span>
                    <Switch
                      checked={logisticaActiva}
                      onCheckedChange={(v) => {
                        setLogisticaActiva(v);
                        if (!v) {
                          setTransporte(false);
                          setTransporteCont(false);
                          setDietas(false);
                          setDietasCont(false);
                          setHospedaje(false);
                          setHospedajeCont(false);
                        }
                      }}
                    />
                  </div>
                </div>
                {logisticaActiva && (
                  <>
                    <ToggleRow label="¿Transporte?" checked={transporte} onChange={setTransporte} contracted={transporteCont} onContractedChange={setTransporteCont} />
                    <ToggleRow label="¿Dietas?" checked={dietas} onChange={setDietas} contracted={dietasCont} onContractedChange={setDietasCont} />
                    <ToggleRow label="¿Hospedaje?" checked={hospedaje} onChange={setHospedaje} contracted={hospedajeCont} onContractedChange={setHospedajeCont} />
                  </>
                )}
              </div>

              <Separator />

              {/* Fabricación física */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Fabricación física</h4>
                <ToggleRow
                  label="¿Fabricación física (vinilo/CD)?"
                  checked={fisico}
                  onChange={(v) => { setFisico(v); if (!v) setFisicoFormatos([]); }}
                  contracted={fisicoCont}
                  onContractedChange={setFisicoCont}
                />
                {fisico && (
                  <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formatos</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {FORMATOS_FISICOS.map(f => (
                        <label key={f.value} className={cn(
                          "flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-colors",
                          fisicoFormatos.includes(f.value) ? "bg-primary/10" : "hover:bg-muted/60"
                        )}>
                          <Checkbox
                            checked={fisicoFormatos.includes(f.value)}
                            onCheckedChange={(v) => {
                              setFisicoFormatos(prev =>
                                v ? [...prev, f.value] : prev.filter(x => x !== f.value)
                              );
                            }}
                            className="shrink-0"
                          />
                          <span className="text-sm text-foreground">{f.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Contingencia */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Contingencia</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Reserva de imprevistos</Label>
                    <Badge variant="secondary">{contingencia[0]}%</Badge>
                  </div>
                  <Slider value={contingencia} onValueChange={setContingencia} min={0} max={20} step={1} />
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <p className="text-xs font-medium mb-2">Resumen de categorías a generar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RELEASE_BUDGET_CATEGORIES
                      .filter(c => getActiveCategories().includes(c.key))
                      .map(c => (
                        <Badge key={c.key} variant="outline" className="text-xs">{c.name}</Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" onClick={currentIndex > 0 ? () => setStep(steps[currentIndex - 1]) : handleClose} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            {currentIndex > 0 ? 'Anterior' : 'Cancelar'}
          </Button>
          {currentIndex < steps.length - 1 ? (
            <Button onClick={() => setStep(steps[currentIndex + 1])} className="gap-1">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !budgetName.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Presupuesto
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
