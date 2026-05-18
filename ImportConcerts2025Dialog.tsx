import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { importConcerts2025 } from '@/utils/importConcerts2025';
import { Alert, AlertDescription } from '@/components/ui/alert';
export function ImportConcerts2025Dialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
  } | null>(null);
  const handleImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const importResult = await importConcerts2025();
      setResult(importResult);
      toast({
        title: "¡Importación completada!",
        description: `${importResult.inserted} nuevos, ${importResult.updated} actualizados, ${importResult.skipped} omitidos`
      });
    } catch (error) {
      console.error('Error importing concerts:', error);
      toast({
        title: "Error",
        description: "No se pudieron importar los conciertos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Conciertos 2025</DialogTitle>
          <DialogDescription>
            Se importarán 23 conciertos de Rita Payés para Oct-Nov 2025. Si ya existen (misma fecha + ciudad + festival), se actualizarán.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {result && <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">Resultados:</div>
                  <div>✅ {result.inserted} conciertos nuevos creados</div>
                  <div>🔄 {result.updated} conciertos actualizados</div>
                  <div>⏭️ {result.skipped} conciertos omitidos</div>
                  <div className="font-semibold mt-2">Total: {result.total} registros procesados</div>
                </div>
              </AlertDescription>
            </Alert>}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={loading} className="flex-1">
              {loading ? 'Importando...' : result ? 'Volver a importar' : 'Importar ahora'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Los conciertos cancelados también se importarán con estado "Cancelado" para mantener el registro histórico.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>;
}