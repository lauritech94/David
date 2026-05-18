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
import { Loader2, Music, Users } from 'lucide-react';

interface CreateArtistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistType: 'roster' | 'collaborator';
  onSuccess: () => void;
}

interface FormData {
  name: string;
  stage_name: string;
  description: string;
}

const config = {
  roster: {
    icon: Music,
    title: 'Nuevo Artista',
    description: 'Añade un nuevo artista a tu roster de management',
    successMsg: 'Artista creado correctamente',
    submitLabel: 'Crear Artista',
  },
  collaborator: {
    icon: Users,
    title: 'Nuevo Colaborador',
    description: 'Añade el perfil de un artista externo para colaboraciones',
    successMsg: 'Colaborador añadido correctamente',
    submitLabel: 'Añadir Colaborador',
  },
};

export function CreateArtistDialog({ open, onOpenChange, artistType, onSuccess }: CreateArtistDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const c = config[artistType];
  const Icon = c.icon;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { name: '', stage_name: '', description: '' },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('No se pudo obtener información del usuario');
      return;
    }

    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!profileData?.workspace_id) {
        toast.error('No se encontró workspace');
        return;
      }

      const { error } = await supabase
        .from('artists')
        .insert({
          name: data.name,
          stage_name: data.stage_name || null,
          description: data.description || null,
          artist_type: artistType,
          workspace_id: profileData.workspace_id,
          created_by: user.id,
        } as any);

      if (error) throw error;

      toast.success(c.successMsg);
      reset();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating artist:', error);
      toast.error(error.message || 'Error al crear el artista');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {c.title}
          </DialogTitle>
          <DialogDescription>{c.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre legal *</Label>
            <Input
              id="name"
              placeholder="Nombre completo"
              {...register('name', { required: 'El nombre es obligatorio' })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage_name">Nombre artístico</Label>
            <Input
              id="stage_name"
              placeholder="Nombre de escenario"
              {...register('stage_name')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Breve descripción del artista"
              rows={3}
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {c.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
