import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Folder, Calendar, User, Users, Copy, Link } from "lucide-react";
import { format } from "date-fns";

interface FolderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
}

interface FolderData {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date_estimada: string | null;
  artist_id: string | null;
  equipo_involucrado: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Artist {
  id: string;
  full_name: string;
  email: string;
}

export function FolderDetailsDialog({ 
  open, 
  onOpenChange, 
  folderId 
}: FolderDetailsDialogProps) {
  const [folderData, setFolderData] = useState<FolderData | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [creator, setCreator] = useState<{ full_name: string } | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && folderId) {
      loadFolderDetails();
    }
  }, [open, folderId]);

  const loadFolderDetails = async () => {
    setIsLoading(true);
    try {
      // Load folder data
      const { data: folder, error: folderError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', folderId)
        .single();

      if (folderError) throw folderError;
      setFolderData(folder);

      // Load associated artist if exists
      if (folder.artist_id) {
        const { data: artistData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', folder.artist_id)
          .single();
        
        setArtist(artistData);
      }

      // Load creator information
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', folder.created_by)
        .single();
      
      setCreator(creatorData);

      // Count projects in this folder
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('parent_folder_id', folderId);
      
      setProjectCount(count || 0);

    } catch (error) {
      console.error('Error loading folder details:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la carpeta.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const folderUrl = `${window.location.origin}/projects?folder=${folderId}`;
      await navigator.clipboard.writeText(folderUrl);
      toast({
        title: "Enlace copiado",
        description: "El enlace de la carpeta ha sido copiado al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace.",
        variant: "destructive",
      });
    }
  };

  if (!folderData && !isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-primary" />
            Detalles de la Carpeta
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando detalles...</div>
          </div>
        ) : folderData ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nombre</Label>
                <p className="text-foreground font-medium">{folderData.name}</p>
              </div>

              {folderData.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
                  <p className="text-foreground">{folderData.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {folderData.start_date && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Fecha de inicio</Label>
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(folderData.start_date), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                )}

                {folderData.end_date_estimada && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Fecha de cierre</Label>
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(folderData.end_date_estimada), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                )}
              </div>

              {artist && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Artista asociado</Label>
                  <div className="flex items-center gap-2 text-foreground">
                    <User className="w-4 h-4" />
                    <span>{artist.full_name}</span>
                    <span className="text-sm text-muted-foreground">({artist.email})</span>
                  </div>
                </div>
              )}

              {folderData.equipo_involucrado && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Equipo involucrado</Label>
                  <div className="flex items-start gap-2 text-foreground">
                    <Users className="w-4 h-4 mt-0.5" />
                    <span>{folderData.equipo_involucrado}</span>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Proyectos contenidos</Label>
                <p className="text-foreground font-medium">{projectCount} proyecto{projectCount !== 1 ? 's' : ''}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Creado por</Label>
                  <p className="text-foreground">{creator?.full_name || 'Desconocido'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fecha de creación</Label>
                  <p className="text-foreground">{format(new Date(folderData.created_at), "dd/MM/yyyy")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Enlace de la carpeta</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/projects?folder=${folderId}`}
                    readOnly
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}