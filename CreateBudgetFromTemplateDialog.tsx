import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, File, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  description: string;
  created_at: string;
  template_items: Array<{
    name: string;
    category: string;
    subcategory: string;
    unit_price: number;
    quantity: number;
    iva_percentage: number;
  }>;
}

interface CreateBudgetFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateBudgetFromTemplateDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateBudgetFromTemplateDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("budget_templates")
        .select(`
          *,
          template_items:budget_template_items(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      // TODO: Implement template creation logic
      onSuccess();
      onOpenChange(false);
      setSelectedTemplate("");
    }
  };

  const getItemsCount = (template: Template) => {
    return template.template_items?.length || 0;
  };

  const getCategoriesCount = (template: Template) => {
    const categories = new Set(template.template_items?.map(item => item.category) || []);
    return categories.size;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Crear Presupuesto desde Plantilla
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay plantillas disponibles</p>
                <p className="text-sm">Crea un presupuesto y guárdalo como plantilla para reutilizarlo</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="font-medium">Seleccionar Plantilla:</h3>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{template.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getItemsCount(template)} elementos
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <Card>
                    <CardContent className="pt-4">
                      {(() => {
                        const template = templates.find(t => t.id === selectedTemplate);
                        if (!template) return null;
                        
                        return (
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{getItemsCount(template)}</span>
                                <span className="text-muted-foreground">elementos</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{getCategoriesCount(template)}</span>
                                <span className="text-muted-foreground">categorías</span>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Creada el {new Date(template.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSelectTemplate}
                    disabled={!selectedTemplate}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Crear desde Plantilla
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}