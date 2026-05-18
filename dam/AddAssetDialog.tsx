import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  SECTION_LABELS,
  ARTWORK_TYPES, VIDEO_TYPES, DIGITAL_ASSET_TYPES, PHYSICAL_TYPES,
  ASSET_STATUSES, STATUS_LABELS,
} from './DAMConstants';
import { detectImageDimensionsFromFile } from './utils/detectImageDimensions';

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releaseId: string;
  defaultSection: string;
  sessionId?: string;
  stage?: string;
  onSuccess: () => void;
}

export default function AddAssetDialog({
  open, onOpenChange, releaseId, defaultSection, sessionId, stage, onSuccess,
}: AddAssetDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [form, setForm] = useState({
    title: '',
    sub_type: '',
    status: 'en_produccion',
    external_url: '',
    section: defaultSection,
  });

  const getSubTypeOptions = () => {
    switch (form.section) {
      case 'artwork': return ARTWORK_TYPES;
      case 'video': return VIDEO_TYPES;
      case 'assets_digitales': return DIGITAL_ASSET_TYPES;
      case 'formatos_fisicos': return PHYSICAL_TYPES;
      default: return [];
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        const ext = file.name.split('.').pop();
        const fileName = `${releaseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('release-assets')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('release-assets').getPublicUrl(fileName);

        const title = form.title || file.name.replace(/\.[^/.]+$/, '');

        // Auto-detect dimensions for images
        let resolution: string | null = null;
        let format_spec: string | null = null;
        if (isImage) {
          try {
            const dims = await detectImageDimensionsFromFile(file);
            resolution = dims.resolution;
            format_spec = dims.formatSpec || null;
          } catch { /* ignore detection errors */ }
        }

        await supabase.from('release_assets').insert({
          release_id: releaseId,
          type: isVideo ? 'video' : 'image',
          title,
          file_url: urlData.publicUrl,
          file_bucket: fileName,
          uploaded_by: user.id,
          section: form.section,
          sub_type: form.sub_type || null,
          status: form.status,
          session_id: sessionId || null,
          stage: stage || null,
          resolution,
          format_spec,
        } as any);

        // Auto-sync cover to release
        if (
          form.section === 'artwork' &&
          ['Cover Álbum', 'Cover Single'].includes(form.sub_type) &&
          ['listo', 'publicado'].includes(form.status) &&
          urlData.publicUrl
        ) {
          await supabase
            .from('releases')
            .update({ cover_image_url: urlData.publicUrl } as any)
            .eq('id', releaseId);
        }
      }

      toast({ title: `${files.length} archivo(s) subidos` });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error al subir', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlAdd = async () => {
    if (!form.external_url || !form.title || !user) {
      toast({ title: 'Completa título y URL', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      await supabase.from('release_assets').insert({
        release_id: releaseId,
        type: 'video',
        title: form.title,
        file_url: form.external_url,
        file_bucket: '',
        uploaded_by: user.id,
        section: form.section,
        sub_type: form.sub_type || null,
        status: form.status,
        external_url: form.external_url,
        session_id: sessionId || null,
        stage: stage || null,
      } as any);

      toast({ title: 'Enlace añadido' });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', sub_type: '', status: 'en_produccion', external_url: '', section: defaultSection });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir a {SECTION_LABELS[form.section] || form.section}</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={v => setMode(v as 'file' | 'url')}>
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1"><Upload className="h-3.5 w-3.5 mr-1" /> Subir archivo</TabsTrigger>
            <TabsTrigger value="url" className="flex-1"><Link2 className="h-3.5 w-3.5 mr-1" /> Enlace externo</TabsTrigger>
          </TabsList>

          <div className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nombre del asset" className="h-8 text-sm" />
            </div>

            {getSubTypeOptions().length > 0 && (
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.sub_type} onValueChange={v => setForm(f => ({ ...f, sub_type: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {getSubTypeOptions().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="url" className="mt-0 space-y-3">
              <div>
                <Label className="text-xs">URL</Label>
                <Input value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://youtube.com/..." className="h-8 text-sm" />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={handleFileUpload} />
          {mode === 'file' ? (
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {uploading ? 'Subiendo...' : 'Seleccionar archivos'}
            </Button>
          ) : (
            <Button onClick={handleUrlAdd} disabled={uploading} className="w-full">
              {uploading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Añadir enlace
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
