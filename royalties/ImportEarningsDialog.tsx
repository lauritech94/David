import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useSongs, useCreatePlatformEarning } from '@/hooks/useRoyalties';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ParsedEarning {
  platform: string;
  amount: number;
  streams: number;
  period_start: string;
  period_end: string;
}

export function ImportEarningsDialog() {
  const [open, setOpen] = useState(false);
  const [songId, setSongId] = useState('');
  const [parsedData, setParsedData] = useState<ParsedEarning[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: songs = [] } = useSongs();
  const createEarning = useCreatePlatformEarning();

  const parseCSV = (text: string): { data: ParsedEarning[]; errors: string[] } => {
    const lines = text.trim().split('\n');
    const data: ParsedEarning[] = [];
    const errors: string[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      
      if (parts.length < 4) {
        errors.push(`Línea ${i + 1}: formato incorrecto`);
        continue;
      }

      const [platform, amountStr, streamsStr, period_start, period_end] = parts;
      const amount = parseFloat(amountStr);
      const streams = parseInt(streamsStr) || 0;

      if (!platform || isNaN(amount)) {
        errors.push(`Línea ${i + 1}: plataforma o monto inválido`);
        continue;
      }

      data.push({
        platform,
        amount,
        streams,
        period_start: period_start || new Date().toISOString().split('T')[0],
        period_end: period_end || period_start || new Date().toISOString().split('T')[0],
      });
    }

    return { data, errors };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { data, errors } = parseCSV(text);
      setParsedData(data);
      setErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!songId || parsedData.length === 0) return;

    setIsImporting(true);
    let successCount = 0;

    for (const earning of parsedData) {
      try {
        await createEarning.mutateAsync({
          song_id: songId,
          ...earning,
        });
        successCount++;
      } catch (error) {
        console.error('Error importing earning:', error);
      }
    }

    setIsImporting(false);
    toast.success(`${successCount} de ${parsedData.length} registros importados`);
    setOpen(false);
    setParsedData([]);
    setErrors([]);
    setSongId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Ganancias desde CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Canción destino *</Label>
            <Select value={songId} onValueChange={setSongId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una canción" />
              </SelectTrigger>
              <SelectContent>
                {songs.map(song => (
                  <SelectItem key={song.id} value={song.id}>{song.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Archivo CSV</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-primary hover:underline">Seleccionar archivo</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Formato: plataforma, monto, streams, fecha_inicio, fecha_fin
                </p>
              </label>
            </div>
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors.slice(0, 3).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
                {errors.length > 3 && <div>...y {errors.length - 3} errores más</div>}
              </AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">{parsedData.length} registros listos para importar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Total: €{parsedData.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!songId || parsedData.length === 0 || isImporting}
            >
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
