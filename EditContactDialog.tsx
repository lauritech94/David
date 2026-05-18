import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

import { ContactTagsInput } from './ContactTagsInput';
import { TEAM_CATEGORIES, TeamCategoryOption } from '@/lib/teamCategories';
import { detectPreset, getAllPresets } from '@/lib/fieldConfigPresets';
import { ManageFieldPresetsDialog } from './ManageFieldPresetsDialog';
import { CustomFieldsSection } from '@/components/CustomFieldsSection';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useWorkspaceId } from '@/hooks/useWorkspaceId';
import { Check, X, Music, Building2, Settings2, Share2, Copy, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { useAuth } from '@/hooks/useAuth';

interface Artist {
  id: string;
  name: string;
  stage_name?: string;
}

interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  bank_info?: string;
  iban?: string;
  clothing_size?: string;
  shoe_size?: string;
  allergies?: string;
  special_needs?: string;
  contract_url?: string;
  preferred_hours?: string;
  company?: string;
  role?: string;
  city?: string;
  country?: string;
  category: string;
  notes?: string;
  tags?: string[];
  field_config: Record<string, any>;
  is_public: boolean;
  public_slug?: string;
}

interface EditContactDialogProps {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactUpdated: () => void;
  customCategories?: TeamCategoryOption[];
}


const FIELD_LABELS = {
  stage_name: 'Nombre artístico',
  legal_name: 'Nombre legal',
  email: 'Email',
  phone: 'Teléfono',
  address: 'Dirección',
  bank_info: 'Banco',
  iban: 'IBAN',
  clothing_size: 'Talla de ropa',
  shoe_size: 'Talla de calzado',
  allergies: 'Alergias',
  special_needs: 'Necesidades especiales',
  contract_url: 'Contrato (URL)',
  preferred_hours: 'Horarios preferidos',
  company: 'Empresa',
  role: 'Rol',
  notes: 'Notas',
};

export function EditContactDialog({ contact, open, onOpenChange, onContactUpdated, customCategories = [] }: EditContactDialogProps) {
  const { user } = useAuth();
  const { data: workspaceId } = useWorkspaceId(user?.id);
  const { fields: customFields, isLoading: loadingCustomFields, createField, deleteField } = useCustomFields(workspaceId || undefined, 'contact');
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fieldConfig, setFieldConfig] = useState<Record<string, boolean>>(contact.field_config as Record<string, boolean>);
  const [selectedPreset, setSelectedPreset] = useState(() => detectPreset(contact.field_config as Record<string, boolean>));
  const [allPresets, setAllPresets] = useState(() => getAllPresets());
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(contact.tags || []);
  
  // Team-related state
  const [isTeamMember, setIsTeamMember] = useState<boolean>(contact.field_config?.is_team_member || false);
  const [isManagementTeam, setIsManagementTeam] = useState<boolean>(contact.field_config?.is_management_team || false);
  const [teamCategories, setTeamCategories] = useState<string[]>(contact.field_config?.team_categories || []);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [artistSelectOpen, setArtistSelectOpen] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [fieldsAtRisk, setFieldsAtRisk] = useState<string[]>([]);
  const [generatingFormLink, setGeneratingFormLink] = useState(false);

  // Delete contact state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checkingRefs, setCheckingRefs] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refsResult, setRefsResult] = useState<{ total: number; breakdown: Record<string, number>; examples: Array<{ type: string; id: string; name?: string }> } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Project roles state
  const [projectRoles, setProjectRoles] = useState<{ projectId: string; projectName: string; role: string }[]>([]);
  
  const [formData, setFormData] = useState({
    name: contact.name || '',
    stage_name: contact.stage_name || '',
    legal_name: contact.legal_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    address: contact.address || '',
    bank_info: contact.bank_info || '',
    iban: contact.iban || '',
    clothing_size: contact.clothing_size || '',
    shoe_size: contact.shoe_size || '',
    allergies: contact.allergies || '',
    special_needs: contact.special_needs || '',
    contract_url: contact.contract_url || '',
    preferred_hours: contact.preferred_hours || '',
    company: contact.company || '',
    role: contact.role || '',
    city: contact.city || '',
    country: contact.country || '',
    category: contact.category || 'general',
    notes: contact.notes || '',
    is_public: contact.is_public || false,
  });

  useEffect(() => {
    if (open) {
      fetchArtists();
      fetchContactArtistAssignments();
      fetchProjectRoles();
    }
  }, [open, contact.id]);

  const fetchProjectRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('project_team')
        .select('id, role, project_id, projects:project_id(name)')
        .eq('contact_id', contact.id);
      
      if (error) throw error;
      
      const roles = (data || []).map((pt: any) => ({
        projectId: pt.project_id,
        projectName: pt.projects?.name || 'Proyecto sin nombre',
        role: pt.role || 'Sin rol'
      }));
      setProjectRoles(roles);
    } catch (error) {
      console.error('Error fetching project roles:', error);
    }
  };

  useEffect(() => {
    setFieldConfig(contact.field_config as Record<string, boolean>);
    setSelectedPreset(detectPreset(contact.field_config as Record<string, boolean>));
    setTags(contact.tags || []);
    setIsTeamMember(contact.field_config?.is_team_member || false);
    setIsManagementTeam(contact.field_config?.is_management_team || false);
    setTeamCategories(contact.field_config?.team_categories || []);
    setFormData({
      name: contact.name || '',
      stage_name: contact.stage_name || '',
      legal_name: contact.legal_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      bank_info: contact.bank_info || '',
      iban: contact.iban || '',
      clothing_size: contact.clothing_size || '',
      shoe_size: contact.shoe_size || '',
      allergies: contact.allergies || '',
      special_needs: contact.special_needs || '',
      contract_url: contact.contract_url || '',
      preferred_hours: contact.preferred_hours || '',
      company: contact.company || '',
      role: contact.role || '',
      city: contact.city || '',
      country: contact.country || '',
      category: contact.category || 'general',
      notes: contact.notes || '',
      is_public: contact.is_public || false,
    });
    setCustomData(((contact as any).custom_data as Record<string, string>) || {});
  }, [contact]);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name');
      
      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchContactArtistAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_artist_assignments')
        .select('artist_id')
        .eq('contact_id', contact.id);
      
      if (error) throw error;
      setSelectedArtistIds((data || []).map(a => a.artist_id));
    } catch (error) {
      console.error('Error fetching artist assignments:', error);
    }
  };

  const toggleArtist = (artistId: string) => {
    if (selectedArtistIds.includes(artistId)) {
      setSelectedArtistIds(selectedArtistIds.filter(id => id !== artistId));
    } else {
      setSelectedArtistIds([...selectedArtistIds, artistId]);
    }
  };

  const removeArtist = (artistId: string) => {
    setSelectedArtistIds(selectedArtistIds.filter(id => id !== artistId));
  };

  const getArtistLabel = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.stage_name || artist?.name || artistId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Build updated field_config (normalize custom_* keys for existing custom fields)
      const customFieldFlags: Record<string, boolean> = {};
      customFields.forEach((f) => {
        const key = `custom_${f.id}`;
        customFieldFlags[key] = fieldConfig[key] !== false;
      });
      const updatedFieldConfig = {
        ...fieldConfig,
        ...customFieldFlags,
        is_team_member: isTeamMember,
        is_management_team: isManagementTeam,
        team_categories: teamCategories,
      };

      const { error } = await supabase
        .from('contacts')
        .update({
          ...formData,
          tags: tags,
          field_config: updatedFieldConfig,
          custom_data: customData,
        } as any)
        .eq('id', contact.id);

      if (error) throw error;

      // Update artist assignments if it's a team member
      if (isTeamMember) {
        // Remove existing assignments
        await supabase
          .from('contact_artist_assignments')
          .delete()
          .eq('contact_id', contact.id);

        // Add new assignments
        if (selectedArtistIds.length > 0) {
          const assignments = selectedArtistIds.map(artistId => ({
            contact_id: contact.id,
            artist_id: artistId,
          }));

          await supabase
            .from('contact_artist_assignments')
            .insert(assignments);
        }
      }

      toast({
        title: "Éxito",
        description: "Contacto actualizado correctamente",
      });

      onContactUpdated();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el contacto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFormLink = async () => {
    setGeneratingFormLink(true);
    try {
      const { data: existing } = await supabase
        .from('contact_form_tokens')
        .select('token')
        .eq('contact_id', contact.id)
        .eq('is_active', true)
        .maybeSingle();

      let tokenValue = existing?.token;

      if (!tokenValue) {
        const currentUser = (await supabase.auth.getUser()).data.user;
        const { data: newToken, error } = await supabase
          .from('contact_form_tokens')
          .insert({
            contact_id: contact.id,
            created_by: currentUser?.id,
            workspace_id: workspaceId,
          } as any)
          .select('token')
          .single();

        if (error) throw error;
        tokenValue = newToken.token;
      }

      const url = `${PUBLIC_APP_URL}/contact-form/${tokenValue}`;
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace al formulario se ha copiado al portapapeles.',
      });
    } catch (err) {
      console.error('Error generating form link:', err);
      toast({
        title: 'Error',
        description: 'No se pudo generar el enlace del formulario.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingFormLink(false);
    }
  };

  const updateFieldConfig = (field: string, enabled: boolean) => {
    const next = { ...fieldConfig, [field]: enabled };
    setFieldConfig(next);
    setSelectedPreset(detectPreset(next));
  };

  // Default to true when not yet stored in config
  const visible = (key: string) => fieldConfig[key] !== false;

  const applyPreset = (presetKey: string) => {
    if (presetKey === 'custom') return;
    if (presetKey === '__manage__') {
      setManagePresetsOpen(true);
      return;
    }
    const all = getAllPresets();
    const preset = all[presetKey];
    if (!preset) return;

    const atRisk = Object.keys(FIELD_LABELS).filter(field => {
      const wasOn = fieldConfig[field as keyof typeof fieldConfig];
      const willBeOn = preset.config[field as keyof typeof preset.config];
      const hasData = formData[field as keyof typeof formData]?.toString().trim();
      return wasOn && !willBeOn && hasData;
    });

    if (atRisk.length > 0) {
      setPendingPreset(presetKey);
      setFieldsAtRisk(atRisk.map(f => FIELD_LABELS[f as keyof typeof FIELD_LABELS]));
    } else {
      setFieldConfig(preset.config);
      setSelectedPreset(presetKey);
    }
  };

  const confirmApplyPreset = (keepFieldsWithData: boolean) => {
    if (!pendingPreset) return;
    const all = getAllPresets();
    const preset = all[pendingPreset];
    if (!preset) return;

    if (keepFieldsWithData) {
      const adjusted = { ...preset.config };
      Object.keys(FIELD_LABELS).forEach(field => {
        const hasData = formData[field as keyof typeof formData]?.toString().trim();
        if (hasData) adjusted[field] = true;
      });
      setFieldConfig(adjusted);
      setSelectedPreset(pendingPreset);
    } else {
      setFieldConfig(preset.config);
      setSelectedPreset(pendingPreset);
    }
    setPendingPreset(null);
    setFieldsAtRisk([]);
  };

  const handlePresetsChanged = () => {
    setAllPresets(getAllPresets());
  };

  const handleStartDelete = async () => {
    setCheckingRefs(true);
    setRefsResult(null);
    setDeleteConfirmText('');
    try {
      const { data, error } = await supabase.functions.invoke('check-contact-references', {
        body: { contact_id: contact.id },
      });
      if (error) throw error;
      setRefsResult(data);
      setDeleteOpen(true);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudieron comprobar las referencias del contacto', variant: 'destructive' });
    } finally {
      setCheckingRefs(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!refsResult || refsResult.total > 0) return;
    if (deleteConfirmText.trim() !== contact.name.trim()) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-contact', {
        body: { contact_id: contact.id, confirmation_text: deleteConfirmText },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Contacto eliminado', description: `"${contact.name}" se ha eliminado correctamente.` });
      setDeleteOpen(false);
      onOpenChange(false);
      onContactUpdated();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err?.message || 'No se pudo eliminar el contacto', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const REF_LABELS: Record<string, string> = {
    budget_items: 'Partidas de presupuesto',
    solicitudes: 'Solicitudes',
    solicitudes_promotor: 'Solicitudes (como promotor)',
    royalty_splits: 'Splits de royalties',
    song_splits: 'Splits de canciones',
    track_credits: 'Créditos de tracks',
    release_assets: 'Activos de lanzamiento (proveedor)',
    transactions: 'Movimientos financieros',
    default_royalty_splits: 'Splits por defecto',
    booking_availability_responses: 'Respuestas de disponibilidad',
    sync_offers: 'Ofertas de sync',
    sync_offers_requester: 'Ofertas de sync (solicitante)',
    sync_splits: 'Splits de sync',
    track_publishing_splits: 'Splits de publishing',
    track_master_splits: 'Splits de master',
  };

  const renderField = (field: keyof typeof formData, type: 'input' | 'textarea' = 'input') => {
    if (field === 'is_public' || field === 'category') return null;
    if (!fieldConfig[field as keyof typeof fieldConfig]) return null;

    const Component = type === 'textarea' ? Textarea : Input;
    
    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={field}>{FIELD_LABELS[field as keyof typeof FIELD_LABELS]}</Label>
        <Component
          id={field}
          value={formData[field]}
          onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={`Introduce ${FIELD_LABELS[field as keyof typeof FIELD_LABELS]?.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contacto</DialogTitle>
          <DialogDescription>
            Modifica la información y configura los campos visibles
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de Campos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Plantilla</Label>
                <Select value={selectedPreset} onValueChange={applyPreset}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(allPresets).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                    ))}
                    
                    <SelectItem value="__manage__">
                      <span className="flex items-center gap-1.5">
                        <Settings2 className="w-3.5 h-3.5" />
                        Editar plantillas...
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator className="my-2" />
              {Object.entries(FIELD_LABELS).map(([field, label]) => (
                <div key={field} className="flex items-center justify-between">
                  <Label htmlFor={`config-${field}`} className="text-sm">
                    {label}
                  </Label>
                  <Switch
                    id={`config-${field}`}
                    checked={fieldConfig[field as keyof typeof fieldConfig]}
                    onCheckedChange={(checked) => updateFieldConfig(field, checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              ))}

              {customFields.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <Label className="text-xs uppercase text-muted-foreground tracking-wide">
                    Campos personalizados
                  </Label>
                  {customFields.map((cf) => {
                    const key = `custom_${cf.id}`;
                    return (
                      <div key={cf.id} className="flex items-center justify-between">
                        <Label htmlFor={`config-${key}`} className="text-sm">
                          {cf.label}
                        </Label>
                        <Switch
                          id={`config-${key}`}
                          checked={visible(key)}
                          onCheckedChange={(checked) => updateFieldConfig(key, checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    );
                  })}
                </>
              )}

              <hr className="my-4" />
              
              <div className="flex items-center justify-between">
                <Label htmlFor="is-public" className="text-sm">
                  Hacer público
                </Label>
                <Switch
                  id="is-public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="is-team-member" className="text-sm">
                  Miembro de equipo
                </Label>
                <Switch
                  id="is-team-member"
                  checked={isTeamMember}
                  onCheckedChange={setIsTeamMember}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Panel */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-lg shrink-0">
                    {(formData.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">{formData.name || 'Nuevo contacto'}</h3>
                    {formData.role && (
                      <p className="text-sm text-muted-foreground truncate">{formData.role}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {formData.category && formData.category !== 'general' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {formData.category}
                        </span>
                      )}
                      {formData.email && (
                        <span className="text-xs text-muted-foreground">{formData.email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateFormLink}
                  disabled={generatingFormLink}
                  className="shrink-0"
                >
                  {generatingFormLink ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Share2 className="h-4 w-4 mr-2" />Formulario</>
                  )}
                </Button>
              </div>

              {/* Basic Info - Always Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre principal del contacto"
                  required
                />
              </div>

              {/* Main Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Rol / Funciones</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Ej: Batería, Productor, Ingeniero de sonido..."
                />
                <p className="text-xs text-muted-foreground">
                  Puedes añadir varias funciones separadas por coma
                </p>
              </div>

              {/* Project-specific roles - Show if contact has roles in projects */}
              {projectRoles.length > 0 && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <Label className="text-sm font-medium">Roles en proyectos</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Este contacto tiene roles específicos asignados en los siguientes proyectos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {projectRoles.map((pr) => (
                      <div 
                        key={pr.projectId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border text-sm"
                      >
                        <span className="font-medium">{pr.role}</span>
                        <span className="text-muted-foreground">en</span>
                        <span className="text-primary">{pr.projectName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Configuration - Only show if isTeamMember */}
              {isTeamMember && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm">Configuración de Equipo</h4>
                    
                    {/* Team Type Selector */}
                    <div className="space-y-2">
                      <Label>Tipo de equipo</Label>
                      <RadioGroup 
                        value={isManagementTeam ? 'management' : 'artist'} 
                        onValueChange={(value) => {
                          setIsManagementTeam(value === 'management');
                          if (value === 'management') {
                            setSelectedArtistIds([]);
                          }
                        }}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="management" id="edit-team-management" />
                          <Label htmlFor="edit-team-management" className="flex items-center gap-2 cursor-pointer">
                            <Building2 className="w-4 h-4 text-primary" />
                            00 Management (empresa)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="artist" id="edit-team-artist" />
                          <Label htmlFor="edit-team-artist" className="flex items-center gap-2 cursor-pointer">
                            <Music className="w-4 h-4 text-primary" />
                            Equipo de artista
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Artist selector - always show for team members */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Artistas</Label>
                        <p className="text-xs text-muted-foreground mb-2">Puedes asignar este miembro a varios artistas</p>
                      </div>
                        <Popover open={artistSelectOpen} onOpenChange={setArtistSelectOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={artistSelectOpen}
                              className="w-full justify-start text-left font-normal h-auto min-h-10 bg-background hover:bg-background/80"
                            >
                              {selectedArtistIds.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedArtistIds.map((artistId) => (
                                    <span
                                      key={artistId}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-background border border-border/50 text-sm font-medium text-foreground shadow-sm"
                                    >
                                      <Music className="w-3.5 h-3.5 text-primary" />
                                      {getArtistLabel(artistId)}
                                      <button
                                        type="button"
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeArtist(artistId);
                                        }}
                                      >
                                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Seleccionar artistas...</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar artista..." />
                              <CommandList>
                                <CommandEmpty>No se encontró ningún artista.</CommandEmpty>
                                <CommandGroup heading="Artistas">
                                  {artists.map((artist) => {
                                    const isSelected = selectedArtistIds.includes(artist.id);
                                    return (
                                      <CommandItem
                                        key={artist.id}
                                        value={artist.stage_name || artist.name}
                                        onSelect={() => toggleArtist(artist.id)}
                                      >
                                        <div className={cn(
                                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                                        )}>
                                          {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        <Music className="mr-2 h-4 w-4" />
                                        {artist.stage_name || artist.name}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                    {/* Primary Team Category */}
                    <div className="space-y-2">
                      <Label>Categoría principal</Label>
                      <Select 
                        value={teamCategories[0] || ''} 
                        onValueChange={(value) => setTeamCategories([value])}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Seleccionar categoría..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {[...TEAM_CATEGORIES, ...customCategories].map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                {cat.label}
                                {cat.isCustom && (
                                  <span className="text-xs text-muted-foreground">(personalizada)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Define cómo se agrupa este miembro en la vista de equipo
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('stage_name')}
                {renderField('legal_name')}
                {renderField('email')}
                {renderField('phone')}
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="País"
                  />
                </div>
              </div>

              {renderField('address', 'textarea')}
              {renderField('company')}

              {/* Financial Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('bank_info')}
                {renderField('iban')}
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('clothing_size')}
                {renderField('shoe_size')}
              </div>

              {renderField('allergies', 'textarea')}
              {renderField('special_needs', 'textarea')}
              {renderField('contract_url')}
              {renderField('preferred_hours', 'textarea')}
              {renderField('notes', 'textarea')}

              {/* Custom Fields */}
              <CustomFieldsSection
                fields={customFields.filter((f) => visible(`custom_${f.id}`))}
                customData={customData}
                onCustomDataChange={(key, value) => setCustomData(prev => ({ ...prev, [key]: value }))}
                onCreateField={async (label, fieldType) => { await createField.mutateAsync({ label, fieldType }); }}
                onDeleteField={async (id) => { await deleteField.mutateAsync(id); }}
                isEditing={true}
                isLoading={loadingCustomFields}
              />

              <Separator className="my-6" />

              {/* Tags Section */}
              <ContactTagsInput
                value={tags}
                onChange={setTags}
                label="Etiquetas"
                placeholder="Añadir etiqueta... #prensa #paris"
              />

              {/* Danger Zone */}
              <Separator className="my-6" />
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive">Zona de peligro</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Eliminar este contacto es permanente. Si está vinculado a presupuestos, bookings, contratos, splits o cualquier otro registro, no podrás borrarlo hasta desvincularlo primero.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleStartDelete}
                  disabled={deleting || checkingRefs}
                >
                  {checkingRefs ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Comprobando...</>
                  ) : (
                    <><Trash2 className="h-4 w-4 mr-2" />Eliminar contacto</>
                  )}
                </Button>
              </div>
              
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>

        <ManageFieldPresetsDialog
          open={managePresetsOpen}
          onOpenChange={setManagePresetsOpen}
          currentFieldConfig={fieldConfig}
          onPresetsChanged={handlePresetsChanged}
        />

        <AlertDialog open={pendingPreset !== null} onOpenChange={(open) => { if (!open) { setPendingPreset(null); setFieldsAtRisk([]); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Campos con información se ocultarán</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>Al aplicar esta plantilla se ocultarán estos campos que ya contienen información:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {fieldsAtRisk.map(label => (
                      <li key={label} className="font-medium text-foreground">{label}</li>
                    ))}
                  </ul>
                  <p className="text-sm">Los datos no se eliminan, solo dejan de ser visibles.</p>
                  <p className="text-sm font-medium">¿Deseas mantener visibles los campos que ya contienen información?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button variant="outline" onClick={() => confirmApplyPreset(false)}>
                Ocultar
              </Button>
              <AlertDialogAction onClick={() => confirmApplyPreset(true)}>
                Mantener
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete contact confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deleting) setDeleteOpen(o); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {refsResult && refsResult.total > 0 ? 'No se puede eliminar' : 'Eliminar contacto'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                {refsResult && refsResult.total > 0 ? (
                  <div className="space-y-3">
                    <p>
                      <strong>{contact.name}</strong> está vinculado a {refsResult.total} registro{refsResult.total !== 1 ? 's' : ''} crítico{refsResult.total !== 1 ? 's' : ''}. Eliminarlo provocaría pérdida de información en otros módulos.
                    </p>
                    <div className="rounded-md border bg-muted/30 p-3 max-h-48 overflow-y-auto">
                      <ul className="text-sm space-y-1">
                        {Object.entries(refsResult.breakdown)
                          .filter(([, c]) => c > 0)
                          .map(([key, c]) => (
                            <li key={key} className="flex justify-between gap-3">
                              <span className="text-foreground">{REF_LABELS[key] || key}</span>
                              <span className="font-medium tabular-nums">{c}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                    <p className="text-sm">
                      Desvincula primero estas referencias desde los módulos correspondientes (presupuestos, splits, finanzas, etc.) o archiva el contacto en su lugar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p>
                      Esta acción es <strong>permanente e irreversible</strong>. El contacto <strong>{contact.name}</strong> y sus datos personales (etiquetas, asignaciones de equipo, tokens de formulario) se eliminarán definitivamente.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="delete-confirm" className="text-sm">
                        Para confirmar, escribe <span className="font-mono font-semibold text-foreground">{contact.name}</span>:
                      </Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={contact.name}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                {refsResult && refsResult.total > 0 ? 'Entendido' : 'Cancelar'}
              </AlertDialogCancel>
              {(!refsResult || refsResult.total === 0) && (
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deleting || deleteConfirmText.trim() !== contact.name.trim()}
                >
                  {deleting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando...</>
                  ) : (
                    <><Trash2 className="h-4 w-4 mr-2" />Eliminar definitivamente</>
                  )}
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}