import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Phone, Mail, MapPin, Plane, Train, Bus, Car, Clock, 
  Hotel, Users, Music, Calendar, User, Briefcase, 
  Coffee, CheckCircle2, AlertCircle, Luggage
} from 'lucide-react';
import { RoadmapBlock } from '@/hooks/useRoadmaps';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface RoadmapPreviewProps {
  roadmapName: string;
  artistName?: string;
  promoter?: string;
  startDate?: string | null;
  endDate?: string | null;
  blocks: RoadmapBlock[];
  artistId?: string | null;
}

// Type definitions for block data
interface HeaderBlockData {
  artistName?: string;
  tourTitle?: string;
  localPromoter?: string;
  globalDates?: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  origin?: string;
}

interface TravelTrip {
  id: string;
  date: string;
  medium: 'plane' | 'train' | 'bus' | 'car';
  flightNumber?: string; // Legacy field name
  serviceNumber?: string; // New field name
  pnr: string;
  origin: string;
  destination: string;
  departureTime?: string;
  arrivalTime?: string;
  passengers: string[] | string;
  passengerIds?: string[]; // Contact IDs for linked team members
  luggagePolicy?: string; // Per-trip luggage policy
}

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

interface RoomAssignment {
  id: string;
  passenger: string;
  passengerIds?: string[]; // Contact IDs for linked team members
  roomType: 'single' | 'double' | 'twin' | 'suite';
}

interface BacklineItem {
  id: string;
  category: string;
  instrument: string;
  model: string;
  provider: string;
  confirmed: boolean;
}

interface VenueBackline {
  id: string;
  venueName: string;
  items: BacklineItem[];
}

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  activityType: string;
  title: string;
  location: string;
  notes: string;
  assignedMemberIds?: string[]; // Contact IDs for assigned team members
}

interface ScheduleDay {
  id: string;
  label: string;
  date: string;
  items: ScheduleItem[];
}

const activityTypeLabels: Record<string, string> = {
  travel: 'Viaje',
  soundcheck: 'Soundcheck',
  rehearsal: 'Ensayo',
  show: 'Show',
  meal: 'Comida',
  hotel: 'Hotel',
  apartment: 'Apartamento',
  meeting: 'Reunión',
  other: 'Otro',
};

const roomTypeLabels: Record<string, string> = {
  single: 'Single',
  double: 'Doble',
  twin: 'Twin',
  suite: 'Suite',
};

const MediumIcon = ({ medium, className = "w-4 h-4" }: { medium: string; className?: string }) => {
  switch (medium) {
    case 'plane': return <Plane className={className} />;
    case 'train': return <Train className={className} />;
    case 'bus': return <Bus className={className} />;
    case 'car': return <Car className={className} />;
    default: return <Plane className={className} />;
  }
};

const getMediumLabel = (medium: string) => {
  switch (medium) {
    case 'plane': return 'VUELO';
    case 'train': return 'TREN';
    case 'bus': return 'BUS';
    case 'car': return 'COCHE';
    default: return 'VIAJE';
  }
};

export function RoadmapPreview({ roadmapName, artistName, promoter, startDate, endDate, blocks, artistId }: RoadmapPreviewProps) {
  // State to store resolved member names
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  
  // Collect all member IDs from blocks and resolve them to names
  useEffect(() => {
    const allMemberIds = new Set<string>();
    
    blocks.forEach(block => {
      const data = block.data as Record<string, unknown>;
      
      // Travel block
      if (block.block_type === 'travel') {
        const trips = (data.trips as TravelTrip[]) || [];
        trips.forEach(trip => {
          (trip.passengerIds || []).forEach(id => allMemberIds.add(id));
        });
      }
      
      // Schedule block
      if (block.block_type === 'schedule') {
        const days = (data.days as ScheduleDay[]) || [];
        days.forEach(day => {
          day.items?.forEach(item => {
            (item.assignedMemberIds || []).forEach(id => allMemberIds.add(id));
          });
        });
      }
      
      // Hospitality block
      if (block.block_type === 'hospitality') {
        const roomingList = (data.roomingList as RoomAssignment[]) || [];
        roomingList.forEach(room => {
          (room.passengerIds || []).forEach(id => allMemberIds.add(id));
        });
      }
    });
    
    if (allMemberIds.size === 0) return;
    
    // Fetch names for all member IDs (both contacts and workspace profiles)
    const fetchNames = async () => {
      const ids = Array.from(allMemberIds);
      const namesMap: Record<string, string> = {};
      
      // 1. Fetch from contacts table
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, stage_name')
        .in('id', ids);
      
      (contacts || []).forEach(c => {
        namesMap[c.id] = c.stage_name || c.name;
      });
      
      // 2. Check for any unresolved IDs - they might be profile user_ids
      const unresolvedIds = ids.filter(id => !namesMap[id]);
      if (unresolvedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, stage_name')
          .in('user_id', unresolvedIds);
        
        (profiles || []).forEach(p => {
          namesMap[p.user_id] = p.stage_name || p.full_name || 'Sin nombre';
        });
      }
      
      setMemberNames(namesMap);
    };
    
    fetchNames();
  }, [blocks]);
  
  // Helper to resolve member IDs to names
  const resolveMemberNames = (ids: string[]): string[] => {
    return ids.map(id => memberNames[id] || id).filter(Boolean);
  };
  
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "EEEE d 'de' MMMM yyyy", { locale: es });
    } catch {
      return date;
    }
  };

  const formatShortDate = (date: string) => {
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: es });
    } catch {
      return date;
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time;
  };

  // ============== COVER PAGE ==============
  const renderCoverPage = (headerData?: HeaderBlockData) => {
    const artist = headerData?.artistName || artistName || 'Artista';
    const title = headerData?.tourTitle || roadmapName;
    const dates = headerData?.globalDates || (startDate && endDate ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}` : '');
    const localPromoter = headerData?.localPromoter || promoter;

    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center py-16 bg-gradient-to-b from-primary/5 to-background border-b-4 border-primary">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-medium">
              Hoja de Ruta
            </p>
            <h1 className="text-5xl font-bold tracking-tight">{artist}</h1>
          </div>
          
          {title && title !== artist && (
            <p className="text-2xl text-muted-foreground font-light">{title}</p>
          )}
          
          {dates && (
            <div className="pt-4">
              <p className="text-lg font-medium">{dates}</p>
            </div>
          )}

          {localPromoter && (
            <div className="pt-8 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Promotor Local</p>
              <p className="text-lg">{localPromoter}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============== CONTACTS SECTION ==============
  const renderContacts = (data: { contacts?: Contact[] }) => {
    const contacts = data.contacts || [];
    if (contacts.length === 0) return null;

    // Group contacts by role for better organization
    const groupedContacts = contacts.reduce((acc, contact) => {
      const role = contact.role || 'Otros';
      if (!acc[role]) acc[role] = [];
      acc[role].push(contact);
      return acc;
    }, {} as Record<string, Contact[]>);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">CONTACTOS</h2>
        </div>

        {/* Contacts Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-semibold">NOMBRE</th>
                <th className="text-left p-3 font-semibold">ROL</th>
                <th className="text-left p-3 font-semibold">ORIGEN</th>
                <th className="text-left p-3 font-semibold">TELÉFONO</th>
                <th className="text-left p-3 font-semibold">EMAIL</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, idx) => (
                <tr key={contact.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                  <td className="p-3 font-medium">{contact.name || '-'}</td>
                  <td className="p-3 text-muted-foreground">{contact.role || '-'}</td>
                  <td className="p-3">
                    {contact.origin && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {contact.origin}
                      </span>
                    )}
                    {!contact.origin && '-'}
                  </td>
                  <td className="p-3">
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {contact.phone}
                      </span>
                    )}
                    {!contact.phone && '-'}
                  </td>
                  <td className="p-3">
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {contact.email}
                      </span>
                    )}
                    {!contact.email && '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============== TRAVEL SECTION ==============
  const renderTravel = (data: { trips?: TravelTrip[]; luggagePolicy?: string }) => {
    const trips = data.trips || [];
    if (trips.length === 0 && !data.luggagePolicy) return null;

    // Group trips by date
    const tripsByDate = trips.reduce((acc, trip) => {
      const date = trip.date || 'Sin fecha';
      if (!acc[date]) acc[date] = [];
      acc[date].push(trip);
      return acc;
    }, {} as Record<string, TravelTrip[]>);

    const getPassengersList = (passengers: string[] | string | undefined): string[] => {
      if (!passengers) return [];
      if (typeof passengers === 'string') {
        return passengers.split(',').map(p => p.trim()).filter(Boolean);
      }
      return passengers;
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">LOGÍSTICA DE VIAJE</h2>
        </div>

        {/* Luggage Policy */}
        {data.luggagePolicy && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Luggage className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">POLÍTICA DE EQUIPAJE</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap">{data.luggagePolicy}</p>
              </div>
            </div>
          </div>
        )}

        {/* Trips by date */}
        {Object.entries(tripsByDate).map(([date, dateTrips]) => (
          <div key={date} className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">
              {date !== 'Sin fecha' ? formatDate(date) : 'Sin fecha asignada'}
            </h3>
            
            {dateTrips.map((trip) => {
              // Combine legacy text passengers with resolved member names
              const textPassengers = getPassengersList(trip.passengers);
              const linkedPassengers = resolveMemberNames(trip.passengerIds || []);
              const passengers = [...linkedPassengers, ...textPassengers.filter(p => !linkedPassengers.includes(p))];
              // Support both legacy flightNumber and new serviceNumber
              const serviceNumber = trip.serviceNumber || trip.flightNumber;
              
              return (
                <div key={trip.id} className="border rounded-lg overflow-hidden">
                  {/* Trip Header */}
                  <div className="bg-muted px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MediumIcon medium={trip.medium} className="w-5 h-5" />
                      <span className="font-bold">{getMediumLabel(trip.medium)}</span>
                      {serviceNumber && (
                        <span className="font-mono bg-background px-2 py-0.5 rounded text-sm">
                          {serviceNumber}
                        </span>
                      )}
                    </div>
                    {trip.pnr && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">PNR: </span>
                        <span className="font-mono font-bold">{trip.pnr}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Trip Details */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{trip.departureTime || '--:--'}</p>
                          <p className="text-sm font-medium">{trip.origin || 'Origen'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-8 h-px bg-border" />
                          <MediumIcon medium={trip.medium} className="w-4 h-4" />
                          <div className="w-8 h-px bg-border" />
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{trip.arrivalTime || '--:--'}</p>
                          <p className="text-sm font-medium">{trip.destination || 'Destino'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Passengers */}
                    {passengers.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                          PASAJEROS ({passengers.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {passengers.map((passenger, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm"
                            >
                              <User className="w-3 h-3" />
                              {passenger}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trip-specific luggage policy */}
                    {trip.luggagePolicy && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          EQUIPAJE
                        </p>
                        <p className="text-sm text-muted-foreground">{trip.luggagePolicy}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ============== SCHEDULE SECTION ==============
  const renderSchedule = (data: { days?: ScheduleDay[] }) => {
    const days = data.days || [];
    if (days.length === 0) return null;

    const getActivityIcon = (type: string) => {
      switch (type) {
        case 'travel': return <Plane className="w-4 h-4" />;
        case 'soundcheck': return <Music className="w-4 h-4" />;
        case 'show': return <Music className="w-4 h-4" />;
        case 'meal': return <Coffee className="w-4 h-4" />;
        case 'hotel': return <Hotel className="w-4 h-4" />;
        case 'meeting': return <Users className="w-4 h-4" />;
        default: return <Clock className="w-4 h-4" />;
      }
    };

    const getActivityColor = (type: string) => {
      switch (type) {
        case 'travel': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'soundcheck': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'show': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'meal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        case 'hotel': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
        case 'meeting': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">PLANIFICACIÓN DIARIA</h2>
        </div>

        {days.map((day) => (
          <div key={day.id} className="space-y-3">
            {/* Day Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 rounded-t-lg">
              <h3 className="font-bold text-lg uppercase">{day.label}</h3>
              {day.date && (
                <p className="text-sm opacity-90">{formatDate(day.date)}</p>
              )}
            </div>
            
            {/* Day Schedule */}
            {day.items.length > 0 ? (
              <div className="border border-t-0 rounded-b-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 w-28 font-semibold">HORA</th>
                      <th className="text-left p-3 font-semibold">ACTIVIDAD</th>
                      <th className="text-left p-3 font-semibold">UBICACIÓN</th>
                      <th className="text-left p-3 font-semibold">NOTAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.items.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="p-3 font-mono font-medium whitespace-nowrap">
                          {item.startTime}
                          {item.endTime && <span className="text-muted-foreground"> - {item.endTime}</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getActivityColor(item.activityType)}`}>
                              {getActivityIcon(item.activityType)}
                              {activityTypeLabels[item.activityType] || item.activityType}
                            </span>
                            {item.title && <span className="font-medium">{item.title}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </span>
                          )}
                          {!item.location && '-'}
                        </td>
                        <td className="p-3 text-muted-foreground">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 border border-t-0 rounded-b-lg">
                Sin actividades programadas
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ============== HOSPITALITY SECTION ==============
  const renderHospitality = (data: { hotels?: HotelData[]; roomingList?: RoomAssignment[]; dietNotes?: string }) => {
    const hotels = data.hotels || [];
    const roomingList = data.roomingList || [];
    if (hotels.length === 0 && roomingList.length === 0 && !data.dietNotes) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Hotel className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">HOSPITALIDAD</h2>
        </div>

        {/* Hotels */}
        {hotels.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">HOTELES</h3>
            {hotels.map((hotel) => (
              <div key={hotel.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3">
                  <h4 className="font-bold text-lg">{hotel.name || 'Hotel sin nombre'}</h4>
                  {hotel.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {hotel.address}
                      {hotel.mapLink && (
                        <a 
                          href={hotel.mapLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline ml-2"
                        >
                          Ver mapa →
                        </a>
                      )}
                    </p>
                  )}
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {hotel.phone && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Teléfono</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {hotel.phone}
                      </p>
                    </div>
                  )}
                  {hotel.checkIn && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-in</p>
                      <p className="font-medium">{hotel.checkIn}</p>
                    </div>
                  )}
                  {hotel.checkOut && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-out</p>
                      <p className="font-medium">{hotel.checkOut}</p>
                    </div>
                  )}
                  {hotel.breakfastTime && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Desayuno</p>
                      <p className="font-medium flex items-center gap-1">
                        <Coffee className="w-3 h-3" />
                        {hotel.breakfastTime}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rooming List */}
        {roomingList.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">ROOMING LIST</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-semibold">PASAJERO</th>
                    <th className="text-left p-3 font-semibold">TIPO DE HABITACIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {roomingList.map((r, idx) => {
                    const passengerName = r.passengerIds?.length 
                      ? resolveMemberNames(r.passengerIds).join(', ') 
                      : r.passenger;
                    return (
                    <tr key={r.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="p-3 font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {passengerName || '-'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                          {roomTypeLabels[r.roomType] || r.roomType}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Diet Notes */}
        {data.dietNotes && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Coffee className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200 mb-1">NOTAS DE DIETAS</p>
                <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">{data.dietNotes}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============== PRODUCTION SECTION ==============
  const renderProduction = (data: { venues?: VenueBackline[] }) => {
    const venues = data.venues || [];
    if (venues.length === 0) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">PRODUCCIÓN TÉCNICA (BACKLINE)</h2>
        </div>

        {venues.map((venue) => (
          <div key={venue.id} className="space-y-3">
            <h3 className="font-semibold text-lg bg-muted px-4 py-2 rounded">
              {venue.venueName || 'Venue sin nombre'}
            </h3>
            
            {venue.items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-semibold">CATEGORÍA</th>
                      <th className="text-left p-3 font-semibold">INSTRUMENTO</th>
                      <th className="text-left p-3 font-semibold">MODELO</th>
                      <th className="text-left p-3 font-semibold">PROVEEDOR</th>
                      <th className="text-left p-3 font-semibold">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venue.items.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="p-3 text-muted-foreground">{item.category || '-'}</td>
                        <td className="p-3 font-medium">{item.instrument || '-'}</td>
                        <td className="p-3">{item.model || '-'}</td>
                        <td className="p-3">{item.provider || '-'}</td>
                        <td className="p-3">
                          {item.confirmed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Confirmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-medium">
                              <AlertCircle className="w-3 h-3" />
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 border rounded-lg">
                Sin elementos de backline
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ============== RENDER BLOCK ==============
  const renderBlock = (block: RoadmapBlock) => {
    const data = block.data as Record<string, unknown>;

    switch (block.block_type) {
      case 'header':
        return null; // Header is rendered separately as cover page
      case 'contacts':
        return renderContacts(data as { contacts?: Contact[] });
      case 'travel':
        return renderTravel(data as { trips?: TravelTrip[]; luggagePolicy?: string });
      case 'hospitality':
        return renderHospitality(data as { hotels?: HotelData[]; roomingList?: RoomAssignment[]; dietNotes?: string });
      case 'production':
        return renderProduction(data as { venues?: VenueBackline[] });
      case 'schedule':
        return renderSchedule(data as { days?: ScheduleDay[] });
      default:
        return null;
    }
  };

  // Find header block for cover page
  const headerBlock = blocks.find(b => b.block_type === 'header');
  const headerData = headerBlock?.data as HeaderBlockData | undefined;
  const otherBlocks = blocks.filter(b => b.block_type !== 'header');

  return (
    <div className="max-w-4xl mx-auto bg-background">
      {/* Cover Page */}
      {renderCoverPage(headerData)}

      {/* Content Sections */}
      <div className="space-y-12 p-8">
        {otherBlocks.map((block, index) => {
          const content = renderBlock(block);
          if (!content) return null;
          
          return (
            <div key={block.id}>
              {content}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-8 border-t mx-8">
        <p>Documento generado el {format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}</p>
        <p className="mt-1">Esta hoja de ruta es confidencial y de uso interno.</p>
      </div>
    </div>
  );
}
