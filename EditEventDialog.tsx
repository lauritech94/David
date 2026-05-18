import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditEventDialogProps {
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    location: string | null;
    description: string | null;
  };
  onUpdated?: () => void;
}

function toLocalDateInputValue(d: Date) {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function toLocalTimeInputValue(d: Date) {
  return d.toTimeString().slice(0, 5);
}

export function EditEventDialog({ event, onUpdated }: EditEventDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const start = new Date(event.start_date);
  const end = new Date(event.end_date);

  const [title, setTitle] = useState(event.title);
  const [startDate, setStartDate] = useState(toLocalDateInputValue(start));
  const [startTime, setStartTime] = useState(toLocalTimeInputValue(start));
  const [endDate, setEndDate] = useState(toLocalDateInputValue(end));
  const [endTime, setEndTime] = useState(toLocalTimeInputValue(end));
  const [location, setLocation] = useState(event.location || "");
  const [description, setDescription] = useState(event.description || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title || !startDate || !startTime || !endDate || !endTime) {
      toast({ title: "Faltan datos", description: "Completa título, fechas y horas", variant: "destructive" });
      return;
    }

    const newStart = new Date(`${startDate}T${startTime}`);
    const newEnd = new Date(`${endDate}T${endTime}`);

    try {
      setSaving(true);
      const { error } = await supabase
        .from('events')
        .update({
          title,
          start_date: newStart.toISOString(),
          end_date: newEnd.toISOString(),
          location: location || null,
          description: description || null,
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({ title: "Evento actualizado", description: "Los cambios se guardaron correctamente" });
      setOpen(false);
      onUpdated?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || 'No se pudo actualizar el evento', variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora inicio</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora fin</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ubicación / Enlace</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lugar, teléfono o enlace" />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
