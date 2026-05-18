import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users } from 'lucide-react';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  stage_name: string;
  description: string;
}

export function CreateTeamDialog({ open, onOpenChange, onSuccess }: CreateTeamDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      stage_name: '',
      description: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('No se pudo obtener información del usuario');
      return;
    }

    setLoading(true);
    try {
      // Get workspace_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!profileData?.workspace_id) {
        toast.error('No se encontró workspace');
        return;
      }

      const { data: inserted, error } = await supabase
        .from('artists')
        .insert({
          name: data.name,
          stage_name: data.stage_name || null,
          description: data.description || null,
          workspace_id: profileData.workspace_id,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Crear carpeta en Google Drive (no bloquea si falla)
      if (inserted?.id) {
        supabase.functions
          .invoke('create-artist-drive-folder', { body: { artist_id: inserted.id } })
          .catch((e) => console.warn('Drive folder creation failed:', e));
      }

      toast.success('Equipo creado correctamente');
      reset();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast.error(error.message || 'Error al crear el equipo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Nuevo Equipo
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo equipo para organizar tus perfiles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del equipo *</Label>
            <Input
              id="name"
              placeholder="Ej: M00DITA, Banda Principal..."
              {...register('name', { required: 'El nombre es obligatorio' })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage_name">Nombre público</Label>
            <Input
              id="stage_name"
              placeholder="Nombre para mostrar públicamente"
              {...register('stage_name')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Breve descripción del equipo"
              rows={3}
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Equipo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
