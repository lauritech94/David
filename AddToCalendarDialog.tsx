import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
}

interface Request {
  id: string;
  type: string;
  title: string;
  description: string;
  artist_id: string;
}

interface AddToCalendarDialogProps {
  request: Request | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
}

export function AddToCalendarDialog({ request, open, onOpenChange, onEventCreated }: AddToCalendarDialogProps) {
  const { profile } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    artist_id: undefined as string | undefined,
    event_type: '',
    location: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    if (open && request) {
      fetchArtists();
      // Map request type to valid event types
      const eventTypeMap: { [key: string]: string } = {
        'entrevista': 'interview',
        'booking': 'concert',
        'consulta': 'meeting',
        'informacion': 'meeting',
        'otro': 'meeting'
      };
      
      setFormData({
        title: request.title,
        description: request.description,
        artist_id: request.artist_id && request.artist_id.trim() !== '' ? request.artist_id : undefined,
        event_type: eventTypeMap[request.type] || 'meeting',
        location: '',
        start_time: '09:00',
        end_time: '10:00',
      });
    }
  }, [open, request]);

  const fetchArtists = async () => {
    try {
      const { data } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name', { ascending: true });

      const validArtists = (data || []).filter(artist => 
        artist && artist.id && artist.name
      );
      
      setArtists(validArtists);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!request || !eventDate || !formData.title || !formData.artist_id || !formData.start_time || !formData.end_time) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const startDateTime = new Date(eventDate);
      const [startHour, startMinute] = formData.start_time.split(':');
      startDateTime.setHours(parseInt(startHour), parseInt(startMinute));

      const endDateTime = new Date(eventDate);
      const [endHour, endMinute] = formData.end_time.split(':');
      endDateTime.setHours(parseInt(endHour), parseInt(endMinute));

      const { error } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          event_type: formData.event_type,
          artist_id: formData.artist_id,
          created_by: profile?.id,
          location: formData.location || null,
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evento añadido al calendario correctamente.",
      });

      onEventCreated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir el evento al calendario.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir al Calendario</DialogTitle>
          <DialogDescription>
            Crea un evento en el calendario basado en esta solicitud
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título del Evento</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título del evento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist">Artista</Label>
            <Select
              value={formData.artist_id}
              onValueChange={(value) => setFormData({ ...formData, artist_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un artista" />
              </SelectTrigger>
              <SelectContent>
              {artists.filter(artist => artist.id && artist.name).map((artist) => (
                  <SelectItem key={artist.id} value={artist.id}>
                    {artist.stage_name || artist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">Tipo de Evento</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concert">Concierto</SelectItem>
                <SelectItem value="interview">Entrevista</SelectItem>
                <SelectItem value="rehearsal">Ensayo</SelectItem>
                <SelectItem value="meeting">Reunión</SelectItem>
                <SelectItem value="recording">Grabación</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha del Evento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={setEventDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Hora de Inicio</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Hora de Fin</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ubicación del evento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del evento"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit">Crear Evento</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}