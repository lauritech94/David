import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Music, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Song, useSongSplits, usePlatformEarnings } from '@/hooks/useRoyalties';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SongDetailDialogProps {
  song: Song;
}

const ROLES: Record<string, string> = {
  writer: 'Compositor',
  producer: 'Productor',
  performer: 'Intérprete',
  featured: 'Featuring',
  label: 'Sello',
};

export function SongDetailDialog({ song }: SongDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: allSplits = [] } = useSongSplits();
  const { data: allEarnings = [] } = usePlatformEarnings();

  const splits = allSplits.filter(s => s.song_id === song.id);
  const earnings = allEarnings.filter(e => e.song_id === song.id);
  
  const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalStreams = earnings.reduce((sum, e) => sum + (e.streams || 0), 0);
  const totalPercentage = splits.reduce((sum, s) => sum + Number(s.percentage), 0);

  // Prepare chart data (earnings by month)
  const chartData = earnings
    .reduce((acc, e) => {
      const month = format(new Date(e.period_end), 'MMM yyyy', { locale: es });
      const existing = acc.find(d => d.month === month);
      if (existing) {
        existing.amount += Number(e.amount);
        existing.streams += e.streams || 0;
      } else {
        acc.push({ month, amount: Number(e.amount), streams: e.streams || 0 });
      }
      return acc;
    }, [] as { month: string; amount: number; streams: number }[])
    .reverse();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Ver detalles">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {song.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Song Info */}
          <div className="flex flex-wrap gap-2">
            {song.isrc && <Badge variant="outline">ISRC: {song.isrc}</Badge>}
            {song.release_date && (
              <Badge variant="outline">
                Lanzamiento: {format(new Date(song.release_date), 'dd MMM yyyy', { locale: es })}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Ganancias</p>
                    <p className="text-lg font-bold">€{totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Reproducciones</p>
                    <p className="text-lg font-bold">{totalStreams.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Colaboradores</p>
                    <p className="text-lg font-bold">{splits.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tendencia de Ganancias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [`€${value.toFixed(2)}`, 'Ganancias']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Splits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Distribución de Splits
                <Badge variant={totalPercentage === 100 ? 'default' : 'secondary'}>
                  {totalPercentage}% asignado
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {splits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay splits configurados
                </p>
              ) : (
                <div className="space-y-2">
                  {splits.map(split => {
                    const collaboratorEarnings = (totalEarnings * split.percentage) / 100;
                    return (
                      <div
                        key={split.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                      >
                        <div>
                          <p className="font-medium text-sm">{split.collaborator_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLES[split.role] || split.role}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{split.percentage}%</Badge>
                          <p className="text-xs text-green-500 mt-1">
                            €{collaboratorEarnings.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Earnings History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historial de Ganancias</CardTitle>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay ganancias registradas
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {earnings.map(earning => (
                    <div
                      key={earning.id}
                      className="flex items-center justify-between p-2 border rounded text-sm"
                    >
                      <div>
                        <p className="font-medium">{earning.platform}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(earning.period_start), 'MMM yyyy', { locale: es })} - {format(new Date(earning.period_end), 'MMM yyyy', { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-500">€{Number(earning.amount).toFixed(2)}</p>
                        {earning.streams > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {earning.streams.toLocaleString()} streams
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
