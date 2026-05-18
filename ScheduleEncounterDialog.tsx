import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ScheduleEncounterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: {
    id: string;
    artist_id?: string | null;
    tipo: string;
    nombre_solicitante: string;
    ciudad?: string | null;
    medio?: string | null;
    lugar_concierto?: string | null;
  } | null;
  onCreated?: () => void;
}

export function ScheduleEncounterDialog({ open, onOpenChange, solicitud, onCreated }: ScheduleEncounterDialogProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<'llamada' | 'videollamada' | 'chat' | ''>('');
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [linkOrPhone, setLinkOrPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const timeSlots = [
    { value: "08:00-10:00", label: "08:00 - 10:00" },
    { value: "10:00-12:00", label: "10:00 - 12:00" },
    { value: "12:00-14:00", label: "12:00 - 14:00" },
    { value: "14:00-16:00", label: "14:00 - 16:00" },
    { value: "16:00-18:00", label: "16:00 - 18:00" },
    { value: "18:00-20:00", label: "18:00 - 20:00" },
    { value: "20:00-22:00", label: "20:00 - 22:00" },
  ];

  useEffect(() => {
    // Autorrellenar el teléfono desde el perfil cuando sea una llamada
    if (type === 'llamada') {
      setLinkOrPhone(profile?.phone || '');
    }
  }, [type, profile?.phone]);

  const reset = () => {
    setType(''); setDate(''); setTimeSlot(''); setLinkOrPhone(''); setNotes('');
  };

  const handleSubmit = async () => {
    if (!solicitud) return;

    if (type === 'chat') {
      toast({ title: 'Chat interno', description: 'Abriendo chat interno…' });
      onOpenChange(false);
      navigate('/chat');
      return;
    }

    if (!date || !timeSlot) {
      toast({ title: 'Faltan datos', description: 'Selecciona fecha y franja horaria', variant: 'destructive' });
      return;
    }

    if (type === 'llamada' && !profile?.phone) {
      toast({ title: 'Teléfono no configurado', description: 'Añade tu teléfono en el perfil antes de crear una llamada', variant: 'destructive' });
      return;
    }

    if (type === 'videollamada' && !linkOrPhone) {
      toast({ title: 'Falta el enlace', description: 'Añade el enlace de videollamada', variant: 'destructive' });
      return;
    }

    const [startTime, endTime] = timeSlot.split('-');
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    try {
      setLoading(true);
      const { error } = await supabase.from('events').insert([
        {
          title: `Encuentro (${type === 'llamada' ? 'Llamada' : 'Videollamada'}) – ${solicitud.nombre_solicitante}`,
          event_type: 'meeting',
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          location: type === 'llamada' ? (profile?.phone || '') : (linkOrPhone || 'Online'),
          description: `Franja de disponibilidad: ${timeSlot.replace('-', ' a ')}${notes ? `\n\n${notes}` : ''}`,
          created_by: profile?.id,
          artist_id: solicitud.artist_id || profile?.id || null,
        }
      ]);

      if (error) throw error;

      toast({ title: 'Encuentro creado', description: 'Se ha añadido al calendario' });
      onCreated?.();
      onOpenChange(false);
      reset();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo crear el encuentro', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Organizar encuentro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="llamada">Llamada</SelectItem>
                <SelectItem value="videollamada">Videollamada</SelectItem>
                <SelectItem value="chat">Abrir chat interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type && type !== 'chat' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Franja horaria</Label>
                <Select value={timeSlot} onValueChange={setTimeSlot}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona franja" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === 'videollamada' && (
            <div className="space-y-2">
              <Label>Enlace de videollamada</Label>
              <Input
                placeholder="https://meet..."
                value={linkOrPhone}
                onChange={(e) => setLinkOrPhone(e.target.value)}
              />
            </div>
          )}

          {type === 'llamada' && (
            <p className="text-sm text-muted-foreground">
              Se usará el teléfono de tu perfil: {profile?.phone || 'No configurado'}
            </p>
          )}

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agenda, objetivos…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {type === 'chat' ? 'Abrir chat' : 'Crear encuentro'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
