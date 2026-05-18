import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ExternalLink, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateSolicitudDialog } from '@/components/CreateSolicitudDialog';

interface Solicitud {
  id: string;
  tipo: string;
  nombre_solicitante: string;
  nombre_festival: string | null;
  estado: string;
  fecha_creacion: string;
}

interface LinkedSolicitudesCardProps {
  bookingId: string;
  artistId?: string | null;
  projectId?: string | null;
  booking?: any;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pendiente: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  aprobada: { label: 'Aprobada', variant: 'default', icon: CheckCircle },
  denegada: { label: 'Denegada', variant: 'destructive', icon: XCircle },
};

export function LinkedSolicitudesCard({ bookingId, artistId, projectId, booking }: LinkedSolicitudesCardProps) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSolicitudes();
  }, [bookingId]);

  const fetchSolicitudes = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes')
        .select('id, tipo, nombre_solicitante, nombre_festival, estado, fecha_creacion')
        .eq('booking_id', bookingId)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error fetching linked solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSolicitud = (solicitudId: string) => {
    navigate(`/solicitudes?id=${solicitudId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || statusConfig.pendiente;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            Solicitudes
            {solicitudes.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {solicitudes.length}
              </Badge>
            )}
            <Button
              size="sm"
              className="ml-auto h-8"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nueva solicitud
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {solicitudes.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-4">
                No hay solicitudes vinculadas a este booking
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Crear primera solicitud
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {solicitudes.map((solicitud) => {
                const statusInfo = getStatusInfo(solicitud.estado);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={solicitud.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-background/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleOpenSolicitud(solicitud.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {solicitud.nombre_festival || solicitud.nombre_solicitante}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={statusInfo.variant} className="text-xs h-5">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(solicitud.fecha_creacion), "d MMM", { locale: es })}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSolicitudDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSolicitudCreated={fetchSolicitudes}
        bookingId={bookingId}
        artistId={artistId ?? undefined}
        projectId={projectId ?? undefined}
        defaultTipo="booking"
        bookingData={booking}
      />
    </>
  );
}
