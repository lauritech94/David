import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, Phone, Mail, MapPin, ExternalLink, Hotel, Utensils, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDebounce } from '@/hooks/useDebounce';
import { TeamMemberSelector } from './TeamMemberSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HotelData {
  id: string;
  name: string;
  address: string;
  mapLink: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  breakfastTime: string;
}

interface RoomType {
  id: string;
  name: string;
  capacity: number | null;
}

interface RoomAssignment {
  id: string;
  passenger: string;
  passengerIds?: string[];
  roomType: string;
  capacityAcknowledged?: boolean;
}

interface HospitalityBlockData {
  hotels?: HotelData[];
  roomingList?: RoomAssignment[];
  dietNotes?: string;
}

export interface HospitalityBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  artistId?: string | null;
  bookingId?: string | null;
}

export function HospitalityBlock({ data, onChange, artistId, bookingId }: HospitalityBlockProps) {
  const blockData = data as HospitalityBlockData;
  const incomingHotels = blockData.hotels || [];
  const incomingRoomingList = blockData.roomingList || [];
  const incomingDietNotes = blockData.dietNotes || '';

  const [localHotels, setLocalHotels] = useState<HotelData[]>(incomingHotels);
  const [localRoomingList, setLocalRoomingList] = useState<RoomAssignment[]>(incomingRoomingList);
  const [localDietNotes, setLocalDietNotes] = useState(incomingDietNotes);
  
  const [editingHotel, setEditingHotel] = useState<HotelData | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomAssignment | null>(null);
  const [showDietEdit, setShowDietEdit] = useState(false);
  
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [newRoomTypeName, setNewRoomTypeName] = useState('');
  const [newRoomTypeCapacity, setNewRoomTypeCapacity] = useState(1);
  const [showAddRoomType, setShowAddRoomType] = useState(false);
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});

  const lastSyncedRef = useRef<string>(
    JSON.stringify({ hotels: incomingHotels, roomingList: incomingRoomingList, dietNotes: incomingDietNotes })
  );
  const debouncedHotels = useDebounce(localHotels, 500);
  const debouncedRoomingList = useDebounce(localRoomingList, 500);
  const debouncedDietNotes = useDebounce(localDietNotes, 500);

  useEffect(() => {
    const fetchRoomTypes = async () => {
      const { data: types, error } = await supabase
        .from('custom_room_types')
        .select('id, name, capacity')
        .order('name');
      
      if (!error && types) {
        setRoomTypes(types);
      }
    };
    fetchRoomTypes();
  }, []);

  // Fetch guest names based on passengerIds in roomingList
  useEffect(() => {
    const fetchGuestNames = async () => {
      const allPassengerIds = localRoomingList
        .flatMap(r => r.passengerIds || [])
        .filter(id => id && !guestNames[id]);
      
      if (allPassengerIds.length === 0) return;

      const uniqueIds = [...new Set(allPassengerIds)];
      
      // Fetch contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, stage_name')
        .in('id', uniqueIds);
      
      if (contacts) {
        const newNames: Record<string, string> = { ...guestNames };
        contacts.forEach(c => {
          newNames[c.id] = c.stage_name || c.name;
        });
        
        // Check for artists too
        const foundIds = new Set(contacts.map(c => c.id));
        const remainingIds = uniqueIds.filter(id => !foundIds.has(id));
        
        if (remainingIds.length > 0) {
          const { data: artists } = await supabase
            .from('artists')
            .select('id, name, stage_name')
            .in('id', remainingIds);
          
          artists?.forEach(a => {
            newNames[a.id] = a.stage_name || a.name;
          });
        }
        
        setGuestNames(newNames);
      }
    };
    
    fetchGuestNames();
  }, [localRoomingList]);

  useEffect(() => {
    const next = JSON.stringify({ hotels: incomingHotels, roomingList: incomingRoomingList, dietNotes: incomingDietNotes });
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalHotels(incomingHotels);
      setLocalRoomingList(incomingRoomingList);
      setLocalDietNotes(incomingDietNotes);
    }
  }, [incomingHotels, incomingRoomingList, incomingDietNotes]);

  useEffect(() => {
    const next = JSON.stringify({ hotels: debouncedHotels, roomingList: debouncedRoomingList, dietNotes: debouncedDietNotes });
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, hotels: debouncedHotels, roomingList: debouncedRoomingList, dietNotes: debouncedDietNotes });
    }
  }, [debouncedHotels, debouncedRoomingList, debouncedDietNotes]);

  const addHotel = () => {
    const newHotel: HotelData = {
      id: crypto.randomUUID(),
      name: '',
      address: '',
      mapLink: '',
      phone: '',
      checkIn: '',
      checkOut: '',
      breakfastTime: '',
    };
    setEditingHotel(newHotel);
  };

  const saveHotel = () => {
    if (!editingHotel) return;
    setLocalHotels((prev) => {
      const existingIndex = prev.findIndex(h => h.id === editingHotel.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = editingHotel;
        return updated;
      }
      return [...prev, editingHotel];
    });
    setEditingHotel(null);
  };

  const removeHotel = (hotelId: string) => {
    setLocalHotels((prev) => prev.filter((h) => h.id !== hotelId));
  };

  const addRoomAssignment = () => {
    const defaultType = roomTypes.find(t => t.name.toLowerCase() === 'single') || roomTypes[0];
    const newAssignment: RoomAssignment = {
      id: crypto.randomUUID(),
      passenger: '',
      passengerIds: [],
      roomType: defaultType?.name || 'Single',
    };
    setEditingRoom(newAssignment);
  };

  const saveRoom = () => {
    if (!editingRoom) return;
    setLocalRoomingList((prev) => {
      const existingIndex = prev.findIndex(r => r.id === editingRoom.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = editingRoom;
        return updated;
      }
      return [...prev, editingRoom];
    });
    setEditingRoom(null);
  };

  const removeRoomAssignment = (assignmentId: string) => {
    setLocalRoomingList((prev) => prev.filter((r) => r.id !== assignmentId));
  };

  const handleAddRoomType = async () => {
    if (!newRoomTypeName.trim()) return;
    
    const { data: newType, error } = await supabase
      .from('custom_room_types')
      .insert({
        name: newRoomTypeName.trim(),
        capacity: newRoomTypeCapacity,
        created_by: 'user'
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Error al crear tipo de habitación');
      return;
    }
    
    if (newType) {
      setRoomTypes(prev => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)));
      setNewRoomTypeName('');
      setNewRoomTypeCapacity(1);
      setShowAddRoomType(false);
      toast.success('Tipo de habitación creado');
    }
  };

  const getCapacityWarning = (assignment: RoomAssignment): string | null => {
    const roomType = roomTypes.find(t => t.name === assignment.roomType);
    if (!roomType || !assignment.passengerIds) return null;
    if (roomType.capacity === null) return null;
    
    const guestCount = assignment.passengerIds.length;
    if (guestCount === 0) return null;
    
    if (guestCount > roomType.capacity) {
      return `Capacidad: ${roomType.capacity}, asignados: ${guestCount}`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Hotels Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <Hotel className="w-4 h-4" />
            Hoteles
          </h4>
          <Button onClick={addHotel} variant="outline" size="sm" className="gap-1">
            <Plus className="w-3 h-3" />
            Hotel
          </Button>
        </div>
        
        {localHotels.length > 0 ? (
          <div className="grid gap-3">
            {localHotels.map((hotel) => (
              <Card key={hotel.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h5 className="font-semibold">{hotel.name || 'Sin nombre'}</h5>
                      {hotel.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {hotel.address}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {hotel.checkIn && <span>Check-in: {hotel.checkIn}</span>}
                        {hotel.checkOut && <span>Check-out: {hotel.checkOut}</span>}
                        {hotel.breakfastTime && <span>Desayuno: {hotel.breakfastTime}</span>}
                      </div>
                      {hotel.phone && (
                        <p className="text-sm flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {hotel.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {hotel.mapLink && (
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                          <a href={hotel.mapLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingHotel({ ...hotel })}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeHotel(hotel.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground">
            No hay hoteles configurados
          </div>
        )}
      </div>

      {/* Rooming List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Rooming List</h4>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowAddRoomType(!showAddRoomType)} 
              variant="ghost" 
              size="sm"
              className="text-xs"
            >
              + Tipo
            </Button>
            <Button onClick={addRoomAssignment} variant="outline" size="sm" className="gap-1">
              <Plus className="w-3 h-3" />
              Habitación
            </Button>
          </div>
        </div>

        {showAddRoomType && (
          <Card className="p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Nombre del tipo</Label>
                <Input
                  value={newRoomTypeName}
                  onChange={(e) => setNewRoomTypeName(e.target.value)}
                  placeholder="Ej: Junior Suite"
                  className="h-8"
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Capacidad</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newRoomTypeCapacity}
                  onChange={(e) => setNewRoomTypeCapacity(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <Button onClick={handleAddRoomType} size="sm" className="h-8">Añadir</Button>
              <Button onClick={() => setShowAddRoomType(false)} variant="ghost" size="sm" className="h-8">Cancelar</Button>
            </div>
          </Card>
        )}

        {localRoomingList.length > 0 ? (
          <div className="grid gap-2">
            {localRoomingList.map((assignment) => {
              const warning = getCapacityWarning(assignment);
              const guestNamesList = (assignment.passengerIds || [])
                .map(id => guestNames[id])
                .filter(Boolean);
              
              return (
                <div
                  key={assignment.id}
                  className="border rounded-lg p-3 flex items-center justify-between group hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline">
                      {assignment.roomType}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {assignment.passengerIds?.length || 0} persona{(assignment.passengerIds?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    {guestNamesList.length > 0 && (
                      <span className="text-sm font-medium">
                        {guestNamesList.join(', ')}
                      </span>
                    )}
                    {warning && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {warning}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingRoom({ ...assignment })}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeRoomAssignment(assignment.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground">
            No hay habitaciones asignadas
          </div>
        )}
      </div>

      {/* Diet Notes */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-muted-foreground" />
            <div>
              <h4 className="font-medium">Notas Dietéticas</h4>
              {localDietNotes ? (
                <p className="text-sm text-muted-foreground mt-1">{localDietNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1 italic">Sin notas</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowDietEdit(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Edit Hotel Dialog */}
      <Dialog open={!!editingHotel} onOpenChange={(open) => !open && setEditingHotel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingHotel && localHotels.some(h => h.id === editingHotel.id) ? 'Editar Hotel' : 'Nuevo Hotel'}
            </DialogTitle>
          </DialogHeader>
          {editingHotel && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre del hotel</Label>
                <Input
                  value={editingHotel.name}
                  onChange={(e) => setEditingHotel({ ...editingHotel, name: e.target.value })}
                  placeholder="Hotel Example"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={editingHotel.address}
                  onChange={(e) => setEditingHotel({ ...editingHotel, address: e.target.value })}
                  placeholder="Calle, número, ciudad"
                />
              </div>
              <div className="space-y-2">
                <Label>Link Google Maps</Label>
                <Input
                  value={editingHotel.mapLink}
                  onChange={(e) => setEditingHotel({ ...editingHotel, mapLink: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={editingHotel.phone}
                  onChange={(e) => setEditingHotel({ ...editingHotel, phone: e.target.value })}
                  placeholder="+34 XXX XXX XXX"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Check-in</Label>
                  <Input
                    type="time"
                    value={editingHotel.checkIn}
                    onChange={(e) => setEditingHotel({ ...editingHotel, checkIn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-out</Label>
                  <Input
                    type="time"
                    value={editingHotel.checkOut}
                    onChange={(e) => setEditingHotel({ ...editingHotel, checkOut: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desayuno</Label>
                  <Input
                    value={editingHotel.breakfastTime}
                    onChange={(e) => setEditingHotel({ ...editingHotel, breakfastTime: e.target.value })}
                    placeholder="7:00-10:30"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHotel(null)}>Cancelar</Button>
            <Button onClick={saveHotel}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom && localRoomingList.some(r => r.id === editingRoom.id) ? 'Editar Habitación' : 'Nueva Habitación'}
            </DialogTitle>
          </DialogHeader>
          {editingRoom && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de habitación</Label>
                <Select
                  value={editingRoom.roomType}
                  onValueChange={(val) => setEditingRoom({ ...editingRoom, roomType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name}{t.capacity !== null ? ` (${t.capacity}p)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Huéspedes</Label>
                <TeamMemberSelector
                  artistId={artistId}
                  bookingId={bookingId}
                  value={editingRoom.passengerIds || []}
                  onValueChange={(ids) => setEditingRoom({ ...editingRoom, passengerIds: ids })}
                  placeholder="Seleccionar huéspedes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoom(null)}>Cancelar</Button>
            <Button onClick={saveRoom}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Diet Notes Dialog */}
      <Dialog open={showDietEdit} onOpenChange={setShowDietEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notas Dietéticas</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={localDietNotes}
              onChange={(e) => setLocalDietNotes(e.target.value)}
              placeholder="Alergias, preferencias alimenticias, etc."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDietEdit(false)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
