import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Users, Send, Link as LinkIcon, Copy, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  stage_name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface RequestAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  artistId?: string | null;
  eventDate?: string | null;
  eventName?: string;
  onRequestCreated: () => void;
}

export function RequestAvailabilityDialog({
  open,
  onOpenChange,
  bookingId,
  artistId,
  eventDate,
  eventName,
  onRequestCreated
}: RequestAvailabilityDialogProps) {
  const [teamContacts, setTeamContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [blockConfirmation, setBlockConfirmation] = useState(true);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && artistId) {
      fetchTeamContacts();
    }
  }, [open, artistId]);

  const fetchTeamContacts = async () => {
    if (!artistId) return;
    setLoading(true);
    try {
      // Get contacts assigned to this artist
      const { data: assignments } = await supabase
        .from('contact_artist_assignments')
        .select('contact_id')
        .eq('artist_id', artistId);

      const contactIds = assignments?.map(a => a.contact_id) || [];

      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, stage_name, email, role')
          .in('id', contactIds);

        setTeamContacts(contacts || []);
      } else {
        // Fallback: get all contacts with team member flag
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, stage_name, email, role, field_config')
          .not('field_config', 'is', null);

        const teamOnly = (contacts || []).filter((c: any) => {
          const config = c.field_config as Record<string, any> | null;
          return config?.is_team_member === true;
        });

        setTeamContacts(teamOnly);
      }
    } catch (error) {
      console.error('Error fetching team contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === teamContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(teamContacts.map(c => c.id));
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSubmit = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Selecciona al menos un miembro del equipo');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Create the availability request
      const { data: request, error: requestError } = await supabase
        .from('booking_availability_requests')
        .insert({
          booking_id: bookingId,
          requested_by: user.id,
          block_confirmation: blockConfirmation,
          deadline: deadline?.toISOString() || null,
          notes
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create responses for each selected contact
      const responses = selectedContacts.map(contactId => {
        const contact = teamContacts.find(c => c.id === contactId);
        return {
          request_id: request.id,
          contact_id: contactId,
          responder_name: contact?.stage_name || contact?.name,
          responder_email: contact?.email
        };
      });

      const { error: responsesError } = await supabase
        .from('booking_availability_responses')
        .insert(responses);

      if (responsesError) throw responsesError;

      toast.success(`Solicitud enviada a ${selectedContacts.length} miembros del equipo`);
      onRequestCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating availability request:', error);
      toast.error('Error al crear la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const getShareLink = () => {
    if (!shareToken) return '';
    return `${PUBLIC_APP_URL}/availability/${shareToken}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareLink());
    setCopied(true);
    toast.success('Enlace copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShareToken(null);
    setSelectedContacts([]);
    setNotes('');
    setDeadline(undefined);
    setBlockConfirmation(true);
    onOpenChange(false);
  };

  if (shareToken) {
    // Show success state with share link
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Solicitud Creada
            </DialogTitle>
            <DialogDescription>
              La solicitud de disponibilidad ha sido creada. Comparte el enlace con los miembros del equipo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md text-sm font-mono truncate">
                {getShareLink()}
              </div>
              <Button variant="outline" size="icon" onClick={copyShareLink}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Miembros notificados:</p>
              <div className="flex flex-wrap gap-1">
                {selectedContacts.map(id => {
                  const contact = teamContacts.find(c => c.id === id);
                  return contact ? (
                    <Badge key={id} variant="secondary">
                      {contact.stage_name || contact.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Solicitar Disponibilidad
          </DialogTitle>
          <DialogDescription>
            {eventName && <span className="font-medium">{eventName}</span>}
            {eventDate && <span> - {format(new Date(eventDate), 'PPP', { locale: es })}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Miembros del equipo</Label>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedContacts.length === teamContacts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Button>
            </div>
            <ScrollArea className="h-48 border rounded-md p-2">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Cargando equipo...
                </div>
              ) : teamContacts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay contactos asignados a este artista
                </div>
              ) : (
                <div className="space-y-2">
                  {teamContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => toggleContact(contact.id)}
                    >
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {contact.stage_name || contact.name}
                        </p>
                        {contact.role && (
                          <p className="text-xs text-muted-foreground">{contact.role}</p>
                        )}
                      </div>
                      {contact.email && (
                        <Badge variant="outline" className="text-xs">
                          Email
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {selectedContacts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedContacts.length} seleccionado(s)
              </p>
            )}
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label>Fecha límite de respuesta (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !deadline && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade información adicional..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || selectedContacts.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}