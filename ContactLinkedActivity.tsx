import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Music, DollarSign, Calendar, FileText, ChevronRight, ExternalLink, User
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  link?: string;
}

interface ContactLinkedActivityProps {
  contactId: string;
  contactName: string;
  open: boolean;
}

export function ContactLinkedActivity({ contactId, contactName, open }: ContactLinkedActivityProps) {
  const [loading, setLoading] = useState(true);
  const [songCredits, setSongCredits] = useState<ActivityItem[]>([]);
  const [budgetItems, setBudgetItems] = useState<ActivityItem[]>([]);
  const [bookings, setBookings] = useState<ActivityItem[]>([]);
  const [solicitudes, setSolicitudes] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (open && contactId) {
      fetchAll();
    }
  }, [open, contactId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        // Song splits
        supabase
          .from('song_splits')
          .select('id, song_id, role, percentage, created_at, songs(title)')
          .eq('collaborator_contact_id', contactId)
          .then(({ data }) => {
            const items: ActivityItem[] = (data || []).map((s: any) => ({
              id: s.id,
              title: s.songs?.title || 'Canción sin título',
              subtitle: `${s.role}${s.percentage ? ` · ${s.percentage}%` : ''}`,
              date: s.created_at,
              link: '/royalties',
            }));
            // Also fetch track_credits
            return supabase
              .from('track_credits')
              .select('id, role, percentage, created_at, tracks(title)')
              .eq('contact_id', contactId)
              .then(({ data: tc }) => {
                const tcItems: ActivityItem[] = (tc || []).map((t: any) => ({
                  id: t.id,
                  title: t.tracks?.title || 'Track sin título',
                  subtitle: `${t.role}${t.percentage ? ` · ${t.percentage}%` : ''}`,
                  date: t.created_at,
                  link: '/releases',
                }));
                setSongCredits([...items, ...tcItems]);
              });
          }),

        // Budget items by contact_id
        supabase
          .from('budget_items')
          .select('id, name, category, created_at, budget_id, budgets(name)')
          .eq('contact_id', contactId)
          .then(({ data }) => {
            setBudgetItems((data || []).map((b: any) => ({
              id: b.id,
              title: b.name,
              subtitle: b.budgets?.name ? `en ${b.budgets.name}` : b.category,
              date: b.created_at,
              link: b.budget_id ? `/budgets?budgetId=${b.budget_id}` : undefined,
            })));
          }),

        // Bookings by name
        supabase
          .from('booking_offers')
          .select('id, ciudad, venue, fecha, estado')
          .or(`tour_manager.ilike.%${contactName}%,contacto.ilike.%${contactName}%`)
          .then(({ data }) => {
            setBookings((data || []).map((b: any) => ({
              id: b.id,
              title: `${b.ciudad || 'Sin ciudad'} - ${b.venue || 'Sin venue'}`,
              subtitle: b.estado,
              date: b.fecha,
              link: `/bookings/${b.id}`,
            })));
          }),

        // Solicitudes
        supabase
          .from('solicitudes')
          .select('id, nombre_solicitante, estado, created_at')
          .or(`contact_id.eq.${contactId},promotor_contact_id.eq.${contactId}`)
          .then(({ data }) => {
            setSolicitudes((data || []).map((s: any) => ({
              id: s.id,
              title: s.nombre_solicitante || 'Solicitud',
              subtitle: s.estado,
              date: s.created_at,
              link: `/solicitudes?id=${s.id}`,
            })));
          }),
      ]);
    } catch (err) {
      console.error('Error fetching linked activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalItems = songCredits.length + budgetItems.length + bookings.length + solicitudes.length;

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Actividad vinculada</h3>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Actividad vinculada</h3>
        <div className="text-center py-6 text-muted-foreground">
          <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sin actividad vinculada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Actividad vinculada ({totalItems})
      </h3>

      <ActivitySection
        icon={Music}
        label="Canciones / Créditos"
        items={songCredits}
        color="text-primary"
      />
      <ActivitySection
        icon={DollarSign}
        label="Presupuestos"
        items={budgetItems}
        color="text-green-600"
      />
      <ActivitySection
        icon={Calendar}
        label="Bookings"
        items={bookings}
        color="text-blue-600"
      />
      <ActivitySection
        icon={FileText}
        label="Solicitudes"
        items={solicitudes}
        color="text-amber-600"
      />
    </div>
  );
}

function ActivitySection({
  icon: Icon,
  label,
  items,
  color,
}: {
  icon: React.ElementType;
  label: string;
  items: ActivityItem[];
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm font-medium flex-1">{label}</span>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1.5 pl-4 pt-1">
        {items.map(item => {
          const Wrapper = item.link ? 'a' : 'div';
          return (
            <Card 
              key={item.id} 
              className={`hover:shadow-sm transition-shadow ${item.link ? 'cursor-pointer hover:bg-muted/30' : ''}`}
              onClick={() => item.link && navigate(item.link)}
            >
              <CardContent className="py-2 px-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.subtitle && <span>{item.subtitle}</span>}
                    {item.date && (
                      <span>{format(new Date(item.date), 'dd MMM yyyy', { locale: es })}</span>
                    )}
                  </div>
                </div>
                {item.link && (
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
