import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ProjectOption = 'none' | 'existing' | 'new';

interface ProjectLinkSelectorProps {
  selectedOption: ProjectOption;
  onOptionChange: (option: ProjectOption) => void;
  selectedProjectId: string | null;
  onProjectIdChange: (id: string | null) => void;
  newProjectName: string;
  onNewProjectNameChange: (name: string) => void;
  newProjectDescription: string;
  onNewProjectDescriptionChange: (desc: string) => void;
  artistId?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  archivado: 'Archivado',
};

export function ProjectLinkSelector({
  selectedOption,
  onOptionChange,
  selectedProjectId,
  onProjectIdChange,
  newProjectName,
  onNewProjectNameChange,
  newProjectDescription,
  onNewProjectDescriptionChange,
  artistId,
}: ProjectLinkSelectorProps) {
  const { data: projects } = useQuery({
    queryKey: ['projects-for-link', artistId],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, name, status, artist_id')
        .is('parent_folder_id', null)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const options: { key: ProjectOption; icon: React.ReactNode; title: string; desc: string }[] = [
    {
      key: 'none',
      icon: <X className="w-5 h-5" />,
      title: 'Sin proyecto',
      desc: 'Vincular más tarde',
    },
    {
      key: 'existing',
      icon: <FolderOpen className="w-5 h-5" />,
      title: 'Proyecto existente',
      desc: 'Vincular a uno ya creado',
    },
    {
      key: 'new',
      icon: <Plus className="w-5 h-5" />,
      title: 'Crear proyecto',
      desc: 'Nuevo proyecto para este lanzamiento',
    },
  ];

  return (
    <div className="space-y-3">
      <Label>Proyecto</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              onOptionChange(opt.key);
              if (opt.key !== 'existing') onProjectIdChange(null);
            }}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all cursor-pointer',
              selectedOption === opt.key
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
            )}
          >
            {opt.icon}
            <span className="text-xs font-medium leading-tight">{opt.title}</span>
            <span className="text-[10px] leading-tight opacity-70">{opt.desc}</span>
          </button>
        ))}
      </div>

      {selectedOption === 'existing' && (
        <Select value={selectedProjectId || ''} onValueChange={(v) => onProjectIdChange(v || null)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar proyecto..." />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{p.name}</span>
                  <Badge variant="outline" className="text-[10px] ml-1 shrink-0">
                    {STATUS_LABELS[p.status || 'en_curso'] || p.status}
                  </Badge>
                </div>
              </SelectItem>
            ))}
            {(!projects || projects.length === 0) && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No hay proyectos disponibles</div>
            )}
          </SelectContent>
        </Select>
      )}

      {selectedOption === 'new' && (
        <div className="space-y-2">
          <Input
            placeholder="Nombre del proyecto"
            value={newProjectName}
            onChange={(e) => onNewProjectNameChange(e.target.value)}
          />
          <Textarea
            placeholder="Descripción (opcional)"
            value={newProjectDescription}
            onChange={(e) => onNewProjectDescriptionChange(e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
