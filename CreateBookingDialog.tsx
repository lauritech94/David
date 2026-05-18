import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useBookingCalendarSync } from '@/hooks/useBookingCalendarSync';
import { useBookingFolders } from '@/hooks/useBookingFolders';
import { Calendar, MapPin, Users, DollarSign, FileText, Ticket, Clock, ShieldCheck } from 'lucide-react';
import { DurationInput } from '@/components/booking-detail/DurationInput';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const CONTRACT_STATUS_OPTIONS = [
  { value: 'ctto_por_hacer', label: 'CTTO Por Hacer' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'firmado', label: 'Firmado' },
];

export function CreateBookingDialog({ 
  open, 
  onOpenChange, 
  onBookingCreated 
}: CreateBookingDialogProps) {
  const { profile } = useAuth();
  const { syncBookingWithCalendar } = useBookingCalendarSync();
  const { createEventFolder } = useBookingFolders();
  
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    // Datos del Evento
    festival_ciclo: '',
    fecha: '',
    hora: '',
    ciudad: '',
    lugar: '',
    capacidad: '',
    duracion: '',
    // Económico y Artístico
    fee: '',
    estado: 'pendiente',
    formato: '',
    pvp: '',
    // Contactos y Promo
    contacto: '',
    invitaciones: '',
    inicio_venta: '',
    link_venta: '',
    publico: '',
    // Logística y Legal
    logistica: '',
    notas: '',
    contratos: 'ctto_por_hacer',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fecha || !formData.festival_ciclo) {
      toast({
        title: "Campos requeridos",
        description: "Fecha y Festival/Ciclo son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.estado === 'confirmado') {
      setShowConfirmDialog(true);
      return;
    }

    await createBooking(formData.estado);
  };

  const createBooking = async (estado: string) => {
    setLoading(true);
    
    try {
      const estadoToPhase: Record<string, string> = {
        'pendiente': 'interes',
        'confirmado': 'confirmado',
        'cancelado': 'cancelado',
      };

      const bookingData = {
        festival_ciclo: formData.festival_ciclo,
        fecha: formData.fecha,
        hora: formData.hora || null,
        ciudad: formData.ciudad,
        lugar: formData.lugar,
        capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
        duracion: formData.duracion,
        fee: formData.fee ? parseFloat(formData.fee) : null,
        estado: estado,
        phase: estadoToPhase[estado] || 'interes',
        formato: formData.formato,
        pvp: formData.pvp ? parseFloat(formData.pvp) : null,
        contacto: formData.contacto,
        invitaciones: formData.invitaciones ? parseInt(formData.invitaciones) : 0,
        inicio_venta: formData.inicio_venta || null,
        link_venta: formData.link_venta,
        publico: formData.publico,
        logistica: formData.logistica,
        notas: formData.notas,
        contratos: formData.contratos,
        created_by: profile?.user_id,
      };

      const { data, error } = await supabase
        .from('booking_offers')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      if (data && data.estado === 'confirmado' && profile?.user_id) {
        await syncBookingWithCalendar(null, data, profile.user_id);
      }

      if (data) {
        await createEventFolder(data);
      }

      toast({
        title: "Booking creado",
        description: estado === 'confirmado' 
          ? "El evento se ha creado como confirmado."
          : "El evento se ha creado. Puedes consultar disponibilidad y viabilidad desde el detalle.",
      });

      onBookingCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el booking.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      festival_ciclo: '',
      fecha: '',
      hora: '',
      ciudad: '',
      lugar: '',
      capacidad: '',
      duracion: '',
      fee: '',
      estado: 'pendiente',
      formato: '',
      pvp: '',
      contacto: '',
      invitaciones: '',
      inicio_venta: '',
      link_venta: '',
      publico: '',
      logistica: '',
      notas: '',
      contratos: 'ctto_por_hacer',
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-primary" />
            Nueva Oferta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del Evento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              DATOS DEL EVENTO
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="festival_ciclo">Festival / Ciclo *</Label>
                <Input
                  id="festival_ciclo"
                  value={formData.festival_ciclo}
                  onChange={(e) => setFormData({ ...formData, festival_ciclo: e.target.value })}
                  placeholder="Ej: Primavera Sound"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
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
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  placeholder="Ej: Barcelona"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lugar">Lugar</Label>
                <Input
                  id="lugar"
                  value={formData.lugar}
                  onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                  placeholder="Ej: Sala Apolo"
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
              <div className="space-y-2">
                <Label htmlFor="duracion">Duración</Label>
                <DurationInput
                  value={formData.duracion}
                  onChange={(v) => setFormData({ ...formData, duracion: v ?? '' })}
                />
              </div>
            </div>
          </div>

          {/* Económico y Artístico */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              ECONÓMICO Y ARTÍSTICO
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Oferta (€)</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  placeholder="Ej: 5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Status</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="formato">Formato</Label>
                <Input
                  id="formato"
                  value={formData.formato}
                  onChange={(e) => setFormData({ ...formData, formato: e.target.value })}
                  placeholder="Ej: Quinteto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pvp">PVP (€)</Label>
                <Input
                  id="pvp"
                  type="number"
                  step="0.01"
                  value={formData.pvp}
                  onChange={(e) => setFormData({ ...formData, pvp: e.target.value })}
                  placeholder="Ej: 25"
                />
              </div>
            </div>
          </div>

          {/* Contactos y Promo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              CONTACTOS Y PROMO
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contacto">Contacto</Label>
                <Input
                  id="contacto"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  placeholder="Ej: Marco (CityZen)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitaciones">Invitaciones</Label>
                <Input
                  id="invitaciones"
                  type="number"
                  value={formData.invitaciones}
                  onChange={(e) => setFormData({ ...formData, invitaciones: e.target.value })}
                  placeholder="Ej: 10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inicio_venta">Inicio Venta</Label>
                <Input
                  id="inicio_venta"
                  type="date"
                  value={formData.inicio_venta}
                  onChange={(e) => setFormData({ ...formData, inicio_venta: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_venta">Link de Venta</Label>
                <Input
                  id="link_venta"
                  type="url"
                  value={formData.link_venta}
                  onChange={(e) => setFormData({ ...formData, link_venta: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publico">Público</Label>
                <Input
                  id="publico"
                  value={formData.publico}
                  onChange={(e) => setFormData({ ...formData, publico: e.target.value })}
                  placeholder="Ej: General, +18"
                />
              </div>
            </div>
          </div>

          {/* Logística y Legal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              LOGÍSTICA Y LEGAL
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logistica">Logística</Label>
                <Textarea
                  id="logistica"
                  value={formData.logistica}
                  onChange={(e) => setFormData({ ...formData, logistica: e.target.value })}
                  placeholder="Detalles de transporte, hotel, catering..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Comentarios</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>
            <div className="w-48 space-y-2">
              <Label htmlFor="contratos">Contrato</Label>
              <Select
                value={formData.contratos}
                onValueChange={(value) => setFormData({ ...formData, contratos: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
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
              Esto crea el booking como pendiente para que puedas gestionar la disponibilidad y los checks de viabilidad desde el detalle.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowConfirmDialog(false);
              createBooking('confirmado');
            }}
            disabled={loading}
          >
            Confirmar directamente
          </Button>
          <Button
            onClick={() => {
              setShowConfirmDialog(false);
              createBooking('pendiente');
            }}
            disabled={loading}
          >
            Consultar disponibilidad y viabilidad
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
