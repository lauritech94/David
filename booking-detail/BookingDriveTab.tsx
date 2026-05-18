import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileExplorer } from '@/components/drive/FileExplorer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, ExternalLink, FolderPlus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { loadCrewFromFormat } from '@/utils/budgetCrewLoader';

interface BookingDriveTabProps {
  bookingId: string;
  artistId?: string | null;
  folderUrl?: string | null;
  eventName?: string;
  eventDate?: string | null;
  bookingData?: {
    ciudad?: string | null;
    pais?: string | null;
    venue?: string | null;
    hora?: string | null;
    fee?: number | null;
    formato?: string | null;
    festival_ciclo?: string | null;
    condiciones?: string | null;
    es_internacional?: boolean | null;
  };
}

export function BookingDriveTab({ bookingId, artistId, folderUrl, eventName, eventDate, bookingData }: BookingDriveTabProps) {
  const [linkedFolderId, setLinkedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const fetchLinkedFolder = async () => {
    if (!bookingId) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to find a folder linked to this booking via metadata
      const { data, error } = await supabase
        .from('storage_nodes')
        .select('id')
        .contains('metadata', { booking_id: bookingId })
        .eq('node_type', 'folder')
        .limit(1)
        .single();

      if (!error && data) {
        setLinkedFolderId(data.id);
      } else if (folderUrl) {
        // Parse folder ID from URL if available
        const urlParams = new URLSearchParams(folderUrl.split('?')[1] || '');
        const folderId = urlParams.get('folder');
        if (folderId) {
          setLinkedFolderId(folderId);
        }
      }
    } catch (err) {
      console.error('Error fetching linked folder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedFolder();
  }, [bookingId, folderUrl]);

  const handleCreateFolder = async () => {
    if (!artistId || !user?.id) {
      toast.error('Faltan datos para crear la carpeta');
      return;
    }

    setIsCreating(true);
    try {
      const date = eventDate ? new Date(eventDate) : new Date();
      const year = date.getFullYear().toString();
      const folderName = eventDate 
        ? `${date.toISOString().slice(0, 10).replace(/-/g, '.')} ${eventName || 'Evento'}`
        : eventName || 'Evento';

      // Get or create Conciertos folder
      let { data: conciertosFolder } = await supabase
        .from('storage_nodes')
        .select('id')
        .eq('artist_id', artistId)
        .eq('name', 'Conciertos')
        .is('parent_id', null)
        .single();

      if (!conciertosFolder) {
        const { data: newConciertos, error: conciertosError } = await supabase
          .from('storage_nodes')
          .insert({
            artist_id: artistId,
            name: 'Conciertos',
            node_type: 'folder',
            is_system_folder: true,
            created_by: user.id
          })
          .select('id')
          .single();

        if (conciertosError) throw conciertosError;
        conciertosFolder = newConciertos;
      }

      // Get or create year folder
      let { data: yearFolder } = await supabase
        .from('storage_nodes')
        .select('id')
        .eq('artist_id', artistId)
        .eq('parent_id', conciertosFolder.id)
        .eq('name', year)
        .single();

      if (!yearFolder) {
        const { data: newYear, error: yearError } = await supabase
          .from('storage_nodes')
          .insert({
            artist_id: artistId,
            parent_id: conciertosFolder.id,
            name: year,
            node_type: 'folder',
            is_system_folder: true,
            created_by: user.id
          })
          .select('id')
          .single();

        if (yearError) throw yearError;
        yearFolder = newYear;
      }

      // Create event folder
      const { data: eventFolder, error: eventError } = await supabase
        .from('storage_nodes')
        .insert({
          artist_id: artistId,
          parent_id: yearFolder.id,
          name: folderName,
          node_type: 'folder',
          is_system_folder: false,
          metadata: { booking_id: bookingId },
          created_by: user.id
        })
        .select('id')
        .single();

      if (eventError) throw eventError;

      // Create subfolders
      const subfolders = ['Facturas', 'Hojas de Ruta', 'Contratos', 'Rider', 'Grafismos', 'Presupuesto'];
      for (const name of subfolders) {
        await supabase
          .from('storage_nodes')
          .insert({
            artist_id: artistId,
            parent_id: eventFolder.id,
            name,
            node_type: 'folder',
            is_system_folder: true,
            created_by: user.id
          });
      }

      // Update booking with folder reference
      await supabase
        .from('booking_offers')
        .update({ folder_url: `/carpetas?folder=${eventFolder.id}` })
        .eq('id', bookingId);

      // Create budget for this booking
      const isInternational = bookingData?.es_internacional || 
        (bookingData?.pais && !['españa', 'espana', 'spain', 'es'].includes(bookingData.pais.toLowerCase()));
      
      const { data: newBudget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          name: folderName,
          type: 'concierto',
          artist_id: artistId,
          city: bookingData?.ciudad || null,
          country: bookingData?.pais || null,
          venue: bookingData?.venue || null,
          event_date: eventDate || null,
          event_time: bookingData?.hora || null,
          fee: bookingData?.fee || null,
          formato: bookingData?.formato || null,
          festival_ciclo: bookingData?.festival_ciclo || null,
          condiciones: bookingData?.condiciones || null,
          budget_status: isInternational ? 'internacional' : 'nacional',
          show_status: 'pendiente',
          created_by: user.id
        })
        .select('id')
        .single();

      if (budgetError) {
        console.error('Error creating budget:', budgetError);
      } else if (newBudget) {
        // Try to copy items from default template
        const { data: defaultTemplate } = await supabase
          .from('budget_templates')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (defaultTemplate) {
          const { data: templateItems } = await supabase
            .from('budget_template_items')
            .select('*')
            .eq('template_id', defaultTemplate.id);

          if (templateItems && templateItems.length > 0) {
            const budgetItems = templateItems.map(item => ({
              budget_id: newBudget.id,
              category: item.category,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              iva_percentage: item.iva_percentage,
              subcategory: item.subcategory,
              observations: item.observations,
              is_attendee: item.is_attendee
            }));

            await supabase.from('budget_items').insert(budgetItems);
          }
        }
        
        // Insert crew members from booking product (formato)
        if (bookingData?.formato && artistId) {
          await loadCrewFromFormat({
            budgetId: newBudget.id,
            formatName: bookingData.formato,
            artistId,
            bookingFee: bookingData.fee || 0,
            isInternational: isInternational || false,
            userId: user.id,
          });
        }
        
        toast.success('Carpeta y presupuesto creados correctamente');
      }

      setLinkedFolderId(eventFolder.id);
    } catch (err) {
      console.error('Error creating folder:', err);
      toast.error('Error al crear la carpeta');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!linkedFolderId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold mb-2">Sin carpeta vinculada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Puedes crear la carpeta ahora o se creará automáticamente al confirmar el evento.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={handleCreateFolder} disabled={isCreating || !artistId}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FolderPlus className="w-4 h-4 mr-2" />
              )}
              Crear carpeta ahora
            </Button>
            {artistId && (
              <Button variant="outline" asChild>
                <Link to={`/carpetas?artist=${artistId}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ir al Drive del Artista
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Archivos del Evento</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/carpetas?folder=${linkedFolderId}`}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir en Drive
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <FileExplorer
          artistId={artistId || null}
          initialFolderId={linkedFolderId}
          bookingId={bookingId}
          showBreadcrumbs={false}
          compact
        />
      </CardContent>
    </Card>
  );
}
