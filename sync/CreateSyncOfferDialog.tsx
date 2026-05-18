import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Film, Music, Users, DollarSign, SplitSquareVertical, X, Plus, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { ContactSelector } from '@/components/ContactSelector';
import { cn } from '@/lib/utils';

interface CreateSyncOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferCreated: () => void;
}

interface ProductionCompany {
  id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface Director {
  id: string;
  name: string;
  contact_email?: string;
  production_company_id?: string;
}

interface Song {
  id: string;
  title: string;
  artist_id?: string;
  isrc?: string;
}

interface SyncSplit {
  id: string;
  split_type: string;
  percentage: number;
  holder_name: string;
  contact_id?: string;
  team_member_id?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role?: string;
  type: 'contact' | 'workspace';
}

const PRODUCTION_TYPES = [
  { value: 'cine', label: 'Cine' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'serie', label: 'Serie TV' },
  { value: 'evento', label: 'Evento' },
  { value: 'videojuego', label: 'Videojuego' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'otro', label: 'Otro' },
];

const TERRITORIES = [
  { value: 'España', label: 'España' },
  { value: 'Europa', label: 'Europa' },
  { value: 'Mundo', label: 'Mundo' },
  { value: 'LATAM', label: 'Latinoamérica' },
  { value: 'USA', label: 'Estados Unidos' },
];

const MEDIA_OPTIONS = [
  'TV', 'Internet', 'Cine', 'RRSS', 'Radio', 'OOH', 'Streaming'
];

const USAGE_TYPES = [
  { value: 'background', label: 'Background / Incidental' },
  { value: 'featured', label: 'Featured / Destacada' },
  { value: 'main_title', label: 'Main Title / Cabecera' },
  { value: 'end_credits', label: 'End Credits / Créditos finales' },
  { value: 'trailer', label: 'Trailer / Promo' },
  { value: 'promo', label: 'Promocional' },
];

const SPLIT_TYPES = [
  { value: 'master', label: 'Master (Sello)' },
  { value: 'publishing', label: 'Publishing (Editorial)' },
  { value: 'songwriter', label: 'Compositor' },
  { value: 'producer', label: 'Productor' },
  { value: 'manager', label: 'Manager' },
  { value: 'band', label: 'Banda' },
  { value: 'label', label: 'Sello' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'other', label: 'Otro' },
];

export function CreateSyncOfferDialog({ open, onOpenChange, onOfferCreated }: CreateSyncOfferDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('project');
  
  // Production Companies & Directors
  const [productionCompanies, setProductionCompanies] = useState<ProductionCompany[]>([]);
  const [directors, setDirectors] = useState<Director[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Project Details
  const [productionTitle, setProductionTitle] = useState('');
  const [productionType, setProductionType] = useState('');
  const [selectedProductionCompanyId, setSelectedProductionCompanyId] = useState<string | null>(null);
  const [productionCompanyName, setProductionCompanyName] = useState('');
  const [selectedDirectorId, setSelectedDirectorId] = useState<string | null>(null);
  const [directorName, setDirectorName] = useState('');
  const [territory, setTerritory] = useState('España');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [durationYears, setDurationYears] = useState(1);
  
  // Popovers
  const [productionCompanyOpen, setProductionCompanyOpen] = useState(false);
  const [directorOpen, setDirectorOpen] = useState(false);
  const [songOpen, setSongOpen] = useState(false);

  // Music Usage
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const [usageType, setUsageType] = useState('');
  const [usageDuration, setUsageDuration] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');

  // Contact Info
  const [requesterContactId, setRequesterContactId] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterCompany, setRequesterCompany] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');

  // Financial
  const [totalBudget, setTotalBudget] = useState('');
  const [musicBudget, setMusicBudget] = useState('');
  const [syncFee, setSyncFee] = useState('');

  // Dynamic Splits
  const [splits, setSplits] = useState<SyncSplit[]>([
    { id: crypto.randomUUID(), split_type: 'master', percentage: 50, holder_name: '' },
    { id: crypto.randomUUID(), split_type: 'publishing', percentage: 50, holder_name: '' },
  ]);

  // Notes
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      fetchProductionCompanies();
      fetchDirectors();
      fetchSongs();
      fetchTeamMembers();
    }
  }, [open]);

  useEffect(() => {
    if (selectedArtistId) {
      fetchSongs();
      fetchTeamMembers();
    }
  }, [selectedArtistId]);

  const fetchProductionCompanies = async () => {
    const { data } = await supabase
      .from('production_companies')
      .select('*')
      .order('name');
    setProductionCompanies(data || []);
  };

  const fetchDirectors = async () => {
    const { data } = await supabase
      .from('directors')
      .select('*')
      .order('name');
    setDirectors(data || []);
  };

  const fetchSongs = async () => {
    let query = supabase.from('songs').select('id, title, artist_id, isrc').order('title');
    if (selectedArtistId) {
      query = query.eq('artist_id', selectedArtistId);
    }
    const { data } = await query;
    setSongs(data || []);
  };

  const fetchTeamMembers = async () => {
    if (!user) return;
    
    const members: TeamMember[] = [];
    
    // Get contacts that are team members
    let contactQuery = supabase
      .from('contacts')
      .select('id, name, stage_name, role, field_config')
      .eq('created_by', user.id);
    
    const { data: contacts } = await contactQuery;
    
    (contacts || []).forEach((c: any) => {
      const config = c.field_config as Record<string, any> | null;
      if (config?.is_team_member === true) {
        members.push({
          id: c.id,
          name: c.stage_name || c.name,
          role: c.role,
          type: 'contact',
        });
      }
    });
    
    setTeamMembers(members);
  };

  const handleSelectProductionCompany = (company: ProductionCompany) => {
    setSelectedProductionCompanyId(company.id);
    setProductionCompanyName(company.name);
    
    // Auto-fill requester info if available
    if (company.contact_name) setRequesterName(company.contact_name);
    if (company.contact_email) setRequesterEmail(company.contact_email);
    if (company.contact_phone) setRequesterPhone(company.contact_phone);
    setRequesterCompany(company.name);
    
    setProductionCompanyOpen(false);
  };

  const handleCreateProductionCompany = async () => {
    if (!productionCompanyName.trim() || !user) return;
    
    const { data, error } = await supabase
      .from('production_companies')
      .insert({
        name: productionCompanyName,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (!error && data) {
      setProductionCompanies(prev => [...prev, data]);
      setSelectedProductionCompanyId(data.id);
      setProductionCompanyOpen(false);
    }
  };

  const handleSelectDirector = (director: Director) => {
    setSelectedDirectorId(director.id);
    setDirectorName(director.name);
    setDirectorOpen(false);
  };

  const handleCreateDirector = async () => {
    if (!directorName.trim() || !user) return;
    
    const { data, error } = await supabase
      .from('directors')
      .insert({
        name: directorName,
        production_company_id: selectedProductionCompanyId,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (!error && data) {
      setDirectors(prev => [...prev, data]);
      setSelectedDirectorId(data.id);
      setDirectorOpen(false);
    }
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSongId(song.id);
    setSongTitle(song.title);
    setSongOpen(false);
  };

  const toggleMedia = (media: string) => {
    setSelectedMedia(prev => 
      prev.includes(media) 
        ? prev.filter(m => m !== media)
        : [...prev, media]
    );
  };

  const addSplit = () => {
    setSplits(prev => [
      ...prev,
      { id: crypto.randomUUID(), split_type: 'other', percentage: 0, holder_name: '' }
    ]);
  };

  const removeSplit = (id: string) => {
    setSplits(prev => prev.filter(s => s.id !== id));
  };

  const updateSplit = (id: string, field: keyof SyncSplit, value: any) => {
    setSplits(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const totalSplitPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);

  const handleSubmit = async () => {
    if (!productionTitle || !productionType || !songTitle) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el título de producción, tipo y canción.",
        variant: "destructive",
      });
      return;
    }

    if (totalSplitPercentage !== 100) {
      toast({
        title: "Splits inválidos",
        description: "La suma de los porcentajes debe ser exactamente 100%.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const syncFeeValue = syncFee ? parseFloat(syncFee) : null;
      
      // Calculate master and publishing from splits
      const masterSplit = splits.find(s => s.split_type === 'master');
      const publishingSplit = splits.find(s => s.split_type === 'publishing');
      const masterPercentage = masterSplit?.percentage || 0;
      const publishingPercentage = publishingSplit?.percentage || 0;
      const masterFee = syncFeeValue ? (syncFeeValue * masterPercentage) / 100 : null;
      const publishingFee = syncFeeValue ? (syncFeeValue * publishingPercentage) / 100 : null;

      const { data: syncOffer, error } = await supabase.from('sync_offers').insert({
        production_title: productionTitle,
        production_type: productionType,
        production_company: productionCompanyName || null,
        production_company_id: selectedProductionCompanyId,
        director: directorName || null,
        director_id: selectedDirectorId,
        territory,
        media: selectedMedia,
        duration_years: durationYears,
        song_title: songTitle,
        song_id: selectedSongId,
        song_artist: null,
        artist_id: selectedArtistId,
        usage_type: usageType || null,
        usage_duration: usageDuration || null,
        scene_description: sceneDescription || null,
        requester_name: requesterName || null,
        requester_email: requesterEmail || null,
        requester_company: requesterCompany || null,
        requester_phone: requesterPhone || null,
        requester_contact_id: requesterContactId,
        total_budget: totalBudget ? parseFloat(totalBudget) : null,
        music_budget: musicBudget ? parseFloat(musicBudget) : null,
        sync_fee: syncFeeValue,
        master_fee: masterFee,
        publishing_fee: publishingFee,
        master_percentage: masterPercentage,
        publishing_percentage: publishingPercentage,
        master_holder: masterSplit?.holder_name || null,
        publishing_holder: publishingSplit?.holder_name || null,
        notes: notes || null,
        phase: 'solicitud',
        created_by: user?.id,
      }).select().single();

      if (error) throw error;

      // Insert splits
      if (syncOffer && splits.length > 0) {
        const splitsToInsert = splits.map(s => ({
          sync_offer_id: syncOffer.id,
          split_type: s.split_type,
          percentage: s.percentage,
          holder_name: s.holder_name || null,
          contact_id: s.contact_id || null,
          team_member_id: s.team_member_id || null,
        }));
        
        await supabase.from('sync_splits').insert(splitsToInsert);
      }

      toast({
        title: "Oferta creada",
        description: "La oferta de sincronización se ha creado correctamente.",
      });

      onOfferCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating sync offer:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la oferta de sincronización.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductionTitle('');
    setProductionType('');
    setSelectedProductionCompanyId(null);
    setProductionCompanyName('');
    setSelectedDirectorId(null);
    setDirectorName('');
    setTerritory('España');
    setSelectedMedia([]);
    setDurationYears(1);
    setSelectedArtistId(null);
    setSelectedSongId(null);
    setSongTitle('');
    setUsageType('');
    setUsageDuration('');
    setSceneDescription('');
    setRequesterContactId(null);
    setRequesterName('');
    setRequesterEmail('');
    setRequesterCompany('');
    setRequesterPhone('');
    setTotalBudget('');
    setMusicBudget('');
    setSyncFee('');
    setSplits([
      { id: crypto.randomUUID(), split_type: 'master', percentage: 50, holder_name: '' },
      { id: crypto.randomUUID(), split_type: 'publishing', percentage: 50, holder_name: '' },
    ]);
    setNotes('');
    setActiveTab('project');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Nueva Oferta de Sincronización
          </DialogTitle>
          <DialogDescription>
            Registra una nueva solicitud de licencia para cine, publicidad o TV.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="project" className="flex items-center gap-1 text-xs">
              <Film className="h-3 w-3" />
              Producción
            </TabsTrigger>
            <TabsTrigger value="music" className="flex items-center gap-1 text-xs">
              <Music className="h-3 w-3" />
              Música
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              Contacto
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-1 text-xs">
              <DollarSign className="h-3 w-3" />
              Financiero
            </TabsTrigger>
            <TabsTrigger value="splits" className="flex items-center gap-1 text-xs">
              <SplitSquareVertical className="h-3 w-3" />
              Splits
            </TabsTrigger>
          </TabsList>

          {/* Project Details Tab */}
          <TabsContent value="project" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="production-title">Título de la Producción *</Label>
                <Input
                  id="production-title"
                  value={productionTitle}
                  onChange={(e) => setProductionTitle(e.target.value)}
                  placeholder="Ej: La Casa de Papel - Temporada 5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Producción *</Label>
                  <Select value={productionType} onValueChange={setProductionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Territorio</Label>
                  <Select value={territory} onValueChange={setTerritory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar territorio" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERRITORIES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Productora</Label>
                  <Popover open={productionCompanyOpen} onOpenChange={setProductionCompanyOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {productionCompanyName || "Seleccionar o crear..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar o crear productora..." 
                          value={productionCompanyName}
                          onValueChange={setProductionCompanyName}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleCreateProductionCompany}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Crear "{productionCompanyName}"
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {productionCompanies.map((company) => (
                              <CommandItem
                                key={company.id}
                                onSelect={() => handleSelectProductionCompany(company)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedProductionCompanyId === company.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {company.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Director</Label>
                  <Popover open={directorOpen} onOpenChange={setDirectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {directorName || "Seleccionar o crear..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar o crear director..." 
                          value={directorName}
                          onValueChange={setDirectorName}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleCreateDirector}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Crear "{directorName}"
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {directors.map((director) => (
                              <CommandItem
                                key={director.id}
                                onSelect={() => handleSelectDirector(director)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedDirectorId === director.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {director.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Medios</Label>
                <div className="flex flex-wrap gap-2">
                  {MEDIA_OPTIONS.map((media) => (
                    <Badge
                      key={media}
                      variant={selectedMedia.includes(media) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/90"
                      onClick={() => toggleMedia(media)}
                    >
                      {media}
                      {selectedMedia.includes(media) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duración de la Licencia: {durationYears} {durationYears === 1 ? 'año' : 'años'}</Label>
                <Slider
                  value={[durationYears]}
                  onValueChange={(v) => setDurationYears(v[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </TabsContent>

          {/* Music Usage Tab */}
          <TabsContent value="music" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Artista</Label>
                <SingleArtistSelector
                  value={selectedArtistId}
                  onValueChange={setSelectedArtistId}
                  placeholder="Vincular a un artista..."
                />
              </div>

              <div className="space-y-2">
                <Label>Canción *</Label>
                {songs.length > 0 ? (
                  <Popover open={songOpen} onOpenChange={setSongOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {songTitle || "Seleccionar canción del catálogo..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar canción..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron canciones.</CommandEmpty>
                          <CommandGroup>
                            {songs.map((song) => (
                              <CommandItem
                                key={song.id}
                                onSelect={() => handleSelectSong(song)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedSongId === song.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{song.title}</span>
                                  {song.isrc && (
                                    <span className="text-xs text-muted-foreground">ISRC: {song.isrc}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="Nombre de la obra requerida"
                  />
                )}
                {songs.length > 0 && !selectedSongId && (
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">O escribe manualmente:</Label>
                    <Input
                      value={songTitle}
                      onChange={(e) => { setSongTitle(e.target.value); setSelectedSongId(null); }}
                      placeholder="Nombre de la obra requerida"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Uso</Label>
                  <Select value={usageType} onValueChange={setUsageType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar uso" />
                    </SelectTrigger>
                    <SelectContent>
                      {USAGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usage-duration">Duración del Uso</Label>
                  <Input
                    id="usage-duration"
                    value={usageDuration}
                    onChange={(e) => setUsageDuration(e.target.value)}
                    placeholder="Ej: 30s, 1:20, Full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scene-description">Descripción de la Escena</Label>
                <Textarea
                  id="scene-description"
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  placeholder="Describe brevemente cómo se usará la música en la producción..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Seleccionar Contacto Existente</Label>
                <ContactSelector
                  value={requesterContactId}
                  onValueChange={(id) => setRequesterContactId(id)}
                  placeholder="Vincular a un contacto..."
                  compact
                />
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-4">O introduce los datos manualmente:</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requester-name">Nombre del Solicitante</Label>
                    <Input
                      id="requester-name"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requester-company">Empresa</Label>
                    <Input
                      id="requester-company"
                      value={requesterCompany}
                      onChange={(e) => setRequesterCompany(e.target.value)}
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="requester-email">Email</Label>
                    <Input
                      id="requester-email"
                      type="email"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      placeholder="email@empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requester-phone">Teléfono</Label>
                    <Input
                      id="requester-phone"
                      value={requesterPhone}
                      onChange={(e) => setRequesterPhone(e.target.value)}
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total-budget">Presupuesto Total (€)</Label>
                  <Input
                    id="total-budget"
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="music-budget">Presupuesto Música (€)</Label>
                  <Input
                    id="music-budget"
                    type="number"
                    value={musicBudget}
                    onChange={(e) => setMusicBudget(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync-fee">Sync Fee Propuesto (€)</Label>
                <Input
                  id="sync-fee"
                  type="number"
                  value={syncFee}
                  onChange={(e) => setSyncFee(e.target.value)}
                  placeholder="0.00"
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  Este es el precio total por la licencia de sincronización.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre la negociación..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          {/* Dynamic Splits Tab */}
          <TabsContent value="splits" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Distribución de Royalties</h4>
                  <p className="text-sm text-muted-foreground">Define cómo se repartirá el sync fee</p>
                </div>
                <Badge variant={totalSplitPercentage === 100 ? "default" : "destructive"}>
                  Total: {totalSplitPercentage}%
                </Badge>
              </div>

              <div className="space-y-3">
                {splits.map((split, index) => (
                  <div key={split.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Split #{index + 1}</span>
                        {syncFee && split.percentage > 0 && (
                          <Badge variant="secondary">
                            €{((parseFloat(syncFee) * split.percentage) / 100).toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      {splits.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSplit(split.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select 
                          value={split.split_type} 
                          onValueChange={(v) => updateSplit(split.id, 'split_type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPLIT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Porcentaje: {split.percentage}%</Label>
                        <Slider
                          value={[split.percentage]}
                          onValueChange={(v) => updateSplit(split.id, 'percentage', v[0])}
                          min={0}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Titular / Beneficiario</Label>
                      <div className="flex gap-2">
                        <Input
                          value={split.holder_name}
                          onChange={(e) => updateSplit(split.id, 'holder_name', e.target.value)}
                          placeholder="Nombre del titular"
                          className="flex-1"
                        />
                      </div>
                      {teamMembers.length > 0 && (
                        <Select
                          value={split.contact_id || ''}
                          onValueChange={(v) => {
                            const member = teamMembers.find(m => m.id === v);
                            updateSplit(split.id, 'contact_id', v || null);
                            if (member) {
                              updateSplit(split.id, 'holder_name', member.name);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="O vincular a miembro del equipo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                <div className="flex items-center gap-2">
                                  <span>{member.name}</span>
                                  {member.role && (
                                    <Badge variant="outline" className="text-xs">{member.role}</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={addSplit} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Split
              </Button>

              {syncFee && totalSplitPercentage === 100 && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h5 className="font-medium mb-2">Resumen de Distribución</h5>
                  <div className="space-y-1">
                    {splits.map((split) => {
                      const amount = (parseFloat(syncFee) * split.percentage) / 100;
                      const typeLabel = SPLIT_TYPES.find(t => t.value === split.split_type)?.label || split.split_type;
                      return (
                        <div key={split.id} className="flex justify-between text-sm">
                          <span>{typeLabel}: {split.holder_name || 'Sin asignar'}</span>
                          <span className="font-medium">€{amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando...' : 'Crear Oferta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
