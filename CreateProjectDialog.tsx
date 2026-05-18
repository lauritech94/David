import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SingleArtistSelector } from "@/components/SingleArtistSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCreated?: (projectId: string) => void;
  defaultArtistId?: string;
  parentFolderId?: string | null;
}

export default function CreateProjectDialog({ open, onOpenChange, onSuccess, onCreated, defaultArtistId, parentFolderId }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    artist_id: defaultArtistId || '',
    status: 'en_curso' as 'en_curso' | 'finalizado' | 'archivado',
    start_date: '',
    end_date_estimada: '',
    description: '',
    objective: '',
  });

  const handleChange = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Falta nombre', description: 'Indica el nombre del proyecto', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: form.name.trim(),
          artist_id: form.artist_id || null,
          status: form.status,
          start_date: form.start_date || null,
          end_date_estimada: form.end_date_estimada || null,
          description: form.description || null,
          objective: form.objective || null,
          created_by: profile?.user_id,
          parent_folder_id: parentFolderId,
          is_folder: false,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id && onCreated) {
        onCreated(data.id);
      }
      toast({ title: 'Proyecto creado', description: 'Proyecto creado correctamente' });
      onSuccess();
      onOpenChange(false);
      setForm({ name: '', artist_id: '', status: 'en_curso', start_date: '', end_date_estimada: '', description: '', objective: '' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo crear el proyecto', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>Crea un proyecto y vincúlalo con artistas, presupuestos y documentos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Nombre del proyecto" />
          </div>
          <div className="space-y-2">
            <Label>Artista principal</Label>
            <SingleArtistSelector value={form.artist_id} onValueChange={(v) => handleChange('artist_id', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2 md:col-span-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v: any) => handleChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_curso">En curso</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Inicio</Label>
              <Input type="date" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Fin estimado</Label>
              <Input type="date" value={form.end_date_estimada} onChange={(e) => handleChange('end_date_estimada', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Textarea rows={3} value={form.objective} onChange={(e) => handleChange('objective', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Creando…' : 'Crear'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
