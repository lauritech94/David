import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useSongs, useSongSplits, usePlatformEarnings } from '@/hooks/useRoyalties';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Check, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentRecord {
  splitId: string;
  songId: string;
  collaboratorName: string;
  amount: number;
  isPaid: boolean;
}

interface PaymentTrackerProps {
  artistId?: string;
}

export function PaymentTracker({ artistId }: PaymentTrackerProps) {
  const { data: songs = [] } = useSongs(artistId);
  const { data: allSplits = [] } = useSongSplits();
  const { data: allEarnings = [] } = usePlatformEarnings();
  const [paidSplits, setPaidSplits] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Filter by artist - memoize for performance
  const songIds = useMemo(() => new Set(songs.map(s => s.id)), [songs]);
  const splits = useMemo(() => 
    artistId && artistId !== 'all'
      ? allSplits.filter(s => songIds.has(s.song_id))
      : allSplits,
    [allSplits, songIds, artistId]
  );
  const earnings = useMemo(() => 
    artistId && artistId !== 'all'
      ? allEarnings.filter(e => songIds.has(e.song_id))
      : allEarnings,
    [allEarnings, songIds, artistId]
  );

  // Calculate pending payments
  const payments = useMemo(() => {
    const result: PaymentRecord[] = [];

    songs.forEach(song => {
      const songSplits = splits.filter(s => s.song_id === song.id);
      const songEarnings = earnings.filter(e => e.song_id === song.id);
      const totalEarnings = songEarnings.reduce((sum, e) => sum + Number(e.amount), 0);

      songSplits.forEach(split => {
        const collaboratorAmount = (totalEarnings * split.percentage) / 100;
        if (collaboratorAmount > 0) {
          result.push({
            splitId: split.id,
            songId: song.id,
            collaboratorName: split.collaborator_name,
            amount: collaboratorAmount,
            isPaid: paidSplits.has(split.id),
          });
        }
      });
    });

    return result;
  }, [songs, splits, earnings, paidSplits]);

  const totalPending = payments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);

  const togglePaid = (splitId: string) => {
    setPaidSplits(prev => {
      const next = new Set(prev);
      if (next.has(splitId)) {
        next.delete(splitId);
      } else {
        next.add(splitId);
      }
      return next;
    });
  };

  const markAllPaid = () => {
    setPaidSplits(new Set(payments.map(p => p.splitId)));
    toast.success('Todos los pagos marcados como realizados');
  };

  const getSongTitle = (songId: string) => {
    return songs.find(s => s.id === songId)?.title || 'Canción desconocida';
  };

  // Group payments by collaborator
  const paymentsByCollaborator = useMemo(() => {
    const grouped: Record<string, PaymentRecord[]> = {};
    payments.forEach(p => {
      if (!grouped[p.collaboratorName]) {
        grouped[p.collaboratorName] = [];
      }
      grouped[p.collaboratorName].push(p);
    });
    return grouped;
  }, [payments]);

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No hay pagos pendientes</p>
          <p className="text-sm mt-2">Registra ganancias y configura splits para ver los pagos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente</p>
                <p className="text-xl font-bold text-amber-500">€{totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagado</p>
                <p className="text-xl font-bold text-green-500">€{totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">€{(totalPending + totalPaid).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={markAllPaid}>
          <Check className="h-4 w-4 mr-2" />
          Marcar todo como pagado
        </Button>
      </div>

      {/* Payment List by Collaborator */}
      <div className="space-y-4">
        {Object.entries(paymentsByCollaborator).map(([collaborator, collaboratorPayments]) => {
          const collaboratorTotal = collaboratorPayments.reduce((sum, p) => sum + p.amount, 0);
          const collaboratorPaid = collaboratorPayments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
          const allPaid = collaboratorPayments.every(p => p.isPaid);

          return (
            <Card key={collaborator}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{collaborator}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={allPaid ? 'default' : 'secondary'}>
                      €{collaboratorTotal.toFixed(2)}
                    </Badge>
                    {allPaid ? (
                      <Badge className="bg-green-500">Pagado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-500">
                        Pendiente: €{(collaboratorTotal - collaboratorPaid).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {collaboratorPayments.map(payment => (
                    <div
                      key={payment.splitId}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={payment.isPaid}
                          onCheckedChange={() => togglePaid(payment.splitId)}
                        />
                        <span className={payment.isPaid ? 'line-through text-muted-foreground' : ''}>
                          {getSongTitle(payment.songId)}
                        </span>
                      </div>
                      <span className={`font-medium ${payment.isPaid ? 'text-green-500' : ''}`}>
                        €{payment.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
