import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
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

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  teamId: string | null;
  initialData?: {
    name: string;
    stage_name?: string | null;
    description?: string | null;
  };
}

interface FormData {
  name: string;
  stage_name: string;
  description: string;
}

export function EditTeamDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  teamId,
  initialData 
}: EditTeamDialogProps) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      stage_name: '',
      description: '',
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        stage_name: initialData.stage_name || '',
        description: initialData.description || '',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FormData) => {
    if (!teamId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('artists')
        .update({
          name: data.name,
          stage_name: data.stage_name || null,
          description: data.description || null,
        })
        .eq('id', teamId);

      if (error) throw error;

      toast.success('Equipo actualizado correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating team:', error);
      toast.error(error.message || 'Error al actualizar el equipo');
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
            Editar Equipo
          </DialogTitle>
          <DialogDescription>
            Modifica los datos del equipo
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
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
