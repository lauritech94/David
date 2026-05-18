import React, { useState, useEffect } from "react";
import { PUBLIC_APP_URL } from '@/lib/public-url';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { ContactSelector } from "@/components/ContactSelector";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  FileText, Check, ChevronRight, ChevronLeft, ClipboardCopy, Eye, 
  Building, User, Calendar, CreditCard, Scale, Users, Download,
  Plus, Trash2, Save, ChevronDown, Share2, Copy
} from "lucide-react";
import { useContractDrafts, type ContractDraft } from '@/hooks/useContractDrafts';
import { DraftStatusBanner } from '@/components/contract-drafts/DraftStatusBanner';
import { useAuth } from '@/hooks/useAuth';
import { toast as sonnerToast } from 'sonner';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AgentData,
  PromoterData,
  ContractConditions,
  PaymentTerms,
  LegalClauses,
  DEFAULT_AGENT_DATA,
  DEFAULT_LEGAL_CLAUSES,
  generateContractDocument
} from "@/lib/contractTemplates";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import mooditaLogo from "@/assets/moodita-logo.png";

type ContractGeneratorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contract: { title: string; content: string; pdfUrl?: string }) => void | Promise<void>;
  bookingData?: {
    artista?: string;
    ciudad?: string;
    venue?: string;
    fecha?: string;
    hora?: string;
    fee?: number;
    aforo?: number;
    duracion?: string;
    promotor?: string;
    formato?: string;
    festival_ciclo?: string;
  };
  draftId?: string;
  bookingId?: string;
  artistId?: string;
  onDraftSaved?: () => void;
};

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'agent', title: 'Agente', description: 'Datos del agente/representante', icon: <Building className="h-5 w-5" /> },
  { id: 'promoter', title: 'Promotor', description: 'Selecciona o introduce datos del promotor', icon: <Users className="h-5 w-5" /> },
  { id: 'conditions', title: 'Condiciones', description: 'Detalles de la actuación', icon: <Calendar className="h-5 w-5" /> },
  { id: 'payment', title: 'Pago', description: 'Forma de pago', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'legal', title: 'Cláusulas', description: 'Condiciones legales', icon: <Scale className="h-5 w-5" /> },
  { id: 'preview', title: 'Vista Previa', description: 'Revisa y guarda el contrato', icon: <Eye className="h-5 w-5" /> }
];

const SPONSOR_PRESETS: Record<string, string> = {
  estricta: 'No, y nunca en caja escénica del escenario sin previo acuerdo del artista. Sin marcas ni patrocinadores visibles.',
  con_permiso: 'Marcas permitidas únicamente con permiso previo por escrito en la caja escénica.',
  sin_limitaciones: 'Sin limitaciones respecto a patrocinadores y marcas.',
};

interface ClauseSection {
  title: string;
  clauses: { key: keyof LegalClauses; label: string }[];
}

const CLAUSE_SECTIONS: ClauseSection[] = [
  {
    title: '1. Propiedad Intelectual y Grabaciones',
    clauses: [
      { key: 'propiedadIntelectual', label: '1.1 Propiedad Intelectual' },
      { key: 'grabaciones', label: '1.2 Grabaciones' },
    ]
  },
  {
    title: '2. Publicidad, Patrocinio y Merchandising',
    clauses: [
      { key: 'publicidad', label: '2.1 Publicidad' },
      { key: 'noAnunciarSinPago', label: '2.2 No anunciar sin pago' },
      { key: 'patrocinios', label: '2.3 Patrocinios' },
      { key: 'merchandising', label: '2.4 Entrevistas y promoción' },
      { key: 'merchandisingDerechos', label: '2.5 Merchandising' },
    ]
  },
  {
    title: '3. Recinto, Escenario y Camerinos',
    clauses: [
      { key: 'recinto', label: '3.1 Equipo técnico' },
      { key: 'calidadEquipo', label: '3.2 Calidad del equipo' },
      { key: 'camerinos', label: '3.3 Camerinos' },
    ]
  },
  {
    title: '4. Riders y Control Creativo',
    clauses: [
      { key: 'riders', label: '4.1 Riders técnico y hospitality' },
      { key: 'retrasos', label: '4.2 Retrasos del promotor' },
    ]
  },
  {
    title: '5. Obligaciones del Promotor',
    clauses: [
      { key: 'obligaciones', label: '5.1 Permisos y seguridad' },
      { key: 'segurosIndemnidad', label: '5.2 Seguros e indemnidad' },
      { key: 'certificadosSeguros', label: '5.3 Certificados de seguros' },
      { key: 'cancelacion', label: '5.4 Cancelación' },
      { key: 'fuerzaMayor', label: '5.5 Fuerza mayor' },
      { key: 'covid', label: '5.6 Restricciones sanitarias' },
      { key: 'impagoPenalizacion', label: '5.7 Impago y penalización' },
      { key: 'ticketingReporting', label: '5.8 Ticketing y reporting' },
      { key: 'invitaciones', label: '5.9 Invitaciones' },
      { key: 'liquidacionSGAE', label: '5.10 Liquidación SGAE' },
      { key: 'porcentajeBeneficios', label: '5.11 Porcentaje beneficios' },
    ]
  },
  {
    title: '6-8. Efectividad, Confidencialidad y Jurisdicción',
    clauses: [
      { key: 'contratoFirme', label: 'Contrato firme (pago = vinculante)' },
      { key: 'confidencialidad', label: '7. Confidencialidad' },
      { key: 'jurisdiccion', label: '8. Ley y Jurisdicción' },
    ]
  },
];

const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  open,
  onOpenChange,
  onSave,
  bookingData,
  draftId,
  bookingId,
  artistId,
  onDraftSaved,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [contractDate, setContractDate] = useState(format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es }));
  const [savingContact, setSavingContact] = useState(false);
  const [sponsorPreset, setSponsorPreset] = useState<string>('estricta');
  const { user } = useAuth();
  const { saveDraft, updateDraft, updateStatus } = useContractDrafts();
  const [currentDraft, setCurrentDraft] = useState<ContractDraft | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Load existing draft
  useEffect(() => {
    if (draftId && open) {
      (async () => {
        const { data } = await supabase
          .from('contract_drafts')
          .select('*')
          .eq('id', draftId)
          .single();
        if (data) {
          const d = data as unknown as ContractDraft;
          setCurrentDraft(d);
          if (d.form_data) {
            const fd = d.form_data as any;
            if (fd.agentData) setAgentData(fd.agentData);
            if (fd.promoterData) setPromoterData(fd.promoterData);
            if (fd.conditions) setConditions(fd.conditions);
            if (fd.paymentTerms) setPaymentTerms(fd.paymentTerms);
            if (fd.ticketPrices) setTicketPrices(fd.ticketPrices);
          }
          if (d.clauses_data) setLegalClauses(d.clauses_data as any);
        }
      })();
    }
  }, [draftId, open]);

  const getFormDataSnapshot = () => ({
    agentData, promoterData, conditions, paymentTerms, ticketPrices,
  });

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const title = `Contrato - ${conditions.artista || 'Artista'} - ${conditions.evento || conditions.ciudad || 'Evento'}`;
      if (currentDraft) {
        await updateDraft(currentDraft.id, { formData: getFormDataSnapshot(), clausesData: legalClauses, title });
      } else {
        const draft = await saveDraft({
          draftType: 'booking',
          title,
          formData: getFormDataSnapshot(),
          clausesData: legalClauses,
          bookingId: bookingId,
          artistId: artistId,
        });
        if (draft) setCurrentDraft(draft);
      }
      onDraftSaved?.();
    } finally {
      setSavingDraft(false);
    }
  };

  const handleShareLink = async () => {
    if (!currentDraft) return;
    if (currentDraft.status === 'borrador') {
      await updateStatus(currentDraft.id, 'en_negociacion');
      setCurrentDraft({ ...currentDraft, status: 'en_negociacion' });
    }
    const url = `${PUBLIC_APP_URL}/contract-draft/${currentDraft.share_token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    sonnerToast.success('Link de negociación copiado');
    setTimeout(() => setCopiedLink(false), 2000);
  };
  
  // Agent Data
  const [agentData, setAgentData] = useState<AgentData>(DEFAULT_AGENT_DATA);
  
  // Promoter Data
  const [promoterData, setPromoterData] = useState<PromoterData>({
    nombre: '',
    cif: '',
    direccion: '',
    representante: '',
    cargo: ''
  });
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  
  // Ticket prices
  const [ticketPrices, setTicketPrices] = useState<{ tipo: string; precio: string }[]>([
    { tipo: 'General', precio: '' }
  ]);
  
  // Conditions
  const [conditions, setConditions] = useState<ContractConditions>({
    artista: '',
    ciudad: '',
    aforo: '',
    recinto: '',
    evento: '',
    billing: 'TBC',
    otrosArtistas: '',
    fechaAnuncio: 'TBC',
    fechaActuacion: '',
    duracion: '',
    montajePrueba: 'TBC',
    aperturaPuertas: 'TBC',
    inicioConcierto: '',
    curfew: 'TBC',
    cacheGarantizado: '',
    comisionAgencia: '10%',
    precioTickets: [{ tipo: 'General', precio: '' }],
    sponsors: SPONSOR_PRESETS.estricta,
    riderTecnico: true,
    riderHospitalidad: 'Catering de cortesía',
    hoteles: false,
    transporteInterno: false,
    vuelos: false,
    backline: true
  });
  
  // Payment
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>({
    tipo: 'post-concierto',
    primerPagoPorcentaje: 50,
    primerPagoMomento: 'A la firma del contrato',
    segundoPagoPorcentaje: 50,
    segundoPagoMomento: 'El día hábil después de la actuación'
  });
  
  // Legal Clauses
  const [legalClauses, setLegalClauses] = useState<LegalClauses>(DEFAULT_LEGAL_CLAUSES);

  // Pre-fill from booking data
  useEffect(() => {
    if (bookingData) {
      setConditions(prev => ({
        ...prev,
        artista: bookingData.artista || prev.artista,
        ciudad: bookingData.ciudad || prev.ciudad,
        recinto: bookingData.venue || prev.recinto,
        aforo: bookingData.aforo?.toString() || prev.aforo,
        fechaActuacion: bookingData.fecha ? format(new Date(bookingData.fecha), "d 'de' MMMM 'de' yyyy", { locale: es }) : prev.fechaActuacion,
        inicioConcierto: bookingData.hora || prev.inicioConcierto,
        cacheGarantizado: bookingData.fee ? `${bookingData.fee.toLocaleString('es-ES')}€` : prev.cacheGarantizado,
        duracion: bookingData.duracion || prev.duracion,
        evento: bookingData.festival_ciclo || prev.evento,
      }));
    }
  }, [bookingData]);

  // Load promoter data from contact
  useEffect(() => {
    const loadContactData = async () => {
      if (!selectedContactId) return;
      
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', selectedContactId)
        .single();
      
      if (contact) {
        setPromoterData({
          contactId: contact.id,
          nombre: contact.company || contact.name,
          cif: contact.iban || '',
          direccion: `${contact.address || ''}, ${contact.city || ''}, ${contact.country || ''}`.replace(/^, |, $/g, ''),
          representante: contact.name,
          cargo: contact.role || ''
        });
      }
    };
    
    loadContactData();
  }, [selectedContactId]);

  const generateContract = () => {
    const finalConditions = { ...conditions, precioTickets: ticketPrices };
    return generateContractDocument(
      agentData,
      promoterData,
      finalConditions,
      paymentTerms,
      legalClauses,
      contractDate
    );
  };

  const handleSave = async () => {
    const content = generateContract();
    if (onSave) {
      await onSave({ 
        title: `Contrato ${conditions.artista} - ${conditions.evento || conditions.ciudad}`, 
        content 
      });
    }
    toast({ description: "Contrato guardado correctamente" });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(0);
    setAgentData(DEFAULT_AGENT_DATA);
    setPromoterData({ nombre: '', cif: '', direccion: '', representante: '', cargo: '' });
    setSelectedContactId('');
    setSavingContact(false);
    setSponsorPreset('estricta');
    setTicketPrices([{ tipo: 'General', precio: '' }]);
    setConditions({
      artista: '', ciudad: '', aforo: '', recinto: '', evento: '', billing: 'TBC',
      otrosArtistas: '', fechaAnuncio: 'TBC', fechaActuacion: '', duracion: '',
      montajePrueba: 'TBC', aperturaPuertas: 'TBC', inicioConcierto: '', curfew: 'TBC',
      cacheGarantizado: '', comisionAgencia: '10%',
      precioTickets: [{ tipo: 'General', precio: '' }],
      sponsors: SPONSOR_PRESETS.estricta,
      riderTecnico: true, riderHospitalidad: 'Catering de cortesía',
      hoteles: false, transporteInterno: false, vuelos: false, backline: true
    });
    setPaymentTerms({ tipo: 'post-concierto' });
    setLegalClauses(DEFAULT_LEGAL_CLAUSES);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateContract());
    toast({ description: "Contrato copiado al portapapeles" });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return agentData.nombre && agentData.cif;
      case 1: return promoterData.nombre && promoterData.representante;
      case 2: return conditions.artista && conditions.fechaActuacion && conditions.cacheGarantizado;
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  };

  const handleNext = () => currentStep < WIZARD_STEPS.length - 1 && setCurrentStep(prev => prev + 1);
  const handleBack = () => currentStep > 0 && setCurrentStep(prev => prev - 1);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-6 overflow-x-auto pb-2">
      {WIZARD_STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => index < currentStep && setCurrentStep(index)}
            disabled={index > currentStep}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-sm",
              index === currentStep && "bg-primary text-primary-foreground",
              index < currentStep && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
              index > currentStep && "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs">
              {index < currentStep ? <Check className="h-3 w-3" /> : <span>{index + 1}</span>}
            </span>
            <span className="hidden lg:inline">{step.title}</span>
          </button>
          {index < WIZARD_STEPS.length - 1 && (
            <ChevronRight className={cn("h-4 w-4 mx-1", index < currentStep ? "text-primary" : "text-muted-foreground")} />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Agent Data
  const renderAgentStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre de la Sociedad *</Label>
          <Input value={agentData.nombre} onChange={e => setAgentData({ ...agentData, nombre: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>CIF *</Label>
          <Input value={agentData.cif} onChange={e => setAgentData({ ...agentData, cif: e.target.value })} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Dirección</Label>
          <Input value={agentData.direccion} onChange={e => setAgentData({ ...agentData, direccion: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Representante</Label>
          <Input value={agentData.representante} onChange={e => setAgentData({ ...agentData, representante: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Fecha del Contrato</Label>
          <Input value={contractDate} onChange={e => setContractDate(e.target.value)} />
        </div>
      </div>
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">Datos Bancarios</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Input value={agentData.banco} onChange={e => setAgentData({ ...agentData, banco: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>IBAN</Label>
            <Input value={agentData.iban} onChange={e => setAgentData({ ...agentData, iban: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );

  // Save promoter as new contact
  const handleSaveAsContact = async () => {
    if (!promoterData.representante || !promoterData.nombre) {
      toast({ description: "Introduce al menos nombre/empresa y representante", variant: "destructive" });
      return;
    }
    setSavingContact(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      
      const { data, error } = await supabase.from('contacts').insert({
        name: promoterData.representante,
        company: promoterData.nombre,
        address: promoterData.direccion || null,
        role: promoterData.cargo || null,
        created_by: user.id,
      }).select('id').single();
      
      if (error) throw error;
      setSelectedContactId(data.id);
      setPromoterData(prev => ({ ...prev, contactId: data.id }));
      toast({ description: "Contacto guardado correctamente" });
    } catch (err: any) {
      toast({ description: "Error al guardar contacto: " + err.message, variant: "destructive" });
      setSavingContact(false);
    }
  };

  // Step 2: Promoter Data
  const renderPromoterStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Seleccionar de Contactos</Label>
        <ContactSelector 
          value={selectedContactId} 
          onValueChange={setSelectedContactId}
          placeholder="Buscar promotor en contactos..."
        />
      </div>
      
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">O introducir manualmente</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre/Empresa *</Label>
          <Input value={promoterData.nombre} onChange={e => setPromoterData({ ...promoterData, nombre: e.target.value })} placeholder="Nombre de la empresa o entidad" />
        </div>
        <div className="space-y-2">
          <Label>CIF</Label>
          <Input value={promoterData.cif} onChange={e => setPromoterData({ ...promoterData, cif: e.target.value })} placeholder="CIF de la empresa" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Dirección</Label>
          <Input value={promoterData.direccion} onChange={e => setPromoterData({ ...promoterData, direccion: e.target.value })} placeholder="Dirección completa" />
        </div>
        <div className="space-y-2">
          <Label>Representante Legal *</Label>
          <Input value={promoterData.representante} onChange={e => setPromoterData({ ...promoterData, representante: e.target.value })} placeholder="Nombre del representante" />
        </div>
        <div className="space-y-2">
          <Label>Cargo</Label>
          <Input value={promoterData.cargo} onChange={e => setPromoterData({ ...promoterData, cargo: e.target.value })} placeholder="Ej: Alcalde, Director..." />
        </div>
      </div>

      {!selectedContactId && promoterData.representante && promoterData.nombre && (
        <Button
          type="button"
          variant="outline"
          className="w-full mt-2"
          onClick={handleSaveAsContact}
          disabled={savingContact || !!promoterData.contactId}
        >
          <Save className="h-4 w-4 mr-2" />
          {promoterData.contactId ? 'Contacto vinculado ✓' : 'Guardar como contacto nuevo'}
        </Button>
      )}
    </div>
  );

  // Step 3: Conditions
  const renderConditionsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Artista *</Label>
          <Input value={conditions.artista} onChange={e => setConditions({ ...conditions, artista: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Ciudad</Label>
          <Input value={conditions.ciudad} onChange={e => setConditions({ ...conditions, ciudad: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Aforo</Label>
          <Input value={conditions.aforo} onChange={e => setConditions({ ...conditions, aforo: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Recinto</Label>
          <Input value={conditions.recinto} onChange={e => setConditions({ ...conditions, recinto: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Evento/Festival</Label>
          <Input value={conditions.evento} onChange={e => setConditions({ ...conditions, evento: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Billing</Label>
          <Input value={conditions.billing} onChange={e => setConditions({ ...conditions, billing: e.target.value })} placeholder="HEADLINER, TBC..." />
        </div>
        <div className="space-y-2">
          <Label>Otros Artistas/DJs</Label>
          <Input value={conditions.otrosArtistas} onChange={e => setConditions({ ...conditions, otrosArtistas: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Fecha Anuncio</Label>
          <Input value={conditions.fechaAnuncio} onChange={e => setConditions({ ...conditions, fechaAnuncio: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Fecha Actuación *</Label>
          <Input value={conditions.fechaActuacion} onChange={e => setConditions({ ...conditions, fechaActuacion: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Duración</Label>
          <Input value={conditions.duracion} onChange={e => setConditions({ ...conditions, duracion: e.target.value })} placeholder="70-90 min" />
        </div>
        <div className="space-y-2">
          <Label>Inicio Concierto</Label>
          <Input value={conditions.inicioConcierto} onChange={e => setConditions({ ...conditions, inicioConcierto: e.target.value })} placeholder="22:00" />
        </div>
        <div className="space-y-2">
          <Label>Curfew</Label>
          <Input value={conditions.curfew} onChange={e => setConditions({ ...conditions, curfew: e.target.value })} />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Económico</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Caché Garantizado *</Label>
            <Input value={conditions.cacheGarantizado} onChange={e => setConditions({ ...conditions, cacheGarantizado: e.target.value })} placeholder="12.000€ + IVA" />
          </div>
          <div className="space-y-2">
            <Label>Comisión Agencia</Label>
            <Input value={conditions.comisionAgencia} onChange={e => setConditions({ ...conditions, comisionAgencia: e.target.value })} />
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <Label>Precio Tickets</Label>
          <div className="space-y-2">
            {ticketPrices.map((tp, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  className="flex-1"
                  placeholder="Tipo (General, VIP...)"
                  value={tp.tipo}
                  onChange={e => {
                    const next = [...ticketPrices];
                    next[idx] = { ...next[idx], tipo: e.target.value };
                    setTicketPrices(next);
                  }}
                />
                <Input
                  className="w-32"
                  placeholder="Precio"
                  value={tp.precio}
                  onChange={e => {
                    const next = [...ticketPrices];
                    next[idx] = { ...next[idx], precio: e.target.value };
                    setTicketPrices(next);
                  }}
                />
                {ticketPrices.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setTicketPrices(ticketPrices.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setTicketPrices([...ticketPrices, { tipo: '', precio: '' }])}>
              <Plus className="h-4 w-4 mr-1" /> Agregar precio
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Riders y Logística</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'riderTecnico', label: 'Rider Técnico' },
            { key: 'backline', label: 'Backline' },
            { key: 'hoteles', label: 'Hoteles' },
            { key: 'transporteInterno', label: 'Transporte Interno' },
            { key: 'vuelos', label: 'Vuelos' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <Label>{item.label}</Label>
              <Switch 
                checked={conditions[item.key as keyof ContractConditions] as boolean} 
                onCheckedChange={checked => setConditions({ ...conditions, [item.key]: checked })} 
              />
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <Label>Rider Hospitalidad</Label>
          <Input value={conditions.riderHospitalidad} onChange={e => setConditions({ ...conditions, riderHospitalidad: e.target.value })} />
        </div>
        <div className="mt-4 space-y-2">
          <Label>Sponsors</Label>
          <Select value={sponsorPreset} onValueChange={v => {
            setSponsorPreset(v);
            if (v !== 'personalizado') {
              setConditions(prev => ({ ...prev, sponsors: SPONSOR_PRESETS[v] || '' }));
            }
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="estricta">Estricta — Sin marcas</SelectItem>
              <SelectItem value="con_permiso">Con permiso por escrito</SelectItem>
              <SelectItem value="sin_limitaciones">Sin limitaciones</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {sponsorPreset === 'personalizado' && (
            <Textarea value={conditions.sponsors} onChange={e => setConditions({ ...conditions, sponsors: e.target.value })} rows={2} placeholder="Condiciones de patrocinios..." />
          )}
        </div>
      </div>
    </div>
  );

  // Step 4: Payment
  const renderPaymentStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Pago</Label>
        <Select value={paymentTerms.tipo} onValueChange={v => setPaymentTerms({ ...paymentTerms, tipo: v as PaymentTerms['tipo'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="post-concierto">100% después del concierto</SelectItem>
            <SelectItem value="50-50">50% firma + 50% post-actuación</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paymentTerms.tipo === 'personalizado' && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primer Pago (%)</Label>
              <Input type="number" value={paymentTerms.primerPagoPorcentaje || ''} onChange={e => setPaymentTerms({ ...paymentTerms, primerPagoPorcentaje: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Momento del Primer Pago</Label>
              <Input value={paymentTerms.primerPagoMomento || ''} onChange={e => setPaymentTerms({ ...paymentTerms, primerPagoMomento: e.target.value })} placeholder="A la firma del contrato" />
            </div>
            <div className="space-y-2">
              <Label>Segundo Pago (%)</Label>
              <Input type="number" value={paymentTerms.segundoPagoPorcentaje || ''} onChange={e => setPaymentTerms({ ...paymentTerms, segundoPagoPorcentaje: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Momento del Segundo Pago</Label>
              <Input value={paymentTerms.segundoPagoMomento || ''} onChange={e => setPaymentTerms({ ...paymentTerms, segundoPagoMomento: e.target.value })} placeholder="El día hábil después de la actuación" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Condiciones Adicionales</Label>
            <Textarea value={paymentTerms.condicionesAdicionales || ''} onChange={e => setPaymentTerms({ ...paymentTerms, condicionesAdicionales: e.target.value })} rows={2} />
          </div>
        </div>
      )}
    </div>
  );

  // Step 5: Legal Clauses — grouped with Collapsible
  const renderLegalStep = () => (
    <div className="space-y-3">
      {CLAUSE_SECTIONS.map((section, sIdx) => (
        <Collapsible key={sIdx} defaultOpen={sIdx === 0}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors text-left">
            <span className="font-medium text-sm">{section.title}</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3 pl-2">
            {section.clauses.map(item => (
              <div key={item.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{item.label}</Label>
                <Textarea 
                  value={legalClauses[item.key]} 
                  onChange={e => setLegalClauses({ ...legalClauses, [item.key]: e.target.value })} 
                  rows={3}
                  className="text-sm"
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => setLegalClauses(DEFAULT_LEGAL_CLAUSES)}
        className="w-full"
      >
        Restaurar Cláusulas Predeterminadas
      </Button>
    </div>
  );

  const downloadPDF = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // ── Constants ──
    const PW = 210; // page width
    const PH = 297; // page height
    const ML = 25;  // margin left
    const MR = 20;  // margin right
    const MB = 25;  // margin bottom
    const TW = PW - ML - MR; // text width
    const LH = 5.5; // line height
    const HEADER_Y = 30; // y after header
    const FONT = 'helvetica';

    // ── Safe helper ──
    const safe = (v: any, fb = '') => {
      if (v === undefined || v === null || v === 'undefined' || v === 'null' || v === '') return fb;
      if (typeof v === 'boolean') return v ? 'SÍ' : 'NO';
      return String(v);
    };

    const clean = (s: string) =>
      s.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/–/g, '-').replace(/—/g, '-').replace(/…/g, '...').replace(/\u00A0/g, ' ');

    // ── Logo preload ──
    let logoImg: HTMLImageElement | null = null;
    let logoAR = 1;
    try {
      logoImg = await new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = mooditaLogo;
      });
      logoAR = logoImg.naturalWidth / logoImg.naturalHeight;
    } catch { logoImg = null; }

    let pageNum = 1;

    // ── addHeader ──
    const addHeader = () => {
      const logoH = 12;
      if (logoImg) {
        const logoW = logoH * logoAR;
        const logoX = (PW - logoW) / 2;
        doc.addImage(logoImg, 'PNG', logoX, 8, logoW, logoH);
      }
      // Brand text
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('MOODITA', PW / 2, 22, { align: 'center' });
      // Separator line
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.line(ML, 25, PW - MR, 25);
      doc.setTextColor(0);
    };

    // ── addPageNumber ──
    const addPageNumber = () => {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(String(pageNum), PW - MR, PH - 10, { align: 'right' });
      doc.setTextColor(0);
    };

    // ── y cursor ──
    let y = HEADER_Y;

    const ensureSpace = (needed: number) => {
      if (y + needed > PH - MB) {
        addPageNumber();
        doc.addPage();
        pageNum++;
        addHeader();
        y = HEADER_Y;
      }
    };

    // ── drawJustifiedLine: manual word-spacing justification ──
    const drawJustifiedLine = (text: string, x: number, yPos: number, maxW: number) => {
      const words = text.split(' ').filter(w => w.length > 0);
      if (words.length <= 1) { doc.text(text, x, yPos); return; }
      const totalTextW = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
      const extraSpace = (maxW - totalTextW) / (words.length - 1);
      let cx = x;
      words.forEach((word, idx) => {
        doc.text(word, cx, yPos);
        if (idx < words.length - 1) cx += doc.getTextWidth(word) + extraSpace;
      });
    };

    // ── addParagraph: renders justified multi-line text ──
    const addParagraph = (text: string, x: number, fontSize = 10, fontStyle: 'normal' | 'bold' = 'normal') => {
      doc.setFont(FONT, fontStyle);
      doc.setFontSize(fontSize);
      const maxW = PW - x - MR;
      const lines: string[] = doc.splitTextToSize(clean(text), maxW);
      lines.forEach((line: string, idx: number) => {
        ensureSpace(LH);
        const isLast = idx === lines.length - 1;
        if (!isLast && line.trim().split(' ').length > 1) {
          drawJustifiedLine(line, x, y, maxW);
        } else {
          doc.text(line, x, y);
        }
        y += LH;
      });
    };

    const addBlankLine = (h = LH) => { y += h; };

    const addCenteredText = (text: string, fontSize = 10, fontStyle: 'normal' | 'bold' = 'normal') => {
      ensureSpace(LH + 2);
      doc.setFont(FONT, fontStyle);
      doc.setFontSize(fontSize);
      doc.text(clean(text), PW / 2, y, { align: 'center' });
      y += LH;
    };

    const addRightText = (text: string, fontSize = 10) => {
      ensureSpace(LH);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(fontSize);
      doc.text(clean(text), PW - MR, y, { align: 'right' });
      y += LH;
    };

    const addSectionTitle = (text: string) => {
      addBlankLine(3);
      ensureSpace(LH + 4);
      doc.setFont(FONT, 'bold');
      doc.setFontSize(10);
      doc.text(clean(text.toUpperCase()), ML, y);
      y += LH + 1;
    };

    const addLabelValue = (label: string, value: string, indent = ML) => {
      ensureSpace(LH);
      doc.setFont(FONT, 'bold');
      doc.setFontSize(10);
      const labelText = clean(label + ': ');
      const labelW = doc.getTextWidth(labelText);
      doc.text(labelText, indent, y);
      doc.setFont(FONT, 'normal');
      const valMaxW = PW - indent - labelW - MR;
      const valLines: string[] = doc.splitTextToSize(clean(value), valMaxW);
      if (valLines.length === 1) {
        doc.text(valLines[0], indent + labelW, y);
        y += LH;
      } else {
        doc.text(valLines[0], indent + labelW, y);
        y += LH;
        for (let i = 1; i < valLines.length; i++) {
          ensureSpace(LH);
          const isLast = i === valLines.length - 1;
          if (!isLast && valLines[i].trim().split(' ').length > 1) {
            drawJustifiedLine(valLines[i], indent + labelW, y, valMaxW);
          } else {
            doc.text(valLines[i], indent + labelW, y);
          }
          y += LH;
        }
      }
    };

    // ═══════════════════════════════════════
    // PAGE 1 — Header + Title + Parties
    // ═══════════════════════════════════════
    addHeader();

    addBlankLine(4);
    addCenteredText('CONTRATO CON PROMOTOR PARA LA ACTUACIÓN PÚBLICA DE ARTISTA', 12, 'bold');
    addBlankLine(3);

    addRightText(`En ${safe(agentData.direccion.split(',').pop()?.trim(), 'Madrid')}, el ${safe(contractDate)}.`, 10);
    addBlankLine(4);

    // Parties
    addParagraph('DE UNA PARTE:', ML, 10, 'bold');
    addBlankLine(1);
    addParagraph(
      `${safe(agentData.representante)}, en nombre y representación como Administrador de la sociedad ${safe(agentData.nombre)}, con C.I.F. número ${safe(agentData.cif)} con domicilio social ${safe(agentData.direccion)} (en lo sucesivo, EL AGENTE).`,
      ML
    );
    addBlankLine(3);

    addParagraph('DE LA OTRA:', ML, 10, 'bold');
    addBlankLine(1);
    const promoterIntro = `${safe(promoterData.representante)}${promoterData.cargo ? `, en calidad de ${safe(promoterData.cargo)},` : ''} en nombre y representación de ${safe(promoterData.nombre)}${promoterData.cif ? `, con C.I.F número ${safe(promoterData.cif)}` : ''}${promoterData.direccion ? ` con domicilio social ${safe(promoterData.direccion)}` : ''} (en lo sucesivo, EL PROMOTOR).`;
    addParagraph(promoterIntro, ML);
    addBlankLine(5);

    addCenteredText('PACTAN:', 10, 'bold');
    addBlankLine(2);
    addParagraph('El compromiso de actuación del artista en las condiciones particulares y generales detalladas a continuación y en sus correspondientes Anexos.', ML);
    addBlankLine(4);

    // ═══════════════════════════════════════
    // CONDITIONS TABLE (jspdf-autotable)
    // ═══════════════════════════════════════
    addCenteredText('CONDICIONES PARTICULARES', 11, 'bold');
    addBlankLine(2);

    const finalConditions = { ...conditions, precioTickets: ticketPrices };

    const ticketsText = finalConditions.precioTickets.length > 0
      ? finalConditions.precioTickets.map(p => `${safe(p.tipo, 'General')}: ${safe(p.precio, 'TBC')}`).join(' / ')
      : 'TBC';

    const horariosText = [
      `- Montaje y prueba sonido: ${safe(finalConditions.montajePrueba, 'TBC')}`,
      `- Apertura puertas: ${safe(finalConditions.aperturaPuertas, 'TBC')}`,
      `- Inicio concierto: ${safe(finalConditions.inicioConcierto, 'TBC')}`,
      `- Curfew: ${safe(finalConditions.curfew, 'TBC')}`,
    ].join('\n');

    const tableBody: (string | { content: string; colSpan?: number; styles?: any })[][] = [
      [{ content: 'ARTISTA', styles: { fontStyle: 'bold' } }, { content: safe(finalConditions.artista, 'TBC'), colSpan: 2 }],
      [{ content: 'CIUDAD', styles: { fontStyle: 'bold' } }, { content: safe(finalConditions.ciudad, 'TBC'), colSpan: 2 }],
      [
        { content: `AFORO\n${safe(finalConditions.aforo, 'TBC')}`, styles: { fontStyle: 'bold', halign: 'center' } },
        { content: `RECINTO\n${safe(finalConditions.recinto, 'TBC')}`, styles: { fontStyle: 'bold', halign: 'center' } },
        { content: `EVENTO\n${safe(finalConditions.evento, 'TBC')}`, styles: { fontStyle: 'bold', halign: 'center' } },
      ],
      [{ content: 'BILLING', styles: { fontStyle: 'bold' } }, { content: safe(finalConditions.billing, 'TBC'), colSpan: 2 }],
      [{ content: 'OTROS ARTISTAS/DJs', styles: { fontStyle: 'bold' } }, { content: safe(finalConditions.otrosArtistas, 'SIN ESPECIFICAR'), colSpan: 2 }],
      [{ content: 'FECHA ANUNCIO', styles: { fontStyle: 'bold' } }, { content: safe(finalConditions.fechaAnuncio, 'TBC'), colSpan: 2 }],
      [{ content: 'FECHA ACTUACIÓN', styles: { fontStyle: 'bold' } }, { content: safe(finalConditions.fechaActuacion, 'TBC'), colSpan: 2 }],
      [{ content: 'DURACIÓN ACTUACIÓN', styles: { fontStyle: 'bold' } }, { content: safe(finalConditions.duracion, 'TBC'), colSpan: 2 }],
      [{ content: 'HORARIOS', styles: { fontStyle: 'bold' } }, { content: horariosText, colSpan: 2 }],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      body: tableBody,
      theme: 'grid',
      styles: {
        font: FONT,
        fontSize: 9,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 45 },
      },
      didDrawPage: () => {
        addHeader();
        addPageNumber();
      },
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // ═══════════════════════════════════════
    // Post-table fields
    // ═══════════════════════════════════════
    addLabelValue('CACHÉ GARANTIZADO', `${safe(finalConditions.cacheGarantizado, 'TBC')}${finalConditions.comisionAgencia ? ` (${safe(finalConditions.comisionAgencia)} Comisión Agencia incluida)` : ''}`);
    addLabelValue('PRECIO TICKETS', ticketsText);
    addLabelValue('SPONSORS', safe(finalConditions.sponsors, 'No, y nunca en caja escénica sin previo acuerdo'));
    addBlankLine(2);
    addLabelValue('RIDER TÉCNICO', safe(finalConditions.riderTecnico));
    addLabelValue('RIDER HOSPITALIDAD', safe(finalConditions.riderHospitalidad, 'Catering de cortesía'));
    addLabelValue('HOTELES', safe(finalConditions.hoteles));
    addLabelValue('TRANSPORTE INTERNO', safe(finalConditions.transporteInterno));
    addLabelValue('VUELOS', safe(finalConditions.vuelos));
    addLabelValue('BACKLINE', safe(finalConditions.backline));

    // ═══════════════════════════════════════
    // Payment
    // ═══════════════════════════════════════
    addBlankLine(4);
    addSectionTitle('FORMA DE PAGO');
    const paymentLines = generatePaymentText_internal();
    paymentLines.forEach(line => addParagraph(line, ML + 5));
    addBlankLine(3);

    addParagraph('Los pagos se realizarán mediante transferencia bancaria a:', ML);
    addBlankLine(1);
    addLabelValue('Titular', safe(agentData.nombre), ML + 10);
    addLabelValue('Banco', safe(agentData.banco), ML + 10);
    addLabelValue('IBAN', safe(agentData.iban), ML + 10);
    addBlankLine(3);

    // Contrato firme clause
    addParagraph(clean(legalClauses.contratoFirme), ML, 10, 'normal');
    addBlankLine(2);
    addParagraph('El CONTRATO está formado por estas CONDICIONES PARTICULARES, las CONDICIONES GENERALES que siguen y los RIDERS anexos. En caso de contradicciones entre los términos de las CONDICIONES GENERALES y los RIDERS, prevalecerá lo establecido en los RIDERS.', ML);

    // ═══════════════════════════════════════
    // CONDICIONES GENERALES
    // ═══════════════════════════════════════
    addBlankLine(6);
    addCenteredText('CONDICIONES GENERALES', 11, 'bold');
    addBlankLine(3);

    // Section rendering helper
    const addClauseSection = (num: string, title: string, subclauses: { num: string; title?: string; text: string }[]) => {
      addSectionTitle(`${num}. ${title}`);
      subclauses.forEach(sc => {
        addBlankLine(1);
        if (sc.title) {
          addParagraph(`${sc.num}. ${sc.title}`, ML, 10, 'bold');
        } else {
          doc.setFont(FONT, 'bold');
          doc.setFontSize(10);
          ensureSpace(LH);
          doc.text(`${sc.num}.`, ML, y);
          y += LH;
        }
        addParagraph(sc.text, ML + 5);
      });
    };

    addClauseSection('1', 'OBJETO DEL CONTRATO Y DERECHOS DE PROPIEDAD INTELECTUAL', [
      { num: '1.1', text: legalClauses.propiedadIntelectual },
      { num: '1.2', text: legalClauses.grabaciones },
    ]);

    addClauseSection('2', 'DERECHOS DE IMAGEN; PUBLICIDAD, PATROCINIO Y MERCHANDISING', [
      { num: '2.1', text: legalClauses.publicidad },
      { num: '2.2', text: legalClauses.noAnunciarSinPago },
      { num: '2.3', text: legalClauses.patrocinios },
      { num: '2.4', text: legalClauses.merchandising },
      { num: '2.5', title: 'MERCHANDISING', text: legalClauses.merchandisingDerechos },
    ]);

    addClauseSection('3', 'RECINTO, ESCENARIO Y CAMERINOS', [
      { num: '3.1', text: legalClauses.recinto },
      { num: '3.2', text: legalClauses.calidadEquipo },
      { num: '3.3', title: 'CAMERINOS', text: legalClauses.camerinos },
    ]);

    addClauseSection('4', 'RIDERS TÉCNICO Y HOSPITALITY - CONTROL CREATIVO Y TIEMPO DE ACTUACIÓN', [
      { num: '4.1', text: legalClauses.riders },
      { num: '4.2', title: 'RETRASOS', text: legalClauses.retrasos },
    ]);

    addClauseSection('5', 'OTRAS OBLIGACIONES DEL PROMOTOR', [
      { num: '5.1', text: legalClauses.obligaciones },
      { num: '5.2', title: 'SEGUROS E INDEMNIDAD', text: legalClauses.segurosIndemnidad },
      { num: '5.3', title: 'CERTIFICADOS DE SEGUROS', text: legalClauses.certificadosSeguros },
      { num: '5.4', title: 'CANCELACIÓN', text: legalClauses.cancelacion },
      { num: '5.5', title: 'FUERZA MAYOR', text: legalClauses.fuerzaMayor },
      { num: '5.6', title: 'RESTRICCIONES SANITARIAS', text: legalClauses.covid },
      { num: '5.7', title: 'IMPAGO Y PENALIZACIÓN', text: legalClauses.impagoPenalizacion },
      { num: '5.8', title: 'TICKETING Y REPORTING', text: legalClauses.ticketingReporting },
      { num: '5.9', title: 'INVITACIONES', text: legalClauses.invitaciones },
      { num: '5.10', title: 'LIQUIDACIÓN SGAE', text: legalClauses.liquidacionSGAE },
      { num: '5.11', title: 'PORCENTAJE SOBRE BENEFICIOS', text: legalClauses.porcentajeBeneficios },
    ]);

    // Section 6 - Effectiveness
    addSectionTitle('6. EFECTIVIDAD DEL CONTRATO');
    addParagraph('Las partes aceptan expresamente que el hecho de que el Promotor anuncie públicamente la celebración de la actuación que es el objeto de este contrato será interpretado como una aceptación de todos los términos y condiciones del presente contrato, produciendo éste plenos efectos entre las partes. Los cambios, enmiendas o modificaciones que el Promotor haga por escrito en el contrato y los Riders no producirán efecto alguno hasta que sean aprobados por el Agente por escrito.', ML + 5);

    // Section 7 - Confidentiality
    addSectionTitle('7. CONFIDENCIALIDAD');
    addParagraph(legalClauses.confidencialidad, ML + 5);

    // Section 8 - Jurisdiction
    addSectionTitle('8. LEY Y JURISDICCIÓN');
    addParagraph(legalClauses.jurisdiccion, ML + 5);

    addBlankLine(3);
    addParagraph('Y en prueba de su conformidad, firman el presente contrato y sus anexos, por duplicado y a un solo efecto, en el lugar y fecha arriba indicados.', ML);

    // ═══════════════════════════════════════
    // SIGNATURE BLOCK
    // ═══════════════════════════════════════
    ensureSpace(50);
    addBlankLine(10);

    const sigColW = TW / 2;
    const sigLeftX = ML;
    const sigRightX = ML + sigColW;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.text('EL AGENTE', sigLeftX + sigColW / 2, y, { align: 'center' });
    doc.text('EL PROMOTOR', sigRightX + sigColW / 2, y, { align: 'center' });
    y += 25; // space for signature

    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.text('_________________________', sigLeftX + sigColW / 2, y, { align: 'center' });
    doc.text('_________________________', sigRightX + sigColW / 2, y, { align: 'center' });
    y += LH;
    doc.text(safe(agentData.representante), sigLeftX + sigColW / 2, y, { align: 'center' });
    doc.text(safe(promoterData.representante), sigRightX + sigColW / 2, y, { align: 'center' });
    y += LH;
    doc.setFontSize(8);
    doc.text(safe(agentData.nombre), sigLeftX + sigColW / 2, y, { align: 'center' });
    doc.text(safe(promoterData.nombre), sigRightX + sigColW / 2, y, { align: 'center' });

    // ── Final page numbers ──
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i === 1) addHeader(); // ensure first page header
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(String(i), PW - MR, PH - 10, { align: 'right' });
      doc.setTextColor(0);
    }

    // ── Save ──
    const fileName = `Contrato_${safe(conditions.artista, 'Artista').replace(/\s+/g, '_')}_${safe(conditions.evento || conditions.ciudad, 'booking')}.pdf`;
    doc.save(fileName);
    toast({ description: 'PDF descargado correctamente' });
  };

  // Helper for payment text inside PDF (avoids importing internal function)
  const generatePaymentText_internal = (): string[] => {
    switch (paymentTerms.tipo) {
      case 'post-concierto':
        return ['- A pagar por transferencia bancaria, 100% el día posterior al concierto, previa presentación de factura.'];
      case '50-50':
        return ['- 50% A la firma del presente contrato.', '- 50% El día hábil después de la actuación.'];
      case 'personalizado': {
        const lines: string[] = [];
        if (paymentTerms.primerPagoPorcentaje && paymentTerms.primerPagoMomento) {
          lines.push(`- ${paymentTerms.primerPagoPorcentaje}% ${paymentTerms.primerPagoMomento}`);
        }
        if (paymentTerms.segundoPagoPorcentaje && paymentTerms.segundoPagoMomento) {
          lines.push(`- ${paymentTerms.segundoPagoPorcentaje}% ${paymentTerms.segundoPagoMomento}`);
        }
        if (paymentTerms.condicionesAdicionales) lines.push(paymentTerms.condicionesAdicionales);
        return lines.length ? lines : ['- Condiciones de pago a acordar'];
      }
      default:
        return ['- A pagar por transferencia bancaria, 100% el día posterior al concierto, previa presentación de factura.'];
    }
  };

  // Step 6: Preview
  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
          {generateContract()}
        </pre>
      </div>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={copyToClipboard}>
          <ClipboardCopy className="h-4 w-4 mr-2" />
          Copiar al portapapeles
        </Button>
        <Button variant="outline" onClick={downloadPDF}>
          <Download className="h-4 w-4 mr-2" />
          Descargar PDF
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderAgentStep();
      case 1: return renderPromoterStep();
      case 2: return renderConditionsStep();
      case 3: return renderPaymentStep();
      case 4: return renderLegalStep();
      case 5: return renderPreviewStep();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => { onOpenChange(isOpen); if (!isOpen) { resetForm(); setCurrentDraft(null); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Generador de Contratos
            </DialogTitle>
            {currentDraft && <DraftStatusBanner status={currentDraft.status} />}
          </div>
        </DialogHeader>

        {renderStepIndicator()}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {WIZARD_STEPS[currentStep].icon}
              {WIZARD_STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>{WIZARD_STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[50vh] overflow-y-auto">
            {renderCurrentStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={currentStep === 0 ? () => onOpenChange(false) : handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
                <Save className="h-4 w-4 mr-2" />
                {currentDraft ? 'Actualizar borrador' : 'Guardar borrador'}
              </Button>
              {currentDraft && (
                <Button variant="outline" onClick={handleShareLink}>
                  {copiedLink ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                  {copiedLink ? 'Copiado' : 'Compartir link'}
                </Button>
              )}
              <Button onClick={handleSave} disabled={currentDraft?.status === 'en_negociacion'}>
                <FileText className="h-4 w-4 mr-2" />
                Guardar Contrato
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { ContractGenerator };
export default ContractGenerator;
