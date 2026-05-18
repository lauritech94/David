import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  roles: string[];
  active_role: string;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
}

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onMemberAdded: () => void;
}

export function AddTeamMemberDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  onMemberAdded 
}: AddTeamMemberDialogProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("users");
  
  // New contact form
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    notes: ""
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProfiles();
      fetchContacts();
    }
  }, [open]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, roles, active_role')
        .order('full_name');
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Error al cargar usuarios');
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, company, role')
        .order('name');
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Error al cargar contactos');
    }
  };

  const addProfileToTeam = async (profile: Profile) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_team')
        .insert([{
          project_id: projectId,
          profile_id: profile.id,
          role: profile.active_role
        }]);
      
      if (error) throw error;
      
      toast.success(`${profile.full_name} añadido al equipo`);
      onMemberAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding member:', error);
      if (error.code === '23505') {
        toast.error('Este usuario ya está en el equipo');
      } else {
        toast.error('Error al añadir miembro');
      }
    } finally {
      setLoading(false);
    }
  };

  const addContactToTeam = async (contact: Contact) => {
    setLoading(true);
    try {
      // First create a project_team entry that references the contact
      const { error } = await supabase
        .from('project_team')
        .insert([{
          project_id: projectId,
          contact_id: contact.id,
          profile_id: null,
          role: contact.role || 'Colaborador'
        }]);
      
      if (error) throw error;
      
      toast.success(`${contact.name} añadido al equipo`);
      onMemberAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding contact:', error);
      if (error.code === '23505') {
        toast.error('Este contacto ya está en el equipo');
      } else {
        toast.error('Error al añadir contacto');
      }
    } finally {
      setLoading(false);
    }
  };

  const createAndAddContact = async () => {
    if (!newContact.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setLoading(true);
    try {
      // First create the contact
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .insert([{
          name: newContact.name,
          email: newContact.email || null,
          phone: newContact.phone || null,
          company: newContact.company || null,
          role: newContact.role || null,
          notes: newContact.notes || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();
      
      if (contactError) throw contactError;
      
      // Then add to project team
      const { error: teamError } = await supabase
        .from('project_team')
        .insert([{
          project_id: projectId,
          contact_id: contactData.id,
          profile_id: null,
          role: newContact.role || 'Colaborador'
        }]);
      
      if (teamError) throw teamError;
      
      toast.success(`${newContact.name} creado y añadido al equipo`);
      onMemberAdded();
      onOpenChange(false);
      
      // Reset form
      setNewContact({
        name: "",
        email: "",
        phone: "",
        company: "",
        role: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Error al crear contacto');
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Añadir miembro al equipo
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Contactos
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Nuevo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar usuarios registrados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {profile.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{profile.full_name}</div>
                      <div className="text-sm text-muted-foreground">{profile.email}</div>
                      <Badge variant="outline" className="text-xs">
                        {profile.active_role}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => addProfileToTeam(profile)}
                    disabled={loading}
                    size="sm"
                  >
                    Añadir
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar contactos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      {contact.email && (
                        <div className="text-sm text-muted-foreground">{contact.email}</div>
                      )}
                      {contact.company && (
                        <div className="text-xs text-muted-foreground">{contact.company}</div>
                      )}
                      {contact.role && (
                        <Badge variant="outline" className="text-xs">
                          {contact.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={() => addContactToTeam(contact)}
                    disabled={loading}
                    size="sm"
                  >
                    Añadir
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={newContact.role} onValueChange={(value) => setNewContact({ ...newContact, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Booker">Booker</SelectItem>
                    <SelectItem value="Tour Manager">Tour Manager</SelectItem>
                    <SelectItem value="Técnico">Técnico</SelectItem>
                    <SelectItem value="Promotor">Promotor</SelectItem>
                    <SelectItem value="Colaborador">Colaborador</SelectItem>
                    <SelectItem value="Proveedor">Proveedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                placeholder="Información adicional..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={createAndAddContact} disabled={loading || !newContact.name.trim()}>
                Crear y añadir
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}