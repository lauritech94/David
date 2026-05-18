import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useCreateRelease } from '@/hooks/useReleases';
import { ArtistSelector } from '@/components/ArtistSelector';
import { ProjectLinkSelector } from '@/components/releases/ProjectLinkSelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreateReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId?: string | null;
}

export default function CreateReleaseDialog({
  open,
  onOpenChange,
  artistId,
}: CreateReleaseDialogProps) {
  const navigate = useNavigate();
  const createRelease = useCreateRelease();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<'album' | 'ep' | 'single'>('single');
  const [releaseDate, setReleaseDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(artistId ? [artistId] : []);

  // Project linking state
  const [projectOption, setProjectOption] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (!user?.id) return;

    let projectId: string | null = null;

    // Handle project creation if needed
    if (projectOption === 'existing' && selectedProjectId) {
      projectId = selectedProjectId;
    } else if (projectOption === 'new' && newProjectName.trim()) {
      try {
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            name: newProjectName.trim(),
            description: newProjectDescription.trim() || null,
            artist_id: selectedArtistIds[0] || null,
            created_by: user.id,
            status: 'en_curso',
          } as any)
          .select('id')
          .single();

        if (error) throw error;
        projectId = newProject.id;
        toast.success('Proyecto creado');
      } catch (e) {
        toast.error('Error al crear el proyecto');
        return;
      }
    }

    const result = await createRelease.mutateAsync({
      title: title.trim(),
      type,
      release_date: releaseDate ? format(releaseDate, 'yyyy-MM-dd') : null,
      description: description.trim() || null,
      artist_id: selectedArtistIds[0] || null,
      artist_ids: selectedArtistIds,
      project_id: projectId,
    });

    if (result) {
      onOpenChange(false);
      setTitle('');
      setType('single');
      setReleaseDate(undefined);
      setDescription('');
      setSelectedArtistIds([]);
      setProjectOption('none');
      setSelectedProjectId(null);
      setNewProjectName('');
      setNewProjectDescription('');
      navigate(`/releases/${result.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Lanzamiento</DialogTitle>
          <DialogDescription>
            Crea un nuevo álbum, EP o single para gestionar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del lanzamiento"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="ep">EP</SelectItem>
                <SelectItem value="album">Álbum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Artistas</Label>
            <ArtistSelector
              selectedArtists={selectedArtistIds}
              onSelectionChange={setSelectedArtistIds}
              placeholder="Seleccionar artistas..."
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha de Lanzamiento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !releaseDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {releaseDate
                    ? format(releaseDate, 'PPP', { locale: es })
                    : 'Selecciona una fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={releaseDate}
                  onSelect={setReleaseDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <ProjectLinkSelector
            selectedOption={projectOption}
            onOptionChange={setProjectOption}
            selectedProjectId={selectedProjectId}
            onProjectIdChange={setSelectedProjectId}
            newProjectName={newProjectName}
            onNewProjectNameChange={setNewProjectName}
            newProjectDescription={newProjectDescription}
            onNewProjectDescriptionChange={setNewProjectDescription}
            artistId={selectedArtistIds[0] || null}
          />

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional del proyecto..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createRelease.isPending}>
            {createRelease.isPending ? 'Creando...' : 'Crear Lanzamiento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
