import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { ContactSelector } from '@/components/ContactSelector';
import { Calendar, Users, DollarSign, Plus, X, AlertTriangle, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateSolicitudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSolicitudCreated: () => void;
  projectId?: string;
  bookingId?: string;
  artistId?: string;
  defaultTipo?: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro';
  bookingData?: any;
}

export function CreateSolicitudDialog({ open, onOpenChange, onSolicitudCreated, projectId, bookingId, artistId, defaultTipo, bookingData }: CreateSolicitudDialogProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [artistFormats, setArtistFormats] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    tipo: (defaultTipo ?? '') as 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro' | '',
    nombre_solicitante: '',
    email: '',
    telefono: '',
    observaciones: '',
    notas_internas: '',
    artist_id: artistId ?? '',
    fecha_limite_respuesta: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10),
    prioridad: 'normal' as 'baja' | 'normal' | 'alta' | 'urgente',
    
    // Campos específicos para entrevistas
    medio: '',
    nombre_entrevistador: '',
    nombre_programa: '',
    hora_entrevista: '',
    informacion_programa: '',
    
    // Campos específicos para bookings - matching CreateBookingWizard
    nombre_festival: '',
    lugar_concierto: '',
    ciudad: '',
    pais: '',
    direccion: '',
    hora_show: '',
    capacidad: '',
    fechas_opcionales: [] as string[],
    formato: '',
    // Buyer/Promotor
    promotor_contact_id: '',
    promotor_tab: 'existing' as 'existing' | 'new',
    new_promotor: {
      name: '',
      company: '',
      email: '',
      phone: '',
    },
    // Deal info
    deal_type: 'flat_fee' as 'flat_fee' | 'door_split',
    fee: '',
    door_split_percentage: '',
    condiciones: '',
    
    // Campos específicos para licencias
    oferta: '',
    
    // Campo libre para tipo "otro"
    descripcion_libre: '',
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setStep(1);
    setFormData({
      tipo: '',
      nombre_solicitante: '',
      email: '',
      telefono: '',
      observaciones: '',
      notas_internas: '',
      artist_id: '',
      fecha_limite_respuesta: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10),
      prioridad: 'normal',
      medio: '',
      nombre_entrevistador: '',
      nombre_programa: '',
      hora_entrevista: '',
      informacion_programa: '',
      nombre_festival: '',
      lugar_concierto: '',
      ciudad: '',
      pais: '',
      direccion: '',
      hora_show: '',
      capacidad: '',
      fechas_opcionales: [],
      formato: '',
      promotor_contact_id: '',
      promotor_tab: 'existing',
      new_promotor: { name: '', company: '', email: '', phone: '' },
      deal_type: 'flat_fee',
      fee: '',
      door_split_percentage: '',
      condiciones: '',
      oferta: '',
      descripcion_libre: '',
    });
    setFieldErrors({});
  };

  // Fetch contacts for promotor selector
  useEffect(() => {
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, company, email, phone')
        .order('name')
        .limit(500);
      if (error) {
        console.error('Error loading contacts:', error);
        return;
      }
      setContacts(data || []);
    };
    fetchContacts();
  }, []);

  // Pre-fill from booking data when opening from a booking context
  useEffect(() => {
    if (!open || !bookingData) return;

    // Try to find matching contact for promotor
    const promotorText = (bookingData.promotor || '').trim().toLowerCase();
    const matchedContact = promotorText
      ? contacts.find(c =>
          (c.name || '').toLowerCase().includes(promotorText) ||
          (c.company || '').toLowerCase().includes(promotorText)
        )
      : null;

    setFormData(prev => ({
      ...prev,
      tipo: 'booking',
      artist_id: bookingData.artist_id || prev.artist_id,
      nombre_festival: bookingData.festival_ciclo || '',
      lugar_concierto: bookingData.venue || bookingData.lugar || '',
      ciudad: bookingData.ciudad || '',
      pais: bookingData.pais || '',
      hora_show: bookingData.hora || '',
      capacidad: bookingData.capacidad ? String(bookingData.capacidad) : '',
      formato: bookingData.formato || '',
      fee: bookingData.fee != null ? String(bookingData.fee) : '',
      deal_type: 'flat_fee',
      condiciones: bookingData.condiciones || '',
      observaciones: bookingData.info_comentarios || bookingData.notas || '',
      fechas_opcionales: bookingData.fecha ? [bookingData.fecha] : [],
      promotor_contact_id: matchedContact?.id || '',
      promotor_tab: matchedContact ? 'existing' : (bookingData.promotor ? 'new' : 'existing'),
      new_promotor: matchedContact || !bookingData.promotor
        ? prev.new_promotor
        : { name: bookingData.promotor, company: '', email: '', phone: '' },
    }));
  }, [open, bookingData, contacts]);

  // Fetch artist formats when artist changes
  useEffect(() => {
    const fetchArtistFormats = async () => {
      if (!formData.artist_id) {
        setArtistFormats([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('booking_products')
          .select('id, name')
          .eq('artist_id', formData.artist_id)
          .eq('is_active', true)
          .order('sort_order');
        
        if (error) throw error;
        setArtistFormats(data || []);
        
        // Reset format if current selection is not in new artist's formats
        if (formData.formato && data && !data.some(f => f.name === formData.formato)) {
          setFormData(prev => ({ ...prev, formato: '' }));
        }
      } catch (error) {
        console.error('Error fetching artist formats:', error);
        setArtistFormats([]);
      }
    };
    
    fetchArtistFormats();
  }, [formData.artist_id]);

  // Función para extraer contenido clave del texto
  const extractKeyContent = (text: string): string => {
    if (!text) return '';
    
    // Remove common prefixes and clean up
    let content = text.replace(/^(Solicitud de |Tema\/proyecto:\s*|Asunto principal:\s*|Detalle\/contexto:\s*|Detalle de la solicitud:\s*|Consulta|Información)/i, '');
    
    // Split by newlines and take the first meaningful line
    const lines = content.split('\n').filter(line => line.trim().length > 3);
    if (lines.length > 0) {
      content = lines[0];
    }
    
    // Clean up extra characters and spaces
    content = content.replace(/^[:\s\-–]+/, '').trim();
    
    // Remove common words and get key terms (max 3 words)
    const words = content.split(' ')
      .filter(word => 
        word.length > 2 && 
        !['hauriem', 'hauríem', 'de', 'el', 'la', 'que', 'per', 'amb', 'una', 'un', 'les', 'els', 'del', 'al', 'com', 'quan', 'per', 'sobre', 'si', 'saber', 'decidir', 'treiem'].includes(word.toLowerCase())
      )
      .slice(0, 3);
    
    return words.join(' ');
  };

  // Función para generar automáticamente el asunto de la solicitud
  const generateSubject = () => {
    const { tipo } = formData;
    let subject = '';

    switch (tipo) {
      case 'entrevista':
        if (formData.nombre_programa) {
          subject = `Entrevista ${formData.nombre_programa}`;
        } else if (formData.medio) {
          subject = `Entrevista ${formData.medio}`;
        } else {
          subject = 'Entrevista';
        }
        break;

      case 'booking':
        if (formData.nombre_festival) {
          subject = `Booking ${formData.nombre_festival}`;
        } else if (formData.lugar_concierto) {
          subject = `Booking ${formData.lugar_concierto}`;
        } else if (formData.ciudad) {
          subject = `Booking ${formData.ciudad}`;
        } else {
          subject = 'Booking';
        }
        break;

      case 'consulta':
        if (formData.descripcion_libre) {
          const keyContent = extractKeyContent(formData.descripcion_libre);
          // Special handling for "nom oficial" type queries
          if (keyContent.toLowerCase().includes('nom') && keyContent.toLowerCase().includes('oficial')) {
            subject = 'Consulta: Nom Oficial';
          } else if (keyContent) {
            subject = `Consulta: ${keyContent}`;
          } else {
            subject = 'Consulta';
          }
        } else {
          subject = 'Consulta';
        }
        break;

      case 'informacion':
        if (formData.descripcion_libre) {
          const keyContent = extractKeyContent(formData.descripcion_libre);
          // Special handling for release/single information
          if (keyContent.toLowerCase().includes('single') || keyContent.toLowerCase().includes('release')) {
            subject = keyContent.toLowerCase().includes('primer') ? 'Información: Release primer single' : 'Información: Release single';
          } else if (keyContent) {
            subject = `Información: ${keyContent}`;
          } else {
            subject = 'Información';
          }
        } else {
          subject = 'Información';
        }
        break;

      case 'licencia':
        if (formData.oferta) {
          const keyContent = extractKeyContent(formData.oferta);
          subject = keyContent ? `Licencia: ${keyContent}` : 'Licencia';
        } else {
          subject = 'Licencia';
        }
        break;

      case 'otro':
        if (formData.descripcion_libre) {
          const keyContent = extractKeyContent(formData.descripcion_libre);
          subject = keyContent || 'Solicitud';
        } else {
          subject = 'Solicitud';
        }
        break;

      default:
        subject = 'Solicitud';
    }

    return subject;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, boolean> = {};
    
    if (!formData.tipo) {
      errors.tipo = true;
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios marcados en rojo.",
        variant: "destructive",
      });
      return;
    }
    
    setFieldErrors({});

    // Generar automáticamente el asunto si no hay nombre_solicitante o está vacío
    const generatedSubject = generateSubject();
    const finalNombreSolicitante = formData.nombre_solicitante.trim() || generatedSubject;

    try {
      if (!profile?.user_id) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Create promotor contact if needed
      let promotorContactId = formData.promotor_contact_id || null;
      if (formData.tipo === 'booking' && formData.promotor_tab === 'new' && formData.new_promotor.name) {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            name: formData.new_promotor.name,
            company: formData.new_promotor.company,
            email: formData.new_promotor.email,
            phone: formData.new_promotor.phone,
            category: 'promotor',
            created_by: profile.user_id,
          })
          .select()
          .single();
        if (!contactError && newContact) {
          promotorContactId = newContact.id;
        }
      }

      const solicitudData = {
        tipo: formData.tipo as 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro',
        nombre_solicitante: finalNombreSolicitante,
        email: formData.email || null,
        telefono: formData.telefono || null,
        observaciones: formData.observaciones || null,
        notas_internas: formData.notas_internas || null,
        created_by: profile.user_id,
        artist_id: formData.artist_id || artistId || null,
        fecha_limite_respuesta: formData.fecha_limite_respuesta || null,
        project_id: projectId || null,
        booking_id: bookingId || null,
        prioridad: formData.prioridad,
        
        // Campos específicos según el tipo
        ...(formData.tipo === 'entrevista' && {
          medio: formData.medio || null,
          nombre_entrevistador: formData.nombre_entrevistador || null,
          nombre_programa: formData.nombre_programa || null,
          hora_entrevista: formData.hora_entrevista || null,
          informacion_programa: formData.informacion_programa || null,
        }),
        
        ...(formData.tipo === 'booking' && {
          hora_show: formData.hora_show || null,
          nombre_festival: formData.nombre_festival || null,
          lugar_concierto: formData.lugar_concierto || null,
          ciudad: formData.ciudad || null,
          pais: formData.pais || null,
          direccion: formData.direccion || null,
          capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
          fechas_opcionales: formData.fechas_opcionales.length > 0 
            ? formData.fechas_opcionales.filter(f => f) 
            : null,
          formato: formData.formato || null,
          promotor_contact_id: promotorContactId,
          deal_type: formData.deal_type,
          fee: formData.deal_type === 'flat_fee' && formData.fee ? parseFloat(formData.fee) : null,
          door_split_percentage: formData.deal_type === 'door_split' && formData.door_split_percentage 
            ? parseFloat(formData.door_split_percentage) 
            : null,
          condiciones: formData.condiciones || null,
        }),
        
        ...(formData.tipo === 'licencia' && {
          oferta: formData.oferta || null,
        }),
        
        ...((formData.tipo === 'otro' || formData.tipo === 'consulta' || formData.tipo === 'informacion') && {
          descripcion_libre: formData.descripcion_libre || null,
        }),
      };

      console.log('Creating solicitud with data:', solicitudData);

      const { data, error } = await supabase
        .from('solicitudes')
        .insert(solicitudData)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Solicitud created successfully:', data);

      toast({
        title: "Solicitud creada",
        description: "La solicitud se ha creado correctamente.",
      });

      onSolicitudCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud.",
        variant: "destructive",
      });
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tipo" className={fieldErrors.tipo ? "text-destructive" : ""}>
          Tipo de Solicitud *
          {fieldErrors.tipo && <span className="text-xs block text-destructive mt-1">Campo obligatorio</span>}
        </Label>
        <Select
          value={formData.tipo}
          onValueChange={(value: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro') => {
            setFormData({ ...formData, tipo: value });
            if (fieldErrors.tipo) {
              setFieldErrors(prev => ({ ...prev, tipo: false }));
            }
          }}
        >
          <SelectTrigger className={fieldErrors.tipo ? "border-destructive ring-destructive" : ""} disabled={!!bookingData}>
            <SelectValue placeholder="Selecciona el tipo de solicitud" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entrevista">Entrevista</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="consulta">Consulta</SelectItem>
            <SelectItem value="informacion">Información</SelectItem>
            <SelectItem value="licencia">Licencia</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre_solicitante">
          Asunto de la Solicitud 
          <span className="text-sm text-muted-foreground ml-2">(opcional - se generará automáticamente)</span>
        </Label>
        <Input
          id="nombre_solicitante"
          value={formData.nombre_solicitante}
          onChange={(e) => setFormData({ ...formData, nombre_solicitante: e.target.value })}
          placeholder="Déjalo vacío para generar automáticamente"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="+34 600 000 000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha_limite_respuesta">Fecha límite de respuesta</Label>
          <Input
            id="fecha_limite_respuesta"
            type="date"
            value={formData.fecha_limite_respuesta}
            onChange={(e) => setFormData({ ...formData, fecha_limite_respuesta: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Por defecto: +7 días</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Prioridad
          </Label>
          <Select
            value={formData.prioridad}
            onValueChange={(value: 'baja' | 'normal' | 'alta' | 'urgente') => 
              setFormData({ ...formData, prioridad: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Baja
                </span>
              </SelectItem>
              <SelectItem value="normal">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Normal
                </span>
              </SelectItem>
              <SelectItem value="alta">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Alta
                </span>
              </SelectItem>
              <SelectItem value="urgente">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Urgente
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="artist_id">Artista Asociado</Label>
        <SingleArtistSelector
          value={formData.artist_id}
          onValueChange={(value) => setFormData({ ...formData, artist_id: value })}
          placeholder="Selecciona un artista (opcional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Comentarios de la solicitante</Label>
        <Textarea
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          placeholder="Información adicional sobre la solicitud"
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={() => setStep(2)}
          disabled={!formData.tipo}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {formData.tipo === 'entrevista' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📻 Información de la Entrevista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medio">Medio</Label>
              <Input
                id="medio"
                value={formData.medio}
                onChange={(e) => setFormData({ ...formData, medio: e.target.value })}
                placeholder="Nombre del medio (radio, TV, podcast, etc.)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre_entrevistador">Nombre del Entrevistador</Label>
              <Input
                id="nombre_entrevistador"
                value={formData.nombre_entrevistador}
                onChange={(e) => setFormData({ ...formData, nombre_entrevistador: e.target.value })}
                placeholder="Nombre del periodista o presentador"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre_programa">Nombre del Programa</Label>
              <Input
                id="nombre_programa"
                value={formData.nombre_programa}
                onChange={(e) => setFormData({ ...formData, nombre_programa: e.target.value })}
                placeholder="Nombre del programa o sección"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_entrevista">Fecha y Hora</Label>
              <Input
                id="hora_entrevista"
                type="datetime-local"
                value={formData.hora_entrevista}
                onChange={(e) => setFormData({ ...formData, hora_entrevista: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="informacion_programa">Información del Programa</Label>
              <Textarea
                id="informacion_programa"
                value={formData.informacion_programa}
                onChange={(e) => setFormData({ ...formData, informacion_programa: e.target.value })}
                placeholder="Descripción del programa, audiencia, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {formData.tipo === 'consulta' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💬 Información de la Consulta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion_libre">Descripción de la Consulta</Label>
              <Textarea
                id="descripcion_libre"
                value={formData.descripcion_libre}
                onChange={(e) => setFormData({ ...formData, descripcion_libre: e.target.value })}
                placeholder="Describe detalladamente la consulta que necesitas realizar"
                rows={5}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {formData.tipo === 'informacion' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ℹ️ Información Solicitada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion_libre">Tipo de Información</Label>
              <Textarea
                id="descripcion_libre"
                value={formData.descripcion_libre}
                onChange={(e) => setFormData({ ...formData, descripcion_libre: e.target.value })}
                placeholder="Especifica qué información necesitas (biografía, fotos, rider técnico, etc.)"
                rows={5}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {formData.tipo === 'licencia' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Información de la Licencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oferta">Oferta</Label>
              <Textarea
                id="oferta"
                value={formData.oferta}
                onChange={(e) => setFormData({ ...formData, oferta: e.target.value })}
                placeholder="Describe la oferta para la licencia (propósito, duración, territorio, etc.)"
                rows={5}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {formData.tipo === 'booking' && (
        <div className="space-y-6">
          {/* Sección 1: Datos Generales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datos Generales
              </CardTitle>
              <CardDescription>Información básica del evento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre_festival">Nombre del Evento / Festival</Label>
                  <Input
                    id="nombre_festival"
                    value={formData.nombre_festival}
                    onChange={(e) => setFormData({ ...formData, nombre_festival: e.target.value })}
                    placeholder="Ej: Primavera Sound 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lugar_concierto">Venue <span className="text-destructive">*</span></Label>
                  <Input
                    id="lugar_concierto"
                    value={formData.lugar_concierto}
                    onChange={(e) => setFormData({ ...formData, lugar_concierto: e.target.value })}
                    placeholder="Ej: Sala Apolo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    placeholder="Ej: Barcelona"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pais">País</Label>
                  <Input
                    id="pais"
                    value={formData.pais}
                    onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                    placeholder="Ej: España"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Ej: C/ Nou de la Rambla, 113"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hora_show">Fecha <span className="text-destructive">*</span></Label>
                  <Input
                    id="hora_show"
                    type="datetime-local"
                    value={formData.hora_show}
                    onChange={(e) => setFormData({ ...formData, hora_show: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacidad">Capacidad</Label>
                  <Input
                    id="capacidad"
                    type="number"
                    value={formData.capacidad}
                    onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
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
                    onClick={() => setFormData({
                      ...formData,
                      fechas_opcionales: [...formData.fechas_opcionales, '']
                    })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Añadir fecha
                  </Button>
                </div>
                {formData.fechas_opcionales.map((fecha, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="date"
                      value={fecha}
                      onChange={(e) => {
                        const newFechas = [...formData.fechas_opcionales];
                        newFechas[index] = e.target.value;
                        setFormData({ ...formData, fechas_opcionales: newFechas });
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newFechas = formData.fechas_opcionales.filter((_, i) => i !== index);
                        setFormData({ ...formData, fechas_opcionales: newFechas });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sección 2: Buyer / Promotor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Buyer / Promotor
              </CardTitle>
              <CardDescription>Selecciona o crea el promotor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs 
                value={formData.promotor_tab} 
                onValueChange={(v) => setFormData({ ...formData, promotor_tab: v as 'existing' | 'new' })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Contacto Existente</TabsTrigger>
                  <TabsTrigger value="new">Crear Nuevo</TabsTrigger>
                </TabsList>
                <TabsContent value="existing" className="mt-4">
                  <div className="space-y-2">
                    <Label>Seleccionar Promotor/Buyer</Label>
                    <ContactSelector
                      value={formData.promotor_contact_id}
                      onValueChange={(value) => setFormData({ ...formData, promotor_contact_id: value })}
                      artistId={formData.artist_id || undefined}
                      placeholder={formData.artist_id ? "Buscar contacto del artista..." : "Selecciona primero un artista"}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="new" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre <span className="text-destructive">*</span></Label>
                      <Input
                        value={formData.new_promotor.name}
                        onChange={(e) => setFormData({
                          ...formData,
                          new_promotor: { ...formData.new_promotor, name: e.target.value }
                        })}
                        placeholder="Nombre del contacto"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input
                        value={formData.new_promotor.company}
                        onChange={(e) => setFormData({
                          ...formData,
                          new_promotor: { ...formData.new_promotor, company: e.target.value }
                        })}
                        placeholder="Nombre de la promotora"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.new_promotor.email}
                        onChange={(e) => setFormData({
                          ...formData,
                          new_promotor: { ...formData.new_promotor, email: e.target.value }
                        })}
                        placeholder="email@promotora.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        value={formData.new_promotor.phone}
                        onChange={(e) => setFormData({
                          ...formData,
                          new_promotor: { ...formData.new_promotor, phone: e.target.value }
                        })}
                        placeholder="+34 600 000 000"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Sección 3: Deal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Deal Info
              </CardTitle>
              <CardDescription>Condiciones económicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Deal</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deal_type: 'flat_fee' })}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      formData.deal_type === 'flat_fee'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2",
                        formData.deal_type === 'flat_fee'
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )} />
                      <span className="font-medium">Flat Fee</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Caché fijo</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deal_type: 'door_split' })}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      formData.deal_type === 'door_split'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2",
                        formData.deal_type === 'door_split'
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )} />
                      <span className="font-medium">Door Split</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">% de taquilla</p>
                  </button>
                </div>
              </div>

              {formData.deal_type === 'flat_fee' ? (
                <div className="space-y-2">
                  <Label>Fee (€) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                    placeholder="Ej: 5000"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Porcentaje de taquilla (%) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={formData.door_split_percentage}
                    onChange={(e) => setFormData({ ...formData, door_split_percentage: e.target.value })}
                    placeholder="Ej: 70"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={formData.formato}
                  onValueChange={(value) => setFormData({ ...formData, formato: value })}
                  disabled={!formData.artist_id || artistFormats.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.artist_id 
                        ? "Selecciona primero un artista (Paso 1)" 
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

              <div className="space-y-2">
                <Label htmlFor="condiciones">Condiciones</Label>
                <Textarea
                  id="condiciones"
                  value={formData.condiciones}
                  onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
                  placeholder="Condiciones especiales del deal..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {formData.tipo === 'otro' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📌 Información Adicional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion_libre">Descripción de la Solicitud</Label>
              <Textarea
                id="descripcion_libre"
                value={formData.descripcion_libre}
                onChange={(e) => setFormData({ ...formData, descripcion_libre: e.target.value })}
                placeholder="Describe detalladamente la solicitud"
                rows={5}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="notas_internas">Notas Internas</Label>
        <Textarea
          id="notas_internas"
          value={formData.notas_internas}
          onChange={(e) => setFormData({ ...formData, notas_internas: e.target.value })}
          placeholder="Notas para uso interno del equipo"
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => setStep(1)}>
          Anterior
        </Button>
        <Button type="submit">
          Crear Solicitud
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nueva Solicitud - Paso {step} de 2
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Completa la información básica de la solicitud"
              : "Añade información específica según el tipo de solicitud"
            }
          </DialogDescription>
        </DialogHeader>

        {bookingData && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            📋 Datos pre-rellenados desde el booking
            {bookingData.festival_ciclo ? ` "${bookingData.festival_ciclo}"` : ''}
            {bookingData.venue ? ` — ${bookingData.venue}` : ''}.
            <span className="text-muted-foreground"> Puedes editarlos antes de crear la solicitud.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {step === 1 ? renderStep1() : renderStep2()}
        </form>
      </DialogContent>
    </Dialog>
  );
}