import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, Users, FolderKanban, User, Music, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';
import { TeamSelectorByArtist } from '@/components/TeamSelectorByArtist';

const eventTypes = [
  { value: 'concert', label: 'Concierto' },
  { value: 'recording', label: 'Ensayo' },
  { value: 'meeting', label: 'Reunión' },
  { value: 'interview', label: 'Entrevista' },
  { value: 'deadline', label: 'Compromiso' },
  { value: 'other', label: 'Otros' }
] as const;

const personalCategories = [
  { value: 'meeting', label: 'Reunión' },
  { value: 'medical', label: 'Médico' },
  { value: 'personal', label: 'Personal' },
  { value: 'travel', label: 'Viaje' },
  { value: 'other', label: 'Otros' }
] as const;

const interviewFormats = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'telefonica', label: 'Telefónica' },
  { value: 'video', label: 'Videollamada' },
  { value: 'escrita', label: 'Escrita' },
  { value: 'radio', label: 'Radio' },
  { value: 'tv', label: 'TV' },
] as const;

const formSchema = z.object({
  eventContext: z.enum(['project', 'personal']),
  project_id: z.string().optional(),
  artist_ids: z.array(z.string()).optional(),
  team_member_ids: z.array(z.string()).optional(),
  title: z.string().min(1, 'El título es requerido'),
  event_type: z.string().min(1, 'Selecciona un tipo'),
  start_date: z.date({ required_error: 'La fecha es requerida' }),
  start_time: z.string().min(1, 'Hora requerida'),
  end_date: z.date({ required_error: 'La fecha es requerida' }),
  end_time: z.string().min(1, 'Hora requerida'),
  description: z.string().optional(),
  invitees: z.array(z.string()).default([]),
  syncWithGoogle: z.boolean().default(false),
  // Interview-specific fields
  interview_program: z.string().optional(),
  interview_medio: z.string().optional(),
  interview_formato: z.string().optional(),
  interview_entrevistador: z.string().optional(),
  interview_info_adicional: z.string().optional(),
  interview_comentarios: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
}

interface GlobalTeamMember {
  id: string;
  name: string;
  category?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  selected: boolean;
}

interface Project {
  id: string;
  name: string;
  artist_id: string | null;
}

interface CreateEventDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
  prefilledData?: any;
}

export function CreateEventDialogV2({ 
  open, 
  onOpenChange, 
  onEventCreated, 
  prefilledData 
}: CreateEventDialogV2Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [globalTeamMembers, setGlobalTeamMembers] = useState<GlobalTeamMember[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isConnected: googleConnected, createEvent: createGoogleEvent } = useGoogleCalendar();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventContext: 'project',
      project_id: '',
      artist_ids: [],
      team_member_ids: [],
      title: prefilledData?.title || '',
      event_type: prefilledData?.event_type || '',
      start_time: prefilledData?.start_date ? format(new Date(prefilledData.start_date), 'HH:mm') : '09:00',
      end_time: prefilledData?.end_date ? format(new Date(prefilledData.end_date), 'HH:mm') : '10:00',
      start_date: prefilledData?.start_date ? new Date(prefilledData.start_date) : undefined,
      end_date: prefilledData?.end_date ? new Date(prefilledData.end_date) : undefined,
      description: '',
      invitees: [],
      syncWithGoogle: false,
      interview_program: '',
      interview_medio: '',
      interview_formato: '',
      interview_entrevistador: '',
      interview_info_adicional: '',
      interview_comentarios: '',
    },
  });

  const eventContext = form.watch('eventContext');
  const selectedProjectId = form.watch('project_id');
  const selectedArtistIds = form.watch('artist_ids') || [];
  const selectedTeamMemberIds = form.watch('team_member_ids') || [];
  const selectedEventType = form.watch('event_type');

  // Fetch projects, artists and global team members
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, artist_id')
          .order('name');
        if (projectsError) throw projectsError;
        setProjects(projectsData || []);

        // Artists from artists table (roster)
        const { data: artistsData, error: artistsError } = await supabase
          .from('artists')
          .select('id, name, stage_name')
          .order('name');
        if (artistsError) throw artistsError;
        setArtists(artistsData || []);

        // Global team members (workspace + team contacts)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const allMembers: GlobalTeamMember[] = [];

        // Workspace
        const { data: profileData } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single();

        if (profileData?.workspace_id) {
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('created_by')
            .eq('id', profileData.workspace_id)
            .single();

          let { data: members } = await supabase
            .from('workspace_memberships')
            .select('id, user_id, role, team_category')
            .eq('workspace_id', profileData.workspace_id);

          // Auto-create owner membership if needed
          if ((!members || members.length === 0) && workspace?.created_by === user.id) {
            const { data: newMembership } = await supabase
              .from('workspace_memberships')
              .insert({
                workspace_id: profileData.workspace_id,
                user_id: user.id,
                role: 'OWNER',
                team_category: 'management',
              })
              .select('id, user_id, role, team_category')
              .single();
            members = newMembership ? [newMembership] : [];
          }

          if (members && members.length > 0) {
            const catMap = new Map<string, string>();
            members.forEach((m: any) => catMap.set(m.user_id, m.team_category || 'otro'));

            const userIds = members.map((m: any) => m.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name, stage_name')
              .in('user_id', userIds);

            (profiles || []).forEach((p: any) => {
              allMembers.push({
                id: p.user_id,
                name: p.stage_name || p.full_name || 'Sin nombre',
                category: catMap.get(p.user_id),
              });
            });
          }
        }

        // Team contacts
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, stage_name, category, field_config')
          .eq('created_by', user.id);

        (contacts || []).forEach((c: any) => {
          const config = c.field_config as Record<string, any> | null;
          if (!config?.is_team_member) return;
          const cats: string[] = Array.isArray(config?.team_categories) ? config.team_categories : [];
          allMembers.push({
            id: c.id,
            name: c.stage_name || c.name,
            category: cats[0] || c.category,
          });
        });

        setGlobalTeamMembers(allMembers);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingProjects(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  // Fetch team members when project is selected
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedProjectId) {
        setTeamMembers([]);
        return;
      }

      try {
        // Get project role bindings
        const { data: bindings, error } = await supabase
          .from('project_role_bindings')
          .select('user_id, role')
          .eq('project_id', selectedProjectId);

        if (error) throw error;

        if (bindings && bindings.length > 0) {
          const userIds = bindings.map(b => b.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('user_id', userIds);

          const members: TeamMember[] = bindings.map(binding => {
            const profileData = profiles?.find(p => p.id === binding.user_id);
            const roleLabels: Record<string, string> = {
              'OWNER': 'Propietario',
              'EDITOR': 'Editor',
              'VIEWER': 'Visor',
              'MANAGER': 'Manager',
            };
            return {
              id: binding.user_id,
              name: profileData?.full_name || 'Usuario',
              role: roleLabels[binding.role] || binding.role,
              selected: true, // Pre-selected by default
            };
          });

          setTeamMembers(members);
          form.setValue('invitees', members.map(m => m.id));
        }
      } catch (error) {
        console.error('Error fetching team:', error);
      }
    };

    fetchTeamMembers();
  }, [selectedProjectId, form]);

  // Update form when prefilledData changes
  useEffect(() => {
    if (prefilledData) {
      form.reset({
        eventContext: 'project',
        project_id: '',
        title: prefilledData.title || '',
        event_type: prefilledData.event_type || '',
        start_time: prefilledData.start_date ? format(new Date(prefilledData.start_date), 'HH:mm') : '09:00',
        end_time: prefilledData.end_date ? format(new Date(prefilledData.end_date), 'HH:mm') : '10:00',
        start_date: prefilledData.start_date ? new Date(prefilledData.start_date) : undefined,
        end_date: prefilledData.end_date ? new Date(prefilledData.end_date) : undefined,
        description: '',
        invitees: [],
        syncWithGoogle: false,
      });
    }
  }, [prefilledData, form]);

  const toggleTeamMember = (memberId: string) => {
    const updated = teamMembers.map(m => 
      m.id === memberId ? { ...m, selected: !m.selected } : m
    );
    setTeamMembers(updated);
    form.setValue('invitees', updated.filter(m => m.selected).map(m => m.id));
  };

  const toggleArtist = (artistId: string) => {
    const current = form.getValues('artist_ids') || [];
    if (current.includes(artistId)) {
      form.setValue('artist_ids', current.filter(id => id !== artistId));
    } else {
      form.setValue('artist_ids', [...current, artistId]);
    }
  };

  const toggleGlobalTeamMember = (memberId: string) => {
    const current = form.getValues('team_member_ids') || [];
    if (current.includes(memberId)) {
      form.setValue('team_member_ids', current.filter(id => id !== memberId));
    } else {
      form.setValue('team_member_ids', [...current, memberId]);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!profile) {
      toast({
        title: "Error",
        description: "No se pudo obtener el perfil de usuario",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const startDateTime = new Date(data.start_date);
      const [startHours, startMinutes] = data.start_time.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(data.end_date);
      const [endHours, endMinutes] = data.end_time.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Get artist_id from project if linked
      let artistId = profile.id;
      if (data.eventContext === 'project' && data.project_id) {
        const project = projects.find(p => p.id === data.project_id);
        if (project?.artist_id) {
          artistId = project.artist_id;
        }
      }

      // Build description with interview data if applicable
      let fullDescription = data.description || '';
      if (data.event_type === 'interview') {
        const interviewParts = [];
        if (data.interview_program) interviewParts.push(`Programa: ${data.interview_program}`);
        if (data.interview_medio) interviewParts.push(`Medio/Canal: ${data.interview_medio}`);
        if (data.interview_formato) interviewParts.push(`Formato: ${data.interview_formato}`);
        if (data.interview_entrevistador) interviewParts.push(`Entrevistador: ${data.interview_entrevistador}`);
        if (data.interview_info_adicional) interviewParts.push(`Info adicional: ${data.interview_info_adicional}`);
        if (data.interview_comentarios) interviewParts.push(`Comentarios: ${data.interview_comentarios}`);
        if (interviewParts.length > 0) {
          fullDescription = interviewParts.join('\n') + (fullDescription ? '\n\n' + fullDescription : '');
        }
      }

      const eventPayload = {
        title: data.title,
        event_type: data.event_type,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        description: fullDescription || null,
        artist_id: artistId,
        created_by: profile.id,
        // Note: events table doesn't have project_id column
      };

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert(eventPayload)
        .select()
        .single();

      if (eventError) {
        throw eventError;
      }

      // Create event_artists entries for invitees
      if (data.invitees.length > 0) {
        const entries = data.invitees.map(userId => ({
          event_id: eventData.id,
          artist_id: userId
        }));

        await supabase.from('event_artists').insert(entries);
      }

      // Sync with Google if requested
      if (data.syncWithGoogle && googleConnected) {
        await createGoogleEvent({
          summary: data.title,
          description: data.description || '',
          start: { dateTime: startDateTime.toISOString(), timeZone: 'Europe/Madrid' },
          end: { dateTime: endDateTime.toISOString(), timeZone: 'Europe/Madrid' },
        });
      }

      toast({
        title: "¡Éxito!",
        description: `Evento "${data.title}" creado exitosamente`,
      });

      form.reset();
      onOpenChange(false);
      onEventCreated();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el evento",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Crear Evento
          </DialogTitle>
          <DialogDescription>
            Crea un evento vinculado a un proyecto o personal
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Context Selector */}
            <FormField
              control={form.control}
              name="eventContext"
              render={({ field }) => (
                <FormItem>
                  <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="project" className="gap-2">
                        <FolderKanban className="h-4 w-4" />
                        Vinculado a Proyecto
                      </TabsTrigger>
                      <TabsTrigger value="personal" className="gap-2">
                        <User className="h-4 w-4" />
                        Evento Personal
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormItem>
              )}
            />

            {/* Project Selector - Only show if project context */}
            {eventContext === 'project' && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proyecto</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={loadingProjects}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingProjects ? "Cargando..." : "Seleccionar proyecto"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Artist Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Music className="h-4 w-4" />
                Artistas
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {selectedArtistIds.length > 0 
                      ? `${selectedArtistIds.length} artista(s) seleccionado(s)`
                      : "Seleccionar artistas..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2" align="start">
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {artists.map((artist) => (
                      <div
                        key={artist.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted",
                          selectedArtistIds.includes(artist.id) && "bg-primary/10"
                        )}
                        onClick={() => toggleArtist(artist.id)}
                      >
                        <Checkbox checked={selectedArtistIds.includes(artist.id)} />
                        <span>{artist.stage_name || artist.name}</span>
                      </div>
                    ))}
                    {artists.length === 0 && (
                      <p className="text-sm text-muted-foreground p-2">No hay artistas</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedArtistIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedArtistIds.map(id => {
                    const artist = artists.find(a => a.id === id);
                    return artist ? (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {artist.stage_name || artist.name}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleArtist(id)} />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Global Team Member Selector */}
            <TeamSelectorByArtist
              selectedArtistIds={selectedArtistIds}
              selectedTeamMemberIds={selectedTeamMemberIds}
              onSelectionChange={(ids) => form.setValue('team_member_ids', ids)}
            />

            {/* Team Members - Only show if project selected (project invitees) */}
            {eventContext === 'project' && selectedProjectId && teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Invitados del Proyecto
                </Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-full border cursor-pointer transition-colors",
                        member.selected 
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background border-muted-foreground/20 text-muted-foreground"
                      )}
                      onClick={() => toggleTeamMember(member.id)}
                    >
                      <Checkbox 
                        checked={member.selected}
                        className="h-3.5 w-3.5"
                      />
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {member.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{member.name}</span>
                      <span className="text-[10px] opacity-60">({member.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del evento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Type / Category */}
            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{eventContext === 'project' ? 'Tipo de Evento' : 'Categoría'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(eventContext === 'project' ? eventTypes : personalCategories).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Interview-specific fields */}
            {selectedEventType === 'interview' && (
              <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                  Información Específica - Entrevista
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="interview_program"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Programa</FormLabel>
                        <FormControl>
                          <Input placeholder="La Ventana" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interview_medio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medio / Canal</FormLabel>
                        <FormControl>
                          <Input placeholder="Cadena SER" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="interview_formato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona formato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {interviewFormats.map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interview_entrevistador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del entrevistador</FormLabel>
                      <FormControl>
                        <Input placeholder="María García" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interview_info_adicional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Información adicional</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enlace, preguntas previstas, temática..." 
                          className="resize-none h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interview_comentarios"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comentarios de la solicitante</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Cualquier información adicional relevante" 
                          className="resize-none h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Date & Time - Compact Row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "d MMM", { locale: es }) : "Fecha"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            // Also set end_date to same day
                            form.setValue('end_date', date!);
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inicio</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input 
                            type="time" 
                            className="pl-7 h-8 text-sm" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input 
                            type="time" 
                            className="pl-7 h-8 text-sm" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalles adicionales..." 
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Google Sync */}
            {googleConnected && (
              <FormField
                control={form.control}
                name="syncWithGoogle"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Sincronizar con Google Calendar
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear Evento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
