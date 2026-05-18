import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Guitar, Music, Drum, Piano, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { InlineEditCell, InlineSelectCell } from '@/components/ui/inline-edit';
import { BudgetContactSelector } from '@/components/BudgetContactSelector';
import { supabase } from '@/integrations/supabase/client';

interface BacklineItem {
  id: string;
  category: string;
  instrument: string;
  model: string;
  provider: string;
  provider_contact_id?: string;
  confirmed: boolean;
}

interface VenueBackline {
  id: string;
  venueName: string;
  items: BacklineItem[];
}

interface ProductionBlockData {
  venues?: VenueBackline[];
}

interface ProductionBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  linkedBookings?: Array<{ id: string; lugar: string | null; ciudad: string | null }>;
  artistId?: string;
}

const categories = [
  { value: 'guitar', label: 'Guitarra', icon: Guitar },
  { value: 'bass', label: 'Bajo', icon: Guitar },
  { value: 'drums', label: 'Batería', icon: Drum },
  { value: 'keys', label: 'Teclados', icon: Piano },
  { value: 'other', label: 'Varios', icon: Music },
];

const getCategoryConfig = (cat: string) => categories.find(c => c.value === cat) || categories[categories.length - 1];

export function ProductionBlock({ data, onChange, linkedBookings, artistId }: ProductionBlockProps) {
  const blockData = data as ProductionBlockData;
  const incomingVenues = blockData.venues || [];

  const [localVenues, setLocalVenues] = useState<VenueBackline[]>(incomingVenues);
  const autoPopulatedRef = useRef(false);
  
  const lastSyncedRef = useRef<string>(JSON.stringify(incomingVenues));
  const debouncedVenues = useDebounce(localVenues, 500);

  useEffect(() => {
    const next = JSON.stringify(incomingVenues);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalVenues(incomingVenues);
    }
  }, [incomingVenues]);

  // Auto-populate venues from linked bookings when empty
  useEffect(() => {
    if (autoPopulatedRef.current) return;
    if (incomingVenues.length > 0 || localVenues.length > 0) return;
    if (!linkedBookings || linkedBookings.length === 0) return;

    autoPopulatedRef.current = true;
    const generated: VenueBackline[] = linkedBookings
      .filter(b => b.lugar || b.ciudad)
      .map(b => ({
        id: crypto.randomUUID(),
        venueName: [b.lugar, b.ciudad].filter(Boolean).join(' - '),
        items: [],
      }));

    if (generated.length > 0) {
      setLocalVenues(generated);
    }
  }, [linkedBookings, incomingVenues, localVenues.length]);

  useEffect(() => {
    const next = JSON.stringify(debouncedVenues);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, venues: debouncedVenues });
    }
  }, [debouncedVenues]);

  const addVenue = () => {
    const newVenue: VenueBackline = { 
      id: crypto.randomUUID(), 
      venueName: '', 
      items: [] 
    };
    setLocalVenues((prev) => [...prev, newVenue]);
  };

  const updateVenue = (venueId: string, field: keyof VenueBackline, value: unknown) => {
    setLocalVenues((prev) => 
      prev.map((v) => v.id === venueId ? { ...v, [field]: value } : v)
    );
  };

  const removeVenue = (id: string) => {
    setLocalVenues((prev) => prev.filter((v) => v.id !== id));
  };

  const addItem = (venueId: string) => {
    const newItem: BacklineItem = { 
      id: crypto.randomUUID(), 
      category: 'guitar', 
      instrument: '', 
      model: '', 
      provider: '', 
      provider_contact_id: undefined,
      confirmed: false 
    };
    setLocalVenues((prev) => 
      prev.map((v) => v.id === venueId ? { ...v, items: [...v.items, newItem] } : v)
    );
  };

  const updateItem = (venueId: string, itemId: string, field: keyof BacklineItem, value: unknown) => {
    setLocalVenues((prev) => 
      prev.map((v) => {
        if (v.id !== venueId) return v;
        return {
          ...v,
          items: v.items.map((item) => 
            item.id === itemId ? { ...item, [field]: value } : item
          )
        };
      })
    );
  };

  const handleProviderContactChange = async (venueId: string, itemId: string, contactId: string | null) => {
    if (!contactId) {
      updateItem(venueId, itemId, 'provider_contact_id', undefined);
      updateItem(venueId, itemId, 'provider', '');
      return;
    }

    // Resolve contact name
    const { data: contact } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', contactId)
      .single();

    setLocalVenues((prev) =>
      prev.map((v) => {
        if (v.id !== venueId) return v;
        return {
          ...v,
          items: v.items.map((item) =>
            item.id === itemId
              ? { ...item, provider_contact_id: contactId, provider: contact?.name || '' }
              : item
          ),
        };
      })
    );
  };

  const removeItem = (venueId: string, itemId: string) => {
    setLocalVenues((prev) => 
      prev.map((v) => v.id === venueId ? { ...v, items: v.items.filter(i => i.id !== itemId) } : v)
    );
  };

  return (
    <div className="space-y-4">
      {localVenues.length > 0 ? (
        <div className="space-y-4">
          {localVenues.map((venue) => (
            <Card key={venue.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <InlineEditCell
                      value={venue.venueName}
                      onChange={(v) => updateVenue(venue.id, 'venueName', v)}
                      placeholder="Nombre del venue"
                      className="font-semibold"
                    />
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => removeVenue(venue.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {venue.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[120px_1fr_1fr_1fr_80px_auto] gap-2 p-2 bg-muted/50 text-xs font-medium">
                      <div>CATEGORÍA</div>
                      <div>INSTRUMENTO</div>
                      <div>MODELO</div>
                      <div>PROVEEDOR</div>
                      <div>ESTADO</div>
                      <div></div>
                    </div>
                    <div className="divide-y">
                      {venue.items.map((item) => {
                        const cat = getCategoryConfig(item.category);
                        return (
                          <div 
                            key={item.id} 
                            className="grid grid-cols-[120px_1fr_1fr_1fr_80px_auto] gap-2 p-2 items-center hover:bg-muted/30 group/item"
                          >
                            <InlineSelectCell
                              value={item.category}
                              onChange={(v) => updateItem(venue.id, item.id, 'category', v)}
                              options={categories}
                              renderValue={(opt) => (
                                <Badge variant="outline" className="gap-1">
                                  {opt?.icon && <opt.icon className="w-3 h-3" />}
                                  {opt?.label || 'Seleccionar'}
                                </Badge>
                              )}
                            />
                            <InlineEditCell
                              value={item.instrument}
                              onChange={(v) => updateItem(venue.id, item.id, 'instrument', v)}
                              placeholder="Instrumento"
                              className="font-medium"
                            />
                            <InlineEditCell
                              value={item.model}
                              onChange={(v) => updateItem(venue.id, item.id, 'model', v)}
                              placeholder="Modelo"
                              className="text-muted-foreground"
                            />
                            <BudgetContactSelector
                              value={item.provider_contact_id || undefined}
                              onValueChange={(contactId) => handleProviderContactChange(venue.id, item.id, contactId)}
                              compact={true}
                              className="text-xs"
                            />
                            <div 
                              className="cursor-pointer"
                              onClick={() => updateItem(venue.id, item.id, 'confirmed', !item.confirmed)}
                            >
                              {item.confirmed ? (
                                <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                                  <Check className="w-3 h-3" />
                                  Confirmado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Pendiente
                                </Badge>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100 transition-opacity" 
                              onClick={() => removeItem(venue.id, item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 mt-2" 
                  onClick={() => addItem(venue.id)}
                >
                  <Plus className="w-3 h-3" />
                  Añadir Item
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
          No hay venues configurados
        </div>
      )}
      <Button onClick={addVenue} variant="outline" className="gap-2">
        <Plus className="w-4 h-4" />
        Añadir Venue/Ciudad
      </Button>
    </div>
  );
}
