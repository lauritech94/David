import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, Calendar, FileText, Music, FolderOpen, ArrowRight, Receipt, Disc3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';

interface SelectedProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  artistId?: string;
}

interface ContactDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: SelectedProfile[];
}

interface DashboardData {
  budgetItems: any[];
  budgets: any[];
  bookings: any[];
  solicitudes: any[];
  syncOffers: any[];
  projects: any[];
  transactions: any[];
  songSplits: any[];
  trackCredits: any[];
  releases: any[];
}

const getArtistIds = (profiles: SelectedProfile[]): string[] =>
  profiles.map(p => p.artistId).filter((id): id is string => !!id);

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

export function ContactDashboardDialog({ open, onOpenChange, profiles }: ContactDashboardDialogProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData>({
    budgetItems: [],
    budgets: [],
    bookings: [],
    solicitudes: [],
    syncOffers: [],
    projects: [],
    transactions: [],
    songSplits: [],
    trackCredits: [],
    releases: [],
  });
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const navigate = useNavigate();

  const navigateFromDashboard = (path: string) => {
    // Save dashboard state so browser back restores it
    sessionStorage.setItem('contactDashboardProfiles', JSON.stringify(profiles));
    onOpenChange(false);
    navigate(path);
  };

  const initialContactIds = profiles.map(p => p.id);

  useEffect(() => {
    if (!open || profiles.length === 0) return;
    fetchAll();
  }, [open, profiles]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const artistIds = getArtistIds(profiles);

      // Resolve contact_ids linked to artist_ids so contact-based queries also work for artists
      let resolvedContactIds = [...initialContactIds];
      if (artistIds.length > 0) {
        const { data: linkedContacts } = await supabase
          .from('contacts')
          .select('id')
          .in('artist_id', artistIds);
        if (linkedContacts) {
          const linkedIds = linkedContacts.map(c => c.id);
          resolvedContactIds = [...new Set([...resolvedContactIds, ...linkedIds])];
        }
      }

      // Filter out any non-UUID values (e.g. prefixed IDs that slipped through)
      const contactIds = resolvedContactIds.filter(id => /^[0-9a-f]{8}-/.test(id));

      const [
        budgetItemsRes,
        solicitudesRes,
        syncOffersRes,
        projectsRes,
        transactionsRes,
        songSplitsRes,
        trackCreditsRes,
        bookingsRes,
        releasesRes,
        budgetsRes,
      ] = await Promise.all([
        contactIds.length > 0
          ? supabase.from('budget_items').select('*, budgets(name, status)').in('contact_id', contactIds)
          : Promise.resolve({ data: [] }),
        contactIds.length > 0
          ? supabase.from('solicitudes').select('*').or(`contact_id.in.(${contactIds.join(',')}),promotor_contact_id.in.(${contactIds.join(',')})`)
          : Promise.resolve({ data: [] }),
        contactIds.length > 0
          ? supabase.from('sync_offers').select('*').or(`contact_id.in.(${contactIds.join(',')}),requester_contact_id.in.(${contactIds.join(',')})`)
          : Promise.resolve({ data: [] }),
        contactIds.length > 0
          ? supabase.from('project_team').select('*, projects(name, status)').in('contact_id', contactIds)
          : Promise.resolve({ data: [] }),
        contactIds.length > 0
          ? supabase.from('transactions').select('*').in('contact_id', contactIds)
          : Promise.resolve({ data: [] }),
        contactIds.length > 0
          ? supabase.from('song_splits').select('*, songs(title)').in('collaborator_contact_id', contactIds)
          : Promise.resolve({ data: [] }),
        contactIds.length > 0
          ? supabase.from('track_credits').select('*, release_tracks(title)').in('contact_id', contactIds)
          : Promise.resolve({ data: [] }),
        artistIds.length > 0
          ? supabase.from('booking_offers').select('*, artists(name)').in('artist_id', artistIds)
          : Promise.resolve({ data: [] }),
        artistIds.length > 0
          ? supabase.from('releases').select('*').in('artist_id', artistIds)
          : Promise.resolve({ data: [] }),
        artistIds.length > 0
          ? supabase.from('budgets').select('id, name, type, fee, show_status, budget_status, event_date, event_time, city, venue, country, artist_id, formato, expense_budget, internal_notes, created_at').in('artist_id', artistIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      setData({
        budgetItems: budgetItemsRes.data || [],
        budgets: budgetsRes.data || [],
        bookings: bookingsRes.data || [],
        solicitudes: solicitudesRes.data || [],
        syncOffers: syncOffersRes.data || [],
        projects: projectsRes.data || [],
        transactions: transactionsRes.data || [],
        songSplits: songSplitsRes.data || [],
        trackCredits: trackCreditsRes.data || [],
        releases: releasesRes.data || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalItems =
    data.budgetItems.length +
    data.budgets.length +
    data.bookings.length +
    data.solicitudes.length +
    data.syncOffers.length +
    data.projects.length +
    data.transactions.length +
    data.songSplits.length +
    data.trackCredits.length +
    data.releases.length;

  const tabCounts = {
    presupuestos: data.budgetItems.length + data.budgets.length,
    bookings: data.bookings.length,
    solicitudes: data.solicitudes.length,
    sync: data.syncOffers.length,
    proyectos: data.projects.length,
    transacciones: data.transactions.length,
    discografia: data.releases.length,
    musica: data.songSplits.length + data.trackCredits.length,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const StatusBadge = ({ status }: { status: string | null }) => {
    if (!status) return null;
    const colorMap: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-destructive/10 text-destructive',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      active: 'bg-primary/10 text-primary',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return (
      <Badge variant="secondary" className={`text-xs ${colorMap[status] || ''}`}>
        {status}
      </Badge>
    );
  };

  const EmptyState = ({ label }: { label: string }) => (
    <div className="py-8 text-center text-muted-foreground text-sm">
      No hay {label} vinculados a los perfiles seleccionados
    </div>
  );

  const ItemCard = ({ title, subtitle, status, date, onClick }: {
    title: string;
    subtitle?: string;
    status?: string | null;
    date?: string | null;
    onClick?: () => void;
  }) => (
    <Card
      className={`hover:bg-muted/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      role={onClick ? 'button' : undefined}
      onMouseUp={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {date && <span className="text-xs text-muted-foreground">{formatDate(date)}</span>}
          <StatusBadge status={status} />
          {onClick && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Dashboard de Perfiles</DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-3 py-1">
                <Avatar className="h-6 w-6">
                  {p.avatarUrl && <AvatarImage src={p.avatarUrl} />}
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(p.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="todo" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="w-full flex-wrap h-auto gap-1 justify-start">
              <TabsTrigger value="todo">Todo ({totalItems})</TabsTrigger>
              <TabsTrigger value="presupuestos">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                Presupuestos ({tabCounts.presupuestos})
              </TabsTrigger>
              <TabsTrigger value="bookings">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Bookings ({tabCounts.bookings})
              </TabsTrigger>
              <TabsTrigger value="solicitudes">
                <FileText className="h-3.5 w-3.5 mr-1" />
                Solicitudes ({tabCounts.solicitudes})
              </TabsTrigger>
              <TabsTrigger value="sync">
                <Music className="h-3.5 w-3.5 mr-1" />
                Sync ({tabCounts.sync})
              </TabsTrigger>
              <TabsTrigger value="proyectos">
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                Proyectos ({tabCounts.proyectos})
              </TabsTrigger>
              <TabsTrigger value="transacciones">
                <Receipt className="h-3.5 w-3.5 mr-1" />
                Transacciones ({tabCounts.transacciones})
              </TabsTrigger>
              <TabsTrigger value="discografia">
                <Disc3 className="h-3.5 w-3.5 mr-1" />
                Discografía ({tabCounts.discografia})
              </TabsTrigger>
              <TabsTrigger value="musica">
                <Music className="h-3.5 w-3.5 mr-1" />
                Música ({tabCounts.musica})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-2">
              {/* Todo tab */}
              <TabsContent value="todo" className="space-y-4 m-0">
                {totalItems === 0 ? (
                  <EmptyState label="recursos" />
                ) : (
                  <>
                    {data.budgets.length > 0 && (
                      <Section title="Presupuestos del artista" icon={<DollarSign className="h-4 w-4" />} count={data.budgets.length}>
                        {data.budgets.map(item => (
                          <ItemCard
                            key={`budget-${item.id}`}
                            title={item.name || 'Presupuesto'}
                            subtitle={[item.city, item.venue].filter(Boolean).join(' · ') || item.type}
                            status={item.budget_status || item.show_status}
                            date={item.event_date || item.created_at}
                            onClick={() => setSelectedBudget(item)}
                          />
                        ))}
                      </Section>
                    )}
                    {data.budgetItems.length > 0 && (
                      <Section title="Partidas como proveedor" icon={<DollarSign className="h-4 w-4" />} count={data.budgetItems.length}>
                        {data.budgetItems.map(item => (
                          <ItemCard
                            key={item.id}
                            title={item.name || item.description || 'Partida'}
                            subtitle={item.budgets?.name}
                            status={item.budgets?.status}
                            date={item.created_at}
                            onClick={() => navigateFromDashboard('/budgets')}
                          />
                        ))}
                      </Section>
                    )}
                    {data.bookings.length > 0 && (
                      <Section title="Bookings" icon={<Calendar className="h-4 w-4" />} count={data.bookings.length}>
                        {data.bookings.map(item => (
                          <ItemCard
                            key={item.id}
                            title={item.lugar || item.venue || 'Booking'}
                            subtitle={item.artists?.name ? `${item.artists.name} · ${item.ciudad || ''}` : item.ciudad}
                            status={item.estado}
                            date={item.fecha}
onClick={() => navigateFromDashboard(`/booking/${item.id}`)}
                          />
                        ))}
                      </Section>
                    )}
                    {data.solicitudes.length > 0 && (
                      <Section title="Solicitudes" icon={<FileText className="h-4 w-4" />} count={data.solicitudes.length}>
                        {data.solicitudes.map(item => (
                          <ItemCard
                            key={item.id}
                            title={item.title || item.subject || 'Solicitud'}
                            subtitle={item.requester_name}
                            status={item.status}
                            date={item.created_at}
                            onClick={() => navigateFromDashboard('/solicitudes')}
                          />
                        ))}
                      </Section>
                    )}
                    {data.syncOffers.length > 0 && (
                      <Section title="Sincronizaciones" icon={<Music className="h-4 w-4" />} count={data.syncOffers.length}>
                        {data.syncOffers.map(item => (
                          <ItemCard
                            key={item.id}
                            title={item.title || item.brand || 'Oferta Sync'}
                            status={item.status}
                            date={item.created_at}
                            onClick={() => navigateFromDashboard('/sincronizaciones')}
                          />
                        ))}
                      </Section>
                    )}
                    {data.projects.length > 0 && (
                      <Section title="Proyectos" icon={<FolderOpen className="h-4 w-4" />} count={data.projects.length}>
                        {data.projects.map(item => (
                          <ItemCard
                            key={item.id}
                            title={item.projects?.name || 'Proyecto'}
                            subtitle={item.role_label}
                            status={item.projects?.status}
                            onClick={() => navigateFromDashboard(`/projects/${item.project_id}`)}
                          />
                        ))}
                      </Section>
                    )}
                    {data.transactions.length > 0 && (
                      <Section title="Transacciones" icon={<Receipt className="h-4 w-4" />} count={data.transactions.length}>
                        {data.transactions.map(item => (
                          <ItemCard
                            key={item.id}
                            title={item.description || 'Transacción'}
                            subtitle={item.amount ? `${item.amount} ${item.currency || '€'}` : undefined}
                            status={item.status}
                            date={item.date || item.created_at}
                            onClick={() => navigateFromDashboard('/finanzas')}
                          />
                        ))}
                      </Section>
                    )}
                    {data.releases.length > 0 && (
                      <Section title="Discografía" icon={<Disc3 className="h-4 w-4" />} count={data.releases.length}>
                        {data.releases.map(item => (
                          <ItemCard
                            key={`release-${item.id}`}
                            title={item.title || 'Release'}
                            subtitle={item.release_type}
                            status={item.status}
                            date={item.release_date || item.created_at}
                            onClick={() => navigateFromDashboard(`/releases/${item.id}`)}
                          />
                        ))}
                      </Section>
                    )}
                    {(data.songSplits.length > 0 || data.trackCredits.length > 0) && (
                      <Section title="Música" icon={<Music className="h-4 w-4" />} count={data.songSplits.length + data.trackCredits.length}>
                        {data.songSplits.map(item => (
                          <ItemCard
                            key={`split-${item.id}`}
                            title={item.songs?.title || 'Canción'}
                            subtitle={`Split: ${item.percentage || 0}%`}
                            onClick={() => navigateFromDashboard('/royalties')}
                          />
                        ))}
                        {data.trackCredits.map(item => (
                          <ItemCard
                            key={`credit-${item.id}`}
                            title={item.release_tracks?.title || 'Track'}
                            subtitle={item.credit_role}
                            onClick={() => navigateFromDashboard('/royalties')}
                          />
                        ))}
                      </Section>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Individual tabs */}
              <TabsContent value="presupuestos" className="space-y-4 m-0">
                {data.budgets.length === 0 && data.budgetItems.length === 0 ? (
                  <EmptyState label="presupuestos" />
                ) : (
                  <>
                    {data.budgets.length > 0 && (
                      <Section title="Presupuestos del artista" icon={<DollarSign className="h-4 w-4" />} count={data.budgets.length}>
                        {data.budgets.map(item => (
                          <ItemCard
                            key={`budget-tab-${item.id}`}
                            title={item.name || 'Presupuesto'}
                            subtitle={[item.city, item.venue].filter(Boolean).join(' · ') || item.type}
                            status={item.budget_status || item.show_status}
                            date={item.event_date || item.created_at}
                            onClick={() => setSelectedBudget(item)}
                          />
                        ))}
                      </Section>
                    )}
                    {data.budgetItems.length > 0 && (
                      <Section title="Partidas como proveedor" icon={<DollarSign className="h-4 w-4" />} count={data.budgetItems.length}>
                        {data.budgetItems.map(item => (
                          <ItemCard key={item.id} title={item.name || item.description || 'Partida'} subtitle={item.budgets?.name} status={item.budgets?.status} date={item.created_at} onClick={() => navigateFromDashboard('/budgets')} />
                        ))}
                      </Section>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="bookings" className="space-y-2 m-0">
                {data.bookings.length === 0 ? <EmptyState label="bookings" /> : data.bookings.map(item => (
                  <ItemCard key={item.id} title={item.lugar || item.venue || 'Booking'} subtitle={item.artists?.name ? `${item.artists.name} · ${item.ciudad || ''}` : item.ciudad} status={item.estado} date={item.fecha} onClick={() => navigateFromDashboard(`/booking/${item.id}`)} />
                ))}
              </TabsContent>

              <TabsContent value="solicitudes" className="space-y-2 m-0">
                {data.solicitudes.length === 0 ? <EmptyState label="solicitudes" /> : data.solicitudes.map(item => (
                  <ItemCard key={item.id} title={item.title || item.subject || 'Solicitud'} subtitle={item.requester_name} status={item.status} date={item.created_at} onClick={() => navigateFromDashboard('/solicitudes')} />
                ))}
              </TabsContent>

              <TabsContent value="sync" className="space-y-2 m-0">
                {data.syncOffers.length === 0 ? <EmptyState label="sincronizaciones" /> : data.syncOffers.map(item => (
                  <ItemCard key={item.id} title={item.title || item.brand || 'Oferta Sync'} status={item.status} date={item.created_at} onClick={() => navigateFromDashboard('/sincronizaciones')} />
                ))}
              </TabsContent>

              <TabsContent value="proyectos" className="space-y-2 m-0">
                {data.projects.length === 0 ? <EmptyState label="proyectos" /> : data.projects.map(item => (
                  <ItemCard key={item.id} title={item.projects?.name || 'Proyecto'} subtitle={item.role_label} status={item.projects?.status} onClick={() => navigateFromDashboard(`/projects/${item.project_id}`)} />
                ))}
              </TabsContent>

              <TabsContent value="transacciones" className="space-y-2 m-0">
                {data.transactions.length === 0 ? <EmptyState label="transacciones" /> : data.transactions.map(item => (
                  <ItemCard key={item.id} title={item.description || 'Transacción'} subtitle={item.amount ? `${item.amount} ${item.currency || '€'}` : undefined} status={item.status} date={item.date || item.created_at} onClick={() => navigateFromDashboard('/finanzas')} />
                ))}
              </TabsContent>

              <TabsContent value="discografia" className="space-y-2 m-0">
                {data.releases.length === 0 ? <EmptyState label="discografía" /> : data.releases.map(item => (
                  <ItemCard key={`release-${item.id}`} title={item.title || 'Release'} subtitle={item.release_type} status={item.status} date={item.release_date || item.created_at} onClick={() => navigateFromDashboard(`/releases/${item.id}`)} />
                ))}
              </TabsContent>

              <TabsContent value="musica" className="space-y-2 m-0">
                {data.songSplits.length === 0 && data.trackCredits.length === 0 ? <EmptyState label="música" /> : (
                  <>
                    {data.songSplits.map(item => (
                      <ItemCard key={`split-${item.id}`} title={item.songs?.title || 'Canción'} subtitle={`Split: ${item.percentage || 0}%`} onClick={() => navigateFromDashboard('/royalties')} />
                    ))}
                    {data.trackCredits.map(item => (
                      <ItemCard key={`credit-${item.id}`} title={item.release_tracks?.title || 'Track'} subtitle={item.credit_role} onClick={() => navigateFromDashboard('/royalties')} />
                    ))}
                  </>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
      {selectedBudget && (
        <BudgetDetailsDialog
          open={!!selectedBudget}
          onOpenChange={(open) => { if (!open) setSelectedBudget(null); }}
          budget={selectedBudget}
          onUpdate={fetchAll}
        />
      )}
    </Dialog>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-semibold text-sm">{title}</h4>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-1.5 pl-6">{children}</div>
    </div>
  );
}
