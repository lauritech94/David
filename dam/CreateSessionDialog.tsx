import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releaseId: string;
  onSuccess: () => void;
}

export default function CreateSessionDialog({ open, onOpenChange, releaseId, onSuccess }: CreateSessionDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', photographer: '', session_date: '' });

  const handleCreate = async () => {
    if (!form.name || !user) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('release_photo_sessions').insert({
        release_id: releaseId,
        name: form.name,
        photographer: form.photographer || null,
        session_date: form.session_date || null,
        created_by: user.id,
      } as any);
      if (error) throw error;
      toast({ title: 'Sesión creada' });
      onSuccess();
      onOpenChange(false);
      setForm({ name: '', photographer: '', session_date: '' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al crear sesión', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva sesión de fotos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nombre *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Sesión promo enero" className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Fotógrafo/a</Label>
            <Input value={form.photographer} onChange={e => setForm(f => ({ ...f, photographer: e.target.value }))} placeholder="Nombre" className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Fecha</Label>
            <Input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} className="h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Crear sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
