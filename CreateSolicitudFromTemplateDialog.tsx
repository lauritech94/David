import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Calendar, Mic, HelpCircle, Info, Scale, MoreHorizontal, Users, DollarSign, X, MapPin, UserCheck } from "lucide-react";

import { TeamMemberSelector } from "@/components/TeamMemberSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { SingleArtistSelector } from "@/components/SingleArtistSelector";
import { ContactSelector } from "@/components/ContactSelector";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

interface CreateSolicitudFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const templates = [
  {
    id: 'booking',
    title: 'Booking',
    description: 'Registra una oferta de actuación: concierto, festival, evento privado o gira.',
    nextStep: 'Crea automáticamente un Booking Offer en el pipeline. Al aprobarse, pasa a Negociación y se puede vincular al calendario.',
    badge: 'Más frecuente',
    badgeClassName: 'bg-blue-100 text-blue-700 border-0',
    iconBg: 'bg-blue-600',
    icon: Calendar,
    color: 'bg-blue-100 text-blue-800',
    nextStepBg: 'bg-blue-50 border-blue-100',
    nextStepText: 'text-blue-700',
    nextStepDot: 'text-blue-500',
    priority: 1,
    fields: [
      'fecha',
      'festival_ciclo',
      'ciudad',
      'lugar',
      'capacidad',
      'hora',
      'formato',
      'status_booking',
      'oferta',
      'condiciones',
      'comentarios'
    ]
  },
  {
    id: 'entrevista',
    title: 'Entrevista',
    description: 'Aparición en medios: radio, TV, podcast o prensa escrita.',
    nextStep: 'Al aprobarla, puedes programar el encuentro y crear un evento en el calendario.',
    badge: 'Medios',
    badgeClassName: 'bg-green-100 text-green-700 border-0',
    iconBg: 'bg-green-600',
    icon: Mic,
    color: 'bg-green-100 text-green-800',
    nextStepBg: 'bg-green-50 border-green-100',
    nextStepText: 'text-green-700',
    nextStepDot: 'text-green-500',
    priority: 2,
    fields: [
      'programa',
      'medio_canal',
      'fecha_hora',
      'formato_entrevista',
      'nombre_entrevistador',
      'informacion_adicional'
    ]
  },
  {
    id: 'licencia',
    title: 'Licencia',
    description: 'Uso de tu obra en medios, publicidad o proyectos de terceros.',
    nextStep: 'Registra los derechos solicitados. Al aprobarla, genera un contrato de licencia (Master / Composición).',
    badge: 'Derechos',
    badgeClassName: 'bg-amber-100 text-amber-700 border-0',
    iconBg: 'bg-amber-600',
    icon: Scale,
    color: 'bg-amber-100 text-amber-800',
    nextStepBg: 'bg-amber-50 border-amber-100',
    nextStepText: 'text-amber-700',
    nextStepDot: 'text-amber-500',
    priority: 3,
    fields: [
      'tipo_licencia',
      'obra_licenciar',
      'medio_proyecto',
      'territorio',
      'duracion',
      'empresa_artista_solicitante'
    ]
  },
  {
    id: 'consulta',
    title: 'Consulta',
    description: 'Decisión interna o pregunta que requiere respuesta del equipo.',
    nextStep: 'Se gestiona internamente. Al resolverse, se archiva con comentario de cierre.',
    badge: 'Interna',
    badgeClassName: 'bg-violet-100 text-violet-700 border-0',
    iconBg: 'bg-violet-600',
    icon: HelpCircle,
    color: 'bg-yellow-100 text-yellow-800',
    nextStepBg: 'bg-violet-50 border-violet-100',
    nextStepText: 'text-violet-700',
    nextStepDot: 'text-violet-500',
    priority: 4,
    fields: [
      'asunto',
      'descripcion_contexto',
      'prioridad',
      'contacto',
      'tipo_respuesta'
    ]
  },
  {
    id: 'informacion',
    title: 'Información',
    description: 'Petición de datos concretos sobre un proyecto o artista.',
    nextStep: 'Se gestiona internamente. Al resolverse, se archiva con comentario de cierre.',
    badge: 'Datos',
    badgeClassName: 'bg-orange-100 text-orange-700 border-0',
    iconBg: 'bg-orange-500',
    icon: Info,
    color: 'bg-purple-100 text-purple-800',
    nextStepBg: 'bg-orange-50 border-orange-100',
    nextStepText: 'text-orange-700',
    nextStepDot: 'text-orange-500',
    priority: 5,
    fields: [
      'tema_proyecto',
      'detalle_solicitado',
      'tipo_respuesta'
    ]
  },
  {
    id: 'otros',
    title: 'Otros',
    description: 'Solicitudes no categorizadas. Tú decides el flujo.',
    nextStep: 'Solicitud libre. Puedes asignar responsable y añadir notas de seguimiento.',
    badge: '',
    badgeClassName: '',
    iconBg: 'bg-slate-500',
    icon: MoreHorizontal,
    color: 'bg-gray-100 text-gray-800',
    nextStepBg: 'bg-slate-50 border-slate-100',
    nextStepText: 'text-slate-600',
    nextStepDot: 'text-slate-400',
    priority: 6,
    fields: [
      'asunto',
      'descripcion',
      'contacto',
      'tipo_respuesta'
    ]
  }
];

export function CreateSolicitudFromTemplateDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateSolicitudFromTemplateDialogProps) {
  const { profile } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [artistFormats, setArtistFormats] = useState<{ id: string; name: string }[]>([]);
  const [showNewFormatInput, setShowNewFormatInput] = useState(false);
  const [newFormatName, setNewFormatName] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({
    contact_id: '',
    artist_id: '',
    prioridad: 'media',
    observaciones: '',
  });

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

  // Auto-promote booking_status: si se introduce un fee y el usuario no ha tocado
  // el estado manualmente, pasar de 'interest' a 'offer'. Si se borra el fee, volver.
  useEffect(() => {
    if (selectedTemplate !== 'booking') return;
    if (formData.booking_status_touched) return;

    const hasFee =
      (formData.deal_type === 'flat_fee' && parseFloat(formData.fee || '0') > 0) ||
      (formData.deal_type === 'door_split' && parseFloat(formData.door_split_percentage || '0') > 0);

    const desired = hasFee ? 'offer' : 'interest';
    if (formData.booking_status !== desired) {
      setFormData(prev => ({ ...prev, booking_status: desired }));
    }
  }, [
    selectedTemplate,
    formData.fee,
    formData.door_split_percentage,
    formData.deal_type,
    formData.booking_status_touched,
    formData.booking_status,
  ]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setStep('form');
    // Reset form with template-specific structure
    setFormData({
      contact_id: '',
      artist_id: '',
      prioridad: 'media',
      observaciones: '',
      // Template-specific fields
      ...(templateId === 'booking' && {
        fecha: '',
        festival_ciclo: '',
        ciudad: '',
        pais: '',
        lugar: '',
        direccion: '',
        capacidad: '',
        hora: '',
        fechas_opcionales: [] as string[],
        formato: '',
        // Buyer/Promotor
        promotor_tab: 'existing' as 'existing' | 'new',
        promotor_contact_id: '',
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
        comentarios: '',
        // Estado del booking (auto: interest por defecto, offer si hay fee)
        booking_status: 'interest',
        booking_status_touched: false,
        required_approvers: [] as string[],
      }),
      ...(templateId === 'entrevista' && {
        programa: '',
        medio_canal: '',
        fecha_hora: '',
        formato_entrevista: '',
        nombre_entrevistador: '',
        informacion_adicional: ''
      }),
      ...(templateId === 'consulta' && {
        asunto: '',
        descripcion_contexto: '',
        prioridad: 'media',
        contacto: '',
        tipo_respuesta: ''
      }),
      ...(templateId === 'informacion' && {
        tema_proyecto: '',
        detalle_solicitado: '',
        tipo_respuesta: ''
      }),
      ...(templateId === 'licencia' && {
        tipo_licencia: '',
        obra_licenciar: '',
        medio_proyecto: '',
        territorio: '',
        duracion: '',
        empresa_artista_solicitante: ''
      }),
      ...(templateId === 'otros' && {
        asunto: '',
        descripcion: '',
        contacto: '',
        tipo_respuesta: ''
      })
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.artist_id) {
      toast({
        title: "Error",
        description: "El artista es requerido.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get contact information for the solicitud
      const { data: contactData } = await supabase
        .from('contacts')
        .select('name, email, phone')
        .eq('id', formData.contact_id)
        .single();

      const template = templates.find(t => t.id === selectedTemplate);
      const tipo = selectedTemplate as 'booking' | 'entrevista' | 'consulta' | 'informacion' | 'licencia' | 'otros';

      // Prepare solicitud data based on template
      const solicitudData: any = {
        tipo,
        nombre_solicitante: contactData?.name || 'Sin nombre',
        email: contactData?.email || null,
        telefono: contactData?.phone || null,
        contact_id: formData.contact_id || null,
        artist_id: formData.artist_id,
        observaciones: formData.observaciones || null,
        created_by: profile?.user_id,
        estado: 'pendiente'
      };

      // Establecer fecha límite según prioridad seleccionada
      const priorityDays: Record<string, number> = { urgente: 1, alta: 3, media: 7, baja: 14 };
      const selectedPriority = (formData.prioridad || 'media').toLowerCase();
      const daysToAdd = priorityDays[selectedPriority] ?? 7;
      solicitudData.fecha_limite_respuesta = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      // Add template-specific fields to descripcion_libre as structured text
      let descripcionLibre = `Solicitud de ${template?.title}\n`;
      const prioridadLabelMap: Record<string, string> = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
      const prioridadLabel = prioridadLabelMap[(formData.prioridad || 'media').toLowerCase()] || 'Media';
      descripcionLibre += `Prioridad: ${prioridadLabel}\n\n`;
      if (selectedTemplate === 'booking') {
        // Create promotor contact if needed
        let promotorContactId = formData.promotor_contact_id || null;
        if (formData.promotor_tab === 'new' && formData.new_promotor?.name) {
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              name: formData.new_promotor.name,
              company: formData.new_promotor.company,
              email: formData.new_promotor.email,
              phone: formData.new_promotor.phone,
              category: 'promotor',
              created_by: profile?.user_id,
            })
            .select()
            .single();
          if (!contactError && newContact) {
            promotorContactId = newContact.id;
          }
        }

        descripcionLibre += `Fecha: ${formData.fecha || 'No especificada'}\n`;
        descripcionLibre += `Festival / Ciclo: ${formData.festival_ciclo || 'No especificado'}\n`;
        descripcionLibre += `Ciudad: ${formData.ciudad || 'No especificada'}\n`;
        descripcionLibre += `País: ${formData.pais || 'No especificado'}\n`;
        descripcionLibre += `Venue: ${formData.lugar || 'No especificado'}\n`;
        descripcionLibre += `Dirección: ${formData.direccion || 'No especificada'}\n`;
        descripcionLibre += `Capacidad: ${formData.capacidad || 'No especificada'}\n`;
        descripcionLibre += `Hora: ${formData.hora || 'No especificada'}\n`;
        descripcionLibre += `Formato: ${formData.formato || 'No especificado'}\n`;
        descripcionLibre += `Estado Booking: ${formData.booking_status || 'interest'}\n`;
        descripcionLibre += `Deal Type: ${formData.deal_type === 'flat_fee' ? 'Fee Fijo' : 'Door Split'}\n`;
        if (formData.deal_type === 'flat_fee') {
          descripcionLibre += `Fee: ${formData.fee ? `€${formData.fee}` : 'No especificado'}\n`;
        } else {
          descripcionLibre += `Door Split: ${formData.door_split_percentage || 'No especificado'}%\n`;
        }
        descripcionLibre += `Condiciones: ${formData.condiciones || 'No especificadas'}\n`;
        descripcionLibre += `Comentarios: ${formData.comentarios || 'No especificados'}\n`;
        
        // Map to existing fields where possible
        solicitudData.nombre_festival = formData.festival_ciclo || null;
        solicitudData.ciudad = formData.ciudad || null;
        solicitudData.pais = formData.pais || null;
        solicitudData.lugar_concierto = formData.lugar || null;
        solicitudData.direccion = formData.direccion || null;
        solicitudData.capacidad = formData.capacidad ? parseInt(formData.capacidad) : null;
        solicitudData.hora_show = formData.fecha && formData.hora ? new Date(formData.fecha + 'T' + formData.hora).toISOString() : null;
        solicitudData.formato = formData.formato || null;
        solicitudData.fechas_opcionales = formData.fechas_opcionales?.length > 0 
          ? formData.fechas_opcionales.filter((f: string) => f) 
          : null;
        solicitudData.promotor_contact_id = promotorContactId;
        solicitudData.deal_type = formData.deal_type;
        solicitudData.fee = formData.deal_type === 'flat_fee' && formData.fee ? parseFloat(formData.fee) : null;
        solicitudData.door_split_percentage = formData.deal_type === 'door_split' && formData.door_split_percentage 
          ? parseFloat(formData.door_split_percentage) 
          : null;
        solicitudData.condiciones = formData.condiciones || null;
        // Save booking status and required approvers
        (solicitudData as any).booking_status = formData.booking_status || 'interest';
        (solicitudData as any).required_approvers = formData.required_approvers || [];
      }

      if (selectedTemplate === 'entrevista') {
        descripcionLibre += `Programa: ${formData.programa || 'No especificado'}\n`;
        descripcionLibre += `Medio / Canal: ${formData.medio_canal || 'No especificado'}\n`;
        descripcionLibre += `Fecha y hora: ${formData.fecha_hora || 'No especificada'}\n`;
        descripcionLibre += `Formato: ${formData.formato_entrevista || 'No especificado'}\n`;
        descripcionLibre += `Nombre del entrevistador: ${formData.nombre_entrevistador || 'No especificado'}\n`;
        descripcionLibre += `Información adicional: ${formData.informacion_adicional || 'No especificada'}\n`;
        
        // Map to existing fields where possible
        solicitudData.medio = formData.medio_canal || null;
        solicitudData.nombre_programa = formData.programa || null;
        solicitudData.nombre_entrevistador = formData.nombre_entrevistador || null;
        solicitudData.hora_entrevista = formData.fecha_hora ? new Date(formData.fecha_hora).toISOString() : null;
        solicitudData.informacion_programa = formData.informacion_adicional || null;
      }

      if (selectedTemplate === 'consulta') {
        descripcionLibre += `Asunto: ${formData.asunto || 'No especificado'}\n`;
        descripcionLibre += `Descripción / contexto: ${formData.descripcion_contexto || 'No especificada'}\n`;
        descripcionLibre += `Prioridad: ${formData.prioridad || 'Media'}\n`;
        descripcionLibre += `Contacto: ${formData.contacto || 'No especificado'}\n`;
        descripcionLibre += `Tipo de respuesta: ${formData.tipo_respuesta || 'No especificado'}\n`;
      }

      if (selectedTemplate === 'informacion') {
        descripcionLibre += `Tema o proyecto: ${formData.tema_proyecto || 'No especificado'}\n`;
        descripcionLibre += `Detalle de lo solicitado: ${formData.detalle_solicitado || 'No especificado'}\n`;
        descripcionLibre += `Tipo de respuesta: ${formData.tipo_respuesta || 'No especificado'}\n`;
      }

      if (selectedTemplate === 'licencia') {
        descripcionLibre += `Tipo de licencia: ${formData.tipo_licencia || 'No especificado'}\n`;
        descripcionLibre += `Obra a licenciar: ${formData.obra_licenciar || 'No especificada'}\n`;
        descripcionLibre += `Medio o proyecto: ${formData.medio_proyecto || 'No especificado'}\n`;
        descripcionLibre += `Territorio: ${formData.territorio || 'No especificado'}\n`;
        descripcionLibre += `Duración: ${formData.duracion || 'No especificada'}\n`;
        descripcionLibre += `Empresa o artista solicitante: ${formData.empresa_artista_solicitante || 'No especificado'}\n`;
      }

      if (selectedTemplate === 'otros') {
        descripcionLibre += `Asunto: ${formData.asunto || 'No especificado'}\n`;
        descripcionLibre += `Descripción: ${formData.descripcion || 'No especificada'}\n`;
        descripcionLibre += `Contacto: ${formData.contacto || 'No especificado'}\n`;
        descripcionLibre += `Tipo de respuesta: ${formData.tipo_respuesta || 'No especificado'}\n`;
      }
      
      solicitudData.descripcion_libre = descripcionLibre;

      // For booking requests, create the booking_offer first and link it
      if (selectedTemplate === 'booking') {
        // Map booking_status to phase
        const statusToPhase: Record<string, string> = {
          'interest': 'interes',
          'offer': 'oferta',
          'confirmed': 'confirmado'
        };
        const phase = statusToPhase[formData.booking_status || 'interest'] || 'interes';

        // Create booking offer
        const bookingOfferData = {
          artist_id: formData.artist_id,
          festival_ciclo: formData.festival_ciclo || null,
          ciudad: formData.ciudad || null,
          pais: formData.pais || null,
          lugar: formData.lugar || null,
          venue: formData.direccion || null,
          capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
          fecha: formData.fecha || null,
          hora: formData.hora || null,
          formato: formData.formato || null,
          fee: formData.deal_type === 'flat_fee' && formData.fee ? parseFloat(formData.fee) : null,
          condiciones: formData.condiciones || null,
          info_comentarios: formData.comentarios || null,
          estado: 'pendiente',
          phase: phase,
          created_by: profile?.user_id,
        };

        const { data: bookingOffer, error: bookingError } = await supabase
          .from('booking_offers')
          .insert([bookingOfferData])
          .select('id')
          .single();

        if (bookingError) throw bookingError;

        // Link booking offer to solicitud
        (solicitudData as any).booking_id = bookingOffer.id;
      }

      const { error } = await supabase
        .from('solicitudes')
        .insert([solicitudData]);

      if (error) throw error;

      toast({
        title: "Solicitud creada",
        description: `Solicitud de ${template?.title} creada correctamente.`,
      });

      onSuccess();
      onOpenChange(false);
      setStep('select');
      setSelectedTemplate('');
      setFormData({
        contact_id: '',
        artist_id: '',
        prioridad: 'media',
        observaciones: '',
      });
    } catch (error) {
      console.error('Error creating solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud.",
        variant: "destructive",
      });
    }
  };

  const renderTemplateSelection = () => {
    const booking = templates.find(t => t.id === 'booking')!;
    const secondary = templates.filter(t => t.id !== 'booking' && t.id !== 'otros');
    const otro = templates.find(t => t.id === 'otros')!;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center py-2">
          <h3 className="text-lg font-semibold mb-1">¿Qué tipo de solicitud es?</h3>
          <p className="text-sm text-muted-foreground">Elige el tipo para ver el formulario correcto y activar el flujo adecuado</p>
        </div>

        {/* Booking — Hero card */}
        <Card
          className="cursor-pointer border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50/20 transition-all"
          onClick={() => handleTemplateSelect('booking')}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <booking.icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-bold text-base">Booking</h4>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Más frecuente</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{booking.description}</p>
                <div className={`flex items-start gap-2 rounded-lg p-2.5 border ${booking.nextStepBg}`}>
                  <span className={`text-xs mt-0.5 flex-shrink-0 ${booking.nextStepDot}`}>▶</span>
                  <p className={`text-xs ${booking.nextStepText}`}>
                    Crea automáticamente un <strong>Booking Offer</strong> en el pipeline. Al aprobarse, pasa a Negociación y se puede vincular al calendario.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid 2×2 — tipos secundarios */}
        <div className="grid grid-cols-2 gap-3">
          {secondary.map((template) => {
            const IconComponent = template.icon;
            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:bg-accent/40 transition-all border hover:border-border/80"
                onClick={() => handleTemplateSelect(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${template.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <h4 className="font-semibold text-sm">{template.title}</h4>
                        {template.badge && (
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${template.badgeClassName}`}>
                            {template.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{template.description}</p>
                      <div className={`flex items-start gap-1.5 rounded-md p-2 border ${template.nextStepBg}`}>
                        <span className={`text-[10px] mt-0.5 flex-shrink-0 ${template.nextStepDot}`}>▶</span>
                        <p className={`text-[10px] leading-relaxed ${template.nextStepText}`}>{template.nextStep}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Otro — secundario, estilo dashed */}
        <Card
          className="cursor-pointer border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/20 transition-all opacity-70 hover:opacity-100"
          onClick={() => handleTemplateSelect('otros')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 ${otro.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <otro.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Otro</h4>
                  <span className="text-xs text-muted-foreground">— Solicitud libre, tú decides el flujo</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  const renderFormFields = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <template.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{template.title}</h3>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>
        </div>

        {/* Common fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Información General</h4>
          
          <div className="space-y-2">
            <Label htmlFor="artist_id">Artista Relacionado *</Label>
            <SingleArtistSelector
              value={formData.artist_id}
              onValueChange={(value) => setFormData({ ...formData, artist_id: value })}
              placeholder="Selecciona el artista"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prioridad">Prioridad</Label>
            <Select
              value={formData.prioridad}
              onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">
                  <span className="inline-flex items-center gap-1">
                    <span>🟢 Baja</span>
                    <span className="text-muted-foreground">— 14 días</span>
                  </span>
                </SelectItem>
                <SelectItem value="media">
                  <span className="inline-flex items-center gap-1">
                    <span>🟡 Media</span>
                    <span className="text-muted-foreground">— 7 días</span>
                  </span>
                </SelectItem>
                <SelectItem value="alta">
                  <span className="inline-flex items-center gap-1">
                    <span>🟠 Alta</span>
                    <span className="text-muted-foreground">— 3 días</span>
                  </span>
                </SelectItem>
                <SelectItem value="urgente">
                  <span className="inline-flex items-center gap-1">
                    <span>🔴 Urgente</span>
                    <span className="text-muted-foreground">— 1 día</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Template-specific fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
            Información Específica - {template.title}
          </h4>
          
          {selectedTemplate === 'booking' && (
            <div className="space-y-6">
              {/* Sección 1: Datos Generales */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    Datos Generales
                  </CardTitle>
                  <CardDescription className="text-sm">Información básica del evento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="festival_ciclo">Nombre del Evento / Festival</Label>
                      <Input
                        id="festival_ciclo"
                        value={formData.festival_ciclo}
                        onChange={(e) => setFormData({ ...formData, festival_ciclo: e.target.value })}
                        placeholder="Ej: Primavera Sound 2025"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lugar">Venue <span className="text-destructive">*</span></Label>
                      <Input
                        id="lugar"
                        value={formData.lugar}
                        onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
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
                      <AddressAutocomplete
                        value={formData.direccion || ''}
                        onChange={(value) => setFormData((prev) => ({ ...prev, direccion: value }))}
                        venue={formData.lugar}
                        city={formData.ciudad}
                        country={formData.pais}
                        placeholder="Buscar dirección..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha <span className="text-destructive">*</span></Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hora">Hora</Label>
                      <Input
                        id="hora"
                        type="time"
                        value={formData.hora}
                        onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
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
                          fechas_opcionales: [...(formData.fechas_opcionales || []), '']
                        })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Añadir fecha
                      </Button>
                    </div>
                    {(formData.fechas_opcionales || []).map((fecha: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="date"
                          value={fecha}
                          onChange={(e) => {
                            const newFechas = [...(formData.fechas_opcionales || [])];
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
                            const newFechas = (formData.fechas_opcionales || []).filter((_: string, i: number) => i !== index);
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
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Buyer / Promotor
                  </CardTitle>
                  <CardDescription className="text-sm">Selecciona o crea el promotor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs 
                    value={formData.promotor_tab || 'existing'} 
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
                          value={formData.promotor_contact_id || ''}
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
                            value={formData.new_promotor?.name || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              new_promotor: { ...(formData.new_promotor || {}), name: e.target.value }
                            })}
                            placeholder="Nombre del contacto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Empresa</Label>
                          <Input
                            value={formData.new_promotor?.company || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              new_promotor: { ...(formData.new_promotor || {}), company: e.target.value }
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
                            value={formData.new_promotor?.email || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              new_promotor: { ...(formData.new_promotor || {}), email: e.target.value }
                            })}
                            placeholder="email@promotora.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input
                            value={formData.new_promotor?.phone || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              new_promotor: { ...(formData.new_promotor || {}), phone: e.target.value }
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
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-4 w-4" />
                    Deal Info
                  </CardTitle>
                  <CardDescription className="text-sm">Condiciones económicas del evento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Tipo de Deal</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deal_type: 'flat_fee' })}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.deal_type === 'flat_fee' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium">Fee Fijo</div>
                        <div className="text-sm text-muted-foreground">Caché garantizado</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deal_type: 'door_split' })}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.deal_type === 'door_split' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium">Door Split</div>
                        <div className="text-sm text-muted-foreground">Porcentaje de taquilla</div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {formData.deal_type === 'flat_fee' ? (
                      <div className="space-y-2">
                        <Label htmlFor="fee">Fee (€)</Label>
                        <Input
                          id="fee"
                          type="number"
                          value={formData.fee || ''}
                          onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                          placeholder="5000"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="door_split_percentage">Porcentaje (%)</Label>
                        <Input
                          id="door_split_percentage"
                          type="number"
                          value={formData.door_split_percentage || ''}
                          onChange={(e) => setFormData({ ...formData, door_split_percentage: e.target.value })}
                          placeholder="80"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="formato">Formato</Label>
                      {showNewFormatInput ? (
                        <div className="flex gap-2">
                          <Input
                            id="new_formato"
                            value={newFormatName}
                            onChange={(e) => setNewFormatName(e.target.value)}
                            placeholder="Nombre del nuevo formato"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (newFormatName.trim()) {
                                setFormData({ ...formData, formato: newFormatName.trim() });
                                setNewFormatName('');
                                setShowNewFormatInput(false);
                              }
                            }}
                          >
                            Añadir
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNewFormatName('');
                              setShowNewFormatInput(false);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Select
                          value={formData.formato || ''}
                          onValueChange={(value) => {
                            if (value === '__new__') {
                              setShowNewFormatInput(true);
                            } else {
                              setFormData({ ...formData, formato: value });
                            }
                          }}
                          disabled={!formData.artist_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !formData.artist_id 
                                ? "Selecciona primero un artista" 
                                : artistFormats.length === 0 
                                  ? "Sin formatos - añade uno nuevo"
                                  : "Seleccionar formato"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {artistFormats.map((format) => (
                              <SelectItem key={format.id} value={format.name}>
                                {format.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="__new__" className="text-primary">
                              <span className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Nuevo formato
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condiciones">Condiciones</Label>
                    <Textarea
                      id="condiciones"
                      value={formData.condiciones || ''}
                      onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
                      placeholder="Backline, alojamiento, transporte, rider..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comentarios">Comentarios del solicitante</Label>
                    <Textarea
                      id="comentarios"
                      value={formData.comentarios || ''}
                      onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                      placeholder="Notas adicionales sobre la solicitud"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sección 4: Estado y Aprobadores */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCheck className="h-4 w-4" />
                    Estado y Aprobación
                  </CardTitle>
                  <CardDescription className="text-sm">Estado del booking y aprobadores requeridos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking_status">Estado del Booking</Label>
                    <Select
                      value={formData.booking_status || 'interest'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          booking_status: value,
                          booking_status_touched: true,
                        })
                      }
                    >
                      <SelectTrigger id="booking_status">
                        <SelectValue placeholder="Selecciona el estado..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interest">Interés</SelectItem>
                        <SelectItem value="offer">Oferta</SelectItem>
                        <SelectItem value="hold">Hold (reservado)</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Si se aprueba la solicitud, el booking pasará a "confirmado". Si se deniega, pasará a "cancelado".
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Aprobadores Requeridos</Label>
                    <TeamMemberSelector
                      selectedMembers={formData.required_approvers || []}
                      onSelectionChange={(value) => setFormData({ ...formData, required_approvers: value })}
                      artistId={formData.artist_id}
                      placeholder={formData.artist_id ? "Selecciona los aprobadores del equipo..." : "Primero selecciona un artista"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Si hay múltiples aprobadores, todos deben aprobar para que la solicitud se considere aprobada.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedTemplate === 'entrevista' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="programa">Programa</Label>
                  <Input
                    id="programa"
                    value={formData.programa}
                    onChange={(e) => setFormData({ ...formData, programa: e.target.value })}
                    placeholder="La Ventana"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medio_canal">Medio / Canal</Label>
                  <Input
                    id="medio_canal"
                    value={formData.medio_canal}
                    onChange={(e) => setFormData({ ...formData, medio_canal: e.target.value })}
                    placeholder="Cadena SER"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_hora">Fecha y hora</Label>
                  <Input
                    id="fecha_hora"
                    type="datetime-local"
                    value={formData.fecha_hora}
                    onChange={(e) => setFormData({ ...formData, fecha_hora: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formato_entrevista">Formato</Label>
                  <Select
                    value={formData.formato_entrevista}
                    onValueChange={(value) => setFormData({ ...formData, formato_entrevista: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="phonecall">Phonecall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_entrevistador">Nombre del entrevistador</Label>
                <Input
                  id="nombre_entrevistador"
                  value={formData.nombre_entrevistador}
                  onChange={(e) => setFormData({ ...formData, nombre_entrevistador: e.target.value })}
                  placeholder="María García"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="informacion_adicional">Información adicional</Label>
                <Textarea
                  id="informacion_adicional"
                  value={formData.informacion_adicional}
                  onChange={(e) => setFormData({ ...formData, informacion_adicional: e.target.value })}
                  placeholder="Enlace, preguntas previstas, temática..."
                  rows={3}
                />
              </div>
            </>
          )}

          {selectedTemplate === 'consulta' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="asunto">Asunto</Label>
                <Input
                  id="asunto"
                  value={formData.asunto}
                  onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                  placeholder="Asunto de la consulta"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion_contexto">Descripción / contexto</Label>
                <Textarea
                  id="descripcion_contexto"
                  value={formData.descripcion_contexto}
                  onChange={(e) => setFormData({ ...formData, descripcion_contexto: e.target.value })}
                  placeholder="Describe el contexto y detalles de la consulta"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">
                        <span className="inline-flex items-center gap-1">
                          <span>🟢 Baja</span>
                          <span className="text-muted-foreground">— 14 días</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="media">
                        <span className="inline-flex items-center gap-1">
                          <span>🟡 Media</span>
                          <span className="text-muted-foreground">— 7 días</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="alta">
                        <span className="inline-flex items-center gap-1">
                          <span>🟠 Alta</span>
                          <span className="text-muted-foreground">— 3 días</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="urgente">
                        <span className="inline-flex items-center gap-1">
                          <span>🔴 Urgente</span>
                          <span className="text-muted-foreground">— 1 día</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contacto">Contacto</Label>
                  <Input
                    id="contacto"
                    value={formData.contacto}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                    placeholder="Persona de contacto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_respuesta">Tipo de respuesta</Label>
                <Select
                  value={formData.tipo_respuesta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_respuesta: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de respuesta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="phonecall">Phonecall</SelectItem>
                    <SelectItem value="correo">Correo</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedTemplate === 'informacion' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tema_proyecto">Tema o proyecto</Label>
                <Input
                  id="tema_proyecto"
                  value={formData.tema_proyecto}
                  onChange={(e) => setFormData({ ...formData, tema_proyecto: e.target.value })}
                  placeholder="Nuevo álbum, gira, colaboración..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detalle_solicitado">Detalle de lo solicitado</Label>
                <Textarea
                  id="detalle_solicitado"
                  value={formData.detalle_solicitado}
                  onChange={(e) => setFormData({ ...formData, detalle_solicitado: e.target.value })}
                  placeholder="Qué información específica necesitan"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_respuesta">Tipo de respuesta</Label>
                <Select
                  value={formData.tipo_respuesta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_respuesta: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de respuesta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="phonecall">Phonecall</SelectItem>
                    <SelectItem value="correo">Correo</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedTemplate === 'licencia' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tipo_licencia">Tipo de licencia</Label>
                <Select
                  value={formData.tipo_licencia}
                  onValueChange={(value) => setFormData({ ...formData, tipo_licencia: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de licencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="sampleo">Sampleo</SelectItem>
                    <SelectItem value="sincronia">Sincronía</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obra_licenciar">Obra a licenciar</Label>
                <Input
                  id="obra_licenciar"
                  value={formData.obra_licenciar}
                  onChange={(e) => setFormData({ ...formData, obra_licenciar: e.target.value })}
                  placeholder="Nombre de la canción/obra"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medio_proyecto">Medio o proyecto</Label>
                <Input
                  id="medio_proyecto"
                  value={formData.medio_proyecto}
                  onChange={(e) => setFormData({ ...formData, medio_proyecto: e.target.value })}
                  placeholder="Película, anuncio, serie, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="territorio">Territorio</Label>
                  <Input
                    id="territorio"
                    value={formData.territorio}
                    onChange={(e) => setFormData({ ...formData, territorio: e.target.value })}
                    placeholder="España, Mundial, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duracion">Duración</Label>
                  <Input
                    id="duracion"
                    value={formData.duracion}
                    onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                    placeholder="1 año, permanente, etc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa_artista_solicitante">Empresa o artista solicitante</Label>
                <Input
                  id="empresa_artista_solicitante"
                  value={formData.empresa_artista_solicitante}
                  onChange={(e) => setFormData({ ...formData, empresa_artista_solicitante: e.target.value })}
                  placeholder="Nombre de la empresa o artista"
                />
              </div>
            </>
          )}

          {selectedTemplate === 'otros' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="asunto">Asunto</Label>
                <Input
                  id="asunto"
                  value={formData.asunto}
                  onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                  placeholder="Asunto de la solicitud"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe la solicitud"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contacto">Contacto</Label>
                <Input
                  id="contacto"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  placeholder="Persona de contacto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_respuesta">Tipo de respuesta</Label>
                <Select
                  value={formData.tipo_respuesta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_respuesta: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de respuesta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="phonecall">Phonecall</SelectItem>
                    <SelectItem value="correo">Correo</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="observaciones">Comentarios de la solicitante</Label>
          <Textarea
            id="observaciones"
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            placeholder="Cualquier información adicional relevante"
            rows={3}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={() => setStep('select')}>
            Atrás
          </Button>
          <Button type="submit" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Crear Solicitud
          </Button>
        </div>
      </form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {step === 'select' ? 'Crear Solicitud desde Plantilla' : 'Nueva Solicitud'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? renderTemplateSelection() : renderFormFields()}
      </DialogContent>
    </Dialog>
  );
}