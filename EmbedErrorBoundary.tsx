import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EmbedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  embedType?: 'youtube' | 'vimeo' | 'instagram' | 'spotify' | 'soundcloud' | 'generic';
  embedUrl?: string;
  className?: string;
}

interface EmbedState {
  hasError: boolean;
  errorType: 'network' | 'private' | 'deleted' | 'unavailable' | 'timeout' | 'unknown';
  errorMessage?: string;
  retryCount: number;
}

export const EmbedErrorBoundary: React.FC<EmbedErrorBoundaryProps> = ({
  children,
  fallback,
  embedType = 'generic',
  embedUrl,
  className
}) => {
  const [embedState, setEmbedState] = useState<EmbedState>({
    hasError: false,
    errorType: 'unknown',
    retryCount: 0
  });

  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Reset error state when embedUrl changes
    setEmbedState({
      hasError: false,
      errorType: 'unknown',
      retryCount: 0
    });
  }, [embedUrl]);

  const getErrorMessage = (errorType: EmbedState['errorType'], embedType: string): string => {
    const messages = {
      private: {
        youtube: 'Este video de YouTube es privado o está restringido',
        vimeo: 'Este video de Vimeo es privado o no está disponible públicamente',
        instagram: 'Esta publicación de Instagram es privada o no está disponible',
        spotify: 'Este contenido de Spotify no está disponible públicamente',
        soundcloud: 'Este audio de SoundCloud es privado o no está disponible',
        generic: 'Este contenido es privado o no está disponible públicamente'
      },
      deleted: {
        youtube: 'Este video de YouTube ha sido eliminado o no existe',
        vimeo: 'Este video de Vimeo ha sido eliminado o no existe',
        instagram: 'Esta publicación de Instagram ha sido eliminada',
        spotify: 'Este contenido de Spotify ha sido eliminado',
        soundcloud: 'Este audio de SoundCloud ha sido eliminado',
        generic: 'Este contenido ha sido eliminado o no existe'
      },
      network: {
        youtube: 'Error de conexión al cargar el video de YouTube',
        vimeo: 'Error de conexión al cargar el video de Vimeo',
        instagram: 'Error de conexión al cargar la publicación de Instagram',
        spotify: 'Error de conexión al cargar el contenido de Spotify',
        soundcloud: 'Error de conexión al cargar el audio de SoundCloud',
        generic: 'Error de conexión al cargar el contenido'
      },
      timeout: {
        youtube: 'El video de YouTube tardó demasiado en cargar',
        vimeo: 'El video de Vimeo tardó demasiado en cargar',
        instagram: 'La publicación de Instagram tardó demasiado en cargar',
        spotify: 'El contenido de Spotify tardó demasiado en cargar',
        soundcloud: 'El audio de SoundCloud tardó demasiado en cargar',
        generic: 'El contenido tardó demasiado en cargar'
      },
      unavailable: {
        youtube: 'Video de YouTube no disponible en tu región',
        vimeo: 'Video de Vimeo no disponible en tu región',
        instagram: 'Publicación de Instagram no disponible',
        spotify: 'Contenido de Spotify no disponible en tu región',
        soundcloud: 'Audio de SoundCloud no disponible en tu región',
        generic: 'Contenido no disponible en tu región'
      },
      unknown: {
        youtube: 'Error desconocido al cargar el video de YouTube',
        vimeo: 'Error desconocido al cargar el video de Vimeo',
        instagram: 'Error desconocido al cargar la publicación de Instagram',
        spotify: 'Error desconocido al cargar el contenido de Spotify',
        soundcloud: 'Error desconocido al cargar el audio de SoundCloud',
        generic: 'Error desconocido al cargar el contenido'
      }
    };

    return messages[errorType][embedType] || messages[errorType].generic;
  };

  const getErrorIcon = (errorType: EmbedState['errorType']) => {
    switch (errorType) {
      case 'network':
      case 'timeout':
        return <RefreshCw className="w-6 h-6 text-warning" />;
      case 'private':
      case 'deleted':
      case 'unavailable':
        return <AlertTriangle className="w-6 h-6 text-destructive" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const canRetry = (errorType: EmbedState['errorType']): boolean => {
    return ['network', 'timeout', 'unknown'].includes(errorType);
  };

  const handleRetry = async () => {
    if (embedState.retryCount >= 3) return;

    setIsRetrying(true);
    setEmbedState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));

    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    setEmbedState(prev => ({
      ...prev,
      hasError: false
    }));
    setIsRetrying(false);
  };

  const handleEmbedError = (error: Error) => {
    const errorMessage = error.message.toLowerCase();
    let errorType: EmbedState['errorType'] = 'unknown';

    if (errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
      errorType = 'network';
    } else if (errorMessage.includes('private') || errorMessage.includes('403')) {
      errorType = 'private';
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      errorType = 'deleted';
    } else if (errorMessage.includes('timeout')) {
      errorType = 'timeout';
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('region')) {
      errorType = 'unavailable';
    }

    setEmbedState({
      hasError: true,
      errorType,
      errorMessage: error.message,
      retryCount: 0
    });
  };

  const openInNewTab = () => {
    if (embedUrl) {
      window.open(embedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (embedState.hasError || fallback) {
    const errorMessage = getErrorMessage(embedState.errorType, embedType);
    const canRetryError = canRetry(embedState.errorType);

    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            {getErrorIcon(embedState.errorType)}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">
              Contenido no disponible
            </h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {errorMessage}
            </p>
          </div>

          <div className="flex justify-center items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {embedType.toUpperCase()}
            </Badge>
            {embedState.errorType !== 'unknown' && (
              <Badge variant="secondary" className="text-xs">
                {embedState.errorType}
              </Badge>
            )}
          </div>

          <div className="flex justify-center gap-3 pt-2">
            {canRetryError && embedState.retryCount < 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-xs"
              >
                {isRetrying ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Reintentar
              </Button>
            )}
            
            {embedUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir enlace
              </Button>
            )}
          </div>

          {embedState.retryCount >= 3 && (
            <p className="text-xs text-muted-foreground">
              Máximo de reintentos alcanzado
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div onError={(e) => handleEmbedError(new Error('Embed load failed'))}>
      {children}
    </div>
  );
};