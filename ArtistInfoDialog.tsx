import { useState, useEffect, useRef } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { User, Save, Share2, Loader2, Camera, Trash2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';
import { GenreCombobox } from '@/components/GenreCombobox';
import { cn } from '@/lib/utils';
import { IRPF_TYPE_OPTIONS, getIrpfForArtist } from '@/utils/irpf';
import { useCustomFields } from '@/hooks/useCustomFields';
import { CustomFieldsSection } from '@/components/CustomFieldsSection';
import {
  ARTIST_FIELD_LABELS,
  ARTIST_FIELD_PRESETS,
  isArtistFieldVisible,
  detectArtistPreset,
  type ArtistFieldConfig,
} from '@/lib/artistFieldConfigPresets';
import { SocialLinksEditor } from '@/components/SocialLinksEditor';
import type { SocialLink } from '@/lib/social-platforms';
import { PROCombobox } from '@/components/credits/PROCombobox';

interface ArtistData {
  id: string;
  name: string;
  stage_name: string | null;
  description: string | null;
  genre: string | null;
  avatar_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  tiktok_url: string | null;
  company_name: string | null;
  legal_name: string | null;
  tax_id: string | null;
  brand_color: string | null;
  created_at: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  clothing_size: string | null;
  shoe_size: string | null;
  allergies: string | null;
  special_needs: string | null;
  bank_name: string | null;
  iban: string | null;
  swift_code: string | null;
  notes: string | null;
  workspace_id: string;
  custom_data: Record<string, string> | null;
  field_config: Record<string, any> | null;
}

const FORM_FIELDS = [
  'name', 'stage_name', 'description', 'genre',
  'email', 'phone', 'address',
  'instagram_url', 'spotify_url', 'tiktok_url',
  'clothing_size', 'shoe_size',
  'allergies', 'special_needs',
  'company_name', 'legal_name', 'tax_id',
  'bank_name', 'iban', 'swift_code',
  'notes',
  'irpf_type', 'irpf_porcentaje', 'actividad_inicio', 'nif', 'tipo_entidad',
  'ipi_number', 'pro_name',
] as const;

type FormData = Record<typeof FORM_FIELDS[number], string>;

const emptyForm = (): FormData => Object.fromEntries(FORM_FIELDS.map(f => [f, ''])) as FormData;

interface ArtistInfoDialogProps {
  artistId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtistInfoDialog({ artistId, open, onOpenChange }: ArtistInfoDialogProps) {
  const { profile: currentProfile } = useAuth();
  const navigate = useNavigate();
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [saving, setSaving] = useState(false);

  // Field config state
  const [fieldConfig, setFieldConfig] = useState<ArtistFieldConfig>({});
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('complete');

  // Avatar upload states
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { fields: customFields, isLoading: loadingCustomFields, createField, deleteField } = useCustomFields(
    artistData?.workspace_id, 'artist'
  );

  useEffect(() => {
    if (open && artistId) {
      fetchArtist();
    }
  }, [open, artistId]);

  const fetchArtist = async () => {
    if (!artistId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setArtistData(null); return; }

      setArtistData(data as unknown as ArtistData);
      const fd = emptyForm();
      for (const key of FORM_FIELDS) {
        fd[key] = (data as any)[key] || '';
      }
      setFormData(fd);
      setCustomData(((data as any).custom_data as Record<string, string>) || {});
      const rawSocial = (data as any).social_links;
      setSocialLinks(Array.isArray(rawSocial) ? (rawSocial as SocialLink[]) : []);

      const fc = ((data as any).field_config as ArtistFieldConfig) || {};
      setFieldConfig(fc);
      setSelectedPreset(detectArtistPreset(fc));
    } catch (error) {
      console.error('Error fetching artist:', error);
      toast({ title: "Error", description: "No se pudo cargar la información del artista.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!artistId) return;
    setSaving(true);
    try {
      const updateData: Record<string, any> = {};
      for (const key of FORM_FIELDS) {
        updateData[key] = formData[key] || null;
      }
      updateData.name = formData.name;
      updateData.custom_data = customData;
      updateData.social_links = socialLinks.filter((l) => l.url.trim());
      // Normalize: explicit true/false for every known field so what the user sees in toggles
      // is exactly what the public form will render.
      const normalizedConfig: Record<string, boolean> = Object.fromEntries(
        Object.keys(ARTIST_FIELD_LABELS).map(f => [f, isArtistFieldVisible(fieldConfig, f)])
      );
      for (const field of customFields) {
        const key = `custom_${field.id}`;
        normalizedConfig[key] = isArtistFieldVisible(fieldConfig, key);
      }
      updateData.field_config = normalizedConfig;

      const { error } = await supabase
        .from('artists')
        .update(updateData)
        .eq('id', artistId);

      if (error) throw error;
      toast({ title: "Éxito", description: "Información del artista actualizada." });
      fetchArtist();
      queryClient.invalidateQueries({ queryKey: ['artists'] });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar la información.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canEdit = currentProfile?.active_role === 'management';

  const handleDeleteArtist = async () => {
    if (!artistId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('artists').delete().eq('id', artistId);
      if (error) throw error;
      toast({ title: "Artista eliminado", description: "El perfil y todos sus datos asociados han sido eliminados." });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['management-artists'] });
      navigate('/mi-management');
    } catch (error) {
      console.error('Error deleting artist:', error);
      toast({ title: "Error", description: "No se pudo eliminar el artista.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen.", variant: "destructive" });
      return;
    }
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarUpload = async (blob: Blob) => {
    if (!artistId) return;
    setUploadingAvatar(true);
    setCropFile(null);
    try {
      const filePath = `${artistId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('artist-assets')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('artist-assets').getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from('artists')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', artistId);
      if (updateError) throw updateError;

      setArtistData(prev => prev ? { ...prev, avatar_url: publicUrl.publicUrl } : prev);
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      toast({ title: "Éxito", description: "Imagen del artista actualizada." });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Error", description: "No se pudo subir la imagen.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [generatingLink, setGeneratingLink] = useState(false);
  const handleGenerateFormLink = async () => {
    if (!artistId) return;
    setGeneratingLink(true);
    try {
      const { data: existing } = await supabase
        .from('artist_form_tokens' as any)
        .select('token')
        .eq('artist_id', artistId)
        .eq('is_active', true)
        .maybeSingle();

      let tokenValue: string;
      if (existing && (existing as any).token) {
        tokenValue = (existing as any).token;
      } else {
        const { data: newToken, error } = await supabase
          .from('artist_form_tokens' as any)
          .insert({ artist_id: artistId, created_by: currentProfile?.user_id } as any)
          .select('token')
          .single();
        if (error) throw error;
        tokenValue = (newToken as any).token;
      }

      const url = `${PUBLIC_APP_URL}/artist-form/${tokenValue}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Enlace copiado", description: "El enlace del formulario se ha copiado al portapapeles." });
    } catch (err) {
      console.error('Error generating form link:', err);
      toast({ title: "Error", description: "No se pudo generar el enlace.", variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const set = (key: typeof FORM_FIELDS[number]) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const updateFieldConfig = (field: string, enabled: boolean) => {
    const next = { ...fieldConfig, [field]: enabled };
    setFieldConfig(next);
    setSelectedPreset(detectArtistPreset(next));
  };

  const applyPreset = (presetKey: string) => {
    if (presetKey === 'custom') return;
    const preset = ARTIST_FIELD_PRESETS[presetKey];
    if (!preset) return;
    setFieldConfig({ ...preset.config });
    setSelectedPreset(presetKey);
  };

  const visible = (field: string) => isArtistFieldVisible(fieldConfig, field);

  const renderField = (label: string, field: typeof FORM_FIELDS[number], placeholder?: string) => {
    if (!visible(field)) return null;
    return (
      <div className="space-y-2" key={field}>
        <Label>{label}</Label>
        <Input value={formData[field]} onChange={set(field)} placeholder={placeholder || label} />
      </div>
    );
  };

  const renderTextarea = (label: string, field: typeof FORM_FIELDS[number], placeholder?: string, rows = 3) => {
    if (!visible(field)) return null;
    return (
      <div className="space-y-2" key={field}>
        <Label>{label}</Label>
        <Textarea value={formData[field]} onChange={set(field)} placeholder={placeholder || label} rows={rows} />
      </div>
    );
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="text-center py-8">Cargando información del artista...</div></DialogContent>
      </Dialog>
    );
  }

  if (!artistData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="text-center py-8">No se encontró información del artista.</div></DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Ficha del Artista
          </DialogTitle>
          <DialogDescription>Información detallada y configuración de campos visibles</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel — Config */}
          {canEdit && (
            <Card>
              <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Configuración de Campos</CardTitle>
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 text-muted-foreground transition-transform',
                          configOpen && 'rotate-180'
                        )}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Plantilla</Label>
                      <Select value={selectedPreset} onValueChange={applyPreset}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ARTIST_FIELD_PRESETS).map(([key, preset]) => (
                            <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => applyPreset('complete')}
                    >
                      Activar todos los campos
                    </Button>
                    <Separator className="my-2" />
                    {Object.entries(ARTIST_FIELD_LABELS).map(([field, label]) => (
                      <div key={field} className="flex items-center justify-between">
                        <Label htmlFor={`config-${field}`} className="text-sm">{label}</Label>
                        <Switch
                          id={`config-${field}`}
                          checked={visible(field)}
                          onCheckedChange={(checked) => updateFieldConfig(field, checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    ))}

                    {customFields.length > 0 && (
                      <>
                        <Separator className="my-2" />
                        <Label className="text-xs uppercase text-muted-foreground tracking-wide">Campos personalizados</Label>
                        {customFields.map((field) => {
                          const key = `custom_${field.id}`;
                          return (
                            <div key={field.id} className="flex items-center justify-between">
                              <Label htmlFor={`config-${key}`} className="text-sm">{field.label}</Label>
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
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Right Panel — Form */}
          <div className={cn("space-y-4", canEdit ? "lg:col-span-2" : "lg:col-span-3")}>
            {/* Header with avatar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn('relative group', canEdit && 'cursor-pointer')}
                  onClick={() => canEdit && fileInputRef.current?.click()}
                >
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={artistData.avatar_url || ''} />
                    <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                  </Avatar>
                  {canEdit && !uploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{artistData.name}</h3>
                  {artistData.stage_name && <p className="text-sm text-muted-foreground">{artistData.stage_name}</p>}
                  {artistData.genre && <Badge variant="secondary" className="mt-1">{artistData.genre}</Badge>}
                </div>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={handleGenerateFormLink} disabled={generatingLink}>
                  {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Share2 className="h-4 w-4 mr-2" />Formulario</>}
                </Button>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <ImageCropperDialog
              file={cropFile}
              open={!!cropFile}
              onConfirm={handleAvatarUpload}
              onCancel={() => setCropFile(null)}
              aspectRatio={1}
              circular
              title="Ajustar foto del artista"
            />

            {/* Name (always visible) */}
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={formData.name} onChange={set('name')} placeholder="Nombre del artista" required />
            </div>

            {/* General */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField("Nombre artístico", "stage_name", "Nombre artístico")}
              {visible('genre') && (
                <div className="space-y-2">
                  <Label>Género musical</Label>
                  <GenreCombobox value={formData.genre} onValueChange={(v) => setFormData(prev => ({ ...prev, genre: v }))} />
                </div>
              )}
            </div>
            {renderTextarea("Biografía", "description", "Biografía del artista")}

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField("Email", "email", "email@ejemplo.com")}
              {renderField("Teléfono", "phone", "+34 600 000 000")}
            </div>
            {renderField("Dirección", "address", "Dirección completa")}

            {/* Social */}
            {(visible('instagram_url') || visible('spotify_url') || visible('tiktok_url')) && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField("Instagram", "instagram_url", "https://instagram.com/...")}
                  {renderField("Spotify", "spotify_url", "https://open.spotify.com/...")}
                  {renderField("TikTok", "tiktok_url", "https://tiktok.com/...")}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Otras redes</Label>
                  <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
                </div>
              </div>
            )}

            {/* Sizes */}
            {(visible('clothing_size') || visible('shoe_size')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField("Talla de ropa", "clothing_size", "M, L, XL...")}
                {renderField("Talla de calzado", "shoe_size", "42, 43...")}
              </div>
            )}

            {/* Health */}
            {renderTextarea("Alergias", "allergies", "Alergias alimentarias, medicamentos...", 2)}
            {renderTextarea("Necesidades especiales", "special_needs", "Requisitos especiales...", 2)}

            {/* Fiscal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField("Empresa", "company_name", "Nombre de empresa")}
              {renderField("Nombre legal", "legal_name", "Nombre legal")}
            </div>
            {renderField("CIF / NIF", "tax_id", "CIF o NIF")}

            {/* IRPF section */}
            {visible('irpf_type') && (
              <div className="space-y-2">
                <Label>Tipo de IRPF</Label>
                <Select
                  value={formData.irpf_type || 'profesional_establecido'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, irpf_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IRPF_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span>{opt.label} <span className="text-muted-foreground text-xs">— {opt.description}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {visible('irpf_porcentaje') && formData.irpf_type === 'personalizado' && (
              <div className="space-y-2">
                <Label>% IRPF personalizado</Label>
                <Input type="number" value={formData.irpf_porcentaje || '15'} onChange={set('irpf_porcentaje')} min={0} max={100} />
              </div>
            )}
            {visible('actividad_inicio') && (
              <div className="space-y-2">
                <Label>Fecha inicio actividad</Label>
                <Input type="date" value={formData.actividad_inicio || ''} onChange={set('actividad_inicio')} />
              </div>
            )}
            {renderField("NIF / NIE", "nif", "12345678A")}
            {visible('tipo_entidad') && (
              <div className="space-y-2">
                <Label>Tipo de entidad</Label>
                <Select
                  value={formData.tipo_entidad || 'persona_fisica'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_entidad: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="persona_fisica">Persona física</SelectItem>
                    <SelectItem value="sociedad">Sociedad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Publishing identity (IPI + PRO) */}
            {(visible('ipi_number') || visible('pro_name')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visible('ipi_number') && (
                  <div className="space-y-2">
                    <Label>Número IPI (CISAC)</Label>
                    <Input
                      value={formData.ipi_number}
                      onChange={set('ipi_number')}
                      placeholder="9–11 dígitos, ej. 00123456789"
                      inputMode="numeric"
                      maxLength={11}
                    />
                    {formData.ipi_number && !/^\d{9,11}$/.test(formData.ipi_number.trim()) && (
                      <p className="text-xs text-destructive">Debe tener entre 9 y 11 dígitos.</p>
                    )}
                    <p className="text-xs text-muted-foreground">Identificador global del autor en sociedades de gestión.</p>
                  </div>
                )}
                {visible('pro_name') && artistData && (
                  <div className="space-y-2">
                    <Label>Sociedad de gestión (PRO)</Label>
                    <PROCombobox
                      value={formData.pro_name}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, pro_name: v }))}
                      workspaceId={artistData.workspace_id}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField("Banco", "bank_name", "Nombre del banco")}
              {renderField("IBAN", "iban", "ES00 0000 0000 0000 0000 0000")}
            </div>
            {renderField("Código SWIFT", "swift_code", "BBVAESMMXXX")}

            {/* Notes */}
            {renderTextarea("Notas", "notes", "Notas adicionales sobre el artista...", 3)}

            {/* Custom Fields */}
            <CustomFieldsSection
              fields={customFields.filter((f) => visible(`custom_${f.id}`))}
              customData={customData}
              onCustomDataChange={(key, value) => setCustomData(prev => ({ ...prev, [key]: value }))}
              onCreateField={canEdit ? async (label, fieldType) => { await createField.mutateAsync({ label, fieldType }); } : undefined}
              onDeleteField={canEdit ? async (id) => { await deleteField.mutateAsync(id); } : undefined}
              isEditing={true}
              isLoading={loadingCustomFields}
            />

            <Separator className="my-4" />

            {/* Footer */}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 sm:mr-auto"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />Eliminar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {canEdit && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Cambios
                </Button>
              )}
            </DialogFooter>
          </div>
        </div>

        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="¿Eliminar artista?"
          description={`Se eliminará permanentemente "${artistData?.stage_name || artistData?.name}" y todos sus datos asociados. Esta acción no se puede deshacer.`}
          confirmText="Eliminar artista"
          cancelText="Cancelar"
          variant="destructive"
          icon="delete"
          onConfirm={handleDeleteArtist}
        />
      </DialogContent>
    </Dialog>
  );
}
