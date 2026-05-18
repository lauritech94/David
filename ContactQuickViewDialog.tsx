import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  FileText,
  User,
  Briefcase
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ContactQuickViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
}

interface ContactData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  notes?: string | null;
  category?: string | null;
  city?: string | null;
  country?: string | null;
  stage_name?: string | null;
  legal_name?: string | null;
}

export function ContactQuickViewDialog({
  open,
  onOpenChange,
  contactId
}: ContactQuickViewDialogProps) {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && contactId) {
      fetchContact();
    }
  }, [open, contactId]);

  const fetchContact = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, company, role, notes, category, city, country, stage_name, legal_name')
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      setContact(data);
    } catch (error) {
      console.error('Error fetching contact:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Información de contacto</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{contact.name}</h2>
              {contact.stage_name && (
                <p className="text-muted-foreground">{contact.stage_name}</p>
              )}
              {contact.role && (
                <Badge variant="secondary" className="mt-1">{contact.role}</Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              disabled={!contact.email}
              onClick={() => contact.email && (window.location.href = `mailto:${contact.email}`)}
            >
              <Mail className="h-4 w-4 mr-2" />
              Enviar Email
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              disabled={!contact.phone}
              onClick={() => contact.phone && (window.location.href = `tel:${contact.phone}`)}
            >
              <Phone className="h-4 w-4 mr-2" />
              Llamar
            </Button>
          </div>

          {/* Info cards */}
          <div className="space-y-3">
            <Card>
              <CardContent className="py-3 flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{contact.email || <span className="text-muted-foreground italic">Sin email</span>}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-3 flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-sm">{contact.phone || <span className="text-muted-foreground italic">Sin teléfono</span>}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-3 flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="text-sm">{contact.company || <span className="text-muted-foreground italic">Sin empresa</span>}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-3 flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Ubicación</p>
                  <p className="text-sm">
                    {(contact.city || contact.country) 
                      ? [contact.city, contact.country].filter(Boolean).join(', ')
                      : <span className="text-muted-foreground italic">Sin ubicación</span>
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {contact.legal_name && (
              <Card>
                <CardContent className="py-3 flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre legal</p>
                    <p className="text-sm">{contact.legal_name}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {contact.category && (
              <Card>
                <CardContent className="py-3 flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Categoría</p>
                    <Badge variant="outline">{contact.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {contact.notes && (
              <Card>
                <CardContent className="py-3 flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Notas</p>
                    <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}