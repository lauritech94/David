import { CalendarExportDialog } from '@/components/CalendarExportDialog';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, isSameMonth, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, X, Plus, Folder, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { YearlyCalendar } from '@/components/YearlyCalendar';
import { EditEventDialog } from '@/components/EditEventDialog';
import { EditEventDialogControlled } from '@/components/EditEventDialogControlled';
import { useBookingReminders } from '@/hooks/useBookingReminders';
import { ReminderBadge } from '@/components/ReminderBadge';
import { EventDetailPopover } from '@/components/EventDetailPopover';
import { importCsvEvents } from '@/utils/importCsvEvents';
import { useToast } from '@/hooks/use-toast';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarToolbar } from '@/components/calendar/CalendarToolbar';
import { CreateEventDialogV2 } from '@/components/calendar/CreateEventDialogV2';
import { useCalendarReleases, type CalendarRelease, type CalendarMilestone } from '@/hooks/useCalendarReleases';
import { ReleaseDayPopover } from '@/components/calendar/ReleaseDayPopover';
import { MilestoneDayPopover } from '@/components/calendar/MilestoneDayPopover';
import { Disc3, Target } from 'lucide-react';
import {
  applyProjectFilterToBookings,
  applyProjectFilterToReleases,
  applyProjectFilterToMilestones,
  applyProjectFilterToEvents,
  applyMemberFilterToEvents,
  applyMemberFilterToBookings,
  applyMemberFilterToMilestones,
  applyDepartmentFilterToEvents,
  applyDepartmentFilterToBookings,
  applyDepartmentFilterToMilestones,
  filterMembersByArtists,
  pruneFilters,
  type CalendarTeamMember,
} from '@/lib/calendar/filters';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';
interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  event_type: string;
  location: string | null;
  artist_id: string;
  project_id?: string | null;
}
export default function Calendar() {
  usePageTitle('Calendario');
  const {
    profile,
    loading
  } = useAuth();
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [viewMode, setViewModeRaw] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const setViewMode = (mode: 'week' | 'month' | 'quarter' | 'year') => {
    setViewModeRaw(mode);
    setSelectedDate(undefined);
    setSelectedMonth(null);
  };
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<CalendarTeamMember[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isImporting, setIsImporting] = useState(false);
  const {
    toast
  } = useToast();
  const [shouldOpenCreateDialog, setShouldOpenCreateDialog] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [bookingOffers, setBookingOffers] = useState<any[]>([]);
  const {
    getRemindersForBooking
  } = useBookingReminders(bookingOffers);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showMyCalendar, setShowMyCalendar] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Time selection states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    day: Date;
    hour: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    day: Date;
    hour: number;
  } | null>(null);
  const [hasActiveSelection, setHasActiveSelection] = useState(false);

  // Event detail popup states - ahora múltiples popups
  interface OpenEventPopup {
    id: string;
    event: Event;
    position: {
      x: number;
      y: number;
    };
    zIndex: number;
  }
  const [openEventPopups, setOpenEventPopups] = useState<OpenEventPopup[]>([]);
  const [highestZIndex, setHighestZIndex] = useState(100);
  const [savedPopupPositions, setSavedPopupPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedBookingOffer, setSelectedBookingOffer] = useState<any | null>(null);
  const [accessibleArtistIds, setAccessibleArtistIds] = useState<string[]>([]);
  const [showReleases, setShowReleases] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<CalendarRelease | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<{ milestone: CalendarMilestone; date: Date } | null>(null);

  // Load artist_ids the user has access to (real artists, not profile.id)
  useEffect(() => {
    const loadAccessibleArtists = async () => {
      if (!profile) return;
      try {
        const ids = new Set<string>();

        // 1. Artists via role bindings
        const { data: bindings } = await supabase
          .from('artist_role_bindings')
          .select('artist_id')
          .eq('user_id', profile.user_id);
        bindings?.forEach((b: any) => b.artist_id && ids.add(b.artist_id));

        // 2. For management role: include all artists in the workspace
        const wsId = (profile as any).workspace_id;
        if (profile.active_role === 'management' && wsId) {
          const { data: wsArtists } = await supabase
            .from('artists')
            .select('id')
            .eq('workspace_id', wsId);
          wsArtists?.forEach((a: any) => a.id && ids.add(a.id));
        }

        const arr = Array.from(ids);
        setAccessibleArtistIds(arr);
        // Initialize selection with all accessible artists by default
        setSelectedArtists(prev => (prev.length === 0 ? arr : prev));
      } catch (err) {
        console.error('Error loading accessible artists:', err);
      }
    };
    loadAccessibleArtists();
  }, [profile]);
  useEffect(() => {
    // Check if we should create an event from solicitud
    if (location.state?.createEvent) {
      setPrefilledData(location.state.createEvent);
      setShouldOpenCreateDialog(true);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  useEffect(() => {
    if (profile && selectedArtists.length > 0) {
      fetchEvents();
      fetchBookingOffers();
      fetchTeamMembers();
    }
  }, [profile, selectedArtists, showMyCalendar, showAllEvents]);

  // Reload projects when accessible/selected artists change so the dropdown only
  // lists projects of artists the user can see.
  useEffect(() => {
    if (profile) fetchProjects();
  }, [profile, selectedArtists, accessibleArtistIds]);

  // Scroll to 9 AM when week view is rendered
  useEffect(() => {
    if (viewMode === 'week' && scrollAreaRef.current) {
      // Scroll to 9 AM (hour 9 = index 9, each hour is 48px tall)
      scrollAreaRef.current.scrollTop = 9 * 48;
    }
  }, [viewMode, currentDate]);

  // Add global mouseup listener for time selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleTimeSlotMouseUp();
      }
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting, selectionStart, selectionEnd]);

  // Clear selection when view mode or current date changes
  useEffect(() => {
    clearSelection();
  }, [viewMode, currentDate]);
  const fetchEvents = async () => {
    try {
      if (profile?.active_role === 'management') {
        const artistIds = selectedArtists.length > 0 ? selectedArtists : accessibleArtistIds;
        let query = supabase.from('events').select('*');
        if (artistIds.length > 0) {
          query = query.or(`created_by.eq.${profile.id},artist_id.in.(${artistIds.join(',')})`);
        } else {
          query = query.eq('created_by', profile.id);
        }
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching events:', error);
        } else {
          let filteredEvents = data || [];

          // Si "Ver todo" está activo, mostrar todos los eventos sin filtros
          if (showAllEvents) {
            setEvents(filteredEvents);
            return;
          }

          // Aplicar filtros solo cuando "Ver todo" está desactivado
          // Filtrar por artistas seleccionados
          filteredEvents = filteredEvents.filter(event => selectedArtists.includes(event.artist_id) || event.created_by === profile.id);

          // Filtrar por "Mi Calendario" si está activado
          if (showMyCalendar) {
            filteredEvents = filteredEvents.filter((event: any) => event.created_by === profile.id || event.artist_id === profile.id);
          }

          // Filtrar por proyectos - nota: events no tiene project_id, este filtro no aplica
          if (selectedProjects.length > 0) {
            // La tabla events no tiene project_id, este filtro se desactiva
            // filteredEvents = filteredEvents.filter((event: any) => event.project_id && selectedProjects.includes(event.project_id));
          }
          setEvents(filteredEvents);
        }
      } else {
        const artistFilter = selectedArtists.length > 0 ? selectedArtists : (accessibleArtistIds.length > 0 ? accessibleArtistIds : [profile.id]);
        const {
          data,
          error
        } = await supabase.from('events').select('*').in('artist_id', artistFilter).order('start_date', {
          ascending: true
        });
        if (error) {
          console.error('Error fetching events:', error);
        } else {
          let filteredEvents = data || [];

          // Si "Ver todo" está activo, mostrar todos los eventos sin filtros
          if (showAllEvents) {
            setEvents(filteredEvents);
            return;
          }

          // Aplicar filtros solo cuando "Ver todo" está desactivado
          // Filtrar por "Mi Calendario" si está activado
          if (showMyCalendar) {
            filteredEvents = filteredEvents.filter((event: any) => event.created_by === profile.id || event.artist_id === profile.id);
          }

          // Filtrar por proyectos - nota: events no tiene project_id, este filtro no aplica
          // if (selectedProjects.length > 0) {
          //   filteredEvents = filteredEvents.filter((event: any) => event.project_id && selectedProjects.includes(event.project_id));
          // }
          setEvents(filteredEvents);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }
  };
  const fetchProjects = async () => {
    try {
      // Restrict to artists the user can see (RBAC) — coherent with the artists filter.
      const artistScope = selectedArtists.length > 0 ? selectedArtists : accessibleArtistIds;
      if (artistScope.length === 0) {
        setProjects([]);
        return;
      }
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, artist_id, is_folder')
        .in('artist_id', artistScope)
        .or('is_folder.is.null,is_folder.eq.false')
        .order('name', { ascending: true });
      if (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };
  const fetchTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      const allMembers: CalendarTeamMember[] = [];
      const wsId = profileData?.workspace_id as string | undefined;

      if (wsId) {
        const { data: memberships } = await supabase
          .from('workspace_memberships')
          .select('user_id, team_category')
          .eq('workspace_id', wsId);

        if (memberships && memberships.length > 0) {
          const userIds = memberships.map((m: any) => m.user_id);

          const [{ data: profiles }, { data: bindings }] = await Promise.all([
            supabase
              .from('profiles')
              .select('user_id, full_name, stage_name')
              .in('user_id', userIds),
            supabase
              .from('artist_role_bindings')
              .select('user_id, artist_id')
              .in('user_id', userIds),
          ]);

          const deptByUser = new Map(memberships.map((m: any) => [m.user_id, m.team_category]));
          const artistsByUser = new Map<string, string[]>();
          (bindings || []).forEach((b: any) => {
            if (!b.user_id || !b.artist_id) return;
            const arr = artistsByUser.get(b.user_id) || [];
            arr.push(b.artist_id);
            artistsByUser.set(b.user_id, arr);
          });

          (profiles || []).forEach((p: any) => {
            allMembers.push({
              id: p.user_id,
              full_name: p.stage_name || p.full_name || 'Sin nombre',
              type: 'workspace',
              team_category: deptByUser.get(p.user_id) ?? null,
              artist_ids: artistsByUser.get(p.user_id) || [],
            });
          });
        }

        // Workspace-wide team contacts. Collaborators excluded.
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, stage_name, category, field_config, artist_id')
          .neq('category', 'colaborador');

        (contacts || []).forEach((c: any) => {
          const config = c.field_config as Record<string, any> | null;
          if (!config?.is_team_member) return;
          allMembers.push({
            id: c.id,
            full_name: c.stage_name || c.name || 'Sin nombre',
            type: 'contact',
            team_category: c.category ?? null,
            artist_ids: c.artist_id ? [c.artist_id] : [],
          });
        });
      }

      const seen = new Set<string>();
      const unique = allMembers.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      setTeamMembers(unique);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };
  const handleImportCsvClick = () => {
    document.getElementById('csv-upload')?.click();
  };
  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const csvContent = await file.text();
      const result = await importCsvEvents(csvContent);
      toast({
        title: "Eventos importados",
        description: `Se importaron ${result.eventCount} eventos desde el CSV`
      });
      fetchEvents();
      fetchBookingOffers();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron importar los eventos del CSV",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') navigateWeek(direction);else if (viewMode === 'month' || viewMode === 'quarter') navigateMonth(direction);else navigateYear(direction);
  };
  const fetchBookingOffers = async () => {
    try {
      const artistFilter = selectedArtists.length > 0 ? selectedArtists : accessibleArtistIds;
      if (artistFilter.length === 0) return;
      
      const { data, error } = await supabase
        .from('booking_offers')
        .select(`
          id, fecha, estado, phase, contratos, link_venta, ciudad, lugar, venue, 
          festival_ciclo, event_id, formato, duracion, folder_url,
          artist_id, artists!booking_offers_artist_id_fkey(name, stage_name)
        `)
        .in('artist_id', artistFilter)
        .or('estado.in.(confirmado,pendiente,negociacion,interes,oferta,facturado,realizado,cerrado),phase.in.(interes,oferta,negociacion,preconfirmado,confirmado,realizado,facturado,cerrado)');
      
      if (error) {
        console.error('Error fetching booking offers:', error);
      } else {
        setBookingOffers(data || []);
      }
    } catch (error) {
      console.error('Error fetching booking offers:', error);
    }
  };
  // ----- Project / member / department filters wiring -----
  // Map projectId → artistId so we can derive the project filter for entities that
  // don't have a native `project_id` (events, milestones via release).
  const projectArtistMap = (() => {
    const m = new Map<string, string>();
    projects.forEach((p: any) => p?.id && p?.artist_id && m.set(p.id, p.artist_id));
    return m;
  })();

  // Cascade: members visible given the artist selection (and visible departments).
  const visibleMembers = filterMembersByArtists(teamMembers, selectedArtists);
  const visibleDepartments = TEAM_CATEGORIES.filter((cat) =>
    visibleMembers.some((m) => m.team_category === cat.value),
  );

  // Sync: when the artist selection (or members) changes, prune dependent filters
  // that no longer match. Compares values to avoid render loops.
  useEffect(() => {
    const next = pruneFilters({
      selectedProjects,
      selectedTeam,
      selectedDepartment,
      members: teamMembers,
      visibleMembers,
      projectArtistMap,
      selectedArtists,
    });
    if (next.projects.length !== selectedProjects.length || next.projects.some((p, i) => p !== selectedProjects[i])) {
      setSelectedProjects(next.projects);
    }
    if (next.team !== selectedTeam) setSelectedTeam(next.team);
    if (next.department !== selectedDepartment) setSelectedDepartment(next.department);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArtists, teamMembers, projects]);

  const selectedMember =
    selectedTeam !== 'all' ? teamMembers.find((m) => m.id === selectedTeam) || null : null;

  // Releases & milestones layer (must be declared before the getters use it).
  const releaseArtistIds = selectedArtists.length > 0 ? selectedArtists : accessibleArtistIds;
  const { releases: calendarReleases, milestones: calendarMilestones } = useCalendarReleases({
    artistIds: releaseArtistIds,
    enabled: !!profile,
  });

  // Apply project / member / department filters once, then memoize via the per-date getters.
  const filteredEvents = (() => {
    let out = events;
    out = applyProjectFilterToEvents(out, selectedProjects, projectArtistMap);
    out = applyMemberFilterToEvents(out, selectedMember);
    out = applyDepartmentFilterToEvents(out, teamMembers, selectedDepartment);
    return out;
  })();

  const filteredBookings = (() => {
    let out = bookingOffers;
    out = applyProjectFilterToBookings(out, selectedProjects);
    out = applyMemberFilterToBookings(out, selectedMember);
    out = applyDepartmentFilterToBookings(out, teamMembers, selectedDepartment);
    return out;
  })();

  const filteredReleases = (() => {
    let out = calendarReleases;
    out = applyProjectFilterToReleases(out, selectedProjects);
    return out;
  })();

  const filteredMilestones = (() => {
    let out = calendarMilestones;
    out = applyProjectFilterToMilestones(out, selectedProjects);
    out = applyMemberFilterToMilestones(out, selectedMember);
    out = applyDepartmentFilterToMilestones(out, teamMembers, selectedDepartment);
    return out;
  })();

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => isSameDay(new Date(event.start_date), date));
  };

  const getBookingOffersForDate = (date: Date) => {
    return filteredBookings.filter((offer) => {
      if (!offer.fecha) return false;
      return isSameDay(new Date(offer.fecha), date);
    });
  };

  const getReleasesForDate = (date: Date) => {
    if (!showReleases) return [] as CalendarRelease[];
    return filteredReleases.filter((r) => r.release_date && isSameDay(new Date(r.release_date), date));
  };
  const getMilestonesForDate = (date: Date) => {
    if (!showMilestones) return [] as CalendarMilestone[];
    return filteredMilestones.filter((m) => m.due_date && isSameDay(new Date(m.due_date), date));
  };
  
  const formatBookingTitle = (offer: any) => {
    const eventName = offer.festival_ciclo || offer.venue || offer.lugar || 'Evento';
    const city = offer.ciudad || '';
    return `🎤 ${eventName}${city ? ` - ${city}` : ''}`;
  };
  
  const getEventsForWeek = (startDate: Date) => {
    const weekStart = startOfWeek(startDate, {
      weekStartsOn: 1
    });
    const weekEnd = endOfWeek(startDate, {
      weekStartsOn: 1
    });
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });
  };
  const getEventsForMonth = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= monthStart && eventDate <= monthEnd;
    });
  };
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(undefined);
    setSelectedMonth(null);
  };
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(undefined);
    setSelectedMonth(null);
  };
  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(newDate);
    setSelectedDate(undefined);
    setSelectedMonth(null);
  };
  const selectDay = (day: Date) => {
    setSelectedDate(day);
    setSelectedMonth(null);
  };
  const selectMonth = (monthDate: Date) => {
    setSelectedMonth(startOfMonth(monthDate));
    setSelectedDate(undefined);
  };
  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate, {
      weekStartsOn: 1
    });
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, {
        weekStartsOn: 1
      })
    });
  };
  const getMonthWeeks = (date: Date = currentDate) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart, {
      weekStartsOn: 1
    });
    const calendarEnd = endOfWeek(monthEnd, {
      weekStartsOn: 1
    });
    const days = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };
  const currentEvents = viewMode === 'week' ? getEventsForWeek(currentDate) : viewMode === 'month' ? getEventsForMonth(currentDate) : events;
  const isAllDayEvent = (event: Event) => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const startTime = startDate.getHours() * 60 + startDate.getMinutes();
    const endTime = endDate.getHours() * 60 + endDate.getMinutes();

    // Consider it all-day if it starts at 00:00 and ends at 23:59 or spans multiple days
    return startTime === 0 && endTime === 1439 || startDate.toDateString() !== endDate.toDateString();
  };
  const getAllDayEventsForDate = (date: Date) => {
    return getEventsForDate(date).filter(isAllDayEvent);
  };
  const getTimedEventsForDate = (date: Date) => {
    return getEventsForDate(date).filter(event => !isAllDayEvent(event));
  };

  // Time selection handlers
  const handleTimeSlotMouseDown = (day: Date, hour: number) => {
    setIsSelecting(true);
    setSelectionStart({
      day,
      hour
    });
    setSelectionEnd({
      day,
      hour
    });
  };
  const handleTimeSlotMouseEnter = (day: Date, hour: number) => {
    if (isSelecting && selectionStart && isSameDay(day, selectionStart.day)) {
      setSelectionEnd({
        day,
        hour
      });
    }
  };
  const handleTimeSlotMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd) {
      setHasActiveSelection(true);
    }
    setIsSelecting(false);
  };
  const createEventFromSelection = () => {
    if (selectionStart && selectionEnd) {
      const startHour = Math.min(selectionStart.hour, selectionEnd.hour);
      const endHour = Math.max(selectionStart.hour, selectionEnd.hour) + 1; // Add 1 to include the end hour

      const startDate = new Date(selectionStart.day);
      startDate.setHours(startHour, 0, 0, 0);
      const endDate = new Date(selectionStart.day);
      endDate.setHours(endHour, 0, 0, 0);
      setPrefilledData({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        event_type: 'reunion'
      });
      setShouldOpenCreateDialog(true);
      clearSelection();
    }
  };
  const clearSelection = () => {
    setHasActiveSelection(false);
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };
  const isTimeSlotSelected = (day: Date, hour: number) => {
    if (!selectionStart || !selectionEnd) return false;
    if (!isSameDay(day, selectionStart.day)) return false;
    const minHour = Math.min(selectionStart.hour, selectionEnd.hour);
    const maxHour = Math.max(selectionStart.hour, selectionEnd.hour);
    return hour >= minHour && hour <= maxHour;
  };
  const getSelectionTimeRange = () => {
    if (!selectionStart || !selectionEnd) return '';
    const startHour = Math.min(selectionStart.hour, selectionEnd.hour);
    const endHour = Math.max(selectionStart.hour, selectionEnd.hour) + 1;
    return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
  };
  const handleEventClick = (event: Event, mouseEvent: React.MouseEvent) => {
    console.log('Event clicked:', event);
    console.log('Event start_date:', event.start_date);
    console.log('Event end_date:', event.end_date);
    console.log('Opening popup for event');

    // Verificar si el evento ya está abierto
    const existingPopup = openEventPopups.find(popup => popup.event.id === event.id);
    if (existingPopup) {
      // Guardar la posición actual antes de cerrar
      setSavedPopupPositions(prev => ({
        ...prev,
        [event.id]: existingPopup.position
      }));
      // Si ya está abierto, cerrarlo (toggle)
      setOpenEventPopups(prev => prev.filter(popup => popup.id !== existingPopup.id));
      return;
    }

    // Usar la posición guardada si existe, si no usar la posición del clic
    const rect = (mouseEvent.target as HTMLElement).getBoundingClientRect();
    const savedPosition = savedPopupPositions[event.id];
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    const newPopup: OpenEventPopup = {
      id: `popup-${event.id}-${Date.now()}`,
      event,
      position: savedPosition || {
        x: rect.right + 10,
        y: rect.top
      },
      zIndex: newZIndex
    };
    setOpenEventPopups(prev => [...prev, newPopup]);
    console.log('Popup added for event:', event.title);
  };
  const bringPopupToFront = (popupId: string) => {
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    setOpenEventPopups(prev => prev.map(popup => popup.id === popupId ? {
      ...popup,
      zIndex: newZIndex
    } : popup));
  };
  const closePopup = (popupId: string) => {
    const popup = openEventPopups.find(p => p.id === popupId);
    if (popup) {
      setSavedPopupPositions(prev => ({
        ...prev,
        [popup.event.id]: popup.position
      }));
    }
    setOpenEventPopups(prev => prev.filter(p => p.id !== popupId));
  };

  const updatePopupPosition = (popupId: string, newPosition: { x: number; y: number }) => {
    setOpenEventPopups(prev => prev.map(popup => 
      popup.id === popupId ? { ...popup, position: newPosition } : popup
    ));
  };
  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const timeSlots = Array.from({
      length: 24
    }, (_, i) => i); // Show all 24 hours (0-23)

    return <div className="calendar-week-view bg-background rounded-xl border shadow-soft overflow-hidden">
        {/* Header with navigation */}
        <div className="bg-muted/30 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'MMMM yyyy', {
                locale: es
              })}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>
                Semana
              </Button>
              <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>
                Mes
              </Button>
              <Button variant={viewMode === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('year')}>
                Año
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <CalendarExportDialog events={events} />
            </div>
          </div>
        </div>

        {/* Week header */}
        <div className="grid grid-cols-8 border-b bg-muted/20">
          <div className="p-3 text-xs font-medium text-muted-foreground">GMT+02</div>
          {weekDays.map((day, index) => <div key={index} className={`p-3 text-center border-l cursor-pointer hover:bg-muted/30 transition-colors ${selectedDate && isSameDay(day, selectedDate) ? 'bg-primary/10' : ''}`} onClick={() => selectDay(day)}>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {format(day, 'EEE', {
              locale: es
            }).toUpperCase()}
              </div>
              <div className={`text-2xl font-bold ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center mx-auto' : selectedDate && isSameDay(day, selectedDate) ? 'text-primary' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>)}
        </div>

        {/* All-day events section */}
        <div className="grid grid-cols-8 border-b bg-muted/5">
          <div className="p-3 text-xs font-medium text-muted-foreground bg-muted/10">Todo el día</div>
          {weekDays.map((day, dayIndex) => {
          const allDayEvents = getAllDayEventsForDate(day);
          const dayBookings = getBookingOffersForDate(day);
          const dayReleases = getReleasesForDate(day);
          const dayMilestones = getMilestonesForDate(day);
          return <div key={dayIndex} className="border-l min-h-16 p-2 space-y-1">
                {allDayEvents.map((event) => <div key={event.id} className={`text-xs px-2 py-1 rounded truncate font-medium relative ${event.event_type === 'concierto' ? 'bg-blue-100 text-blue-800 border border-blue-200' : event.event_type === 'entrevista' ? 'bg-green-100 text-green-800 border border-green-200' : event.event_type === 'reunion' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="truncate">{event.title}</span>
                      {(() => {
                  const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                  if (bookingOffer) {
                    const reminders = getRemindersForBooking(bookingOffer.id);
                    return reminders.length > 0 ? <div className="ml-1 flex-shrink-0">
                              <ReminderBadge reminders={reminders} variant="compact" />
                            </div> : null;
                  }
                  return null;
                })()}
                    </div>
                  </div>)}
                {dayBookings.map((booking) => <div key={booking.id} className="text-xs px-2 py-1 rounded truncate font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50" onClick={e => { e.stopPropagation(); setSelectedBookingOffer(booking); }}>
                    <div className="flex items-center justify-between">
                      <span className="truncate">{formatBookingTitle(booking)}</span>
                      {(() => {
                        const reminders = getRemindersForBooking(booking.id);
                        return reminders.length > 0 ? <div className="ml-1 flex-shrink-0">
                              <ReminderBadge reminders={reminders} variant="compact" />
                            </div> : null;
                      })()}
                    </div>
                  </div>)}
                {dayReleases.map((release) => (
                  <div key={`rel-${release.id}`} className="text-xs px-2 py-1 rounded truncate font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-700 cursor-pointer hover:bg-violet-200 dark:hover:bg-violet-900/50 flex items-center gap-1"
                    onClick={e => { e.stopPropagation(); setSelectedRelease(release); }}>
                    <Disc3 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{release.title}</span>
                  </div>
                ))}
                {dayMilestones.map((m) => (
                  <div key={`ms-${m.id}`} className="text-xs px-2 py-1 rounded truncate font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900/50 flex items-center gap-1"
                    onClick={e => { e.stopPropagation(); setSelectedMilestone({ milestone: m, date: day }); }}>
                    <Target className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{m.title}</span>
                  </div>
                ))}
              </div>;
        })}
        </div>

        {/* Calendar grid with scroll area and initial position at 9 AM */}
        <div className="h-96 overflow-y-auto" ref={scrollAreaRef}>
          <div className="grid grid-cols-8">
            {/* Time column */}
            <div className="bg-muted/10">
              {timeSlots.map(hour => <div key={hour} className="h-12 border-b border-r border-muted/30 p-2 text-xs text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>)}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => <div key={dayIndex} className="border-r border-muted/30">
                {timeSlots.map(hour => {
              const dayEvents = getTimedEventsForDate(day).filter(event => {
                const eventHour = new Date(event.start_date).getHours();
                return eventHour === hour;
              });
              const isFirstSelectedHour = selectionStart && selectionEnd && isSameDay(day, selectionStart.day) && hour === Math.min(selectionStart.hour, selectionEnd.hour);
              const selectedHoursCount = selectionStart && selectionEnd && isSameDay(day, selectionStart.day) ? Math.abs(selectionEnd.hour - selectionStart.hour) + 1 : 0;
              return <div key={hour} className={`h-12 border-b border-muted/20 p-1 relative cursor-pointer hover:bg-muted/10 transition-colors select-none`} onMouseDown={e => {
                e.preventDefault();
                handleTimeSlotMouseDown(day, hour);
              }} onMouseEnter={() => handleTimeSlotMouseEnter(day, hour)}>
                      {/* Single continuous selection overlay - only render on first selected hour */}
                      {isFirstSelectedHour && <div className="absolute inset-x-1 bg-primary/90 border-2 border-primary rounded-lg flex items-center justify-center z-5 shadow-sm" style={{
                  top: '4px',
                  height: `${selectedHoursCount * 48 - 8}px` // 48px per hour minus padding
                }}>
                          <span className="text-primary-foreground text-sm font-medium select-none">
                            (Sin título)
                          </span>
                        </div>}
                      
                      {dayEvents.map((event, eventIndex) => <div key={event.id} className={`absolute inset-1 border rounded text-xs p-2 overflow-hidden hover:opacity-80 transition-all cursor-pointer z-10 ${event.event_type === 'concierto' ? 'bg-blue-100 border-blue-300 text-blue-800' : event.event_type === 'entrevista' ? 'bg-green-100 border-green-300 text-green-800' : event.event_type === 'reunion' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-gray-100 border-gray-300 text-gray-800'}`} style={{
                  zIndex: eventIndex + 10,
                  marginTop: `${eventIndex * 2}px`
                }} onMouseDown={e => e.stopPropagation()} onClick={e => {
                  e.stopPropagation();
                  console.log('Event card clicked, calling handleEventClick');
                  handleEventClick(event, e);
                }}>
                          <div className="flex flex-col h-full">
                            <div className="font-bold text-xs uppercase tracking-wide leading-tight mb-1">
                              {event.title}
                            </div>
                            <div className="text-xs opacity-80 leading-tight mb-1">
                              {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
                            </div>
                            {event.location && <div className="text-xs opacity-70 leading-tight truncate">
                                {event.location}
                              </div>}
                            {(() => {
                      const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                      if (bookingOffer) {
                        const reminders = getRemindersForBooking(bookingOffer.id);
                        return reminders.length > 0 ? <div className="mt-auto pt-1">
                                    <ReminderBadge reminders={reminders} variant="compact" />
                                  </div> : null;
                      }
                      return null;
                    })()}
                          </div>
                        </div>)}
                    </div>;
            })}
              </div>)}
          </div>
        </div>

        {/* Floating Create Event Button - Google Calendar Style */}
        {hasActiveSelection && selectionStart && selectionEnd && <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background border border-border/50 shadow-2xl rounded-xl p-4 z-20 animate-scale-in">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <div className="font-semibold text-foreground mb-1">
                  {format(selectionStart.day, 'dd MMM yyyy', {
                locale: es
              })}
                </div>
                <div className="text-muted-foreground text-xs">
                  {getSelectionTimeRange()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80">
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={createEventFromSelection} className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Plus className="h-3 w-3 mr-1.5" />
                  Crear evento
                </Button>
              </div>
            </div>
          </div>}
      </div>;
  };
  const renderMonthView = () => {
    const currentMonthWeeks = getMonthWeeks(currentDate);
    const nextMonth = addMonths(currentDate, 1);
    const nextMonthWeeks = getMonthWeeks(nextMonth);
    const renderSingleMonth = (monthDate: Date, monthWeeks: any[]) => <div className="flex-1 min-w-0">
        {/* Month header */}
        <div className="bg-muted/20 p-3 border-b text-center">
          <button
            type="button"
            onClick={() => selectMonth(monthDate)}
            className={`text-lg font-semibold capitalize hover:text-primary transition-colors ${selectedMonth && isSameMonth(monthDate, selectedMonth) ? 'text-primary underline underline-offset-4' : ''}`}
            title="Ver eventos de este mes"
          >
            {format(monthDate, 'MMMM yyyy', {
            locale: es
          })}
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b bg-muted/10">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>)}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {monthWeeks.map((week, weekIndex) => week.map((day: Date, dayIndex: number) => {
          const dayEvents = getEventsForDate(day);
          const dayBookings = getBookingOffersForDate(day);
          const dayReleases = getReleasesForDate(day);
          const dayMilestones = getMilestonesForDate(day);
          const isCurrentMonth = isSameMonth(day, monthDate);
          const isToday = isSameDay(day, new Date());
          const allItems = [
            ...dayEvents.map(e => ({ type: 'event' as const, data: e })),
            ...dayBookings.map(b => ({ type: 'booking' as const, data: b })),
            ...dayReleases.map(r => ({ type: 'release' as const, data: r })),
            ...dayMilestones.map(m => ({ type: 'milestone' as const, data: m })),
          ];
          return <div key={`${weekIndex}-${dayIndex}`} className={`min-h-20 border-r border-b border-muted/30 p-1.5 cursor-pointer hover:bg-muted/10 transition-colors ${!isCurrentMonth ? 'bg-muted/5 text-muted-foreground' : ''}`} onClick={() => selectDay(day)}>
                <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {allItems.slice(0, 2).map((item, idx) => {
                    if (item.type === 'event') {
                      const event = item.data as Event;
                      return (
                        <div 
                          key={event.id} 
                          className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary/20" 
                          onClick={e => {
                            e.stopPropagation();
                            handleEventClick(event, e);
                          }}
                        >
                          {event.title}
                        </div>
                      );
                    } else if (item.type === 'booking') {
                      const booking = item.data as any;
                      return (
                        <div 
                          key={booking.id} 
                          className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50" 
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedBookingOffer(booking);
                          }}
                        >
                          {formatBookingTitle(booking)}
                        </div>
                      );
                    } else if (item.type === 'release') {
                      const release = item.data as CalendarRelease;
                      return (
                        <div
                          key={`rel-${release.id}`}
                          className="text-[10px] bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-violet-200 dark:hover:bg-violet-900/50 flex items-center gap-1"
                          onClick={e => { e.stopPropagation(); setSelectedRelease(release); }}
                        >
                          <Disc3 className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{release.title}</span>
                        </div>
                      );
                    } else {
                      const m = item.data as CalendarMilestone;
                      return (
                        <div
                          key={`ms-${m.id}`}
                          className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900/50 flex items-center gap-1"
                          onClick={e => { e.stopPropagation(); setSelectedMilestone({ milestone: m, date: day }); }}
                        >
                          <Target className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </div>
                      );
                    }
                  })}
                  {allItems.length > 2 && <div className="text-[10px] text-muted-foreground">
                      +{allItems.length - 2}
                    </div>}
                </div>
              </div>;
        }))}
        </div>
      </div>;
    return <div className="calendar-month-view bg-background rounded-xl border shadow-soft overflow-hidden">
        {/* Header with navigation */}
        <div className="bg-muted/30 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'MMMM', {
                locale: es
              })} - {format(nextMonth, 'MMMM yyyy', {
                locale: es
              })}
              </h2>
              
            </div>
            <div className="flex gap-2 items-center">
              <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>
                Semana
              </Button>
              <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>
                Mes
              </Button>
              <Button variant={viewMode === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('year')}>
                Año
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <CalendarExportDialog events={events} />
            </div>
          </div>
        </div>

        {/* Two month grid */}
        <div className="flex divide-x">
          {renderSingleMonth(currentDate, currentMonthWeeks)}
          {renderSingleMonth(nextMonth, nextMonthWeeks)}
        </div>
      </div>;
  };
  const renderYearView = () => {
    return <div className="card-moodita hover-lift">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigateYear('prev')} size="sm">
                ← {currentDate.getFullYear() - 1}
              </Button>
              <Button variant="outline" onClick={() => navigateYear('next')} size="sm">
                {currentDate.getFullYear() + 1} →
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>
                Semana
              </Button>
              <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>
                Mes
              </Button>
              <Button variant="default" size="sm" onClick={() => setViewMode('year')}>
                Año
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <CalendarExportDialog events={events} />
            </div>
          </div>
          
          <YearlyCalendar year={currentDate.getFullYear()} events={events} bookings={bookingOffers} onDateSelect={date => {
          selectDay(date);
        }} onMonthSelect={date => selectMonth(date)} onEventClick={handleEventClick} selectedDate={selectedDate} selectedMonth={selectedMonth} />
        </CardContent>
      </div>;
  };
  if (loading) {
    return <div className="p-6">
        <div className="text-center">Cargando calendario...</div>
      </div>;
  }
  if (!profile) {
    return <div className="p-6">
        <div className="text-center">Error: No se pudo cargar el perfil</div>
      </div>;
  }
  return <div className="container-moodita py-4 space-y-4">
      {/* Compact Header */}
      <CalendarHeader onCreateEvent={() => setShouldOpenCreateDialog(true)} onImportCsv={handleImportCsvClick} onSyncGoogle={() => {}} isImporting={isImporting} />
      <input id="csv-upload" type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />

      {/* Unified Toolbar */}
      <CalendarToolbar viewMode={viewMode} setViewMode={setViewMode} currentDate={currentDate} onNavigate={handleNavigate} onGoToToday={() => { setCurrentDate(new Date()); setSelectedDate(undefined); setSelectedMonth(null); }} showMyCalendar={showMyCalendar} setShowMyCalendar={setShowMyCalendar} selectedArtists={selectedArtists} setSelectedArtists={setSelectedArtists} selectedProjects={selectedProjects} setSelectedProjects={setSelectedProjects} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} selectedDepartment={selectedDepartment} setSelectedDepartment={setSelectedDepartment} projects={projects} teamMembers={visibleMembers} departments={visibleDepartments} showReleases={showReleases} setShowReleases={setShowReleases} showMilestones={showMilestones} setShowMilestones={setShowMilestones} />

      {/* Create Event Dialog V2 */}
      <CreateEventDialogV2 open={shouldOpenCreateDialog} onOpenChange={open => {
      setShouldOpenCreateDialog(open);
      if (!open) {
        setPrefilledData(null);
        clearSelection();
      }
    }} onEventCreated={fetchEvents} prefilledData={prefilledData} />

      {/* Calendar Views */}
      <div>
        {viewMode === 'year' ? renderYearView() : viewMode === 'week' ? renderWeekView() : renderMonthView()}
      </div>

      {/* Event Details */}
      {(() => {
        // Compute the active range (single day, selected month, or default by viewMode)
        let rangeStart: Date;
        let rangeEnd: Date;
        let rangeLabel: string;
        let isSingleDay = false;

        if (selectedDate) {
          rangeStart = startOfDay(selectedDate);
          rangeEnd = endOfWeek(rangeStart, { weekStartsOn: 1 }); // overwritten below
          rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 23, 59, 59, 999);
          rangeLabel = `Eventos para ${format(selectedDate, 'PPPP', { locale: es })}`;
          isSingleDay = true;
        } else if (selectedMonth) {
          rangeStart = startOfMonth(selectedMonth);
          rangeEnd = endOfMonth(selectedMonth);
          rangeLabel = `Eventos de ${format(selectedMonth, 'MMMM yyyy', { locale: es })}`;
        } else if (viewMode === 'week') {
          rangeStart = startOfWeek(currentDate, { weekStartsOn: 1 });
          rangeEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
          rangeLabel = `Eventos de la semana del ${format(rangeStart, 'd MMM', { locale: es })} al ${format(rangeEnd, 'd MMM yyyy', { locale: es })}`;
        } else if (viewMode === 'year') {
          rangeStart = startOfYear(currentDate);
          rangeEnd = endOfYear(currentDate);
          rangeLabel = `Eventos de ${format(currentDate, 'yyyy', { locale: es })}`;
        } else {
          // month / quarter
          rangeStart = startOfMonth(currentDate);
          rangeEnd = endOfMonth(addMonths(currentDate, 1));
          rangeLabel = `Eventos de ${format(currentDate, 'MMMM', { locale: es })} – ${format(addMonths(currentDate, 1), 'MMMM yyyy', { locale: es })}`;
        }

        const inRange = (d: Date) => d >= rangeStart && d <= rangeEnd;
        const rangeBookings = filteredBookings
          .filter(b => b.fecha && inRange(new Date(b.fecha)))
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        const rangeEvents = filteredEvents
          .filter(e => inRange(new Date(e.start_date)))
          .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        const total = rangeBookings.length + rangeEvents.length;
        const showDate = !isSingleDay;

        return (
        <Card className="card-moodita">
          <CardHeader>
            <CardTitle>{rangeLabel}</CardTitle>
            <CardDescription>
              {total} evento(s) programado(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Booking Offers */}
            {rangeBookings.map(booking => (
              <div key={booking.id} className="card-interactive p-4 space-y-2 hover-glow border-l-4 border-l-amber-500">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">🎤</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{formatBookingTitle(booking)}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {showDate && booking.fecha && (
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(booking.fecha), "d MMM yyyy", { locale: es })}
                          </div>
                        )}
                        {(booking.lugar || booking.venue) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {booking.lugar || booking.venue}
                          </div>
                        )}
                        {booking.duracion && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.duracion}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={booking.estado === 'confirmado' ? 'default' : 'secondary'}>
                      {booking.estado}
                    </Badge>
                    {booking.formato && <Badge variant="outline">{booking.formato}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  {booking.folder_url && (
                    <Link to={booking.folder_url} className="text-sm text-primary hover:underline flex items-center gap-1">
                      <Folder className="h-3 w-3" />
                      Ver carpeta
                    </Link>
                  )}
                  <Link to={`/booking/${booking.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Ver booking
                  </Link>
                </div>
              </div>
            ))}

            {/* Regular Events */}
            {rangeEvents.map(event => <div key={event.id} className="card-interactive p-4 space-y-2 hover-glow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {showDate && (
                            <div className="flex items-center gap-1 font-medium text-foreground">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(event.start_date), "d MMM yyyy", { locale: es })}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.start_date), 'HH:mm')} - 
                            {format(new Date(event.end_date), 'HH:mm')}
                          </div>
                          {event.location && <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{event.event_type}</Badge>
                      {(() => {
                const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                if (bookingOffer) {
                  const reminders = getRemindersForBooking(bookingOffer.id);
                  return reminders.length > 0 ? <ReminderBadge reminders={reminders} /> : null;
                }
                return null;
              })()}
                      <EditEventDialog event={event} onUpdated={fetchEvents} />
                    </div>
                  </div>
                  {event.description && <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                      {event.description}
                    </p>}
                </div>)}

            {total === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {isSingleDay ? 'No hay eventos programados para esta fecha' : 'No hay eventos en este rango'}
              </div>
            )}
          </CardContent>
        </Card>
        );
      })()}

      {/* Event Detail Popovers - Múltiples */}
      {openEventPopups.map(popup => <EventDetailPopover key={popup.id} event={popup.event} open={true} onOpenChange={() => closePopup(popup.id)} position={popup.position} zIndex={popup.zIndex} onBringToFront={() => bringPopupToFront(popup.id)} onPositionChange={(newPos) => updatePopupPosition(popup.id, newPos)} artistName="David Solans" createdBy="Fabrica Mudita" onEdit={event => {
      setEditingEvent(event);
    }} onDelete={eventId => {
      console.log('Delete event:', eventId);
      closePopup(popup.id);
    }} />)}

      {/* Edit Event Dialog Controlled */}
      <EditEventDialogControlled event={editingEvent} open={!!editingEvent} onOpenChange={open => {
      if (!open) setEditingEvent(null);
    }} onUpdated={fetchEvents} />

      {/* Booking Offer Detail Dialog */}
      <Dialog open={!!selectedBookingOffer} onOpenChange={(open) => {
        if (!open) setSelectedBookingOffer(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎤 {selectedBookingOffer?.festival_ciclo || selectedBookingOffer?.venue || selectedBookingOffer?.lugar || 'Evento'}
              {selectedBookingOffer?.ciudad && ` - ${selectedBookingOffer.ciudad}`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBookingOffer && (
            <div className="space-y-4">
              {/* Fecha */}
              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Fecha:</span>
                <span>{format(new Date(selectedBookingOffer.fecha), 'PPPP', { locale: es })}</span>
              </div>
              
              {/* Lugar */}
              {(selectedBookingOffer.lugar || selectedBookingOffer.venue || selectedBookingOffer.ciudad) && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Lugar:</span>
                  <span>
                    {[selectedBookingOffer.lugar || selectedBookingOffer.venue, selectedBookingOffer.ciudad].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              
              {/* Status */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">Status:</span>
                <Badge variant={
                  selectedBookingOffer.estado === 'confirmado' ? 'default' : 
                  selectedBookingOffer.estado === 'pendiente' ? 'secondary' : 
                  'outline'
                }>
                  {selectedBookingOffer.estado}
                </Badge>
              </div>
              
              {/* Formato */}
              {selectedBookingOffer.formato && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">Formato:</span>
                  <span>{selectedBookingOffer.formato}</span>
                </div>
              )}
              
              {/* Duración */}
              {selectedBookingOffer.duracion && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Duración:</span>
                  <span>{selectedBookingOffer.duracion}</span>
                </div>
              )}
              
              {/* Artista */}
              {selectedBookingOffer.artists && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">Artista:</span>
                  {selectedBookingOffer.artist_id ? (
                    <Link
                      to={`/artistas/${selectedBookingOffer.artist_id}`}
                      onClick={() => setSelectedBookingOffer(null)}
                      className="text-primary hover:underline"
                    >
                      {selectedBookingOffer.artists.stage_name || selectedBookingOffer.artists.name}
                    </Link>
                  ) : (
                    <span>{selectedBookingOffer.artists.stage_name || selectedBookingOffer.artists.name}</span>
                  )}
                </div>
              )}
              
              {/* Enlace a carpeta */}
              {selectedBookingOffer.folder_url && (
                <div className="pt-4 border-t">
                  <Link 
                    to={selectedBookingOffer.folder_url}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    onClick={() => setSelectedBookingOffer(null)}
                  >
                    <Folder className="h-4 w-4" />
                    Ver carpeta del evento
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
              
              {/* Enlace al booking */}
              <div className="pt-2">
                <Link 
                  to={`/booking/${selectedBookingOffer.id}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  onClick={() => setSelectedBookingOffer(null)}
                >
                  Ver detalles completos del booking
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Release & milestone popovers */}
      <ReleaseDayPopover release={selectedRelease} open={!!selectedRelease} onOpenChange={(o) => !o && setSelectedRelease(null)} />
      <MilestoneDayPopover milestone={selectedMilestone?.milestone ?? null} clickedDate={selectedMilestone?.date} open={!!selectedMilestone} onOpenChange={(o) => !o && setSelectedMilestone(null)} />
    </div>;
}