import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Eye,
  Mic,
  Disc3,
  Wallet,
  User,
  Calendar,
  HardDrive,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface ArtistPortalPreviewProps {
  artistId: string;
  artistName: string;
  artistStageName?: string | null;
  artistAvatarUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ArtistPortalPreview({
  artistId,
  artistName,
  artistStageName,
  artistAvatarUrl,
  open,
  onOpenChange,
}: ArtistPortalPreviewProps) {
  const [stats, setStats] = useState({ shows: 0, releases: 0 });

  useEffect(() => {
    if (open && artistId) {
      fetchStats();
    }
  }, [open, artistId]);

  const fetchStats = async () => {
    const [bookings, releases] = await Promise.all([
      supabase
        .from('booking_offers')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artistId)
        .gte('fecha', new Date().toISOString().split('T')[0]),
      supabase
        .from('releases')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artistId),
    ]);
    setStats({
      shows: bookings.count || 0,
      releases: releases.count || 0,
    });
  };

  const displayName = artistStageName || artistName;
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Preview Banner */}
        <div className="bg-warning/15 border-b border-warning/30 px-6 py-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <p className="text-sm text-warning-foreground">
            <strong>Vista previa</strong> — Así verá <strong>{displayName}</strong> su portal al iniciar sesión.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Artist Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl border p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {artistAvatarUrl && <AvatarImage src={artistAvatarUrl} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <p className="text-muted-foreground">Tu portal de artista</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.shows}</p>
                  <p className="text-sm text-muted-foreground">Shows próximos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Disc3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.releases}</p>
                  <p className="text-sm text-muted-foreground">Lanzamientos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-sm text-muted-foreground">Finanzas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: User, title: 'Mi Perfil de Artista', desc: 'Edita tu bio, redes sociales, género musical y datos fiscales' },
              { icon: Disc3, title: 'Mis Lanzamientos', desc: 'Álbumes, singles, créditos y cronogramas' },
              { icon: Calendar, title: 'Calendario de Shows', desc: 'Tus próximos conciertos y eventos' },
              { icon: HardDrive, title: 'Mi Drive', desc: 'Contratos, riders y documentos' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{title}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
