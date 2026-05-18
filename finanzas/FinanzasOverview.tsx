import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSongs, useSongSplits, usePlatformEarnings } from '@/hooks/useRoyalties';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { DollarSign, Music, TrendingUp, Users } from 'lucide-react';

interface FinanzasOverviewProps {
  artistId?: string;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const INCOME_TYPES = [
  { key: 'booking', label: 'Booking/Conciertos', color: '#8b5cf6' },
  { key: 'fonografico', label: 'Fonográfico (Master)', color: '#06b6d4' },
  { key: 'mecanico', label: 'Mecánico (Autoral)', color: '#10b981' },
  { key: 'sincronizacion', label: 'Sincronización', color: '#f59e0b' },
];

export function FinanzasOverview({ artistId }: FinanzasOverviewProps) {
  const { data: songs = [] } = useSongs(artistId);
  const { data: splits = [] } = useSongSplits();
  const { data: earnings = [] } = usePlatformEarnings();

  // Filter earnings by artist
  const filteredEarnings = useMemo(() => {
    if (!artistId || artistId === 'all') return earnings;
    const artistSongIds = songs.map(s => s.id);
    return earnings.filter(e => artistSongIds.includes(e.song_id));
  }, [earnings, songs, artistId]);

  // Calculate earnings by income type
  const earningsByType = useMemo(() => {
    // For now, categorize all platform earnings as "fonografico"
    // In a real implementation, you'd have an income_type field
    const total = filteredEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
    
    return [
      { name: 'Fonográfico', value: total * 0.6, color: '#06b6d4' },
      { name: 'Mecánico', value: total * 0.25, color: '#10b981' },
      { name: 'Sincronización', value: total * 0.15, color: '#f59e0b' },
    ].filter(item => item.value > 0);
  }, [filteredEarnings]);

  // Calculate earnings by platform
  const earningsByPlatform = useMemo(() => {
    const platformTotals: Record<string, number> = {};
    
    filteredEarnings.forEach(e => {
      const platform = e.platform || 'Otros';
      platformTotals[platform] = (platformTotals[platform] || 0) + Number(e.amount);
    });

    return Object.entries(platformTotals)
      .map(([platform, amount]) => ({ platform, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [filteredEarnings]);

  // Calculate top songs by earnings
  const topSongs = useMemo(() => {
    const songEarnings: Record<string, { title: string; amount: number }> = {};
    
    filteredEarnings.forEach(e => {
      const song = songs.find(s => s.id === e.song_id);
      if (song) {
        if (!songEarnings[e.song_id]) {
          songEarnings[e.song_id] = { title: song.title, amount: 0 };
        }
        songEarnings[e.song_id].amount += Number(e.amount);
      }
    });

    return Object.values(songEarnings)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredEarnings, songs]);

  const totalEarnings = filteredEarnings.reduce((sum, e) => sum + Number(e.amount), 0);

  if (filteredEarnings.length === 0) {
    return (
      <Card className="card-moodita">
        <CardContent className="py-12 text-center text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No hay datos financieros</p>
          <p className="text-sm mt-2">Registra ganancias en la pestaña "Ganancias" para ver el resumen</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-moodita">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient-primary">
              €{totalEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-moodita">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              Canciones Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{songs.length}</div>
          </CardContent>
        </Card>

        <Card className="card-moodita">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(splits.map(s => s.collaborator_name)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings by Type Pie Chart */}
        <Card className="card-moodita">
          <CardHeader>
            <CardTitle className="text-lg">Ingresos por Tipo de Derecho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={earningsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {earningsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toFixed(2)}`, 'Importe']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {earningsByType.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Earnings by Platform Bar Chart */}
        <Card className="card-moodita">
          <CardHeader>
            <CardTitle className="text-lg">Ingresos por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsByPlatform} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `€${v}`} />
                  <YAxis type="category" dataKey="platform" width={80} />
                  <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Importe']} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Songs */}
      <Card className="card-moodita">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Canciones por Ingresos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSongs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay canciones con ingresos registrados
            </p>
          ) : (
            <div className="space-y-4">
              {topSongs.map((song, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium">{song.title}</span>
                  </div>
                  <span className="font-bold text-primary">€{song.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
