import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  FileText, 
  ExternalLink,
  UserX
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { undoableDeleteCustom } from "@/utils/undoableDelete";

interface TeamMemberProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberType: 'profile' | 'contact';
  projectId: string;
  onMemberRemoved: () => void;
}

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  roles: string[];
  active_role: string;
  created_at: string;
  address?: string;
  emergency_contact?: string;
  team_contacts?: string;
  internal_notes?: string;
}

interface ContactData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export function TeamMemberProfileDialog({
  open,
  onOpenChange,
  memberId,
  memberType,
  projectId,
  onMemberRemoved
}: TeamMemberProfileDialogProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (open && memberId) {
      if (memberType === 'profile') {
        fetchProfileData();
      } else {
        fetchContactData();
      }
    }
  }, [open, memberId, memberType]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', memberId)
        .single();
      
      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error al cargar perfil de usuario');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', memberId)
        .single();
      
      if (error) throw error;
      setContactData(data);
    } catch (error) {
      console.error('Error fetching contact:', error);
      toast.error('Error al cargar datos de contacto');
    } finally {
      setLoading(false);
    }
  };

  const removeMemberFromTeam = async () => {
    setRemoving(true);
    try {
      const memberName = memberType === 'profile' ? profileData?.full_name : contactData?.name;

      // Build the query to find the record
      let selectQuery = supabase
        .from('project_team')
        .select('*')
        .eq('project_id', projectId);
      
      if (memberType === 'profile') {
        selectQuery = selectQuery.eq('profile_id', memberId);
      } else {
        selectQuery = selectQuery.eq('contact_id', memberId);
      }
      
      const { data: snapshot } = await selectQuery.single();

      await undoableDeleteCustom({
        deleteAction: async () => {
          let query = supabase
            .from('project_team')
            .delete()
            .eq('project_id', projectId);
          
          if (memberType === 'profile') {
            query = query.eq('profile_id', memberId);
          } else {
            query = query.eq('contact_id', memberId);
          }
          
          const { error } = await query;
          if (error) throw error;
        },
        undoAction: async () => {
          if (snapshot) {
            const { error } = await (supabase as any)
              .from('project_team')
              .insert(snapshot);
            if (error) throw error;
          }
        },
        successMessage: `${memberName} eliminado del equipo`,
        onComplete: () => {
          onMemberRemoved();
        },
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Error al eliminar miembro');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const renderProfileView = () => {
    if (!profileData) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg">
              {profileData.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{profileData.full_name}</h3>
            <p className="text-muted-foreground">{profileData.email}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="default">{profileData.active_role}</Badge>
              {profileData.roles.filter(role => role !== profileData.active_role).map(role => (
                <Badge key={role} variant="outline">{role}</Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Contact Information */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Información de contacto
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{profileData.email}</span>
              </div>
              {profileData.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{profileData.phone}</span>
                </div>
              )}
              {profileData.address && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>{profileData.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Miembro desde {new Date(profileData.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        {(profileData.emergency_contact || profileData.team_contacts || profileData.internal_notes) && (
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Información adicional
              </h4>
              <div className="space-y-3">
                {profileData.emergency_contact && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contacto de emergencia</label>
                    <p className="text-sm">{profileData.emergency_contact}</p>
                  </div>
                )}
                {profileData.team_contacts && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contactos del equipo</label>
                    <p className="text-sm">{profileData.team_contacts}</p>
                  </div>
                )}
                {profileData.internal_notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notas internas</label>
                    <p className="text-sm">{profileData.internal_notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderContactView = () => {
    if (!contactData) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg">
              {contactData.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{contactData.name}</h3>
            {contactData.email && (
              <p className="text-muted-foreground">{contactData.email}</p>
            )}
            {contactData.role && (
              <Badge variant="default" className="mt-2">{contactData.role}</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Contact Information */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Información de contacto
            </h4>
            <div className="space-y-3">
              {contactData.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{contactData.email}</span>
                </div>
              )}
              {contactData.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{contactData.phone}</span>
                </div>
              )}
              {contactData.company && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>{contactData.company}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Añadido el {new Date(contactData.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {contactData.notes && (
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notas
              </h4>
              <p className="text-sm">{contactData.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil del miembro
            <Badge variant="outline" className="ml-auto">
              {memberType === 'profile' ? 'Usuario registrado' : 'Contacto externo'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {memberType === 'profile' ? renderProfileView() : renderContactView()}

        <div className="flex justify-between pt-6">
          <Button
            variant="destructive"
            onClick={removeMemberFromTeam}
            disabled={removing}
            className="flex items-center gap-2"
          >
            <UserX className="w-4 h-4" />
            {removing ? 'Eliminando...' : 'Eliminar del equipo'}
          </Button>
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}