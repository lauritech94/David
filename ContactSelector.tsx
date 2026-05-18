import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Mail, Phone, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  artist_id?: string;
  artist?: {
    name: string;
    stage_name: string | null;
  } | null;
}

interface ContactSelectorProps {
  value?: string | null;
  onValueChange: (value: string) => void;
  artistId?: string;
  placeholder?: string;
  compact?: boolean;
}

export function ContactSelector({ value, onValueChange, artistId, placeholder = "Seleccionar contacto", compact = false }: ContactSelectorProps) {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    notes: '',
    artist_id: artistId || ''
  });

  useEffect(() => {
    fetchContacts();
  }, [artistId]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      let contactIds: string[] | null = null;

      // Si hay artista, obtenemos los contactos asignados a ese artista
      // a través de la tabla puente `contact_artist_assignments`, que es
      // la fuente de verdad para la asociación contacto↔artista.
      if (artistId) {
        const { data: assignments, error: assignErr } = await supabase
          .from('contact_artist_assignments')
          .select('contact_id')
          .eq('artist_id', artistId);
        if (assignErr) throw assignErr;
        contactIds = (assignments || []).map((a: any) => a.contact_id);

        // Compatibilidad: incluir también contactos con `contacts.artist_id`
        // igual al artista (modelo legado).
        const { data: legacy } = await supabase
          .from('contacts')
          .select('id')
          .eq('artist_id', artistId);
        for (const row of (legacy || []) as any[]) {
          if (!contactIds.includes(row.id)) contactIds.push(row.id);
        }

        if (contactIds.length === 0) {
          setContacts([]);
          return;
        }
      }

      let query = supabase
        .from('contacts')
        .select(`
          *,
          artist:artist_id(name, stage_name)
        `)
        .order('name', { ascending: true });

      if (contactIds) {
        query = query.in('id', contactIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContacts((data as any) || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los contactos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContact.name) {
      toast({
        title: "Error",
        description: "El nombre es requerido.",
        variant: "destructive",
      });
      return;
    }

    try {
      const contactData = {
        name: newContact.name,
        email: newContact.email || null,
        phone: newContact.phone || null,
        company: newContact.company || null,
        role: newContact.role || null,
        notes: newContact.notes || null,
        artist_id: newContact.artist_id || null,
        created_by: profile?.user_id,
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();

      if (error) throw error;

      // Si hay artista seleccionado, crear también la asignación en
      // `contact_artist_assignments` para que aparezca al filtrar por artista.
      if (artistId && data?.id) {
        const { error: assignErr } = await supabase
          .from('contact_artist_assignments')
          .insert([{ contact_id: data.id, artist_id: artistId }]);
        if (assignErr) {
          console.error('Error linking contact to artist:', assignErr);
        }
      }

      toast({
        title: "Éxito",
        description: "Contacto creado correctamente.",
      });

      // Add to local list and select it
      const newContactWithProfile = {
        ...data,
        artist: artistId ? contacts.find(c => c.artist_id === artistId)?.artist || null : null
      };
      
      setContacts(prev => [newContactWithProfile as any, ...prev]);
      onValueChange(data.id);
      
      // Reset form and close dialog
      setNewContact({
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        notes: '',
        artist_id: artistId || ''
      });
      setShowNewContactDialog(false);
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el contacto.",
        variant: "destructive",
      });
    }
  };

  const selectedContact = contacts.find(c => c.id === value);

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Select value={value} onValueChange={onValueChange} disabled={loading}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={loading ? "Cargando..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{contact.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {contact.role && <Badge variant="outline" className="text-xs">{contact.role}</Badge>}
                        {contact.artist && <span>• {contact.artist.stage_name || contact.artist.name}</span>}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            type="button"
            variant="outline" 
            size="default"
            onClick={() => setShowNewContactDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </Button>
        </div>

        {/* Show selected contact details - only when not compact */}
        {!compact && selectedContact && (
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-medium text-sm">{selectedContact.name}</h4>
                <div className="space-y-1">
                  {selectedContact.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {selectedContact.email}
                    </div>
                  )}
                  {selectedContact.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {selectedContact.phone}
                    </div>
                  )}
                  {selectedContact.company && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building className="w-3 h-3" />
                      {selectedContact.company}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {selectedContact.role && (
                    <Badge variant="secondary" className="text-xs">{selectedContact.role}</Badge>
                  )}
                  {selectedContact.artist && (
                    <Badge variant="outline" className="text-xs">
                      Artista: {selectedContact.artist.stage_name || selectedContact.artist.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Contact Dialog */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Contacto
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateContact} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nombre *</Label>
              <Input
                id="contact-name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="Nombre del contacto"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Teléfono</Label>
                <Input
                  id="contact-phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-company">Empresa</Label>
                <Input
                  id="contact-company"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-role">Rol</Label>
                <Select
                  value={newContact.role}
                  onValueChange={(value) => setNewContact({ ...newContact, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="prensa">Prensa</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="promotor">Promotor</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="label">Label</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-notes">Notas</Label>
              <Textarea
                id="contact-notes"
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                placeholder="Notas adicionales sobre el contacto"
                rows={2}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setShowNewContactDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Contacto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}