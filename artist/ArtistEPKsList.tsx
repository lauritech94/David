import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ArtistEPKsListProps {
  artistId: string;
}

export function ArtistEPKsList({ artistId }: ArtistEPKsListProps) {
  const navigate = useNavigate();

  const { data: epks = [], isLoading } = useQuery({
    queryKey: ['artist-epks', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epks')
        .select('id, titulo, artista_proyecto, slug, visibilidad, vistas_totales, creado_en')
        .eq('artist_id', artistId)
        .order('creado_en', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent></Card>;
  }

  if (epks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin EPKs</h3>
          <p className="text-muted-foreground">No hay EPKs vinculados a este artista</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {epks.map((epk) => (
        <Card
          key={epk.id}
          className="cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => navigate(`/epk/builder/${epk.id}`)}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{epk.titulo || 'Sin título'}</p>
                <p className="text-sm text-muted-foreground">{epk.artista_proyecto}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                {epk.vistas_totales || 0}
              </div>
              <Badge variant={epk.visibilidad === 'publico' ? 'default' : 'secondary'}>
                {epk.visibilidad}
              </Badge>
              {epk.slug && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/epk/${epk.slug}`, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
