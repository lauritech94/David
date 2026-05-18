import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Plane, Train, Bus, Car, Pencil, MapPin, Clock, Briefcase, User, Info } from 'lucide-react';
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
import { useDebounce } from '@/hooks/useDebounce';
import { TeamMemberSelector } from './TeamMemberSelector';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export interface TravelTrip {
  id: string;
  date: string;
  medium: 'plane' | 'train' | 'bus' | 'car';
  serviceNumber: string;
  pnr: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  passengers: string[];
  passengerIds?: string[];
  luggagePolicy?: string;
}

interface TravelBlockData {
  trips?: TravelTrip[];
  luggagePolicy?: string;
  selfArranged?: boolean;
  selfArrangedNote?: string;
}

export interface TravelBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  tourDates?: string[];
  bookingInfo?: {
    eventDate?: string;
  };
  artistId?: string | null;
  bookingId?: string | null;
}

const mediumOptions = [
  { value: 'plane', label: 'Avión', icon: Plane, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'train', label: 'Tren', icon: Train, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'bus', label: 'Bus', icon: Bus, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'car', label: 'Coche', icon: Car, color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const getMediumConfig = (medium: string) => {
  return mediumOptions.find(m => m.value === medium) || mediumOptions[0];
};

export function TravelBlock({ data, onChange, tourDates, bookingInfo, artistId, bookingId }: TravelBlockProps) {
  const blockData = data as TravelBlockData;
  const incomingTrips = blockData.trips || [];
  const incomingLuggagePolicy = blockData.luggagePolicy || '';
  const incomingSelfArranged = blockData.selfArranged || false;
  const incomingSelfArrangedNote = blockData.selfArrangedNote || 'Cada miembro del equipo debe llegar al venue por sus propios medios. Si alguien necesita transporte adicional, contactar directamente con el equipo para valorar opciones.';

  const [localTrips, setLocalTrips] = useState<TravelTrip[]>(incomingTrips);
  const [localLuggagePolicy, setLocalLuggagePolicy] = useState(incomingLuggagePolicy);
  const [localSelfArranged, setLocalSelfArranged] = useState(incomingSelfArranged);
  const [localSelfArrangedNote, setLocalSelfArrangedNote] = useState(incomingSelfArrangedNote);
  const [editingTrip, setEditingTrip] = useState<TravelTrip | null>(null);
  const [showLuggageEdit, setShowLuggageEdit] = useState(false);
  const [showSelfArrangedEdit, setShowSelfArrangedEdit] = useState(false);
  const [passengerNames, setPassengerNames] = useState<Record<string, string>>({});

  const lastSyncedRef = useRef<string>(JSON.stringify({ trips: incomingTrips, luggagePolicy: incomingLuggagePolicy, selfArranged: incomingSelfArranged, selfArrangedNote: incomingSelfArrangedNote }));
  const debouncedTrips = useDebounce(localTrips, 500);
  const debouncedLuggagePolicy = useDebounce(localLuggagePolicy, 500);
  const debouncedSelfArranged = useDebounce(localSelfArranged, 300);
  const debouncedSelfArrangedNote = useDebounce(localSelfArrangedNote, 500);

  const getDefaultDate = (): string => {
    if (tourDates && tourDates.length > 0) return [...tourDates].sort()[0];
    if (bookingInfo?.eventDate) return bookingInfo.eventDate;
    return '';
  };

  // Collect all passenger IDs and fetch their names
  const allPassengerIds = useMemo(() => {
    const ids = new Set<string>();
    localTrips.forEach(trip => {
      trip.passengerIds?.forEach(id => ids.add(id));
    });
    return Array.from(ids);
  }, [localTrips]);

  useEffect(() => {
    const fetchPassengerNames = async () => {
      if (allPassengerIds.length === 0) return;
      
      const names: Record<string, string> = {};
      
      // Fetch from contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, stage_name')
        .in('id', allPassengerIds);
      
      contacts?.forEach(c => {
        names[c.id] = c.stage_name || c.name;
      });

      // Fetch from artists for any missing
      const contactIds = new Set(contacts?.map(c => c.id) || []);
      const missingIds = allPassengerIds.filter(id => !contactIds.has(id));
      
      if (missingIds.length > 0) {
        const { data: artists } = await supabase
          .from('artists')
          .select('id, name, stage_name')
          .in('id', missingIds);
        
        artists?.forEach(a => {
          names[a.id] = a.stage_name || a.name;
        });
      }

      setPassengerNames(names);
    };

    fetchPassengerNames();
  }, [allPassengerIds]);

  useEffect(() => {
    const next = JSON.stringify({ trips: incomingTrips, luggagePolicy: incomingLuggagePolicy, selfArranged: incomingSelfArranged, selfArrangedNote: incomingSelfArrangedNote });
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalTrips(incomingTrips);
      setLocalLuggagePolicy(incomingLuggagePolicy);
      setLocalSelfArranged(incomingSelfArranged);
      setLocalSelfArrangedNote(incomingSelfArrangedNote);
    }
  }, [incomingTrips, incomingLuggagePolicy, incomingSelfArranged, incomingSelfArrangedNote]);

  useEffect(() => {
    const next = JSON.stringify({ trips: debouncedTrips, luggagePolicy: debouncedLuggagePolicy, selfArranged: debouncedSelfArranged, selfArrangedNote: debouncedSelfArrangedNote });
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, trips: debouncedTrips, luggagePolicy: debouncedLuggagePolicy, selfArranged: debouncedSelfArranged, selfArrangedNote: debouncedSelfArrangedNote });
    }
  }, [debouncedTrips, debouncedLuggagePolicy, debouncedSelfArranged, debouncedSelfArrangedNote]);

  const sortTripsByDate = (trips: TravelTrip[]): TravelTrip[] => {
    return [...trips].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      if (!a.departureTime && !b.departureTime) return 0;
      if (!a.departureTime) return 1;
      if (!b.departureTime) return -1;
      return a.departureTime.localeCompare(b.departureTime);
    });
  };

  const addTrip = () => {
    const newTrip: TravelTrip = {
      id: crypto.randomUUID(),
      date: getDefaultDate(),
      medium: 'plane',
      serviceNumber: '',
      pnr: '',
      origin: '',
      destination: '',
      departureTime: '',
      arrivalTime: '',
      passengers: [],
      passengerIds: [],
      luggagePolicy: '',
    };
    setEditingTrip(newTrip);
  };

  const saveTrip = () => {
    if (!editingTrip) return;
    
    setLocalTrips((prev) => {
      const existingIndex = prev.findIndex(t => t.id === editingTrip.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = editingTrip;
        return sortTripsByDate(updated);
      }
      return sortTripsByDate([...prev, editingTrip]);
    });
    setEditingTrip(null);
  };

  const removeTrip = (tripId: string) => {
    setLocalTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), "EEE d MMM", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Luggage Policy Card */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-muted-foreground" />
            <div>
              <h4 className="font-medium">Política de Equipaje</h4>
              {localLuggagePolicy ? (
                <p className="text-sm text-muted-foreground mt-1">{localLuggagePolicy}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1 italic">Sin definir</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowLuggageEdit(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Self-arranged travel option */}
      <div
        className={`border rounded-lg p-4 cursor-pointer transition-colors ${localSelfArranged ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 hover:bg-muted/50'}`}
        onClick={() => setLocalSelfArranged(!localSelfArranged)}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${localSelfArranged ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
            {localSelfArranged && <span className="text-primary-foreground text-xs font-bold">✓</span>}
          </div>
          <div className="flex-1">
            <h4 className="font-medium">Cada uno llega por sus propios medios</h4>
            <p className="text-sm text-muted-foreground mt-1">
              No se organizan desplazamientos grupales. Cada miembro gestiona su propio transporte.
            </p>
          </div>
        </div>
      </div>

      {localSelfArranged && (
        <div className="border rounded-lg p-4 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{localSelfArrangedNote}</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); setShowSelfArrangedEdit(true); }}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Trips list - visual style */}
      {!localSelfArranged && (
        <>
          <div className="space-y-3">
            {localTrips.length > 0 ? (
              localTrips.map((trip) => {
                const config = getMediumConfig(trip.medium);
                const Icon = config.icon;
                
                return (
                  <div
                    key={trip.id}
                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <Badge variant="outline" className={`${config.color} gap-1`}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                          {trip.date && (
                            <span className="text-xs text-muted-foreground mt-1">
                              {formatDate(trip.date)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-lg font-medium">
                            <span>{trip.origin || '—'}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{trip.destination || '—'}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {trip.departureTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {trip.departureTime}
                                {trip.arrivalTime && ` → ${trip.arrivalTime}`}
                              </span>
                            )}
                            {trip.serviceNumber && (
                              <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                                {trip.serviceNumber}
                              </span>
                            )}
                            {trip.pnr && (
                              <span className="font-mono text-xs">
                                PNR: {trip.pnr}
                              </span>
                            )}
                          </div>

                          {trip.passengerIds && trip.passengerIds.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs text-muted-foreground mb-2">
                                PASAJEROS ({trip.passengerIds.length})
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {trip.passengerIds.map(id => (
                                  <Badge key={id} variant="outline" className="text-xs gap-1">
                                    <User className="w-3 h-3" />
                                    {passengerNames[id] || id.slice(0, 8)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {trip.luggagePolicy && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <span className="font-medium">Equipaje:</span> {trip.luggagePolicy}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingTrip({ ...trip })}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeTrip(trip.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                No hay desplazamientos configurados
              </div>
            )}
          </div>

          <Button onClick={addTrip} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Añadir Desplazamiento
          </Button>
        </>
      )}

      {/* Edit Self-Arranged Note Dialog */}
      <Dialog open={showSelfArrangedEdit} onOpenChange={setShowSelfArrangedEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota de transporte individual</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={localSelfArrangedNote}
              onChange={(e) => setLocalSelfArrangedNote(e.target.value)}
              placeholder="Instrucciones para el equipo sobre cómo llegar al venue..."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSelfArrangedEdit(false)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Luggage Dialog */}
      <Dialog open={showLuggageEdit} onOpenChange={setShowLuggageEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Política de Equipaje</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={localLuggagePolicy}
              onChange={(e) => setLocalLuggagePolicy(e.target.value)}
              placeholder="Ej: Equipaje de mano: 55x40x23cm, máx 10kg. Facturado: 23kg incluido."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLuggageEdit(false)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trip Dialog */}
      <Dialog open={!!editingTrip} onOpenChange={(open) => !open && setEditingTrip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTrip && localTrips.some(t => t.id === editingTrip.id)
                ? 'Editar Desplazamiento'
                : 'Nuevo Desplazamiento'}
            </DialogTitle>
          </DialogHeader>
          {editingTrip && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={editingTrip.date}
                    onChange={(e) => setEditingTrip({ ...editingTrip, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medio de transporte</Label>
                  <Select
                    value={editingTrip.medium}
                    onValueChange={(val) => setEditingTrip({ ...editingTrip, medium: val as TravelTrip['medium'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mediumOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon className="w-4 h-4" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origen</Label>
                  <Input
                    value={editingTrip.origin}
                    onChange={(e) => setEditingTrip({ ...editingTrip, origin: e.target.value })}
                    placeholder="Madrid (MAD)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Input
                    value={editingTrip.destination}
                    onChange={(e) => setEditingTrip({ ...editingTrip, destination: e.target.value })}
                    placeholder="Barcelona (BCN)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora salida</Label>
                  <Input
                    type="time"
                    value={editingTrip.departureTime}
                    onChange={(e) => setEditingTrip({ ...editingTrip, departureTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora llegada</Label>
                  <Input
                    type="time"
                    value={editingTrip.arrivalTime}
                    onChange={(e) => setEditingTrip({ ...editingTrip, arrivalTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nº Vuelo/Tren</Label>
                  <Input
                    value={editingTrip.serviceNumber}
                    onChange={(e) => setEditingTrip({ ...editingTrip, serviceNumber: e.target.value })}
                    placeholder="IB1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localizador (PNR)</Label>
                  <Input
                    value={editingTrip.pnr}
                    onChange={(e) => setEditingTrip({ ...editingTrip, pnr: e.target.value })}
                    placeholder="ABC123"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pasajeros</Label>
                <TeamMemberSelector
                  artistId={artistId}
                  bookingId={bookingId}
                  value={editingTrip.passengerIds || []}
                  onValueChange={(ids) => setEditingTrip({ ...editingTrip, passengerIds: ids })}
                  placeholder="Seleccionar pasajeros..."
                />
              </div>

              <div className="space-y-2">
                <Label>Equipaje específico</Label>
                <Input
                  value={editingTrip.luggagePolicy || ''}
                  onChange={(e) => setEditingTrip({ ...editingTrip, luggagePolicy: e.target.value })}
                  placeholder="Política de equipaje para este viaje"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrip(null)}>Cancelar</Button>
            <Button onClick={saveTrip}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
