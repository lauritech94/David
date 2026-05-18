import { Button } from '@/components/ui/button';
import { BarChart3, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AnalyticsEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="p-4 rounded-full bg-muted">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Aún no hay datos para analizar</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Añade tu primer booking, sincronización o lanzamiento para empezar a ver tus analytics de negocio.
        </p>
      </div>
      <Button onClick={() => navigate('/booking')} className="gap-2">
        <Plus className="h-4 w-4" />
        Crear primer booking
      </Button>
    </div>
  );
}
