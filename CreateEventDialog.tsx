import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LocationMap } from './LocationMap';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

const eventTypes = [
  { value: 'concert', label: 'Concierto' },
  { value: 'recording', label: 'Ensayo' },
  { value: 'meeting', label: 'Entrevista' },
  { value: 'deadline', label: 'Compromiso' },
  { value: 'other', label: 'Otros' }
] as const;

const eventTypeValues = ['concert', 'recording', 'meeting', 'deadline', 'other'] as const;

interface Artist {
  id: string;
  full_name: string;
}

const formSchema = z.object({
  artist_ids: z.array(z.string()).min(1, 'Selecciona al menos un artista'),
  title: z.string().min(1, 'El título es requerido'),
  event_type: z.enum(eventTypeValues, {
    required_error: 'Selecciona un tipo de evento',
  }),
  start_date: z.date({
    required_error: 'La fecha de inicio es requerida',
  }),
  start_time: z.string().min(1, 'La hora de inicio es requerida'),
  end_date: z.date({
    required_error: 'La fecha de fin es requerida',
  }),
  end_time: z.string().min(1, 'La hora de fin es requerida'),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  syncWithGoogle: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface CreateEventDialogProps {
  onEventCreated: () => void;
  shouldOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefilledData?: any;
}

export function CreateEventDialog({ onEventCreated, shouldOpen, onOpenChange, prefilledData }: CreateEventDialogProps) {
  const [open, setOpen] = useState(shouldOpen || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isConnected: googleConnected, createEvent: createGoogleEvent } = useGoogleCalendar();

  console.log('CreateEventDialog - Rendering, profile:', profile);

  // Update open state when shouldOpen changes
  useEffect(() => {
    if (shouldOpen !== undefined) {
      setOpen(shouldOpen);
    }
  }, [shouldOpen]);

  // Load artists from database
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name', { ascending: true });

        if (error) throw error;
        setArtists(data || []);
      } catch (error) {
        console.error('Error fetching artists:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los artistas",
          variant: "destructive",
        });
      } finally {
        setLoadingArtists(false);
      }
    };

    fetchArtists();
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artist_ids: profile?.id ? [profile.id] : [],
      title: prefilledData?.title || '',
      event_type: prefilledData?.event_type || undefined,
      location: prefilledData?.location || '',
      description: prefilledData?.description || '',
      start_time: prefilledData?.start_date ? format(new Date(prefilledData.start_date), 'HH:mm') : '09:00',
      end_time: prefilledData?.end_date ? format(new Date(prefilledData.end_date), 'HH:mm') : '10:00',
      start_date: prefilledData?.start_date ? new Date(prefilledData.start_date) : undefined,
      end_date: prefilledData?.end_date ? new Date(prefilledData.end_date) : undefined,
    },
  });

  // Update form when prefilledData changes
  useEffect(() => {
    if (prefilledData) {
      console.log('Updating form with prefilledData:', prefilledData);
      form.reset({
        artist_ids: profile?.id ? [profile.id] : [],
        title: prefilledData.title || '',
        event_type: prefilledData.event_type || undefined,
        location: prefilledData.location || '',
        description: prefilledData.description || '',
        start_time: prefilledData.start_date ? format(new Date(prefilledData.start_date), 'HH:mm') : '09:00',
        end_time: prefilledData.end_date ? format(new Date(prefilledData.end_date), 'HH:mm') : '10:00',
        start_date: prefilledData.start_date ? new Date(prefilledData.start_date) : undefined,
        end_date: prefilledData.end_date ? new Date(prefilledData.end_date) : undefined,
      });
    }
  }, [prefilledData, profile, form]);

  const selectedArtistIds = form.watch('artist_ids') || [];

  const onSubmit = async (data: FormData) => {
    if (!profile) {
      toast({
        title: "Error",
        description: "No se pudo obtener el perfil de usuario",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('=== CREATING EVENT ===');
      console.log('Profile:', profile);
      console.log('Form data:', data);
      
      // Combine date and time for start and end
      const startDateTime = new Date(data.start_date);
      const [startHours, startMinutes] = data.start_time.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);
      
      const endDateTime = new Date(data.end_date);
      const [endHours, endMinutes] = data.end_time.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Create the main event with the first selected artist
      const eventPayload = {
        title: data.title,
        event_type: data.event_type,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        description: data.description || null,
        location: data.location || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        artist_id: profile.id, // Use the correct profile.id
        created_by: profile.id  // Use the correct profile.id
      };

      console.log('Event payload:', eventPayload);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert(eventPayload)
        .select()
        .single();

      if (eventError) {
        console.error('Event creation error:', eventError);
        toast({
          title: "Error al crear evento",
          description: eventError.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Event created successfully:', eventData);

      // Create entries in event_artists for all selected artists
      const eventArtistEntries = data.artist_ids.map(artistId => ({
        event_id: eventData.id,
        artist_id: artistId
      }));

      const { error: eventArtistsError } = await supabase
        .from('event_artists')
        .insert(eventArtistEntries);

      if (eventArtistsError) {
        console.error('Event artists creation error:', eventArtistsError);
        // Event was created but artist associations failed
        toast({
          title: "Evento creado parcialmente",
          description: "El evento se creó pero hubo un problema al asociar los artistas",
          variant: "destructive",
        });
        return;
      }

      console.log('Event and artist associations created successfully');
      
      // Sync with Google Calendar if requested and connected
      if (data.syncWithGoogle && googleConnected) {
        const googleEvent = {
          summary: data.title,
          description: data.description || '',
          location: data.location || '',
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Europe/Madrid',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Europe/Madrid',
          },
        };
        
        await createGoogleEvent(googleEvent);
      }
      
      toast({
        title: "¡Éxito!",
        description: `Evento "${data.title}" creado exitosamente con ${data.artist_ids.length} artista(s)${data.syncWithGoogle && googleConnected ? ' y sincronizado con Google Calendar' : ''}`,
      });
      
      form.reset();
      const closeDialog = onOpenChange || setOpen;
      closeDialog(false);
      onEventCreated();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al crear el evento",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArtist = (artistId: string) => {
    const current = form.getValues('artist_ids') || [];
    if (!current.includes(artistId)) {
      form.setValue('artist_ids', [...current, artistId]);
    }
  };

  const removeArtist = (artistId: string) => {
    const current = form.getValues('artist_ids') || [];
    form.setValue('artist_ids', current.filter(id => id !== artistId));
  };

  const handleLocationSelect = (location: string, lat?: number, lng?: number) => {
    form.setValue('location', location);
    if (lat && lng) {
      form.setValue('latitude', lat);
      form.setValue('longitude', lng);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange || setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarIcon className="mr-2 h-4 w-4" />
          Crear Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Evento Profesional</DialogTitle>
          <DialogDescription>
            Gestiona el calendario profesional con selección múltiple de artistas y ubicación en Google Maps
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="artist_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artistas Seleccionados</FormLabel>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedArtistIds.map((artistId) => {
                        const artist = artists.find(a => a.id === artistId);
                        return (
                          <Badge key={artistId} variant="secondary" className="flex items-center gap-1">
                            {artist?.full_name || 'Artista desconocido'}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-red-500" 
                              onClick={() => removeArtist(artistId)}
                            />
                          </Badge>
                        );
                      })}
                      {selectedArtistIds.length === 0 && (
                        <p className="text-sm text-muted-foreground">No hay artistas seleccionados</p>
                      )}
                    </div>
                    
                    <Select onValueChange={addArtist} disabled={loadingArtists}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingArtists ? "Cargando artistas..." : "Agregar artista..."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {artists
                          .filter(artist => !selectedArtistIds.includes(artist.id))
                          .map((artist) => (
                            <SelectItem key={artist.id} value={artist.id}>
                              {artist.full_name}
                            </SelectItem>
                          ))}
                        {artists.filter(artist => !selectedArtistIds.includes(artist.id)).length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            {selectedArtistIds.length === artists.length ? "Todos los artistas ya están seleccionados" : "No hay artistas disponibles"}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormDescription>
                    Puedes seleccionar múltiples artistas para el mismo evento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Evento</FormLabel>
                  <FormControl>
                    <Input placeholder="Breve y claro..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Evento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Categorías: Ensayo, Entrevista, Compromiso, Concierto, Transfer, Otros
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Selecciona fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Selecciona fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <LocationMap 
              onLocationSelect={handleLocationSelect}
              initialLocation={form.watch('location')}
              initialCoords={
                form.watch('latitude') && form.watch('longitude') 
                  ? { lat: form.watch('latitude')!, lng: form.watch('longitude')! }
                  : undefined
              }
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalles Relevantes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Breve descripción, contactos clave, enlaces, notas necesarias..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Información adicional importante para el evento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {googleConnected && (
              <FormField
                control={form.control}
                name="syncWithGoogle"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Añadir a Google Calendar
                      </FormLabel>
                      <FormDescription>
                        Sincronizar este evento con tu Google Calendar
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  const closeDialog = onOpenChange || setOpen;
                  closeDialog(false);
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Evento Profesional'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}