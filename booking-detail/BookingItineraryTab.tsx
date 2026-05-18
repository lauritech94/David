import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Plane, 
  Hotel, 
  Car, 
  Music,
  Clock,
  MapPin,
  Trash2,
  GripVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';

interface ItineraryItem {
  id: string;
  booking_id: string;
  item_type: 'flight' | 'hotel' | 'transport' | 'show' | 'other';
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  cost?: number;
  handler?: string;
  payer?: string;
  sort_order: number;
  created_at: string;
}

interface BookingItineraryTabProps {
  bookingId: string;
  eventDate?: string;
}

const ITEM_TYPES = [
  { value: 'flight', label: 'Vuelo', icon: Plane, color: 'bg-blue-500' },
  { value: 'hotel', label: 'Hotel', icon: Hotel, color: 'bg-purple-500' },
  { value: 'transport', label: 'Transporte', icon: Car, color: 'bg-green-500' },
  { value: 'show', label: 'Show', icon: Music, color: 'bg-primary' },
  { value: 'other', label: 'Otro', icon: Clock, color: 'bg-gray-500' },
];

const HANDLERS_PAYERS = [
  { value: 'agency', label: 'Agencia' },
  { value: 'promoter', label: 'Promotor' },
  { value: 'artist', label: 'Artista' },
];

export function BookingItineraryTab({ bookingId, eventDate }: BookingItineraryTabProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    item_type: 'flight' as const,
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    cost: 0,
    handler: 'agency',
    payer: 'promoter',
  });

  useEffect(() => {
    fetchItems();
  }, [bookingId]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('booking_itinerary')
        .select('*')
        .eq('booking_id', bookingId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setItems((data || []) as ItineraryItem[]);
    } catch (error) {
      console.error('Error fetching itinerary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title.trim()) {
      toast({
        title: "Error",
        description: "El título es obligatorio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('booking_itinerary')
        .insert({
          booking_id: bookingId,
          ...newItem,
          sort_order: items.length,
          created_by: profile?.user_id,
        });

      if (error) throw error;

      toast({
        title: "Ítem añadido",
        description: "El ítem se ha añadido al itinerario.",
      });

      setShowAddDialog(false);
      setNewItem({
        item_type: 'flight',
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        location: '',
        cost: 0,
        handler: 'agency',
        payer: 'promoter',
      });
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el ítem.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('booking_itinerary')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Ítem eliminado",
        description: "El ítem se ha eliminado del itinerario.",
      });

      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el ítem.",
        variant: "destructive",
      });
    }
  };

  const getItemConfig = (type: string) => {
    return ITEM_TYPES.find(t => t.value === type) || ITEM_TYPES[4];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            Itinerario
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Timeline de vuelos, hoteles, transportes y horarios del show
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Ítem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Añadir al Itinerario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newItem.item_type}
                  onValueChange={(value: any) => setNewItem({ ...newItem, item_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="Ej: Vuelo Madrid - Barcelona"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Inicio</Label>
                  <Input
                    type="time"
                    value={newItem.start_time}
                    onChange={(e) => setNewItem({ ...newItem, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fin</Label>
                  <Input
                    type="time"
                    value={newItem.end_time}
                    onChange={(e) => setNewItem({ ...newItem, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  placeholder="Dirección o lugar"
                />
              </div>

              <div className="space-y-2">
                <Label>Coste (€)</Label>
                <Input
                  type="number"
                  value={newItem.cost}
                  onChange={(e) => setNewItem({ ...newItem, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Handler (Quién gestiona)</Label>
                  <Select
                    value={newItem.handler}
                    onValueChange={(value) => setNewItem({ ...newItem, handler: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HANDLERS_PAYERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payer (Quién paga)</Label>
                  <Select
                    value={newItem.payer}
                    onValueChange={(value) => setNewItem({ ...newItem, payer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HANDLERS_PAYERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddItem}>
                  Añadir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={<Plane className="w-10 h-10 text-muted-foreground" />}
            title="Sin itinerario"
            description="Añade vuelos, hoteles, transportes y horarios del show"
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const config = getItemConfig(item.item_type);
              const Icon = config.icon;
              
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <div className={`p-2 ${config.color} rounded-lg text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {item.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.start_time}
                          {item.end_time && ` - ${item.end_time}`}
                        </span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    {item.cost && item.cost > 0 && (
                      <p className="font-medium">{item.cost.toLocaleString()}€</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.handler && (
                        <Badge variant="secondary" className="text-xs">
                          Handler: {HANDLERS_PAYERS.find(h => h.value === item.handler)?.label}
                        </Badge>
                      )}
                      {item.payer && (
                        <Badge variant="outline" className="text-xs">
                          Payer: {HANDLERS_PAYERS.find(p => p.value === item.payer)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
