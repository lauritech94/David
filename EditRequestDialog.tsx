import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Artist {
  id: string;
  full_name: string;
  email: string;
}

interface Request {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  artist_id: string;
}

interface EditRequestDialogProps {
  request: Request | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestUpdated: () => void;
}

export function EditRequestDialog({ request, open, onOpenChange, onRequestUpdated }: EditRequestDialogProps) {
  const { profile } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [formData, setFormData] = useState({
    artist_id: '',
    type: '',
    title: '',
    description: '',
    status: '',
    due_date: '',
  });

  useEffect(() => {
    if (open) {
      fetchArtists();
      if (request) {
        setFormData({
          artist_id: request.artist_id,
          type: request.type,
          title: request.title,
          description: request.description,
          status: request.status,
          due_date: request.due_date ? new Date(request.due_date).toISOString().slice(0, 16) : '',
        });
      }
    }
  }, [open, request]);

  const fetchArtists = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .contains('roles', ['artist']);

      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!request || !formData.artist_id || !formData.type || !formData.title) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('requests')
        .update({
          artist_id: formData.artist_id,
          type: formData.type,
          title: formData.title,
          description: formData.description,
          status: formData.status,
          due_date: formData.due_date || null,
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Solicitud actualizada correctamente.",
      });

      onRequestUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la solicitud.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Solicitud</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la solicitud
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="artist">Artista</Label>
            <Select
              value={formData.artist_id}
              onValueChange={(value) => setFormData({ ...formData, artist_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un artista" />
              </SelectTrigger>
              <SelectContent>
                {artists.map((artist) => (
                  <SelectItem key={artist.id} value={artist.id}>
                    {artist.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de solicitud" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="interview">Entrevista</SelectItem>
                <SelectItem value="consultation">Consulta</SelectItem>
                <SelectItem value="information">Información</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado de la solicitud" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobada</SelectItem>
                <SelectItem value="rejected">Rechazada</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="archived">Archivada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título de la solicitud"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción detallada de la solicitud"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Fecha Límite</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit">Actualizar Solicitud</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}