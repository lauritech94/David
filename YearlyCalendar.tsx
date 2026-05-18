import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
}

interface BookingOffer {
  id: string;
  fecha: string | null;
  festival_ciclo?: string;
  venue?: string;
  lugar?: string;
  ciudad?: string;
  estado?: string;
}

interface YearlyCalendarProps {
  year: number;
  events: Event[];
  bookings?: BookingOffer[];
  onDateSelect?: (date: Date) => void;
  onMonthSelect?: (date: Date) => void;
  onEventClick?: (event: Event, mouseEvent: React.MouseEvent) => void;
  selectedDate?: Date;
  selectedMonth?: Date | null;
}

const monthColors = [
  'bg-gradient-to-br from-rose-400 to-rose-600', // January - Rosa
  'bg-gradient-to-br from-orange-400 to-orange-600', // February - Naranja
  'bg-gradient-to-br from-amber-400 to-amber-600', // March - Amarillo
  'bg-gradient-to-br from-blue-400 to-blue-600', // April - Azul
  'bg-gradient-to-br from-pink-400 to-pink-600', // May - Rosa claro
  'bg-gradient-to-br from-purple-400 to-purple-600', // June - Morado
  'bg-gradient-to-br from-lime-400 to-lime-600', // July - Verde lima
  'bg-gradient-to-br from-cyan-400 to-cyan-600', // August - Cyan
  'bg-gradient-to-br from-gray-400 to-gray-600', // September - Gris
  'bg-gradient-to-br from-yellow-400 to-yellow-600', // October - Amarillo
  'bg-gradient-to-br from-red-400 to-red-600', // November - Rojo
  'bg-gradient-to-br from-green-400 to-green-600', // December - Verde
];

const monthNames = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

export function YearlyCalendar({ year, events, bookings = [], onDateSelect, onMonthSelect, onEventClick, selectedDate, selectedMonth }: YearlyCalendarProps) {
  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), date)
    );
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(b => b.fecha && isSameDay(new Date(b.fecha), date));
  };

  const renderMonth = (monthIndex: number) => {
    const monthDate = new Date(year, monthIndex, 1);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Días de la semana
    const weekDays = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    
    // Crear array con espacios vacíos al inicio del mes
    const startPadding = Array(getDay(monthStart)).fill(null);
    const allDays = [...startPadding, ...days];

    const isMonthSelected = selectedMonth && isSameMonth(monthDate, selectedMonth);
    return (
      <Card 
        key={monthIndex} 
        className={`${monthColors[monthIndex]} text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer ${isMonthSelected ? 'ring-4 ring-white shadow-2xl scale-105' : ''}`}
      >
        <div className="p-4">
          {/* Header del mes */}
          <div className="text-center mb-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMonthSelect?.(monthDate);
              }}
              className="text-2xl font-bold mb-1 hover:underline underline-offset-4"
              title="Ver eventos de este mes"
            >
              {monthNames[monthIndex]}
            </button>
            <div className="grid grid-cols-7 gap-1 text-xs font-medium opacity-80">
              {weekDays.map(day => (
                <div key={day} className="text-center py-1">{day}</div>
              ))}
            </div>
          </div>
          
          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((day, index) => {
              if (!day) {
                return <div key={index} className="h-6"></div>;
              }
              
              const dayEvents = getEventsForDate(day);
              const dayBookings = getBookingsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasEvents = dayEvents.length > 0 || dayBookings.length > 0;
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    h-6 text-xs flex items-center justify-center rounded transition-all
                    ${isSelected ? 'bg-white text-gray-900 font-bold' : ''}
                    ${hasEvents ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'}
                    cursor-pointer relative group
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Solo seleccionar el día, no abrir popover
                    onDateSelect?.(day);
                  }}
                  title={hasEvents ? `${dayEvents.length + dayBookings.length} evento(s): ${[...dayEvents.map(e => e.title), ...dayBookings.map(b => b.festival_ciclo || b.venue || b.lugar || 'Booking')].join(', ')}` : undefined}
                >
                  {format(day, 'd')}
                  {hasEvents && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Contador de eventos del mes */}
          <div className="mt-3 text-center">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {events.filter(event => 
                isSameMonth(new Date(event.start_date), monthDate)
              ).length + bookings.filter(b => b.fecha && isSameMonth(new Date(b.fecha), monthDate)).length} eventos
            </Badge>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header del año */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gradient-primary mb-2">{year}</h2>
        <p className="text-muted-foreground">
          Vista anual del calendario - {events.length} eventos en total
        </p>
      </div>
      
      {/* Grid de meses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
      </div>
    </div>
  );
}