import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCreateSong } from '@/hooks/useRoyalties';

export function CreateSongDialog({ artistId }: { artistId?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isrc, setIsrc] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  
  const createSong = useCreateSong();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createSong.mutateAsync({
      title,
      artist_id: artistId && artistId !== 'all' ? artistId : undefined,
      isrc: isrc || undefined,
      release_date: releaseDate || undefined,
    });

    setOpen(false);
    setTitle('');
    setIsrc('');
    setReleaseDate('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Canción
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Canción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre de la canción"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isrc">ISRC</Label>
            <Input
              id="isrc"
              value={isrc}
              onChange={(e) => setIsrc(e.target.value)}
              placeholder="Código ISRC (opcional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="releaseDate">Fecha de Lanzamiento</Label>
            <Input
              id="releaseDate"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createSong.isPending}>
              {createSong.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
