import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SongSplit } from '@/hooks/useRoyalties';

interface LinkContactDialogProps {
  split: SongSplit;
}

export function LinkContactDialog({ split }: LinkContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState(split.collaborator_contact_id || '');
  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const linkContact = useMutation({
    mutationFn: async (selectedContactId: string | null) => {
      const { error } = await supabase
        .from('song_splits')
        .update({ collaborator_contact_id: selectedContactId })
        .eq('id', split.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song_splits'] });
      toast.success('Contacto vinculado correctamente');
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Error al vincular: ' + error.message);
    },
  });

  const handleSave = () => {
    linkContact.mutate(contactId || null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Vincular con contacto">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular "{split.collaborator_name}" con Contacto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Seleccionar Contacto</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un contacto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin vincular</SelectItem>
                {contacts.map(contact => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name} {contact.email && `(${contact.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Vincula este colaborador con un contacto existente para acceder a su información de pago
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={linkContact.isPending}>
              {linkContact.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
