import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Folder,
  Search,
  Grid3X3,
  List,
  FolderPlus,
  Upload,
  History,
} from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileExplorer } from './FileExplorer';

interface ConciertosViewProps {
  artistId: string;
  artistName: string;
  onBack: () => void;
}

interface EventFolder {
  id: string;
  name: string;
  event_date: string | null;
  created_at: string;
}

export function ConciertosView({ artistId, artistName, onBack }: ConciertosViewProps) {
  const [viewingHistorial, setViewingHistorial] = useState(false);
  const [selectedEventFolder, setSelectedEventFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch all event folders (grandchildren of Conciertos - skip year folders)
  const { data: eventFolders = [], isLoading } = useQuery({
    queryKey: ['conciertos-event-folders', artistId],
    queryFn: async () => {
      // First get the Conciertos folder
      const { data: conciertosFolder } = await supabase
        .from('storage_nodes')
        .select('id')
        .eq('artist_id', artistId)
        .eq('name', 'Conciertos')
        .is('parent_id', null)
        .single();

      if (!conciertosFolder) return [];

      // Get all year folders
      const { data: yearFolders } = await supabase
        .from('storage_nodes')
        .select('id')
        .eq('artist_id', artistId)
        .eq('parent_id', conciertosFolder.id)
        .eq('node_type', 'folder');

      if (!yearFolders || yearFolders.length === 0) return [];

      // Get all event folders inside year folders
      const yearFolderIds = yearFolders.map(f => f.id);
      const { data: eventFoldersData, error } = await supabase
        .from('storage_nodes')
        .select('id, name, metadata, created_at')
        .eq('artist_id', artistId)
        .in('parent_id', yearFolderIds)
        .eq('node_type', 'folder')
        .order('name', { ascending: true });

      if (error) throw error;

      return (eventFoldersData || []).map(folder => ({
        id: folder.id,
        name: folder.name,
        event_date: (folder.metadata as any)?.event_date || null,
        created_at: folder.created_at,
      })) as EventFolder[];
    },
    enabled: !!artistId,
  });

  const today = startOfDay(new Date());

  // Separate future and past events
  const futureEvents = eventFolders.filter(folder => {
    if (!folder.event_date) return true; // Show events without date as future
    return !isBefore(new Date(folder.event_date), today);
  });

  const pastEvents = eventFolders.filter(folder => {
    if (!folder.event_date) return false;
    return isBefore(new Date(folder.event_date), today);
  });

  // Filter by search
  const displayedEvents = (viewingHistorial ? pastEvents : futureEvents).filter(
    folder => folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If viewing a specific event folder, show FileExplorer
  if (selectedEventFolder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedEventFolder(null)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {eventFolders.find(f => f.id === selectedEventFolder)?.name || 'Evento'}
            </h1>
            <p className="text-muted-foreground">
              {artistName} / Conciertos
            </p>
          </div>
        </div>
        <FileExplorer
          artistId={artistId}
          initialFolderId={selectedEventFolder}
          showBreadcrumbs={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={viewingHistorial ? () => setViewingHistorial(false) : onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {viewingHistorial ? 'HISTORIAL' : 'Conciertos'}
            </h1>
            <p className="text-muted-foreground">
              {artistName} / Conciertos{viewingHistorial ? ' / HISTORIAL' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* HISTORIAL folder (only show when not viewing historial and there are past events) */}
          {!viewingHistorial && pastEvents.length > 0 && (
            <div className="mb-4">
              <Card
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group max-w-[160px]"
                onClick={() => setViewingHistorial(true)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/5 flex items-center justify-center mb-3 group-hover:from-muted-foreground/30 group-hover:to-muted-foreground/10 transition-colors">
                    <History className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-sm">HISTORIAL</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pastEvents.length} evento{pastEvents.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Event folders */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {displayedEvents.map((folder) => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                  onClick={() => setSelectedEventFolder(folder.id)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center mb-3 group-hover:from-yellow-500/30 group-hover:to-yellow-600/15 transition-colors">
                      <Folder className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="font-medium text-sm truncate w-full" title={folder.name}>
                      {folder.name}
                    </h3>
                    {folder.event_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(folder.event_date), 'd MMM yyyy', { locale: es })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {displayedEvents.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                    onClick={() => setSelectedEventFolder(folder.id)}
                  >
                    <Folder className="w-5 h-5 text-yellow-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{folder.name}</p>
                      {folder.event_date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(folder.event_date), 'd MMMM yyyy', { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {displayedEvents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Folder className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">
                  {viewingHistorial ? 'Sin eventos pasados' : 'Sin eventos próximos'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {viewingHistorial 
                    ? 'No hay conciertos anteriores a la fecha actual'
                    : 'Los eventos confirmados aparecerán aquí automáticamente'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
