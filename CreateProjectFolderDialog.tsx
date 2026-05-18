import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SingleArtistSelector } from "@/components/SingleArtistSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Folder, Calendar as CalendarIcon, Copy } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CreateProjectFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (folderId?: string) => void;
  parentFolderId?: string | null;
}

export function CreateProjectFolderDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  parentFolderId = null 
}: CreateProjectFolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedArtistId, setSelectedArtistId] = useState<string>();
  const [team, setTeam] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [folderUrl, setFolderUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { data: insertedProject, error } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate?.toISOString().split('T')[0] || null,
          end_date_estimada: endDate?.toISOString().split('T')[0] || null,
          artist_id: selectedArtistId || null,
          equipo_involucrado: team.trim() || null,
          is_folder: true,
          parent_folder_id: parentFolderId,
          created_by: userData.user.id,
          status: 'en_curso'
        })
        .select()
        .single();

      if (error) throw error;

      // Generate folder URL
      if (insertedProject) {
        const baseUrl = window.location.origin;
        const generatedUrl = `${baseUrl}/projects?folder=${insertedProject.id}`;
        setFolderUrl(generatedUrl);
      }

      toast({
        title: "Carpeta creada",
        description: `La carpeta "${name}" ha sido creada exitosamente.`,
      });

      setName("");
      setDescription("");
      onOpenChange(false);
      onSuccess?.(insertedProject?.id);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la carpeta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setDescription("");
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedArtistId(undefined);
      setTeam("");
      setFolderUrl("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-primary" />
            Nueva Carpeta
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nombre de la carpeta</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Gira 2025, Festival de Verano..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="folder-description">Descripción (opcional)</Label>
            <Textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la carpeta..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha de cierre</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Artista asociado (opcional)</Label>
            <SingleArtistSelector
              value={selectedArtistId || null}
              onValueChange={setSelectedArtistId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Equipo involucrado (opcional)</Label>
            <Textarea
              id="team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="Describe el equipo involucrado en esta carpeta..."
              rows={2}
            />
          </div>

          {folderUrl && (
            <div className="space-y-2">
              <Label>Enlace de la carpeta</Label>
              <div className="flex gap-2">
                <Input
                  value={folderUrl}
                  readOnly
                  className="flex-1"
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
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear carpeta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}