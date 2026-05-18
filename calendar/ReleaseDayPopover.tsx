import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Disc3, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { CalendarRelease } from '@/hooks/useCalendarReleases';

interface Props {
  release: CalendarRelease | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeLabel: Record<string, string> = {
  album: 'Álbum',
  ep: 'EP',
  single: 'Single',
};

const statusLabel: Record<string, string> = {
  planning: 'Planificación',
  in_progress: 'En progreso',
  released: 'Lanzado',
  archived: 'Archivado',
};

export function ReleaseDayPopover({ release, open, onOpenChange }: Props) {
  if (!release) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-violet-500" />
            {release.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{typeLabel[release.type] || release.type}</Badge>
            <Badge variant="outline">{statusLabel[release.status] || release.status}</Badge>
          </div>
          {release.artist?.name && (
            <p className="text-sm text-muted-foreground">
              Artista:{' '}
              {release.artist_id ? (
                <Link
                  to={`/artistas/${release.artist_id}`}
                  onClick={() => onOpenChange(false)}
                  className="text-foreground font-medium hover:text-primary hover:underline transition-colors"
                >
                  {release.artist.name}
                </Link>
              ) : (
                <span className="text-foreground">{release.artist.name}</span>
              )}
            </p>
          )}
          {release.release_date && (
            <p className="text-sm flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              {format(new Date(release.release_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          )}
          <Button asChild className="w-full">
            <Link to={`/releases/${release.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir lanzamiento
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
