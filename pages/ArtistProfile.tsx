import { useState, useMemo } from 'react';
import { useLinkedArtist } from '@/hooks/useLinkedArtist';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Music, Users, Calendar, FolderOpen, 
  Edit, Plus, MapPin, DollarSign, Mic, FileText, Eye, LogIn, 
  Disc3, ClipboardList, TrendingUp, Settings2, Wallet,
  ExternalLink, Instagram, ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContactProfileSheet } from '@/components/ContactProfileSheet';
import { ArtistFormatsContent } from '@/components/ArtistFormatsDialog';
import CreateReleaseDialog from '@/components/releases/CreateReleaseDialog';
import { ArtistInfoDialog } from '@/components/ArtistInfoDialog';
import { ArtistEPKsList } from '@/components/artist/ArtistEPKsList';
import InviteArtistDialog from '@/components/InviteArtistDialog';

import { usePlatformEarnings, useSongs } from '@/hooks/useRoyalties';
import { PieChart, Pie, Cell } from 'recharts';

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  description: string | null;
  created_at: string;
  genre: string | null;
  spotify_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  avatar_url: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  field_config: {
    team_categories?: string[];
  } | null;
}

interface Booking {
  id: string;
  fecha: string | null;
  ciudad: string | null;
  venue: string | null;
  estado: string | null;
  fee: number | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
  is_folder: boolean;
}

interface Release {
  id: string;
  title: string;
  type: string;
  release_date: string | null;
  status: string;
}

interface Solicitud {
  id: string;
  nombre_solicitante: string;
  tipo: string;
  estado: string;
  fecha_creacion: string;
}

interface Budget {
  id: string;
  name: string;
  city?: string;
  venue?: string;
  event_date?: string;
  budget_status?: string;
  fee?: number;
}

const DONUT_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))'];

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { startImpersonation } = useLinkedArtist();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showCreateReleaseDialog, setShowCreateReleaseDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  

  // Fetch artist
  const { data: artist, isLoading: loadingArtist } = useQuery({
    queryKey: ['artist', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Artist;
    },
    enabled: !!id,
  });

  // Fetch team members for this artist via contact_artist_assignments
  const { data: teamMembers = [], refetch: refetchTeam } = useQuery({
    queryKey: ['artist-team', id],
    queryFn: async () => {
      const { data: assignments, error: assignError } = await supabase
        .from('contact_artist_assignments')
        .select('contact_id')
        .eq('artist_id', id!);
      
      if (assignError) throw assignError;
      
      if (!assignments || assignments.length === 0) {
        return [] as TeamMember[];
      }
      
      const contactIds = assignments.map(a => a.contact_id);
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, role, email, phone, category, field_config')
        .in('id', contactIds)
        .order('name');
      
      if (error) throw error;
      return (data || []).filter(c => {
        const config = c.field_config as Record<string, any> | null;
        return config?.is_team_member === true;
      }) as TeamMember[];
    },
    enabled: !!id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['artist-bookings', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_offers')
        .select('id, fecha, ciudad, venue, estado, fee')
        .eq('artist_id', id)
        .order('fecha', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['artist-projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, created_at, is_folder')
        .eq('artist_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!id,
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['artist-releases', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, type, release_date, status')
        .eq('artist_id', id)
        .order('release_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Release[];
    },
    enabled: !!id,
  });

  const { data: solicitudes = [] } = useQuery({
    queryKey: ['artist-solicitudes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitudes')
        .select('id, nombre_solicitante, tipo, estado, fecha_creacion')
        .eq('artist_id', id)
        .order('fecha_creacion', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Solicitud[];
    },
    enabled: !!id,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['artist-budgets', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, name, city, venue, event_date, budget_status, fee')
        .eq('artist_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!id,
  });

  // Royalties data for income breakdown (Improvement #5)
  const { data: songs = [] } = useSongs(id);
  const { data: platformEarnings = [] } = usePlatformEarnings();

  // Stats
  const upcomingBookings = bookings.filter(b => b.fecha && new Date(b.fecha) >= new Date()).length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.fee || 0), 0);

  // Royalties total filtered by artist songs
  const songIds = new Set(songs?.map(s => s.id) || []);
  const royaltiesTotal = (platformEarnings || [])
    .filter(e => songIds.has(e.song_id))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const bookingRevenue = totalRevenue;
  const grandTotal = bookingRevenue + royaltiesTotal;

  // Income breakdown data for mini donut (Improvement #5)
  const incomeBreakdown = useMemo(() => {
    const segments = [];
    if (bookingRevenue > 0) segments.push({ name: 'Booking', value: bookingRevenue });
    if (royaltiesTotal > 0) segments.push({ name: 'Royalties', value: royaltiesTotal });
    return segments;
  }, [bookingRevenue, royaltiesTotal]);

  // Career phase calculation (Improvement #1)
  const careerPhase = useMemo(() => {
    const releaseCount = releases?.length || 0;
    const bookingCount = bookings?.length || 0;
    const revenue = grandTotal || 0;

    if (revenue > 20000 || releaseCount >= 10 || bookingCount >= 20) {
      return { label: 'Expansión', value: 100, index: 3 };
    }
    if (revenue > 5000 || releaseCount >= 4 || bookingCount >= 10) {
      return { label: 'Consolidación', value: 75, index: 2 };
    }
    if (releaseCount >= 1 || bookingCount >= 3) {
      return { label: 'Construcción', value: 50, index: 1 };
    }
    return { label: 'Descubrimiento', value: 25, index: 0 };
  }, [releases, bookings, grandTotal]);

  const phaseLabels = ['Descubrimiento', 'Construcción', 'Consolidación', 'Expansión'];

  if (loadingArtist) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Artista no encontrado</h3>
            <Button variant="outline" onClick={() => navigate('/mi-management')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Separate folders (archive) from projects (workspace)
  const folders = projects.filter(p => p.is_folder);
  const workProjects = projects.filter(p => !p.is_folder);
  const pendingSolicitudes = solicitudes.filter(s => s.estado === 'pendiente');

  const stats = [
    { label: 'Equipo', value: teamMembers.length, icon: Users, color: 'text-blue-500', path: `/teams?artistId=${id}` },
    { label: 'Shows próximos', value: upcomingBookings, icon: Mic, color: 'text-orange-500', path: `/booking?artistId=${id}` },
    { label: 'Proyectos', value: workProjects.length, icon: FolderOpen, color: 'text-purple-500', path: `/projects?artistId=${id}` },
    { label: 'Releases', value: releases.length, icon: Disc3, color: 'text-pink-500', path: `/releases?artistId=${id}` },
    { label: 'Solicitudes', value: pendingSolicitudes.length, icon: ClipboardList, color: 'text-amber-500', path: `/solicitudes?artistId=${id}` },
    { label: 'Ingresos totales', value: `€${grandTotal.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', path: `/royalties?artistId=${id}`, isRevenue: true },
  ];

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'confirmado': return 'bg-green-500/10 text-green-500';
      case 'pendiente': return 'bg-yellow-500/10 text-yellow-500';
      case 'cancelado': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const hasSocialLinks = artist.spotify_url || artist.instagram_url || artist.tiktok_url;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header — Improvement #4: bio, genre badge, social links */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/mi-management')} className="mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-16 w-16">
          {artist.avatar_url && <AvatarImage src={artist.avatar_url} alt={artist.stage_name || artist.name} />}
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            {(artist.stage_name || artist.name).substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold">
              {artist.stage_name || artist.name}
            </h1>
            {artist.genre && (
              <Badge variant="secondary" className="text-xs">
                {artist.genre}
              </Badge>
            )}
          </div>
          {artist.stage_name && (
            <p className="text-muted-foreground">{artist.name}</p>
          )}
          {/* Bio inline */}
          {artist.description ? (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{artist.description}</p>
          ) : (
            <button
              onClick={() => setShowEditDialog(true)}
              className="text-sm text-muted-foreground/60 hover:text-primary mt-1 underline-offset-2 hover:underline transition-colors"
            >
              + Añadir descripción
            </button>
          )}
          {/* Social links */}
          <div className="flex items-center gap-2 mt-2">
            {artist.spotify_url && (
              <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer"
                aria-label="Spotify"
                className="text-muted-foreground hover:text-[#1DB954] transition-colors">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.59 11.66 1.34.36.22.47.69.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.99-8.16-2.56-11.98-1.4a.94.94 0 1 1-.55-1.8c4.37-1.33 9.8-.69 13.5 1.59.44.27.58.85.32 1.3zm.13-3.4C15.32 8.5 8.9 8.28 5.42 9.34a1.13 1.13 0 1 1-.66-2.16c4-1.21 11.07-.98 15.43 1.62a1.13 1.13 0 0 1-1.16 1.94z"/>
                </svg>
              </a>
            )}
            {artist.instagram_url && (
              <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-muted-foreground hover:text-pink-500 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {artist.tiktok_url && (
              <a href={artist.tiktok_url} target="_blank" rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-muted-foreground hover:text-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.86a8.16 8.16 0 0 0 4.77 1.52V6.93a4.85 4.85 0 0 1-1.84-.24z"/>
                </svg>
              </a>
            )}
            {!hasSocialLinks && (
              <button
                onClick={() => setShowEditDialog(true)}
                className="text-xs text-muted-foreground/60 hover:text-primary underline-offset-2 hover:underline transition-colors"
              >
                + Añadir redes
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (!artist) return;
              startImpersonation({
                id: artist.id,
                name: artist.name,
                stage_name: artist.stage_name,
                avatar_url: artist.avatar_url,
                role: 'ARTIST_MANAGER',
              });
              navigate('/');
            }}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Entrar como artista
          </Button>
          <InviteArtistDialog 
            artistId={artist.id} 
            artistName={artist.stage_name || artist.name} 
          />
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Description card — hidden when bio is shown in header (always) */}
      {/* Kept in code but conditioned to never render since bio is now in the header */}

      {/* Career Phase Card — Improvement #1 */}
      <Card>
        <Collapsible defaultOpen={false}>
          <CardContent className="pt-6 pb-4">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Estado de Carrera</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{careerPhase.label}</Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <Progress value={careerPhase.value} className="h-2" />
              <div className="flex justify-between mt-2">
                {phaseLabels.map((label, i) => (
                  <span
                    key={label}
                    className={`text-[10px] ${i <= careerPhase.index ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

      {/* Stats — Improvement #2: dimmed zero stats with "+" button */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const isZero = stat.value === 0 || stat.value === '0' || stat.value === '€0';
          const isRevenueCard = (stat as any).isRevenue;
          return (
            <Card 
              key={stat.label}
              className={`cursor-pointer hover:border-primary transition-colors ${isZero ? 'opacity-60' : ''}`}
              onClick={() => navigate(stat.path)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    {isZero ? (
                      <p className="text-sm font-medium text-primary mt-1">+ Crear</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold">{isRevenueCard ? `€${grandTotal.toLocaleString()}` : stat.value}</p>
                        {/* Mini donut for revenue — Improvement #5 */}
                        {isRevenueCard && incomeBreakdown.length > 1 && (
                          <PieChart width={36} height={36}>
                            <Pie
                              data={incomeBreakdown}
                              cx={18}
                              cy={18}
                              innerRadius={10}
                              outerRadius={16}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {incomeBreakdown.map((_, i) => (
                                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        )}
                      </div>
                    )}
                  </div>
                  <stat.icon className={`h-6 w-6 ${stat.color} shrink-0`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs — Improvement #3: reordered by usage frequency */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Shows</TabsTrigger>
          <TabsTrigger value="finanzas">Finanzas</TabsTrigger>
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="team">Formatos</TabsTrigger>
          <TabsTrigger value="projects">Proyectos</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
          <TabsTrigger value="epks">EPKs</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Últimos shows y conciertos</p>
            <Button variant="outline" onClick={() => navigate('/booking')}>
              Ver todos
            </Button>
          </div>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin shows</h3>
                <p className="text-muted-foreground">
                  No hay shows registrados para este artista
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <Card 
                  key={booking.id} 
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/booking/${booking.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {booking.venue || booking.ciudad || 'Sin ubicación'}
                          </span>
                        </div>
                        {booking.ciudad && booking.venue && (
                          <p className="text-sm text-muted-foreground ml-6">
                            {booking.ciudad}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {booking.fecha && (
                          <p className="text-sm">
                            {format(new Date(booking.fecha), 'd MMM yyyy', { locale: es })}
                          </p>
                        )}
                        {booking.fee && (
                          <p className="text-sm text-muted-foreground">
                            €{booking.fee.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(booking.estado)}>
                        {booking.estado || 'pendiente'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="finanzas" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Presupuestos del artista</p>
            <Button variant="outline" onClick={() => navigate('/finanzas')}>
              Ver todos
            </Button>
          </div>

          {budgets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin presupuestos</h3>
                <p className="text-muted-foreground">
                  No hay presupuestos asociados a este artista
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {budgets.map((budget) => (
                <Card 
                  key={budget.id} 
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/finanzas?budget=${budget.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{budget.name}</span>
                        </div>
                        {budget.city && (
                          <p className="text-sm text-muted-foreground ml-6">
                            {budget.city}{budget.venue ? ` - ${budget.venue}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {budget.event_date && (
                          <p className="text-sm">
                            {format(new Date(budget.event_date), 'd MMM yyyy', { locale: es })}
                          </p>
                        )}
                        {budget.fee && (
                          <p className="text-sm text-muted-foreground">
                            €{budget.fee.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={budget.budget_status === 'aprobado' ? 'default' : 'secondary'}>
                        {budget.budget_status || 'borrador'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="releases" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Discografía del artista</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateReleaseDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo
              </Button>
              <Button variant="outline" onClick={() => navigate(`/releases?artistId=${id}`)}>
                Ver todos
              </Button>
            </div>
          </div>

          {releases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Disc3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin lanzamientos</h3>
                <p className="text-muted-foreground mb-4">
                  No hay lanzamientos asociados a este artista
                </p>
                <Button onClick={() => setShowCreateReleaseDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Lanzamiento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {releases.map((release) => (
                <Card 
                  key={release.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/releases/${release.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <Disc3 className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{release.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {release.type === 'album' ? 'Álbum' : release.type === 'ep' ? 'EP' : 'Single'}
                          </Badge>
                          <Badge className={`text-xs ${
                            release.status === 'released' ? 'bg-green-500/20 text-green-600' :
                            release.status === 'in_progress' ? 'bg-blue-500/20 text-blue-600' :
                            release.status === 'archived' ? 'bg-gray-500/20 text-gray-500' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {release.status === 'planning' ? 'Planificando' :
                             release.status === 'in_progress' ? 'En Progreso' :
                             release.status === 'released' ? 'Publicado' :
                             release.status === 'archived' ? 'Archivado' : release.status}
                          </Badge>
                          {release.release_date && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(release.release_date), 'd MMM yyyy', { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <ArtistFormatsContent 
            artistId={id || ''} 
            artistName={artist.stage_name || artist.name} 
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Proyectos del artista</p>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              Ver todos
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin proyectos</h3>
                <p className="text-muted-foreground">
                  No hay proyectos asociados a este artista
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card 
                  key={project.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Creado {format(new Date(project.created_at), 'd MMM yyyy', { locale: es })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="solicitudes" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Solicitudes del artista</p>
            <Button variant="outline" onClick={() => navigate('/solicitudes')}>
              Ver todas
            </Button>
          </div>

          {solicitudes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin solicitudes</h3>
                <p className="text-muted-foreground">
                  No hay solicitudes asociadas a este artista
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {solicitudes.map((solicitud) => (
                <Card 
                  key={solicitud.id} 
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/solicitudes?id=${solicitud.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{solicitud.nombre_solicitante}</p>
                        <p className="text-sm text-muted-foreground">{solicitud.tipo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {format(new Date(solicitud.fecha_creacion), 'd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                      <Badge variant={solicitud.estado === 'aprobada' ? 'default' : 'secondary'}>
                        {solicitud.estado}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="epks" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">EPKs vinculados a este artista</p>
            <Button variant="outline" onClick={() => navigate('/epk')}>
              Ver todos
            </Button>
          </div>
          <ArtistEPKsList artistId={id!} />
        </TabsContent>
      </Tabs>

      <ContactProfileSheet
        open={!!selectedContactId}
        onOpenChange={(open) => !open && setSelectedContactId(null)}
        contactId={selectedContactId || ''}
      />

      <CreateReleaseDialog
        open={showCreateReleaseDialog}
        onOpenChange={setShowCreateReleaseDialog}
        artistId={id}
      />

      {id && (
        <ArtistInfoDialog
          artistId={id}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}

    </div>
  );
}
