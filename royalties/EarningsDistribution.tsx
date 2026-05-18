import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSongs, useSongSplits, usePlatformEarnings } from '@/hooks/useRoyalties';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DollarSign, Users } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface EarningsDistributionProps {
  artistId?: string;
}

export function EarningsDistribution({ artistId }: EarningsDistributionProps) {
  const { data: songs } = useSongs(artistId);
  const { data: splits } = useSongSplits();
  const { data: allEarnings } = usePlatformEarnings();

  // Filter earnings by songs if artistId is set
  const songIds = new Set(songs?.map(s => s.id) || []);
  const earnings = artistId && artistId !== 'all' 
    ? allEarnings?.filter(e => songIds.has(e.song_id)) 
    : allEarnings;

  const distribution = useMemo(() => {
    if (!songs || !splits || !earnings) return [];

    // Filter splits for songs we have
    const filteredSplits = artistId && artistId !== 'all'
      ? splits.filter(s => songIds.has(s.song_id))
      : splits;

    // Calculate total earnings per song
    const songEarnings: Record<string, number> = {};
    earnings.forEach(e => {
      songEarnings[e.song_id] = (songEarnings[e.song_id] || 0) + Number(e.amount);
    });

    // Calculate distribution per collaborator
    const collaboratorEarnings: Record<string, number> = {};
    
    filteredSplits.forEach(split => {
      const songTotal = songEarnings[split.song_id] || 0;
      const collaboratorShare = (songTotal * split.percentage) / 100;
      collaboratorEarnings[split.collaborator_name] = 
        (collaboratorEarnings[split.collaborator_name] || 0) + collaboratorShare;
    });

    return Object.entries(collaboratorEarnings)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [songs, splits, earnings]);

  const totalDistributed = distribution.reduce((sum, d) => sum + d.value, 0);

  if (distribution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distribución de Ganancias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Añade canciones, splits y ganancias para ver la distribución
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Distribución de Ganancias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`€${value.toFixed(2)}`, 'Ganancias']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Total a distribuir</span>
              <span className="text-lg font-bold text-primary">€{totalDistributed.toFixed(2)}</span>
            </div>

            {distribution.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">€{item.value.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
