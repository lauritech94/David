import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import SingleProjectSelector from "@/components/SingleProjectSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";


interface AssociateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudId: string | null;
  artistId?: string | null;
  onLinked: () => void;
}

export default function AssociateProjectDialog({ open, onOpenChange, solicitudId, artistId, onLinked }: AssociateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [onlyArtistProjects, setOnlyArtistProjects] = useState(false);

  const handleLink = async () => {
    if (!solicitudId || !selectedId) {
      toast({ title: "Selecciona un proyecto", description: "Debes elegir un proyecto para asociar.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("solicitudes")
        .update({ project_id: selectedId })
        .eq("id", solicitudId);
      if (error) throw error;
      toast({ title: "Asociada", description: "La solicitud fue asociada al proyecto." });
      onLinked();
      onOpenChange(false);
      setSelectedId("");
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo asociar la solicitud.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asociar a proyecto</DialogTitle>
          <DialogDescription>Selecciona un proyecto existente para vincular esta solicitud.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {artistId && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="only-artist-projects" className="text-sm cursor-pointer">
                Solo proyectos de este artista
              </Label>
              <Switch
                id="only-artist-projects"
                checked={onlyArtistProjects}
                onCheckedChange={(v) => {
                  setOnlyArtistProjects(v);
                  setSelectedId("");
                }}
              />
            </div>
          )}
          <div>
            <SingleProjectSelector
              value={selectedId || null}
              onValueChange={(val) => setSelectedId(val || "")}
              artistId={artistId ?? null}
              filterByArtist={onlyArtistProjects}
              placeholder="Buscar y seleccionar proyecto"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleLink} disabled={loading || !selectedId}>{loading ? "Guardando…" : "Asociar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
