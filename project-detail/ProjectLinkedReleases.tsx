import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Music, Disc3, Album, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const TYPE_ICONS: Record<string, typeof Music> = {
  album: Album,
  ep: Disc3,
  single: Music,
};

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/20 text-blue-600',
  released: 'bg-green-500/20 text-green-600',
  archived: 'bg-gray-500/20 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planificando',
  in_progress: 'En Progreso',
  released: 'Publicado',
  archived: 'Archivado',
};

interface Props {
  projectId: string;
}

export function ProjectLinkedReleases({ projectId }: Props) {
  const navigate = useNavigate();

  const { data: releases } = useQuery({
    queryKey: ['project-releases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, type, release_date, status, cover_image_url')
        .eq('project_id', projectId)
        .order('release_date', { ascending: false, nullsFirst: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  if (!releases || releases.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Lanzamientos vinculados</h3>
        <Badge variant="secondary" className="text-[10px]">{releases.length}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {releases.map((release) => {
          const TypeIcon = TYPE_ICONS[release.type] || Disc3;
          return (
            <Card
              key={release.id}
              className="group cursor-pointer p-3 hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => navigate(`/releases/${release.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {release.cover_image_url ? (
                    <img src={release.cover_image_url} alt={release.title} className="w-full h-full object-cover" />
                  ) : (
                    <TypeIcon className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {release.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] capitalize">{release.type}</Badge>
                    <Badge className={`text-[10px] ${STATUS_COLORS[release.status] || ''}`}>
                      {STATUS_LABELS[release.status] || release.status}
                    </Badge>
                  </div>
                  {release.release_date && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {format(new Date(release.release_date), 'dd MMM yyyy', { locale: es })}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
