import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlatformEarning, useSongs } from '@/hooks/useRoyalties';
import { undoableDelete } from '@/utils/undoableDelete';

const PLATFORMS = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'apple_music', label: 'Apple Music' },
  { value: 'youtube', label: 'YouTube Music' },
  { value: 'amazon', label: 'Amazon Music' },
  { value: 'tidal', label: 'Tidal' },
  { value: 'deezer', label: 'Deezer' },
  { value: 'other', label: 'Otra' },
];

interface EditEarningDialogProps {
  earning: PlatformEarning;
}

export function EditEarningDialog({ earning }: EditEarningDialogProps) {
  const [open, setOpen] = useState(false);
  const [songId, setSongId] = useState(earning.song_id);
  const [platform, setPlatform] = useState(earning.platform);
  const [amount, setAmount] = useState(String(earning.amount));
  const [streams, setStreams] = useState(String(earning.streams || 0));
  const [periodStart, setPeriodStart] = useState(earning.period_start);
  const [periodEnd, setPeriodEnd] = useState(earning.period_end);
  
  const { data: songs = [] } = useSongs();
  const queryClient = useQueryClient();

  const updateEarning = useMutation({
    mutationFn: async (data: Partial<PlatformEarning>) => {
      const { error } = await supabase
        .from('platform_earnings')
        .update(data)
        .eq('id', earning.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform_earnings'] });
      toast.success('Ganancia actualizada');
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  const handleDeleteEarning = async () => {
    await undoableDelete({
      table: 'platform_earnings',
      id: earning.id,
      successMessage: 'Ganancia eliminada',
      onComplete: () => {
        queryClient.invalidateQueries({ queryKey: ['platform_earnings'] });
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEarning.mutate({
      song_id: songId,
      platform,
      amount: Number(amount),
      streams: Number(streams),
      period_start: periodStart,
      period_end: periodEnd,
    });
  };

  return (
    <div className="flex gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Ganancia</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Canción</Label>
              <Select value={songId} onValueChange={setSongId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {songs.map(song => (
                    <SelectItem key={song.id} value={song.id}>{song.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Reproducciones</Label>
                <Input
                  type="number"
                  value={streams}
                  onChange={(e) => setStreams(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Período Inicio</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Período Fin</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateEarning.isPending}>
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={handleDeleteEarning}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
