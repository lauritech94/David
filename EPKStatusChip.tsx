import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Edit, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useEPKStatus, type EPKStatus } from '@/hooks/useEPKStatus';

interface EPKStatusChipProps {
  projectId?: string;
  artistId?: string;
  projectName?: string;
  artistName?: string;
  projectImageUrl?: string;
  onEPKCreated?: () => void;
}

export const EPKStatusChip: React.FC<EPKStatusChipProps> = ({
  projectId,
  artistId,
  projectName,
  artistName,
  projectImageUrl,
  onEPKCreated
}) => {
  const navigate = useNavigate();
  const { epkStatus, loading, createEPK, getEPKUrl } = useEPKStatus(projectId, artistId);

  const getStatusConfig = (status: EPKStatus['status']) => {
    switch (status) {
      case 'no_creado':
        return {
          label: 'No creado',
          variant: 'muted' as const,
          className: 'bg-muted/50 text-muted-foreground'
        };
      case 'borrador':
        return {
          label: 'Borrador',
          variant: 'warning' as const,
          className: 'bg-warning/10 text-warning border-warning/20'
        };
      case 'publicado':
        return {
          label: 'Publicado',
          variant: 'success' as const,
          className: 'bg-success/10 text-success border-success/20'
        };
    }
  };

  const handleCreateEPK = async () => {
    try {
      const titulo = artistName && projectName 
        ? `${artistName} - ${projectName}`
        : projectName || artistName || 'Nuevo EPK';

      const data = await createEPK({
        titulo,
        artista_proyecto: artistName || projectName || 'Artista',
        portada_url: projectImageUrl
      });

      if (data) {
        toast({
          title: 'EPK creado',
          description: 'El EPK ha sido creado exitosamente'
        });
        navigate(`/epk-builder/${data.id}`);
        onEPKCreated?.();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el EPK',
        variant: 'destructive'
      });
    }
  };

  const handleOpenEPK = () => {
    if (epkStatus.id) {
      navigate(`/epk-builder/${epkStatus.id}`);
    }
  };

  const handleCopyLink = () => {
    const url = getEPKUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace del EPK ha sido copiado al portapapeles'
      });
    }
  };

  const handleOpenPublicEPK = () => {
    const url = getEPKUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  const statusConfig = getStatusConfig(epkStatus.status);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-5 bg-muted/30 rounded animate-pulse" />
        <div className="w-20 h-8 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={statusConfig.variant} className={statusConfig.className}>
        {statusConfig.label}
      </Badge>

      {epkStatus.status === 'no_creado' && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreateEPK}
          className="h-8"
        >
          <Plus className="w-3 h-3 mr-1" />
          Crear EPK
        </Button>
      )}

      {epkStatus.status !== 'no_creado' && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenEPK}
            className="h-8"
          >
            <Edit className="w-3 h-3 mr-1" />
            Abrir EPK
          </Button>

          {epkStatus.status === 'publicado' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                className="h-8 px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleOpenPublicEPK}
                className="h-8 px-2"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      )}

      {epkStatus.status === 'publicado' && epkStatus.slug && (
        <div className="text-xs text-muted-foreground max-w-32 truncate">
          /epk/{epkStatus.slug}
        </div>
      )}
    </div>
  );
};