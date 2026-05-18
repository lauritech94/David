import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Link, ExternalLink, AlertCircle, FileText, Music, ListChecks, Calculator, StickyNote } from 'lucide-react';
import { useProjectShare } from '@/hooks/useProjectFiles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

const SHARE_SECTIONS = [
  { id: 'archivos', label: 'Archivos del proyecto', icon: FileText, defaultChecked: true },
  { id: 'rider', label: 'Rider técnico', icon: Music, defaultChecked: true },
  { id: 'checklist', label: 'Checklist', icon: ListChecks, defaultChecked: false },
  { id: 'presupuestos', label: 'Presupuestos', icon: Calculator, defaultChecked: false },
  { id: 'notas', label: 'Notas', icon: StickyNote, defaultChecked: false },
];

export function ProjectShareDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ProjectShareDialogProps) {
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(SHARE_SECTIONS.filter(s => s.defaultChecked).map(s => s.id))
  );
  
  const {
    shareInfo,
    isLoading,
    enableShare,
    disableShare,
    isEnabling,
    isDisabling,
    getPublicUrl,
    isShared,
  } = useProjectShare(projectId);

  // Load saved sections from DB when dialog opens
  useEffect(() => {
    if (open && projectId) {
      loadSavedSections();
    }
  }, [open, projectId]);

  const loadSavedSections = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('public_share_sections')
      .eq('id', projectId)
      .single();

    if (!error && data?.public_share_sections) {
      const sections = data.public_share_sections as string[];
      if (Array.isArray(sections)) {
        setSelectedSections(new Set(sections));
      }
    }
  };

  const publicUrl = getPublicUrl();

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace público se ha copiado al portapapeles.',
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleToggleShare = async () => {
    if (isShared) {
      disableShare();
    } else {
      // Save selected sections to DB before enabling
      const sectionsArray = Array.from(selectedSections);
      await supabase
        .from('projects')
        .update({ public_share_sections: sectionsArray })
        .eq('id', projectId);

      enableShare(expiresInDays);
    }
  };

  const handleUpdateSections = async () => {
    const sectionsArray = Array.from(selectedSections);
    const { error } = await supabase
      .from('projects')
      .update({ public_share_sections: sectionsArray })
      .eq('id', projectId);

    if (!error) {
      toast({
        title: 'Secciones actualizadas',
        description: 'Las secciones compartidas se han actualizado.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Compartir Proyecto
          </DialogTitle>
          <DialogDescription>
            Genera un enlace público para compartir "{projectName}" con externos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section Selection */}
          <div className="space-y-3">
            <Label className="font-medium">Secciones a compartir</Label>
            <div className="space-y-2">
              {SHARE_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <div
                    key={section.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => toggleSection(section.id)}
                  >
                    <Checkbox
                      checked={selectedSections.has(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{section.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggle share */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share-toggle" className="font-medium">
                Enlace público
              </Label>
              <p className="text-sm text-muted-foreground">
                Cualquiera con el enlace puede ver las secciones marcadas
              </p>
            </div>
            <Switch
              id="share-toggle"
              checked={isShared}
              onCheckedChange={handleToggleShare}
              disabled={isEnabling || isDisabling || selectedSections.size === 0}
            />
          </div>

          {/* Expiration selector (only when enabling) */}
          {!isShared && (
            <div className="space-y-2">
              <Label>Duración del enlace</Label>
              <div className="flex gap-2">
                {[7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    variant={expiresInDays === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExpiresInDays(days)}
                  >
                    {days} días
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Public URL display */}
          {isShared && publicUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={publicUrl}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              {/* Expiration info */}
              {shareInfo?.public_share_expires_at && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Expira el{' '}
                    {format(new Date(shareInfo.public_share_expires_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </span>
                </div>
              )}

              {/* Update sections button */}
              <Button variant="outline" size="sm" className="w-full" onClick={handleUpdateSections}>
                Actualizar secciones compartidas
              </Button>
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge variant={isShared ? 'default' : 'secondary'}>
              {isShared ? 'Compartido' : 'Privado'}
            </Badge>
            {isShared && (
              <span className="text-xs text-muted-foreground">
                {selectedSections.size} sección(es) accesible(s)
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}