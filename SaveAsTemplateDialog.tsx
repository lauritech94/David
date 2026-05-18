import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistItems: Array<{
    id: string;
    title: string;
    description: string | null;
    sort_order: number;
  }>;
  onTemplateSaved: () => void;
}

export function SaveTemplateDialog({ 
  open, 
  onOpenChange, 
  checklistItems, 
  onTemplateSaved 
}: SaveTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState<"personal" | "workspace">("personal");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    console.log('Saving template...', { name, description, checklistItems });
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la plantilla es obligatorio.",
        variant: "destructive",
      });
      return;
    }

    if (checklistItems.length === 0) {
      toast({
        title: "Error",
        description: "No hay elementos en el checklist para guardar como plantilla.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) throw new Error('User not authenticated');

      // For workspace templates, we would need to get the workspace_id
      // For now, we'll implement personal templates only
      const templateData = {
        name: name.trim(),
        name_es: name.trim(),
        description: description.trim() || null,
        description_es: description.trim() || null,
        is_system_template: false,
        workspace_id: templateType === "workspace" ? null : null, // TODO: Get actual workspace_id
        created_by: userId,
      };

      const { data: template, error: templateError } = await supabase
        .from('checklist_templates')
        .insert(templateData)
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template items
      const templateItems = checklistItems.map((item, index) => ({
        template_id: template.id,
        section: item.description?.startsWith('Sección: ') 
          ? item.description.replace('Sección: ', '') 
          : 'GENERAL',
        section_es: item.description?.startsWith('Sección: ') 
          ? item.description.replace('Sección: ', '') 
          : 'GENERAL',
        task: item.title,
        task_es: item.title,
        owner_label_es: 'Por definir',
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('checklist_template_items')
        .insert(templateItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Plantilla guardada",
        description: `La plantilla "${name}" se ha guardado correctamente con ${checklistItems.length} elementos.`,
      });

      onTemplateSaved();
      onOpenChange(false);
      setName("");
      setDescription("");
      setTemplateType("personal");
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Guardar como plantilla
          </DialogTitle>
          <DialogDescription>
            Guarda el checklist actual como una plantilla reutilizable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name">Nombre de la plantilla</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi plantilla personalizada"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="template-description">Descripción (opcional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe cuándo usar esta plantilla..."
              rows={3}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Tipo de plantilla</Label>
            <RadioGroup
              value={templateType}
              onValueChange={(value) => setTemplateType(value as "personal" | "workspace")}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="text-sm">
                  Personal - Solo yo puedo usarla
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="workspace" id="workspace" disabled />
                <Label htmlFor="workspace" className="text-sm text-muted-foreground">
                  Workspace - Todo el equipo puede usarla (próximamente)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Se guardarán {checklistItems.length} elementos del checklist actual.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Guardando..." : "Guardar plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}