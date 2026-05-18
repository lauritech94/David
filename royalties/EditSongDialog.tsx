import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Song } from '@/hooks/useRoyalties';
import { undoableDelete } from '@/utils/undoableDelete';

interface EditSongDialogProps {
  song: Song;
}

export function EditSongDialog({ song }: EditSongDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(song.title);
  const [isrc, setIsrc] = useState(song.isrc || '');
  const [releaseDate, setReleaseDate] = useState(song.release_date || '');
  const queryClient = useQueryClient();

  const updateSong = useMutation({
    mutationFn: async (data: { title: string; isrc?: string; release_date?: string }) => {
      const { error } = await supabase
        .from('songs')
        .update(data)
        .eq('id', song.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success('Canción actualizada');
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  const handleDeleteSong = async () => {
    await undoableDelete({
      table: 'songs',
      id: song.id,
      successMessage: `Canción "${song.title}" eliminada`,
      onComplete: () => {
        queryClient.invalidateQueries({ queryKey: ['songs'] });
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSong.mutate({
      title,
      isrc: isrc || undefined,
      release_date: releaseDate || undefined,
    });
  };

  return (
    <div className="flex gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Canción</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-isrc">ISRC</Label>
              <Input
                id="edit-isrc"
                value={isrc}
                onChange={(e) => setIsrc(e.target.value)}
                placeholder="Código ISRC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-release">Fecha de lanzamiento</Label>
              <Input
                id="edit-release"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateSong.isPending}>
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={handleDeleteSong}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
