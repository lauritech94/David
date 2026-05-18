import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSongs, useSongSplits, usePlatformEarnings } from '@/hooks/useRoyalties';
import { Calculator, Download, CheckCircle, DollarSign, Users, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LiquidacionCalculatorProps {
  artistId?: string;
}

interface LiquidacionRow {
  collaboratorName: string;
  songTitle: string;
  percentage: number;
  totalEarnings: number;
  amountDue: number;
  role: string;
}

export function LiquidacionCalculator({ artistId }: LiquidacionCalculatorProps) {
  const { data: songs = [] } = useSongs(artistId);
  const { data: allSplits = [] } = useSongSplits();
  const { data: allEarnings = [] } = usePlatformEarnings();
  
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedSong, setSelectedSong] = useState('all');
  const [paidItems, setPaidItems] = useState<Set<string>>(new Set());

  // Filter data based on artist
  const filteredSongs = useMemo(() => {
    if (!artistId || artistId === 'all') return songs;
    return songs.filter(s => s.artist_id === artistId);
  }, [songs, artistId]);

  const songIds = useMemo(() => filteredSongs.map(s => s.id), [filteredSongs]);

  const filteredSplits = useMemo(() => {
    return allSplits.filter(s => songIds.includes(s.song_id));
  }, [allSplits, songIds]);

  const filteredEarnings = useMemo(() => {
    let earnings = allEarnings.filter(e => songIds.includes(e.song_id));
    
    if (selectedSong !== 'all') {
      earnings = earnings.filter(e => e.song_id === selectedSong);
    }
    
    // Period filtering
    if (selectedPeriod !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      earnings = earnings.filter(e => new Date(e.period_start) >= startDate);
    }
    
    return earnings;
  }, [allEarnings, songIds, selectedSong, selectedPeriod]);

  // Calculate liquidation
  const liquidacion = useMemo((): LiquidacionRow[] => {
    const rows: LiquidacionRow[] = [];
    
    // Group earnings by song
    const earningsBySong: Record<string, number> = {};
    filteredEarnings.forEach(e => {
      earningsBySong[e.song_id] = (earningsBySong[e.song_id] || 0) + Number(e.amount);
    });
    
    // Calculate each collaborator's share
    filteredSplits.forEach(split => {
      const song = filteredSongs.find(s => s.id === split.song_id);
      const songEarnings = earningsBySong[split.song_id] || 0;
      
      if (songEarnings > 0 && song) {
        const amountDue = (songEarnings * Number(split.percentage)) / 100;
        
        rows.push({
          collaboratorName: split.collaborator_name,
          songTitle: song.title,
          percentage: Number(split.percentage),
          totalEarnings: songEarnings,
          amountDue,
          role: split.role || 'writer',
        });
      }
    });
    
    return rows.sort((a, b) => b.amountDue - a.amountDue);
  }, [filteredEarnings, filteredSplits, filteredSongs]);

  // Group by collaborator for summary
  const collaboratorSummary = useMemo(() => {
    const summary: Record<string, { total: number; songs: number }> = {};
    
    liquidacion.forEach(row => {
      if (!summary[row.collaboratorName]) {
        summary[row.collaboratorName] = { total: 0, songs: 0 };
      }
      summary[row.collaboratorName].total += row.amountDue;
      summary[row.collaboratorName].songs += 1;
    });
    
    return Object.entries(summary)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [liquidacion]);

  const totalToDistribute = liquidacion.reduce((sum, r) => sum + r.amountDue, 0);
  const totalPaid = liquidacion
    .filter(r => paidItems.has(`${r.collaboratorName}-${r.songTitle}`))
    .reduce((sum, r) => sum + r.amountDue, 0);
  const totalPending = totalToDistribute - totalPaid;

  const togglePaid = (key: string) => {
    const newPaid = new Set(paidItems);
    if (newPaid.has(key)) {
      newPaid.delete(key);
    } else {
      newPaid.add(key);
    }
    setPaidItems(newPaid);
  };

  const markAllPaid = () => {
    const allKeys = new Set(liquidacion.map(r => `${r.collaboratorName}-${r.songTitle}`));
    setPaidItems(allKeys);
    toast.success('Todas las liquidaciones marcadas como pagadas');
  };

  const exportToCSV = () => {
    const headers = ['Colaborador', 'Canción', 'Rol', 'Porcentaje', 'Ganancias Totales', 'Importe a Pagar', 'Estado'];
    const rows = liquidacion.map(r => [
      r.collaboratorName,
      r.songTitle,
      r.role,
      `${r.percentage}%`,
      `€${r.totalEarnings.toFixed(2)}`,
      `€${r.amountDue.toFixed(2)}`,
      paidItems.has(`${r.collaboratorName}-${r.songTitle}`) ? 'Pagado' : 'Pendiente'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liquidacion_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast.success('Liquidación exportada correctamente');
  };

  const ROLE_LABELS: Record<string, string> = {
    writer: 'Compositor',
    producer: 'Productor',
    performer: 'Intérprete',
    featured: 'Featuring',
    label: 'Sello',
  };

  if (filteredSongs.length === 0) {
    return (
      <Card className="card-moodita">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No hay canciones registradas</p>
          <p className="text-sm mt-2">Añade canciones y splits en la pestaña "Canciones & Splits"</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="card-moodita">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculadora de Liquidación
          </CardTitle>
          <CardDescription>
            Calcula automáticamente cuánto pagar a cada colaborador basándose en los splits y ganancias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="quarter">Este trimestre</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Canción</Label>
              <Select value={selectedSong} onValueChange={setSelectedSong}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las canciones</SelectItem>
                  {filteredSongs.map(song => (
                    <SelectItem key={song.id} value={song.id}>{song.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={markAllPaid}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar todo pagado
              </Button>
              <Button onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-moodita">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total a Distribuir</div>
                <div className="text-2xl font-bold">€{totalToDistribute.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-moodita">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Pagado</div>
                <div className="text-2xl font-bold text-green-500">€{totalPaid.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-moodita">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pendiente</div>
                <div className="text-2xl font-bold text-amber-500">€{totalPending.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collaborator Summary */}
      <Card className="card-moodita">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Resumen por Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collaboratorSummary.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay liquidaciones pendientes para el período seleccionado
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collaboratorSummary.map((collab, index) => (
                <div 
                  key={collab.name}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{collab.name}</p>
                      <p className="text-sm text-muted-foreground">{collab.songs} canciones</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">€{collab.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card className="card-moodita">
        <CardHeader>
          <CardTitle>Detalle de Liquidación</CardTitle>
        </CardHeader>
        <CardContent>
          {liquidacion.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay liquidaciones para mostrar. Registra ganancias para ver los cálculos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Canción</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right">Ganancias</TableHead>
                  <TableHead className="text-right">A Pagar</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liquidacion.map((row, index) => {
                  const key = `${row.collaboratorName}-${row.songTitle}`;
                  const isPaid = paidItems.has(key);
                  
                  return (
                    <TableRow 
                      key={index} 
                      className={`hover:bg-muted/50 cursor-pointer ${isPaid ? 'opacity-50' : ''}`}
                      onClick={() => togglePaid(key)}
                    >
                      <TableCell className="font-medium">{row.collaboratorName}</TableCell>
                      <TableCell>{row.songTitle}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ROLE_LABELS[row.role] || row.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{row.percentage}%</TableCell>
                      <TableCell className="text-right">€{row.totalEarnings.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">€{row.amountDue.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isPaid ? 'default' : 'secondary'}>
                          {isPaid ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
