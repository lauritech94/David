import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useSongs, useSongSplits, usePlatformEarnings } from '@/hooks/useRoyalties';
import { toast } from 'sonner';

export function ExportRoyaltiesButton() {
  const { data: songs = [] } = useSongs();
  const { data: splits = [] } = useSongSplits();
  const { data: earnings = [] } = usePlatformEarnings();

  const exportToCSV = () => {
    // Build report data
    const rows: string[][] = [];
    
    // Header
    rows.push(['Canción', 'ISRC', 'Colaborador', 'Rol', 'Porcentaje', 'Plataforma', 'Ganancias', 'Streams', 'Periodo']);

    songs.forEach(song => {
      const songSplits = splits.filter(s => s.song_id === song.id);
      const songEarnings = earnings.filter(e => e.song_id === song.id);
      
      if (songSplits.length === 0 && songEarnings.length === 0) {
        rows.push([song.title, song.isrc || '', '', '', '', '', '', '', '']);
        return;
      }

      // Calculate total earnings for this song
      const totalEarnings = songEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalStreams = songEarnings.reduce((sum, e) => sum + (e.streams || 0), 0);

      songSplits.forEach(split => {
        const collaboratorEarnings = (totalEarnings * split.percentage) / 100;
        const collaboratorStreams = Math.round((totalStreams * split.percentage) / 100);
        
        rows.push([
          song.title,
          song.isrc || '',
          split.collaborator_name,
          split.role,
          `${split.percentage}%`,
          'Todas',
          `€${collaboratorEarnings.toFixed(2)}`,
          collaboratorStreams.toString(),
          songEarnings.length > 0 ? `${songEarnings[songEarnings.length - 1].period_start} - ${songEarnings[0].period_end}` : ''
        ]);
      });
    });

    // Convert to CSV
    const csvContent = rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `royalties-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Reporte exportado correctamente');
  };

  return (
    <Button variant="outline" onClick={exportToCSV}>
      <Download className="h-4 w-4 mr-2" />
      Exportar CSV
    </Button>
  );
}
