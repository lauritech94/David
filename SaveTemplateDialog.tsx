import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, File } from "lucide-react";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description?: string) => void;
  budgetName?: string;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  onSave,
  budgetName
}: SaveTemplateDialogProps) {
  const [name, setName] = useState(budgetName ? `Plantilla - ${budgetName}` : "");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim() || undefined);
      setName(budgetName ? `Plantilla - ${budgetName}` : "");
      setDescription("");
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName(budgetName ? `Plantilla - ${budgetName}` : "");
      setDescription("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Guardar como Plantilla
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nombre de la Plantilla</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la plantilla..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Descripción (opcional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe para qué se usa esta plantilla..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Plantilla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}