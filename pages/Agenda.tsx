import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, LayoutGrid, CreditCard, Mail, Phone, MapPin, Building, Edit2, MoreVertical, Settings, Tag, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateContactDialog } from '@/components/CreateContactDialog';
import { EditContactDialog } from '@/components/EditContactDialog';
import { ContactShareDialog } from '@/components/ContactShareDialog';
import { ContactProfileSheet } from '@/components/ContactProfileSheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RolodexView } from '@/components/RolodexView';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ManageContactGroupsDialog } from '@/components/ManageContactGroupsDialog';
import { CategoryManagerSheet } from '@/components/CategoryManagerSheet';
import { TEAM_CATEGORIES, TeamCategoryOption, getTeamCategoryLabel, getTeamCategoryIcon } from '@/lib/teamCategories';
import { deduplicateContacts } from '@/lib/deduplicateContacts';
import { HubGate } from '@/components/permissions/HubGate';

interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  bank_info?: string;
  iban?: string;
  clothing_size?: string;
  shoe_size?: string;
  allergies?: string;
  special_needs?: string;
  contract_url?: string;
  preferred_hours?: string;
  company?: string;
  role?: string;
  category: string;
  city?: string;
  country?: string;
  notes?: string;
  tags?: string[];
  field_config: any;
  is_public: boolean;
  avatar_url?: string;
  public_slug?: string;
  created_at: string;
  updated_at: string;
}

// Categories unified with Teams via TEAM_CATEGORIES

function AgendaInner() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [sharingContact, setSharingContact] = useState<Contact | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'rolodex'>('grid');
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [artists, setArtists] = useState<Array<{ id: string; name: string; stage_name: string | null; avatar_url: string | null; contact_count: number }>>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactRefreshTrigger, setContactRefreshTrigger] = useState(0);
  const [customCategories, setCustomCategories] = useState<Array<{ value: string; label: string; icon?: any; isCustom: boolean }>>([]);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryOrderVersion, setCategoryOrderVersion] = useState(0);

  // Load custom categories from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('custom_team_categories');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomCategories(parsed.map((c: any) => ({ ...c, icon: undefined, isCustom: true })));
      } catch (e) {
        console.error('Error loading custom categories:', e);
      }
    }
  }, [categoryOrderVersion]);

  // Categories ordered for display
  const allCategoriesForDisplay = useMemo(() => {
    const labelOverrides = (() => {
      try {
        const stored = localStorage.getItem('category_label_overrides');
        return stored ? JSON.parse(stored) : {};
      } catch { return {}; }
    })();
    const systemWithLabels = TEAM_CATEGORIES.map(cat => ({
      ...cat,
      label: labelOverrides[cat.value] || cat.label,
    }));
    const all: TeamCategoryOption[] = [...systemWithLabels, ...customCategories];
    const savedOrder = localStorage.getItem('category_order');
    if (savedOrder) {
      try {
        const orderIds: string[] = JSON.parse(savedOrder);
        const ordered = orderIds
          .map(id => all.find(c => c.value === id))
          .filter(Boolean) as TeamCategoryOption[];
        const newCats = all.filter(c => !orderIds.includes(c.value));
        return [...ordered, ...newCats];
      } catch { return all; }
    }
    return all;
  }, [customCategories, categoryOrderVersion]);

  // Category management handlers
  const handleAddCustomCategory = (name: string) => {
    const value = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const exists = [...TEAM_CATEGORIES, ...customCategories].some(c => c.value === value);
    if (exists) {
      toast({ title: 'La categoría ya existe', variant: 'destructive' });
      return;
    }
    const newCat = { value, label: name, isCustom: true as const };
    const updated = [...customCategories, newCat];
    localStorage.setItem('custom_team_categories', JSON.stringify(updated));
    setCustomCategories(updated.map(c => ({ ...c, icon: undefined, isCustom: true })));
    setCategoryOrderVersion(v => v + 1);
    toast({ title: `Categoría "${name}" creada` });
  };

  const handleRenameCategory = (categoryValue: string, newLabel: string) => {
    const updated = customCategories.map(c =>
      c.value === categoryValue ? { ...c, label: newLabel } : c
    );
    localStorage.setItem('custom_team_categories', JSON.stringify(updated));
    setCustomCategories(updated.map(c => ({ ...c, icon: undefined, isCustom: true })));
    setCategoryOrderVersion(v => v + 1);
    toast({ title: `Categoría renombrada a "${newLabel}"` });
  };

  const handleDeleteCategory = (categoryValue: string) => {
    const updated = customCategories.filter(c => c.value !== categoryValue);
    localStorage.setItem('custom_team_categories', JSON.stringify(updated));
    setCustomCategories(updated.map(c => ({ ...c, icon: undefined, isCustom: true })));
    setCategoryOrderVersion(v => v + 1);
    toast({ title: 'Categoría eliminada' });
  };

  const handleCategoryReorder = (orderedValues: string[]) => {
    localStorage.setItem('category_order', JSON.stringify(orderedValues));
    setCategoryOrderVersion(v => v + 1);
  };

  const handleDeduplicateContacts = useCallback(async () => {
    try {
      const result = await deduplicateContacts();
      if (result.deleted > 0) {
        toast({
          title: `${result.deleted} contactos duplicados fusionados`,
          description: `Se consolidaron en ${result.merged} perfiles únicos`,
        });
        fetchContacts();
      } else {
        toast({ title: 'No se encontraron duplicados' });
      }
    } catch (error) {
      console.error('Error deduplicating:', error);
      toast({ title: 'Error al deduplicar', variant: 'destructive' });
    }
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    contacts.forEach(c => {
      counts.set(c.category, (counts.get(c.category) || 0) + 1);
    });
    return counts;
  }, [contacts]);

  const cities = Array.from(new Set(contacts.map(c => c.city).filter(Boolean))).sort();
  
  const allTags = Array.from(new Set(
    contacts.flatMap(c => (c.tags as string[] | null) || [])
  )).sort();

  useEffect(() => {
    fetchContacts();
    fetchGroups();
    fetchArtists();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, selectedCategory, selectedCity, selectedGroup, selectedTag]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los contactos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchArtists = async () => {
    try {
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('id, name, stage_name, avatar_url')
        .order('name');

      if (artistsError) throw artistsError;

      // Get contact counts per artist
      const { data: assignments, error: assignError } = await supabase
        .from('contact_artist_assignments')
        .select('artist_id, contact_id');

      if (assignError) throw assignError;

      const countMap = new Map<string, number>();
      assignments?.forEach(a => {
        countMap.set(a.artist_id, (countMap.get(a.artist_id) || 0) + 1);
      });

      setArtists((artistsData || []).map(a => ({
        ...a,
        contact_count: countMap.get(a.id) || 0,
      })));
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const filterContacts = async () => {
    let filtered = contacts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(contact => {
        const searchableFields: string[] = [contact.name];
        if (contact.stage_name) searchableFields.push(contact.stage_name);
        if (contact.legal_name) searchableFields.push(contact.legal_name);
        if (contact.role) searchableFields.push(contact.role);
        if (contact.company) searchableFields.push(contact.company);
        if (contact.email) searchableFields.push(contact.email);
        if (contact.phone) searchableFields.push(contact.phone);
        if (contact.city) searchableFields.push(contact.city);
        if (contact.country) searchableFields.push(contact.country);
        const contactTags = (contact.tags as string[] | null) || [];
        searchableFields.push(...contactTags);
        return searchableFields.some(field => field.toLowerCase().includes(term));
      });
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(contact => {
        if (contact.category === selectedCategory) return true;
        const teamCats: string[] = Array.isArray((contact.field_config as any)?.team_categories)
          ? (contact.field_config as any).team_categories
          : [];
        return teamCats.includes(selectedCategory);
      });
    }

    if (selectedCity && selectedCity !== 'all') {
      filtered = filtered.filter(contact => contact.city === selectedCity);
    }

    if (selectedTag && selectedTag !== 'all') {
      filtered = filtered.filter(contact => {
        const contactTags = (contact.tags as string[] | null) || [];
        return contactTags.includes(selectedTag);
      });
    }

    if (selectedGroup && selectedGroup !== 'all') {
      try {
        if (selectedGroup === 'management') {
          filtered = filtered.filter(contact => contact.category === 'management');
        } else if (selectedGroup.startsWith('artist-')) {
          const artistId = selectedGroup.replace('artist-', '');
          const { data } = await supabase
            .from('contact_artist_assignments')
            .select('contact_id')
            .eq('artist_id', artistId);

          const contactIdsInArtist = new Set(data?.map(m => m.contact_id) || []);
          filtered = filtered.filter(contact => contactIdsInArtist.has(contact.id));
        } else {
          const { data } = await supabase
            .from('contact_group_members')
            .select('contact_id')
            .eq('group_id', selectedGroup);

          const contactIdsInGroup = new Set(data?.map(m => m.contact_id) || []);
          filtered = filtered.filter(contact => contactIdsInGroup.has(contact.id));
        }
      } catch (error) {
        console.error('Error filtering by group:', error);
      }
    }

    setFilteredContacts(filtered);
  };

  const handleContactCreated = () => {
    fetchContacts();
    setIsCreateDialogOpen(false);
  };

  const handleContactUpdated = (contactId?: string) => {
    fetchContacts();
    setEditingContact(null);
    // Refresh and reopen the profile sheet if we have a contact ID
    if (contactId) {
      setContactRefreshTrigger(prev => prev + 1);
      setSelectedContactId(contactId);
    }
  };

  const getCategoryInfo = (category: string) => {
    return {
      value: category,
      label: getTeamCategoryLabel(category, customCategories),
      icon: getTeamCategoryIcon(category, customCategories),
    };
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.field_config?.stage_name && contact.stage_name) {
      return contact.stage_name;
    }
    return contact.name;
  };

  const getContactSecondaryName = (contact: Contact) => {
    if (contact.field_config?.legal_name && contact.legal_name && contact.stage_name && contact.legal_name !== contact.stage_name) {
      return contact.legal_name;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contactos</h1>
        <p className="text-muted-foreground">
          Gestiona tu directorio de contactos profesionales
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredContacts.length} contactos
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/teams')}>
            <Users className="w-4 h-4 mr-2" />
            Equipos
          </Button>
          <Button variant="outline" onClick={handleDeduplicateContacts}>
            <Users className="w-4 h-4 mr-2" />
            Deduplicar
          </Button>
          <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Editar Categorías
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Contacto
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, rol, ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {allCategoriesForDisplay.map((category) => {
              const Icon = category.icon;
              return (
                <SelectItem key={category.value} value={category.value}>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    {category.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={`city-${city}`} value={city as string}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Equipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            <SelectItem value="management">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    <Building className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span>00 Management</span>
                <span className="text-muted-foreground">({contacts.filter(c => c.category === 'management').length})</span>
              </div>
            </SelectItem>
            {artists.length > 0 && artists.map((artist) => (
              <SelectItem key={`artist-${artist.id}`} value={`artist-${artist.id}`}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    {artist.avatar_url && <AvatarImage src={artist.avatar_url} alt={artist.stage_name || artist.name} />}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {(artist.stage_name || artist.name).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{artist.stage_name || artist.name}</span>
                  <span className="text-muted-foreground">({artist.contact_count})</span>
                </div>
              </SelectItem>
            ))}
            {groups.length > 0 && groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color || '#3b82f6' }}
                  />
                  {group.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {allTags.length > 0 && (
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las etiquetas</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={`tag-${tag}`} value={tag}>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">#</span>
                    {tag}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'rolodex')}>
          <ToggleGroupItem value="grid" aria-label="Vista en cuadrícula">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="rolodex" aria-label="Vista Rolodex">
            <CreditCard className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => {
            const categoryInfo = getCategoryInfo(contact.category);
            const CategoryIcon = categoryInfo.icon;
            const displayName = getContactDisplayName(contact);
            const secondaryName = getContactSecondaryName(contact);
            const contactTags = (contact.tags as string[] | null) || [];
            
            return (
              <Card 
                key={contact.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedContactId(contact.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      {contact.avatar_url && (
                        <AvatarImage src={contact.avatar_url} alt={displayName} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold truncate">{displayName}</h3>
                          {secondaryName && (
                            <p className="text-xs text-muted-foreground truncate">({secondaryName})</p>
                          )}
                          {contact.role && (
                            <p className="text-sm text-muted-foreground">{contact.role}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSharingContact(contact)}>
                              <Mail className="w-4 h-4 mr-2" />
                              Compartir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-2 space-y-1">
                        {contact.company && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="w-3 h-3" />
                            <span className="truncate">{contact.company}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <a href={`mailto:${contact.email}`} className="truncate hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${contact.phone}`} className="hover:underline">
                              {contact.phone}
                            </a>
                          </div>
                        )}
                        {contact.city && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{contact.city}{contact.country ? `, ${contact.country}` : ''}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {(() => {
                          const teamCats: string[] = Array.isArray((contact.field_config as any)?.team_categories)
                            ? (contact.field_config as any).team_categories
                            : [];
                          const catsToShow = teamCats.length > 0 ? teamCats : [contact.category];
                          return catsToShow.map((cat) => {
                            const info = getCategoryInfo(cat);
                            const CatIcon = info.icon;
                            return (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                <CatIcon className="w-3 h-3 mr-1" />
                                {info.label}
                              </Badge>
                            );
                          });
                        })()}
                        {contactTags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                        {contactTags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contactTags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay contactos</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory !== 'all' || selectedCity !== 'all'
              ? "No se encontraron contactos con los filtros aplicados"
              : "Comienza agregando tu primer contacto"}
          </p>
          {!searchTerm && selectedCategory === 'all' && selectedCity === 'all' && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear primer contacto
            </Button>
          )}
        </div>
      )}

      <CreateContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onContactCreated={handleContactCreated}
      />

      {editingContact && (
        <EditContactDialog
          contact={editingContact}
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          onContactUpdated={() => handleContactUpdated(editingContact.id)}
          customCategories={customCategories}
        />
      )}

      {sharingContact && (
        <ContactShareDialog
          contact={sharingContact}
          open={!!sharingContact}
          onOpenChange={(open) => !open && setSharingContact(null)}
        />
      )}

      <ManageContactGroupsDialog
        open={isManageGroupsOpen}
        onOpenChange={setIsManageGroupsOpen}
      />

      {viewMode === 'rolodex' && filteredContacts.length > 0 && (
        <RolodexView
          contacts={filteredContacts}
          onClose={() => setViewMode('grid')}
        />
      )}

      <ContactProfileSheet
        open={!!selectedContactId}
        onOpenChange={(open) => !open && setSelectedContactId(null)}
        contactId={selectedContactId || ''}
        refreshTrigger={contactRefreshTrigger}
        onEdit={(contactId) => {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            setEditingContact(contact);
          }
        }}
      />

      <CategoryManagerSheet
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        systemCategories={TEAM_CATEGORIES}
        customCategories={customCategories}
        categoryCounts={categoryCounts}
        onCreateNew={handleAddCustomCategory}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
        onReorder={handleCategoryReorder}
      />
    </div>
  );
}

export default function Agenda() {
  return (
    <HubGate module="bookings" required="view">
      <AgendaInner />
    </HubGate>
  );
}
