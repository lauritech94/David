import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useBookingCalendarSync } from '@/hooks/useBookingCalendarSync';
import { useBookingFolders } from '@/hooks/useBookingFolders';
import { BookingStatusCombobox } from './BookingStatusCombobox';
import { ContactSelector } from './ContactSelector';
import { SingleArtistSelector } from './SingleArtistSelector';
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft,
  Building2,
  User,
  Music,
  FileText,
  Check,
  Circle,
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateBookingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferCreated: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'general',
    title: 'Datos Generales',
    description: 'Información básica del evento',
    icon: <Calendar className="h-5 w-5" />
  },
  {
    id: 'buyer',
    title: 'Buyer / Promotor',
    description: 'Selecciona o crea el promotor',
    icon: <Users className="h-5 w-5" />
  },
  {
    id: 'deal',
    title: 'Deal Info',
    description: 'Artista y condiciones económicas',
    icon: <DollarSign className="h-5 w-5" />
  }
];

export function CreateBookingWizard({ 
  open, 
  onOpenChange, 
  onOfferCreated 
}: CreateBookingWizardProps) {
  const { profile } = useAuth();
  const { syncBookingWithCalendar } = useBookingCalendarSync();
  const { createEventFolder } = useBookingFolders();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [artistFormats, setArtistFormats] = useState<{ id: string; name: string }[]>([]);
  
  // Form data organized by step
  const [generalData, setGeneralData] = useState({
    festival_ciclo: '',
    venue: '',
    ciudad: '',
    pais: '',
    lugar: '',
    fecha: '',
    hora: '',
    capacidad: '',
    fechas_opcionales: [] as string[],
  });
  
  const [buyerData, setBuyerData] = useState({
    contacto: '',
    promotor: '',
    newContact: {
      name: '',
      company: '',
      email: '',
      phone: '',
      vat_id: '',
    }
  });
  
  const [dealData, setDealData] = useState({
    artist_id: '',
    deal_type: 'flat_fee', // flat_fee | door_split
    fee: '',
    door_split_percentage: '',
    estado: 'pendiente',
    formato: '',
    oferta: '',
    condiciones: '',
    info_comentarios: '',
  });

  useEffect(() => {
    if (open) {
      fetchContacts();
      resetForm();
    }
  }, [open]);

  // Fetch artist formats when artist changes
  useEffect(() => {
    const fetchArtistFormats = async () => {
      if (!dealData.artist_id) {
        setArtistFormats([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('booking_products')
          .select('id, name')
          .eq('artist_id', dealData.artist_id)
          .eq('is_active', true)
          .order('sort_order');
        
        if (error) throw error;
        setArtistFormats(data || []);
        
        // Reset format if current selection is not in new artist's formats
        if (dealData.formato && data && !data.some(f => f.name === dealData.formato)) {
          setDealData(prev => ({ ...prev, formato: '' }));
        }
      } catch (error) {
        console.error('Error fetching artist formats:', error);
        setArtistFormats([]);
      }
    };
    
    fetchArtistFormats();
  }, [dealData.artist_id]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, company, email, phone')
        .order('name');
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setGeneralData({
      festival_ciclo: '',
      venue: '',
      ciudad: '',
      pais: '',
      lugar: '',
      fecha: '',
      hora: '',
      capacidad: '',
      fechas_opcionales: [],
    });
    setBuyerData({
      contacto: '',
      promotor: '',
      newContact: {
        name: '',
        company: '',
        email: '',
        phone: '',
        vat_id: '',
      }
    });
    setDealData({
      artist_id: '',
      deal_type: 'flat_fee',
      fee: '',
      door_split_percentage: '',
      estado: 'pendiente',
      formato: '',
      oferta: '',
      condiciones: '',
      info_comentarios: '',
    });
    setShowNewContactForm(false);
  };

  // Phase requires fee/hora when not in 'pendiente' (Interés)
  const isOfferPhaseOrBeyond = () => dealData.estado !== 'pendiente';

  const getStepMissingFields = (step: number): string[] => {
    const missing: string[] = [];
    if (step === 0) {
      if (!generalData.fecha) missing.push('Fecha');
      if (!generalData.venue && !generalData.festival_ciclo) missing.push('Venue o Festival/Ciclo');
      if (isOfferPhaseOrBeyond() && !generalData.hora) missing.push('Hora');
    } else if (step === 1) {
      if (showNewContactForm) {
        if (!buyerData.newContact.name) missing.push('Nombre del nuevo contacto');
      } else {
        if (!buyerData.contacto) missing.push('Contacto / Promotor');
      }
    } else if (step === 2) {
      if (!dealData.artist_id) missing.push('Artista');
      if (isOfferPhaseOrBeyond()) {
        if (dealData.deal_type === 'flat_fee' && !dealData.fee) missing.push('Fee (€)');
        if (dealData.deal_type === 'door_split' && !dealData.door_split_percentage) missing.push('Porcentaje de Taquilla (%)');
      }
    }
    return missing;
  };

  const getAllMissingFields = (): string[] => {
    return [0, 1, 2].flatMap(getStepMissingFields);
  };

  const canProceed = () => getStepMissingFields(currentStep).length === 0;

  const handleNext = () => {
    const missing = getStepMissingFields(currentStep);
    if (missing.length > 0) {
      toast({
        title: 'Faltan campos obligatorios',
        description: missing.join(', '),
        variant: 'destructive',
      });
      return;
    }
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateContact = async () => {
    if (!buyerData.newContact.name) return null;
    
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: buyerData.newContact.name,
          company: buyerData.newContact.company,
          email: buyerData.newContact.email,
          phone: buyerData.newContact.phone,
          category: 'promotor',
          created_by: profile?.user_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el contacto",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSubmit = async () => {
    const missing = getAllMissingFields();
    if (missing.length > 0) {
      toast({
        title: 'Faltan campos obligatorios',
        description: missing.join(', '),
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    
    try {
      // Create contact if needed
      let contactId = buyerData.contacto;
      if (showNewContactForm && buyerData.newContact.name) {
        const newContact = await handleCreateContact();
        if (newContact) {
          contactId = newContact.id;
        }
      }

      // Map estado to phase for Kanban compatibility
      const estadoToPhase: Record<string, string> = {
        'pendiente': 'interes',
        'oferta': 'oferta',
        'negociacion': 'negociacion',
        'confirmado': 'confirmado',
        'cancelado': 'cancelado',
      };

      // Build offer data
      const offerData = {
        // General
        festival_ciclo: generalData.festival_ciclo,
        venue: generalData.venue,
        ciudad: generalData.ciudad,
        pais: generalData.pais,
        lugar: generalData.lugar,
        fecha: generalData.fecha,
        hora: generalData.hora,
        capacidad: generalData.capacidad ? parseInt(generalData.capacidad) : null,
        
        // Buyer
        contacto: contactId,
        promotor: buyerData.promotor || buyerData.newContact.company,
        
        // Deal
        artist_id: dealData.artist_id || null,
        fee: dealData.deal_type === 'flat_fee' && dealData.fee ? parseFloat(dealData.fee) : null,
        oferta: dealData.deal_type === 'door_split' 
          ? `Door Split: ${dealData.door_split_percentage}%` 
          : dealData.oferta,
        estado: dealData.estado,
        phase: estadoToPhase[dealData.estado] || 'interes',
        formato: dealData.formato,
        condiciones: dealData.condiciones,
        info_comentarios: dealData.info_comentarios,
        
        // Optional dates stored in adjuntos JSON field
        adjuntos: generalData.fechas_opcionales.length > 0 
          ? { fechas_opcionales: generalData.fechas_opcionales.filter(f => f) }
          : null,
        
        // Metadata
        created_by: profile?.user_id,
      };

      const { data, error } = await supabase
        .from('booking_offers')
        .insert([offerData])
        .select()
        .single();

      if (error) throw error;

      // Sync with calendar if confirmed
      if (data && data.estado === 'confirmado' && profile?.user_id) {
        await syncBookingWithCalendar(null, data, profile.user_id);
      }

      // Create event folder
      if (data && (data.estado === 'confirmado' || data.estado === 'pendiente')) {
        await createEventFolder(data);
      }

      toast({
        title: "Evento creado",
        description: "El booking se ha creado correctamente.",
      });

      onOfferCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el booking.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {WIZARD_STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => index < currentStep && setCurrentStep(index)}
            disabled={index > currentStep}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
              index === currentStep && "bg-primary text-primary-foreground",
              index < currentStep && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
              index > currentStep && "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current">
              {index < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </span>
            <span className="hidden sm:inline font-medium">{step.title}</span>
          </button>
          {index < WIZARD_STEPS.length - 1 && (
            <ChevronRight className={cn(
              "h-5 w-5 mx-2",
              index < currentStep ? "text-primary" : "text-muted-foreground"
            )} />
          )}
        </div>
      ))}
    </div>
  );

  const renderGeneralStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="festival_ciclo">Nombre del Evento / Festival</Label>
          <Input
            id="festival_ciclo"
            value={generalData.festival_ciclo}
            onChange={(e) => setGeneralData({ ...generalData, festival_ciclo: e.target.value })}
            placeholder="Ej: Primavera Sound 2025"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="venue">Venue <span className="text-destructive">*</span></Label>
          <Input
            id="venue"
            value={generalData.venue}
            onChange={(e) => setGeneralData({ ...generalData, venue: e.target.value })}
            placeholder="Ej: Sala Apolo"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input
            id="ciudad"
            value={generalData.ciudad}
            onChange={(e) => setGeneralData({ ...generalData, ciudad: e.target.value })}
            placeholder="Ej: Barcelona"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pais">País</Label>
          <Input
            id="pais"
            value={generalData.pais}
            onChange={(e) => setGeneralData({ ...generalData, pais: e.target.value })}
            placeholder="Ej: España"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lugar">Dirección</Label>
          <Input
            id="lugar"
            value={generalData.lugar}
            onChange={(e) => setGeneralData({ ...generalData, lugar: e.target.value })}
            placeholder="Ej: C/ Nou de la Rambla, 113"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha <span className="text-destructive">*</span></Label>
          <Input
            id="fecha"
            type="date"
            value={generalData.fecha}
            onChange={(e) => setGeneralData({ ...generalData, fecha: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="hora">Hora {isOfferPhaseOrBeyond() && <span className="text-destructive">*</span>}</Label>
          <Input
            id="hora"
            type="time"
            value={generalData.hora}
            onChange={(e) => setGeneralData({ ...generalData, hora: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacidad">Capacidad</Label>
          <Input
            id="capacidad"
            type="number"
            value={generalData.capacidad}
            onChange={(e) => setGeneralData({ ...generalData, capacidad: e.target.value })}
            placeholder="Ej: 1500"
          />
        </div>
      </div>

      {/* Fechas opcionales */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">
            Fechas opcionales
            <span className="ml-2 text-xs">(si el festival/sala tiene varios días disponibles)</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setGeneralData({
              ...generalData,
              fechas_opcionales: [...generalData.fechas_opcionales, '']
            })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir fecha
          </Button>
        </div>
        
        {generalData.fechas_opcionales.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {generalData.fechas_opcionales.map((fecha, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    const newFechas = [...generalData.fechas_opcionales];
                    newFechas[index] = e.target.value;
                    setGeneralData({ ...generalData, fechas_opcionales: newFechas });
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    const newFechas = generalData.fechas_opcionales.filter((_, i) => i !== index);
                    setGeneralData({ ...generalData, fechas_opcionales: newFechas });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderBuyerStep = () => (
    <div className="space-y-6">
      <Tabs defaultValue="existing" onValueChange={(v) => setShowNewContactForm(v === 'new')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing">Contacto Existente</TabsTrigger>
          <TabsTrigger value="new">Crear Nuevo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="existing" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Seleccionar Promotor/Buyer <span className="text-destructive">*</span></Label>
            <Select
              value={buyerData.contacto}
              onValueChange={(value) => {
                const contact = contacts.find(c => c.id === value);
                setBuyerData({ 
                  ...buyerData, 
                  contacto: value,
                  promotor: contact?.company || contact?.name || ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Buscar contacto..." />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    <div className="flex flex-col">
                      <span>{contact.name}</span>
                      {contact.company && (
                        <span className="text-xs text-muted-foreground">{contact.company}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {buyerData.contacto && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                {(() => {
                  const contact = contacts.find(c => c.id === buyerData.contacto);
                  return contact ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{contact.name}</span>
                      </div>
                      {contact.company && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{contact.company}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="text-sm text-muted-foreground">{contact.email}</div>
                      )}
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="new" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_name">Nombre <span className="text-destructive">*</span></Label>
              <Input
                id="new_name"
                value={buyerData.newContact.name}
                onChange={(e) => setBuyerData({
                  ...buyerData,
                  newContact: { ...buyerData.newContact, name: e.target.value }
                })}
                placeholder="Nombre del contacto"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new_company">Empresa</Label>
              <Input
                id="new_company"
                value={buyerData.newContact.company}
                onChange={(e) => setBuyerData({
                  ...buyerData,
                  newContact: { ...buyerData.newContact, company: e.target.value }
                })}
                placeholder="Nombre de la empresa"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_email">Email</Label>
              <Input
                id="new_email"
                type="email"
                value={buyerData.newContact.email}
                onChange={(e) => setBuyerData({
                  ...buyerData,
                  newContact: { ...buyerData.newContact, email: e.target.value }
                })}
                placeholder="email@ejemplo.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new_phone">Teléfono</Label>
              <Input
                id="new_phone"
                value={buyerData.newContact.phone}
                onChange={(e) => setBuyerData({
                  ...buyerData,
                  newContact: { ...buyerData.newContact, phone: e.target.value }
                })}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_vat">VAT ID / CIF</Label>
            <Input
              id="new_vat"
              value={buyerData.newContact.vat_id}
              onChange={(e) => setBuyerData({
                ...buyerData,
                newContact: { ...buyerData.newContact, vat_id: e.target.value }
              })}
              placeholder="Ej: B12345678"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderDealStep = () => (
    <div className="space-y-6">
      {/* Artist Selection */}
      <div className="space-y-2">
        <Label>Artista <span className="text-destructive">*</span></Label>
        <SingleArtistSelector
          value={dealData.artist_id || null}
          onValueChange={(value) => setDealData({ ...dealData, artist_id: value || '' })}
          placeholder="Seleccionar artista..."
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de Deal</Label>
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary",
              dealData.deal_type === 'flat_fee' && "border-primary bg-primary/5"
            )}
            onClick={() => setDealData({ ...dealData, deal_type: 'flat_fee' })}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2",
                  dealData.deal_type === 'flat_fee' 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground"
                )} />
                <div>
                  <div className="font-medium">Flat Fee</div>
                  <div className="text-sm text-muted-foreground">Caché fijo</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary",
              dealData.deal_type === 'door_split' && "border-primary bg-primary/5"
            )}
            onClick={() => setDealData({ ...dealData, deal_type: 'door_split' })}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2",
                  dealData.deal_type === 'door_split' 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground"
                )} />
                <div>
                  <div className="font-medium">Door Split</div>
                  <div className="text-sm text-muted-foreground">% de taquilla</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {dealData.deal_type === 'flat_fee' ? (
        <div className="space-y-2">
          <Label htmlFor="fee">Fee (€) {isOfferPhaseOrBeyond() && <span className="text-destructive">*</span>}</Label>
          <Input
            id="fee"
            type="number"
            value={dealData.fee}
            onChange={(e) => setDealData({ ...dealData, fee: e.target.value })}
            placeholder="Ej: 5000"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="door_split">Porcentaje de Taquilla (%) {isOfferPhaseOrBeyond() && <span className="text-destructive">*</span>}</Label>
          <Input
            id="door_split"
            type="number"
            value={dealData.door_split_percentage}
            onChange={(e) => setDealData({ ...dealData, door_split_percentage: e.target.value })}
            placeholder="Ej: 70"
            min="0"
            max="100"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Estado</Label>
          <BookingStatusCombobox
            value={dealData.estado}
            onValueChange={(value) => setDealData({ ...dealData, estado: value })}
            placeholder="Seleccionar estado"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Formato</Label>
          <Select
            value={dealData.formato}
            onValueChange={(value) => setDealData({ ...dealData, formato: value })}
            disabled={!dealData.artist_id || artistFormats.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !dealData.artist_id 
                  ? "Selecciona primero un artista" 
                  : artistFormats.length === 0 
                    ? "No hay formatos configurados"
                    : "Seleccionar formato"
              } />
            </SelectTrigger>
            <SelectContent>
              {artistFormats.map((format) => (
                <SelectItem key={format.id} value={format.name}>
                  {format.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="condiciones">Condiciones</Label>
        <Textarea
          id="condiciones"
          value={dealData.condiciones}
          onChange={(e) => setDealData({ ...dealData, condiciones: e.target.value })}
          placeholder="Condiciones especiales del deal..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas internas</Label>
        <Textarea
          id="notas"
          value={dealData.info_comentarios}
          onChange={(e) => setDealData({ ...dealData, info_comentarios: e.target.value })}
          placeholder="Notas adicionales..."
          rows={2}
        />
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderGeneralStep();
      case 1:
        return renderBuyerStep();
      case 2:
        return renderDealStep();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nueva Oferta</DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {WIZARD_STEPS[currentStep].icon}
              {WIZARD_STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>{WIZARD_STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const missing = getStepMissingFields(currentStep);
              if (missing.length === 0) return null;
              return (
                <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <span className="font-medium">Faltan campos obligatorios: </span>
                  {missing.join(', ')}
                </div>
              );
            })()}
            {renderCurrentStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={currentStep === 0 ? () => onOpenChange(false) : handleBack}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button 
              onClick={handleNext}
              disabled={loading}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Booking'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
