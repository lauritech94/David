import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { Disc3, DollarSign, Music, CalendarDays, FileText, AlignLeft, Trash2 } from 'lucide-react';

const cardDisplayConfigSchema = z.object({
  show_releases: z.boolean(),
  show_budgets: z.boolean(),
  show_events: z.boolean(),
  show_dates: z.boolean(),
  show_epk: z.boolean(),
  show_description: z.boolean(),
});

export type CardDisplayConfig = z.infer<typeof cardDisplayConfigSchema>;

export const DEFAULT_CARD_CONFIG: CardDisplayConfig = {
  show_releases: true,
  show_budgets: true,
  show_events: true,
  show_dates: true,
  show_epk: true,
  show_description: false,
};

const formSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  description: z.string().trim().max(2000, 'Máximo 2000 caracteres').optional(),
});

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  artistId?: string | null;
  description?: string | null;
  config: CardDisplayConfig;
}

const TOGGLE_OPTIONS: { key: keyof CardDisplayConfig; label: string; icon: React.ReactNode }[] = [
  { key: 'show_releases', label: 'Lanzamientos', icon: <Disc3 className="h-4 w-4 text-orange-500" /> },
  { key: 'show_budgets', label: 'Presupuestos', icon: <DollarSign className="h-4 w-4 text-green-500" /> },
  { key: 'show_events', label: 'Eventos', icon: <Music className="h-4 w-4 text-purple-500" /> },
  { key: 'show_dates', label: 'Fechas', icon: <CalendarDays className="h-4 w-4 text-blue-500" /> },
  { key: 'show_epk', label: 'EPK', icon: <FileText className="h-4 w-4 text-cyan-500" /> },
  { key: 'show_description', label: 'Descripción', icon: <AlignLeft className="h-4 w-4 text-muted-foreground" /> },
];

export function ProjectSettingsDialog({ open, onOpenChange, projectId, projectName, artistId, description, config }: ProjectSettingsDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState<CardDisplayConfig>(config);
  const [localName, setLocalName] = useState(projectName);
  const [localArtistId, setLocalArtistId] = useState<string | null>(artistId ?? null);
  const [localDescription, setLocalDescription] = useState<string>(description ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalName(projectName);
      setLocalArtistId(artistId ?? null);
      setLocalDescription(description ?? '');
      setLocalConfig(config);
    }
  }, [open, projectName, artistId, description, config]);

  const handleSave = async () => {
    const parsed = formSchema.safeParse({ name: localName, description: localDescription });
    if (!parsed.success) {
      toast({ title: 'Error', description: parsed.error.errors[0]?.message ?? 'Datos inválidos', variant: 'destructive' });
      return;
    }
    const cfgParsed = cardDisplayConfigSchema.safeParse(localConfig);
    if (!cfgParsed.success) {
      toast({ title: 'Error', description: 'Configuración inválida', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({
        name: parsed.data.name,
        artist_id: localArtistId,
        description: parsed.data.description?.length ? parsed.data.description : null,
        card_display_config: localConfig as any,
      })
      .eq('id', projectId);
    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
      return;
    }

    toast({ title: 'Cambios guardados' });
    queryClient.invalidateQueries({ queryKey: ['proyectos-projects'] });
    queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] });
    onOpenChange(false);
  };

  const handleToggle = (key: keyof CardDisplayConfig, value: boolean) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    setDeleting(false);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el proyecto', variant: 'destructive' });
    } else {
      toast({ title: 'Proyecto eliminado' });
      queryClient.invalidateQueries({ queryKey: ['proyectos-projects'] });
      onOpenChange(false);
      navigate('/proyectos');
    }
  };

  const activeCount = Object.values(localConfig).filter(Boolean).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración del proyecto</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* General data */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Datos generales</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Nombre</Label>
                  <Input
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    maxLength={100}
                    placeholder="Nombre del proyecto"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Perfil vinculado</Label>
                  <SingleArtistSelector
                    value={localArtistId}
                    onValueChange={setLocalArtistId}
                    placeholder="Sin artista vinculado"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Descripción</Label>
                  <Textarea
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    maxLength={2000}
                    placeholder="Breve descripción del proyecto"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Card display toggles */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Vista previa en tarjeta</p>
              <p className="text-xs text-muted-foreground">Elige qué datos se muestran en la tarjeta del proyecto (máx. 3)</p>
              {activeCount >= 3 && (
                <p className="text-xs text-amber-500 font-medium">Máximo 3 opciones seleccionadas</p>
              )}
              <div className="space-y-3 pt-1">
                {TOGGLE_OPTIONS.map(({ key, label, icon }) => {
                  const isChecked = localConfig[key];
                  const isDisabled = !isChecked && activeCount >= 3;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <Label className={`flex items-center gap-2 text-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {icon}
                        {label}
                      </Label>
                      <Switch
                        checked={isChecked}
                        disabled={isDisabled}
                        onCheckedChange={(v) => handleToggle(key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Danger zone */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-destructive">Zona peligrosa</p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar proyecto
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{projectName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al proyecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
