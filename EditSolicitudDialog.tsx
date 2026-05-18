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
import { toast } from '@/hooks/use-toast';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { ContactSelector } from '@/components/ContactSelector';
import { useConfetti } from '@/hooks/useConfetti';
import { TeamMemberSelector } from '@/components/TeamMemberSelector';
import { Calendar, Users, DollarSign, Plus, X, Flag, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Solicitud {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro';
  nombre_solicitante: string;
  email?: string;
  telefono?: string;
  observaciones?: string;
  notas_internas?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  artist_id?: string;
  fecha_limite_respuesta?: string;
  prioridad?: string;
  
  // Multi-approver fields
  required_approvers?: string[];
  current_approvals?: string[];
  
  // Campos específicos para entrevistas
  medio?: string;
  nombre_entrevistador?: string;
  nombre_programa?: string;
  hora_entrevista?: string;
  informacion_programa?: string;
  
  // Campos específicos para bookings
  hora_show?: string;
  nombre_festival?: string;
  lugar_concierto?: string;
  ciudad?: string;
  pais?: string;
  direccion?: string;
  capacidad?: number;
  fechas_opcionales?: string[];
  formato?: string;
  promotor_contact_id?: string;
  deal_type?: string;
  fee?: number;
  door_split_percentage?: number;
  condiciones?: string;
  
  // Campo libre para tipo "otro"
  descripcion_libre?: string;
}

interface EditSolicitudDialogProps {
  solicitud: Solicitud | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSolicitudUpdated: () => void;
}

export function EditSolicitudDialog({ solicitud, open, onOpenChange, onSolicitudUpdated }: EditSolicitudDialogProps) {
  const { fireCelebration } = useConfetti();
  const [artistFormats, setArtistFormats] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    tipo: '' as 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro',
    nombre_solicitante: '',
    email: '',
    telefono: '',
    observaciones: '',
    notas_internas: '',
    estado: '' as 'pendiente' | 'aprobada' | 'denegada',
    artist_id: '',
    fecha_limite_respuesta: '',
    prioridad: 'normal' as 'baja' | 'normal' | 'alta' | 'urgente',
    required_approvers: [] as string[],
    current_approvals: [] as string[],
    
    // Campos específicos para entrevistas
    medio: '',
    nombre_entrevistador: '',
    nombre_programa: '',
    hora_entrevista: '',
    informacion_programa: '',
    
    // Campos específicos para bookings
    hora_show: '',
    nombre_festival: '',
    lugar_concierto: '',
    ciudad: '',
    pais: '',
    direccion: '',
    capacidad: '',
    fechas_opcionales: [] as string[],
    formato: '',
    promotor_contact_id: '',
    promotor_tab: 'existing' as 'existing' | 'new',
    new_promotor: {
      name: '',
      company: '',
      email: '',
      phone: '',
    },
    deal_type: 'flat_fee' as 'flat_fee' | 'door_split',
    fee: '',
    door_split_percentage: '',
    condiciones: '',
    
    // Campo libre para tipo "otro"
    descripcion_libre: '',
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
      } catch (error) {
        console.error('Error fetching artist formats:', error);
        setArtistFormats([]);
      }
    };
    
    fetchArtistFormats();
  }, [formData.artist_id]);

  useEffect(() => {
    if (solicitud && open) {
      setFormData({
        tipo: solicitud.tipo,
        nombre_solicitante: solicitud.nombre_solicitante,
        email: solicitud.email || '',
        telefono: solicitud.telefono || '',
        observaciones: solicitud.observaciones || '',
        notas_internas: solicitud.notas_internas || '',
        estado: solicitud.estado,
        artist_id: solicitud.artist_id || '',
        fecha_limite_respuesta: solicitud.fecha_limite_respuesta ? new Date(solicitud.fecha_limite_respuesta).toISOString().slice(0, 10) : '',
        prioridad: (solicitud.prioridad as 'baja' | 'normal' | 'alta' | 'urgente') || 'normal',
        required_approvers: (solicitud.required_approvers || []) as string[],
        current_approvals: (solicitud.current_approvals || []) as string[],
        
        // Campos específicos para entrevistas
        medio: solicitud.medio || '',
        nombre_entrevistador: solicitud.nombre_entrevistador || '',
        nombre_programa: solicitud.nombre_programa || '',
        hora_entrevista: solicitud.hora_entrevista ? new Date(solicitud.hora_entrevista).toISOString().slice(0, 16) : '',
        informacion_programa: solicitud.informacion_programa || '',
        
        // Campos específicos para bookings
        hora_show: solicitud.hora_show ? new Date(solicitud.hora_show).toISOString().slice(0, 16) : '',
        nombre_festival: solicitud.nombre_festival || '',
        lugar_concierto: solicitud.lugar_concierto || '',
        ciudad: solicitud.ciudad || '',
        pais: solicitud.pais || '',
        direccion: solicitud.direccion || '',
        capacidad: solicitud.capacidad?.toString() || '',
        fechas_opcionales: (solicitud.fechas_opcionales || []) as string[],
        formato: solicitud.formato || '',
        promotor_contact_id: solicitud.promotor_contact_id || '',
        promotor_tab: 'existing',
        new_promotor: { name: '', company: '', email: '', phone: '' },
        deal_type: (solicitud.deal_type as 'flat_fee' | 'door_split') || 'flat_fee',
        fee: solicitud.fee?.toString() || '',
        door_split_percentage: solicitud.door_split_percentage?.toString() || '',
        condiciones: solicitud.condiciones || '',
        
        // Campo libre para tipo "otro"
        descripcion_libre: solicitud.descripcion_libre || '',
      });
    }
  }, [solicitud, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!solicitud || !formData.nombre_solicitante) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    const previousEstado = solicitud.estado;
    const newEstado = formData.estado;

    try {
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
            created_by: solicitud.id, // using solicitud id as fallback
          })
          .select()
          .single();
        if (!contactError && newContact) {
          promotorContactId = newContact.id;
        }
      }

      const solicitudData = {
        tipo: formData.tipo,
        nombre_solicitante: formData.nombre_solicitante,
        email: formData.email || null,
        telefono: formData.telefono || null,
        observaciones: formData.observaciones || null,
        notas_internas: formData.notas_internas || null,
        estado: formData.estado,
        artist_id: formData.artist_id || null,
        prioridad: formData.prioridad,
        required_approvers: formData.required_approvers.length > 0 ? formData.required_approvers : null,
        // Reset current_approvals if required_approvers changed
        current_approvals: formData.required_approvers.length > 0 
          ? (solicitud?.required_approvers?.length === formData.required_approvers.length 
            && solicitud?.required_approvers?.every((id: string) => formData.required_approvers.includes(id))
              ? formData.current_approvals  // Keep existing approvals if approvers didn't change
              : []) // Reset if approvers changed
          : null,
        
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
        
        ...((formData.tipo === 'otro' || formData.tipo === 'consulta' || formData.tipo === 'informacion') && {
          descripcion_libre: formData.descripcion_libre || null,
        }),
        
        // Campo común
        fecha_limite_respuesta: formData.fecha_limite_respuesta || null,
      };

      const { error } = await supabase
        .from('solicitudes')
        .update(solicitudData as any)
        .eq('id', solicitud.id);

      if (error) throw error;

      console.log('Previous estado:', previousEstado, 'New estado:', newEstado);

      toast({
        title: "Solicitud actualizada",
        description: newEstado === 'aprobada' && previousEstado !== 'aprobada' 
          ? "¡Solicitud aprobada! 🎉" 
          : "La solicitud se ha actualizado correctamente.",
      });

      onSolicitudUpdated();

      // 🎉 ¡Confetti cuando se aprueba una solicitud!
      if (previousEstado !== 'aprobada' && newEstado === 'aprobada') {
        console.log('🎉 Firing confetti celebration!');
        setTimeout(() => {
          fireCelebration();
          // Cerrar el diálogo después del confeti
          onOpenChange(false);
        }, 300);
      } else {
        // Cerrar inmediatamente si no hay confeti
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la solicitud.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Solicitud</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la solicitud
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Solicitud</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro') => 
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrevista">Entrevista</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="consulta">Consulta</SelectItem>
                      <SelectItem value="informacion">Información</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value: 'pendiente' | 'aprobada' | 'denegada') => 
                      setFormData({ ...formData, estado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                      <SelectItem value="aprobada">✅ Aprobada</SelectItem>
                      <SelectItem value="denegada">❌ Denegada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_solicitante">Asunto de la Solicitud</Label>
                <Input
                  id="nombre_solicitante"
                  value={formData.nombre_solicitante}
                  onChange={(e) => setFormData({ ...formData, nombre_solicitante: e.target.value })}
                  placeholder="Nombre de la persona o empresa"
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
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          Baja — 14 días
                        </span>
                      </SelectItem>
                      <SelectItem value="normal">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-yellow-500" />
                          Media — 7 días
                        </span>
                      </SelectItem>
                      <SelectItem value="alta">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                          Alta — 3 días
                        </span>
                      </SelectItem>
                      <SelectItem value="urgente">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          Urgente — 1 día
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
                  placeholder="Selecciona un artista"
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
            </CardContent>
          </Card>

          {/* Aprobadores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Aprobadores Requeridos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seleccionar Aprobadores</Label>
                <TeamMemberSelector
                  selectedMembers={formData.required_approvers}
                  onSelectionChange={(value) => setFormData({ ...formData, required_approvers: value })}
                  artistId={formData.artist_id}
                  placeholder={formData.artist_id ? "Selecciona los aprobadores del equipo..." : "Primero selecciona un artista"}
                />
                <p className="text-xs text-muted-foreground">
                  Si hay múltiples aprobadores, todos deben aprobar para que la solicitud se considere aprobada.
                </p>
              </div>

              {/* Show current approval progress */}
              {formData.required_approvers.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso de aprobación</span>
                    <span className="font-medium">
                      {formData.current_approvals.length} / {formData.required_approvers.length}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ 
                        width: `${(formData.current_approvals.length / formData.required_approvers.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información específica por tipo */}
          {formData.tipo === 'entrevista' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📻 Información de la Entrevista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medio">Medio</Label>
                    <Input
                      id="medio"
                      value={formData.medio}
                      onChange={(e) => setFormData({ ...formData, medio: e.target.value })}
                      placeholder="Nombre del medio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre_entrevistador">Entrevistador</Label>
                    <Input
                      id="nombre_entrevistador"
                      value={formData.nombre_entrevistador}
                      onChange={(e) => setFormData({ ...formData, nombre_entrevistador: e.target.value })}
                      placeholder="Nombre del entrevistador"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre_programa">Programa</Label>
                    <Input
                      id="nombre_programa"
                      value={formData.nombre_programa}
                      onChange={(e) => setFormData({ ...formData, nombre_programa: e.target.value })}
                      placeholder="Nombre del programa"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="informacion_programa">Información del Programa</Label>
                  <Textarea
                    id="informacion_programa"
                    value={formData.informacion_programa}
                    onChange={(e) => setFormData({ ...formData, informacion_programa: e.target.value })}
                    placeholder="Descripción del programa"
                    rows={3}
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
                      <Label htmlFor="lugar_concierto">Venue</Label>
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
                      <Label htmlFor="hora_show">Fecha y Hora</Label>
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
                          <Label>Nombre</Label>
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
                      <Label>Fee (€)</Label>
                      <Input
                        type="number"
                        value={formData.fee}
                        onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                        placeholder="Ej: 5000"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Porcentaje de taquilla (%)</Label>
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

          {(formData.tipo === 'otro' || formData.tipo === 'consulta' || formData.tipo === 'informacion') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📌 Información Adicional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="descripcion_libre">Descripción</Label>
                  <Textarea
                    id="descripcion_libre"
                    value={formData.descripcion_libre}
                    onChange={(e) => setFormData({ ...formData, descripcion_libre: e.target.value })}
                    placeholder="Descripción detallada"
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button type="submit">Guardar Cambios</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
