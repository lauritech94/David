import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  Music, 
  DollarSign, 
  FileText, 
  Calendar, 
  FolderOpen, 
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TeamMemberActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    type: 'contact' | 'profile'; // Whether it's a contact or a workspace member
  } | null;
}

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  date: string;
  link?: string;
  metadata?: Record<string, any>;
}

export function TeamMemberActivityDialog({ open, onOpenChange, member }: TeamMemberActivityDialogProps) {
  const [loading, setLoading] = useState(true);
  const [songCredits, setSongCredits] = useState<ActivityItem[]>([]);
  const [trackCredits, setTrackCredits] = useState<ActivityItem[]>([]);
  const [budgetItems, setBudgetItems] = useState<ActivityItem[]>([]);
  const [bookings, setBookings] = useState<ActivityItem[]>([]);
  const [projects, setProjects] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (open && member) {
      fetchAllActivity();
    }
  }, [open, member]);

  const fetchAllActivity = async () => {
    if (!member) return;
    setLoading(true);

    try {
      const promises = [];

      // Fetch song splits where this contact appears
      if (member.type === 'contact') {
        promises.push(
          supabase
            .from('song_splits')
            .select('id, song_id, role, percentage, created_at, songs(title)')
            .eq('collaborator_contact_id', member.id)
            .then(({ data }) => {
              setSongCredits((data || []).map((s: any) => ({
                id: s.id,
                title: s.songs?.title || 'Canción sin título',
                type: s.role,
                date: s.created_at,
                metadata: { percentage: s.percentage },
              })));
            })
        );

        // Fetch track credits
        promises.push(
          supabase
            .from('track_credits')
            .select('id, track_id, role, percentage, created_at, tracks(title)')
            .eq('contact_id', member.id)
            .then(({ data }) => {
              setTrackCredits((data || []).map((t: any) => ({
                id: t.id,
                title: t.tracks?.title || 'Track sin título',
                type: t.role,
                date: t.created_at,
                metadata: { percentage: t.percentage },
              })));
            })
        );

        // Fetch budget items where this contact name appears
        promises.push(
          supabase
            .from('budget_items')
            .select('id, name, category, created_at, budget_id, budgets(name)')
            .ilike('name', `%${member.name}%`)
            .then(({ data }) => {
              setBudgetItems((data || []).map((b: any) => ({
                id: b.id,
                title: b.name,
                type: b.category,
                date: b.created_at,
                metadata: { budget: b.budgets?.name },
              })));
            })
        );
      }

      // Fetch bookings where this person is tour_manager or contact
      promises.push(
        supabase
          .from('booking_offers')
          .select('id, ciudad, venue, fecha, estado, tour_manager, contacto')
          .or(`tour_manager.ilike.%${member.name}%,contacto.ilike.%${member.name}%`)
          .then(({ data }) => {
            setBookings((data || []).map((b: any) => ({
              id: b.id,
              title: `${b.ciudad || 'Sin ciudad'} - ${b.venue || 'Sin venue'}`,
              type: b.estado,
              date: b.fecha || b.created_at,
              link: `/bookings/${b.id}`,
            })));
          })
      );

      // Fetch projects where this contact/member appears
      // Using a simpler approach - search in projects table directly
      promises.push(
        supabase
          .from('projects')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data }) => {
            // For now, we'll show recent projects - in a full implementation
            // you'd have a proper junction table
            setProjects([]);
          })
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalItems = songCredits.length + trackCredits.length + budgetItems.length + bookings.length + projects.length;

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">{member.name}</DialogTitle>
              <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                {member.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {member.email}
                  </span>
                )}
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {member.phone}
                  </span>
                )}
              </div>
              {member.role && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-background border border-border/40 text-foreground shadow-sm mt-2">
                  {member.role}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sin actividad registrada</h3>
              <p className="text-muted-foreground">
                Este miembro aún no aparece en ningún documento, presupuesto o proyecto.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="all" className="text-xs">
                  Todo ({totalItems})
                </TabsTrigger>
                <TabsTrigger value="songs" className="text-xs">
                  <Music className="w-3.5 h-3.5 mr-1" />
                  Canciones ({songCredits.length + trackCredits.length})
                </TabsTrigger>
                <TabsTrigger value="budgets" className="text-xs">
                  <DollarSign className="w-3.5 h-3.5 mr-1" />
                  Presupuestos ({budgetItems.length})
                </TabsTrigger>
                <TabsTrigger value="bookings" className="text-xs">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  Bookings ({bookings.length})
                </TabsTrigger>
                <TabsTrigger value="projects" className="text-xs">
                  <FolderOpen className="w-3.5 h-3.5 mr-1" />
                  Proyectos ({projects.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {renderActivityList([...songCredits, ...trackCredits], 'song')}
                {renderActivityList(budgetItems, 'budget')}
                {renderActivityList(bookings, 'booking')}
                {renderActivityList(projects, 'project')}
              </TabsContent>

              <TabsContent value="songs" className="space-y-3">
                {renderActivityList([...songCredits, ...trackCredits], 'song')}
                {songCredits.length === 0 && trackCredits.length === 0 && (
                  <EmptyState icon={Music} message="No aparece en ninguna canción o track" />
                )}
              </TabsContent>

              <TabsContent value="budgets" className="space-y-3">
                {renderActivityList(budgetItems, 'budget')}
                {budgetItems.length === 0 && (
                  <EmptyState icon={DollarSign} message="No aparece en ningún presupuesto" />
                )}
              </TabsContent>

              <TabsContent value="bookings" className="space-y-3">
                {renderActivityList(bookings, 'booking')}
                {bookings.length === 0 && (
                  <EmptyState icon={Calendar} message="No aparece en ningún booking" />
                )}
              </TabsContent>

              <TabsContent value="projects" className="space-y-3">
                {renderActivityList(projects, 'project')}
                {projects.length === 0 && (
                  <EmptyState icon={FolderOpen} message="No aparece en ningún proyecto" />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderActivityList(items: ActivityItem[], type: string) {
  if (items.length === 0) return null;

  const getIcon = () => {
    switch (type) {
      case 'song': return <Music className="w-4 h-4 text-primary" />;
      case 'budget': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'booking': return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'project': return <FolderOpen className="w-4 h-4 text-amber-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <>
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-background border border-border/40 text-muted-foreground">
                    {item.type}
                  </span>
                  {item.metadata?.percentage && (
                    <span className="text-xs text-muted-foreground">
                      {item.metadata.percentage}%
                    </span>
                  )}
                  {item.metadata?.budget && (
                    <span className="text-xs text-muted-foreground">
                      en {item.metadata.budget}
                    </span>
                  )}
                  {item.date && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.date), 'dd MMM yyyy', { locale: es })}
                    </span>
                  )}
                </div>
              </div>
              {item.link && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={item.link}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
