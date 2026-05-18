import { useState, useEffect } from 'react';
import { Search, Calendar, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

export interface BookingForSelector {
  id: string;
  festival_ciclo: string | null;
  lugar: string | null;
  ciudad: string | null;
  fecha: string | null;
  promotor: string | null;
  artist_id: string | null;
  artist?: {
    id: string;
    name: string;
    stage_name: string | null;
  } | null;
}

interface BookingSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId?: string | null;
  onSelect: (booking: BookingForSelector) => void;
}

export function BookingSelectorDialog({ open, onOpenChange, artistId, onSelect }: BookingSelectorDialogProps) {
  const [bookings, setBookings] = useState<BookingForSelector[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBookings();
    }
  }, [open, artistId]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('booking_offers')
        .select(`
          id,
          festival_ciclo,
          lugar,
          ciudad,
          fecha,
          promotor,
          artist_id,
          artist:artists(id, name, stage_name)
        `)
        .order('fecha', { ascending: false })
        .limit(100);

      if (artistId) {
        query = query.eq('artist_id', artistId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const searchLower = search.toLowerCase();
    const name = booking.festival_ciclo || booking.lugar || '';
    const city = booking.ciudad || '';
    const promoter = booking.promotor || '';
    const artistName = booking.artist?.stage_name || booking.artist?.name || '';
    
    return (
      name.toLowerCase().includes(searchLower) ||
      city.toLowerCase().includes(searchLower) ||
      promoter.toLowerCase().includes(searchLower) ||
      artistName.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (booking: BookingForSelector) => {
    onSelect(booking);
    onOpenChange(false);
  };

  const getBookingName = (booking: BookingForSelector) => {
    return booking.festival_ciclo || booking.lugar || 'Evento sin nombre';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular a Evento de Booking</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, ciudad, promotor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px] -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Cargando eventos...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                {search ? 'No se encontraron eventos' : 'No hay eventos disponibles'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBookings.map((booking) => (
                <button
                  key={booking.id}
                  className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                  onClick={() => handleSelect(booking)}
                >
                  <div className="font-medium">{getBookingName(booking)}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                    {booking.fecha && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(booking.fecha), 'd MMM yyyy', { locale: es })}
                      </span>
                    )}
                    {booking.ciudad && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {booking.ciudad}
                      </span>
                    )}
                    {booking.artist && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {booking.artist.stage_name || booking.artist.name}
                      </span>
                    )}
                    {booking.promotor && (
                      <span className="text-xs">Promotor: {booking.promotor}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
