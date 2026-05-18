import { useEffect, useState, useRef } from "react";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  FileText,
  User,
  Briefcase,
  X,
  Folder,
  Tag,
  CreditCard,
  Shirt,
  AlertTriangle,
  Clock,
  Globe,
  Link,
  Calendar,
  Home,
  Music,
  Settings,
  Camera
} from "lucide-react";

import { getTeamCategoryLabel } from '@/lib/teamCategories';
import { ContactLinkedActivity } from '@/components/ContactLinkedActivity';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface ContactProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onEdit?: (contactId: string) => void;
  refreshTrigger?: number;
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
  address?: string | null;
  tags?: string[] | null;
  iban?: string | null;
  bank_info?: string | null;
  clothing_size?: string | null;
  shoe_size?: string | null;
  allergies?: string | null;
  special_needs?: string | null;
  preferred_hours?: string | null;
  contract_url?: string | null;
  avatar_url?: string | null;
  is_public?: boolean | null;
  public_slug?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  field_config?: {
    is_team_member?: boolean;
    is_management_team?: boolean;
    team_categories?: string[];
    [key: string]: any;
  } | null;
}

interface AssignedArtist {
  id: string;
  name: string;
  stage_name?: string | null;
}

interface ProjectRole {
  project_id: string;
  project_name: string;
  role: string;
}

export function ContactProfileSheet({
  open,
  onOpenChange,
  contactId,
  onEdit,
  refreshTrigger
}: ContactProfileSheetProps) {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [assignedArtists, setAssignedArtists] = useState<AssignedArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pulseConfig, setPulseConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copiado` });
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  const triggerConfigPulse = () => {
    setPulseConfig(true);
    setTimeout(() => setPulseConfig(false), 2000);
  };

  useEffect(() => {
    if (open && contactId) {
      fetchContact();
      fetchProjectRoles();
      fetchAssignedArtists();
    }
  }, [open, contactId, refreshTrigger]);

  const updateContactField = async (field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ [field]: value })
        .eq('id', contactId);
      
      if (error) throw error;
      
      setContact(prev => prev ? { ...prev, [field]: value } : null);
      toast({ title: "Guardado" });
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  };

  const fetchContact = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      setContact(data as ContactData);
    } catch (error) {
      console.error('Error fetching contact:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('project_team')
        .select('project_id, role')
        .eq('contact_id', contactId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const projectIds = data.map(d => d.project_id);
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
        
        const rolesWithNames = data.map(d => ({
          project_id: d.project_id,
          project_name: projects?.find(p => p.id === d.project_id)?.name || 'Proyecto',
          role: d.role || 'Sin rol'
        }));
        
        setProjectRoles(rolesWithNames);
      } else {
        setProjectRoles([]);
      }
    } catch (error) {
      console.error('Error fetching project roles:', error);
    }
  };

  const fetchAssignedArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_artist_assignments')
        .select('artist_id, artists:artist_id(id, name, stage_name)')
        .eq('contact_id', contactId);
      
      if (error) throw error;
      
      if (data) {
        setAssignedArtists(data.map((a: any) => ({
          id: a.artists?.id,
          name: a.artists?.name,
          stage_name: a.artists?.stage_name,
        })).filter((a: AssignedArtist) => a.id));
      } else {
        setAssignedArtists([]);
      }
    } catch (error) {
      console.error('Error fetching assigned artists:', error);
      setAssignedArtists([]);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contact) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Solo se permiten imágenes", variant: "destructive" });
      return;
    }
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarUpload = async (blob: Blob) => {
    if (!contact) return;
    setUploadingAvatar(true);
    try {
      const filePath = `${contact.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('contact-avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contact-avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('contacts')
        .update({ avatar_url: publicUrl })
        .eq('id', contact.id);

      if (updateError) throw updateError;

      setContact(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast({ title: "Foto actualizada" });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Error al subir la foto", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const isFieldVisible = (fieldKey: string): boolean => {
    if (!contact?.field_config) return false;
    return contact.field_config[fieldKey] === true;
  };

  const EditableInfoCard = ({ 
    icon: Icon, 
    label, 
    value, 
    field,
    multiline = false,
    className = "" 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | null | undefined;
    field: string;
    multiline?: boolean;
    className?: string;
  }) => {
    const isEmpty = !value || String(value).trim() === '';

    const handleClick = () => {
      if (isEmpty) {
        triggerConfigPulse();
      } else {
        handleCopyValue(String(value), label);
      }
    };

    return (
      <Card
        className={`${className} ${isEmpty ? 'bg-amber-50/50 dark:bg-amber-950/20 border-dashed border-amber-200/50 dark:border-amber-800/30 cursor-pointer' : 'cursor-copy'} hover:bg-accent/40 transition-colors`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      >
        <CardContent className="py-3 flex items-start gap-3">
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isEmpty ? 'text-amber-500/60' : 'text-muted-foreground'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            {isEmpty ? (
              <p className="text-sm text-muted-foreground/60 italic">Añadir {label.toLowerCase()}...</p>
            ) : (
              <p className="text-sm break-words whitespace-pre-wrap">{value}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ReadOnlyInfoCard = ({ icon: Icon, label, value, className = "" }: { 
    icon: React.ElementType; 
    label: string; 
    value: React.ReactNode;
    className?: string;
  }) => (
    <Card className={className}>
      <CardContent className="py-3 flex items-start gap-3">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="text-sm break-words">{value}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full max-h-screen">
        <SheetHeader className="p-6 pb-0 shrink-0">
          <SheetTitle className="sr-only">Perfil de {contact.name}</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-6 pb-6">
            {/* Header */}
            <div className="flex items-center gap-4 pt-2">
              <div 
                className="relative group cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="h-20 w-20">
                  {contact.avatar_url && (
                    <AvatarImage src={contact.avatar_url} alt={contact.name} />
                  )}
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <ImageCropperDialog
                file={cropFile}
                open={!!cropFile}
                onCancel={() => setCropFile(null)}
                onConfirm={(blob) => {
                  setCropFile(null);
                  handleAvatarUpload(blob);
                }}
                aspectRatio={1}
                circular
                title="Ajustar foto de perfil"
              />
              <div className="flex-1 min-w-0">
                <h2
                  className="text-2xl font-semibold cursor-copy hover:text-primary transition-colors break-words"
                  onClick={() => contact.name && handleCopyValue(contact.name, 'Nombre')}
                  title="Click para copiar"
                >
                  {contact.name}
                </h2>
                {isFieldVisible('stage_name') && (
                  contact.stage_name ? (
                    <p
                      className="text-muted-foreground cursor-copy hover:text-foreground transition-colors break-words"
                      onClick={() => handleCopyValue(contact.stage_name!, 'Nombre artístico')}
                      title="Click para copiar"
                    >
                      {contact.stage_name}
                    </p>
                  ) : (
                    <p
                      className="text-muted-foreground/60 italic cursor-pointer text-sm"
                      onClick={triggerConfigPulse}
                    >
                      Añadir nombre artístico...
                    </p>
                  )
                )}
                {isFieldVisible('role') && (
                  contact.role ? (
                    <p
                      className="text-sm mt-1 cursor-copy hover:text-primary transition-colors break-words"
                      onClick={() => handleCopyValue(contact.role!, 'Rol')}
                      title="Click para copiar"
                    >
                      {contact.role}
                    </p>
                  ) : (
                    <p
                      className="text-sm mt-1 text-muted-foreground/60 italic cursor-pointer"
                      onClick={triggerConfigPulse}
                    >
                      Añadir rol...
                    </p>
                  )
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
                Email
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

            <Separator />

            {/* Roles en proyectos */}
            {projectRoles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Roles en proyectos</h3>
                <div className="flex flex-wrap gap-2">
                  {projectRoles.map((pr, idx) => (
                    <Badge key={idx} variant="outline" className="py-1.5">
                      <Folder className="h-3 w-3 mr-1" />
                      {pr.role} <span className="text-muted-foreground ml-1">en {pr.project_name}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Configuración de equipo - solo si es miembro de equipo */}
            {contact.field_config?.is_team_member && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Configuración de equipo
                </h3>
                
                <ReadOnlyInfoCard 
                  icon={Building} 
                  label="Tipo de equipo" 
                  value={contact.field_config?.is_management_team 
                    ? "00 Management (empresa)" 
                    : "Equipo de artista"} 
                />

                {assignedArtists.length > 0 && (
                  <ReadOnlyInfoCard 
                    icon={Music} 
                    label="Artistas" 
                    value={
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assignedArtists.map((artist) => (
                          <Badge key={artist.id} variant="outline">
                            {artist.stage_name || artist.name}
                          </Badge>
                        ))}
                      </div>
                    } 
                  />
                )}

                {contact.field_config?.team_categories && contact.field_config.team_categories.length > 0 && (
                  <ReadOnlyInfoCard 
                    icon={Tag} 
                    label="Categoría de equipo" 
                    value={
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contact.field_config.team_categories.map((cat: string) => (
                          <Badge key={cat} variant="secondary">
                            {getTeamCategoryLabel(cat)}
                          </Badge>
                        ))}
                      </div>
                    } 
                  />
                )}
              </div>
            )}

            {/* Información de contacto */}
            {(isFieldVisible('email') || isFieldVisible('phone') || isFieldVisible('company') || isFieldVisible('address')) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Información de contacto</h3>
                
                {isFieldVisible('email') && <EditableInfoCard icon={Mail} label="Email" value={contact.email} field="email" />}
                {isFieldVisible('phone') && <EditableInfoCard icon={Phone} label="Teléfono" value={contact.phone} field="phone" />}
                {isFieldVisible('company') && <EditableInfoCard icon={Building} label="Empresa" value={contact.company} field="company" />}
                {isFieldVisible('address') && <EditableInfoCard icon={Home} label="Dirección" value={contact.address} field="address" multiline />}
                <EditableInfoCard icon={MapPin} label="Ciudad" value={contact.city} field="city" />
                <EditableInfoCard icon={Globe} label="País" value={contact.country} field="country" />
              </div>
            )}

            {/* Información personal */}
            {(isFieldVisible('legal_name') || isFieldVisible('preferred_hours') || contact.category || (contact.tags && contact.tags.length > 0)) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Información personal</h3>
                
                {isFieldVisible('legal_name') && <EditableInfoCard icon={User} label="Nombre legal" value={contact.legal_name} field="legal_name" />}
                {isFieldVisible('preferred_hours') && <EditableInfoCard icon={Clock} label="Horario preferido" value={contact.preferred_hours} field="preferred_hours" />}
                
                {contact.category && (
                  <ReadOnlyInfoCard 
                    icon={Briefcase} 
                    label="Categoría" 
                    value={<Badge variant="outline">{contact.category}</Badge>} 
                  />
                )}

                {contact.tags && contact.tags.length > 0 && (
                  <ReadOnlyInfoCard 
                    icon={Tag} 
                    label="Etiquetas" 
                    value={
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contact.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    } 
                  />
                )}
              </div>
            )}

            {/* Información adicional */}
            {(isFieldVisible('clothing_size') || isFieldVisible('shoe_size') || isFieldVisible('allergies') || isFieldVisible('special_needs')) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Información adicional</h3>
                
                {isFieldVisible('clothing_size') && <EditableInfoCard icon={Shirt} label="Talla de ropa" value={contact.clothing_size} field="clothing_size" />}
                {isFieldVisible('shoe_size') && <EditableInfoCard icon={Shirt} label="Talla de calzado" value={contact.shoe_size} field="shoe_size" />}
                {isFieldVisible('allergies') && <EditableInfoCard icon={AlertTriangle} label="Alergias" value={contact.allergies} field="allergies" multiline />}
                {isFieldVisible('special_needs') && <EditableInfoCard icon={AlertTriangle} label="Necesidades especiales" value={contact.special_needs} field="special_needs" multiline />}
              </div>
            )}

            {/* Información bancaria */}
            {(isFieldVisible('iban') || isFieldVisible('bank_info')) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Información bancaria</h3>
                
                {isFieldVisible('iban') && <EditableInfoCard icon={CreditCard} label="IBAN" value={contact.iban} field="iban" />}
                {isFieldVisible('bank_info') && <EditableInfoCard icon={CreditCard} label="Banco" value={contact.bank_info} field="bank_info" />}
              </div>
            )}

            {/* Contrato */}
            {isFieldVisible('contract_url') && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Contrato</h3>
                <EditableInfoCard icon={Link} label="URL del contrato" value={contact.contract_url} field="contract_url" />
              </div>
            )}

            {/* Visibilidad */}
            {(contact.is_public || contact.public_slug) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Visibilidad</h3>
                
                {contact.is_public !== null && (
                  <ReadOnlyInfoCard 
                    icon={Globe} 
                    label="Contacto público" 
                    value={contact.is_public ? "Sí" : "No"} 
                  />
                )}

                {contact.public_slug && (
                  <ReadOnlyInfoCard 
                    icon={Link} 
                    label="Slug público" 
                    value={contact.public_slug} 
                  />
                )}
              </div>
            )}

            {/* Notas */}
            {isFieldVisible('notes') && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Notas</h3>
                <EditableInfoCard icon={FileText} label="Notas" value={contact.notes} field="notes" multiline />
              </div>
            )}

            {/* Actividad vinculada */}
            <Separator />
            <ContactLinkedActivity
              contactId={contactId}
              contactName={contact.name}
              open={open}
            />

            {/* Fechas */}
            {(contact.created_at || contact.updated_at) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Registro</h3>
                
                {contact.created_at && (
                  <ReadOnlyInfoCard 
                    icon={Calendar} 
                    label="Creado" 
                    value={format(new Date(contact.created_at), "d 'de' MMMM, yyyy", { locale: es })} 
                  />
                )}

                {contact.updated_at && (
                  <ReadOnlyInfoCard 
                    icon={Calendar} 
                    label="Última actualización" 
                    value={format(new Date(contact.updated_at), "d 'de' MMMM, yyyy", { locale: es })} 
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background flex gap-2">
          {onEdit && (
            <Button 
              variant={pulseConfig ? "default" : "outline"}
              className={`flex-1 transition-all ${pulseConfig ? 'animate-pulse ring-2 ring-primary ring-offset-2' : ''}`}
              onClick={() => {
                onEdit(contact.id);
                onOpenChange(false);
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
