import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Crown, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TemplateItem {
  id: string;
  section: string;
  section_es: string;
  task: string;
  task_es: string;
  owner_label_es?: string;
  sort_order: number;
  due_anchor?: string;
  due_days_offset?: number;
}

interface Template {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  description_es: string | null;
  is_system_template: boolean;
  workspace_id: string | null;
  items?: TemplateItem[];
  item_count?: number;
}

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTemplateApplied: (newChecklistId?: string) => void;
  checklistId?: string | null;
}

// Emoji mapping for template names
const TEMPLATE_EMOJI: Record<string, string> = {
  'Concierto': '🎶',
  'Producción': '🎛️',
  'Campaña': '📢',
  'Tour': '🗓️',
  'Gira Nacional': '🚌',
  'Lanzamiento Álbum': '🎵',
  'Producción Videoclip': '🎥',
  'Campaña de Sync': '🎬',
};

function getTemplateEmoji(nameEs: string | null): string {
  if (!nameEs) return '📋';
  for (const [key, emoji] of Object.entries(TEMPLATE_EMOJI)) {
    if (nameEs.includes(key)) return emoji;
  }
  return '📋';
}

export function TemplateSelectionDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  onTemplateApplied,
  checklistId 
}: TemplateSelectionDialogProps) {
  const [systemTemplates, setSystemTemplates] = useState<Template[]>([]);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Fetch system templates with item counts
      const { data: systemData, error: systemError } = await supabase
        .from('checklist_templates')
        .select('id, name, name_es, description, description_es, is_system_template, workspace_id')
        .eq('is_system_template', true)
        .order('name_es');

      if (systemError) throw systemError;

      // Fetch user templates
      const { data: userData, error: userError } = await supabase
        .from('checklist_templates')
        .select('id, name, name_es, description, description_es, is_system_template, workspace_id')
        .eq('is_system_template', false)
        .order('name_es');

      if (userError) throw userError;

      // Fetch item counts for all templates
      const allTemplates = [...(systemData || []), ...(userData || [])];
      const templateIds = allTemplates.map(t => t.id);
      
      const { data: itemCounts, error: countError } = await supabase
        .from('checklist_template_items')
        .select('template_id')
        .in('template_id', templateIds);

      const countMap: Record<string, number> = {};
      (itemCounts || []).forEach(item => {
        countMap[item.template_id] = (countMap[item.template_id] || 0) + 1;
      });

      const enrichTemplate = (t: any): Template => ({
        ...t,
        item_count: countMap[t.id] || 0,
      });

      setSystemTemplates((systemData || []).map(enrichTemplate));
      setUserTemplates((userData || []).map(enrichTemplate));
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateItems = async (templateId: string): Promise<TemplateItem[]> => {
    const { data, error } = await supabase
      .from('checklist_template_items')
      .select('id, section, section_es, task, task_es, owner_label_es, sort_order, due_anchor, due_days_offset')
      .eq('template_id', templateId)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  };

  const handleTemplateSelect = async (template: Template) => {
    try {
      const items = await fetchTemplateItems(template.id);
      setSelectedTemplate({ ...template, items });
      setSelectedItems(new Set(items.map(item => item.id)));
    } catch (error) {
      console.error('Error fetching template items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los elementos de la plantilla.",
        variant: "destructive",
      });
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const applyTemplate = async () => {
    if (!selectedTemplate?.items) return;

    setApplying(true);
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      let targetChecklistId = checklistId;

      // If no checklist exists yet, create one with the template name
      if (!targetChecklistId) {
        const { data: newChecklist, error: clError } = await supabase
          .from('project_checklists')
          .insert({
            project_id: projectId,
            name: selectedTemplate.name_es || selectedTemplate.name,
            sort_order: 0,
            created_by: userId,
          })
          .select()
          .single();

        if (clError) throw clError;
        targetChecklistId = newChecklist.id;
      }

      const selectedTemplateItems = selectedTemplate.items.filter(item => selectedItems.has(item.id));
      
      const checklistItems = selectedTemplateItems.map((item, index) => ({
        project_id: projectId,
        title: item.task_es,
        description: item.owner_label_es || null,
        section: item.section_es,
        sort_order: index,
        created_by: userId,
        status: 'PENDING' as const,
        checklist_id: targetChecklistId,
      }));

      const { error } = await supabase
        .from('project_checklist_items')
        .insert(checklistItems);

      if (error) throw error;

      toast({
        title: "Plantilla aplicada",
        description: `Se han añadido ${checklistItems.length} elementos desde la plantilla "${selectedTemplate.name_es}".`,
      });

      onTemplateApplied(targetChecklistId || undefined);
      onOpenChange(false);
      setSelectedTemplate(null);
      setSelectedItems(new Set());
    } catch (error: any) {
      console.error('Error applying template:', error);
      toast({
        title: "Error",
        description: `No se pudo aplicar la plantilla: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const groupItemsBySection = (items: TemplateItem[]) => {
    const grouped: Record<string, TemplateItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.section_es]) {
        grouped[item.section_es] = [];
      }
      grouped[item.section_es].push(item);
    });
    return grouped;
  };

  const TemplateCard = ({ template }: { template: Template }) => {
    const emoji = getTemplateEmoji(template.name_es);
    const isSelected = selectedTemplate?.id === template.id;
    
    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => handleTemplateSelect(template)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{emoji}</span>
              <CardTitle className="text-base font-medium">{template.name_es}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                {template.item_count || 0} tareas
              </Badge>
              {template.is_system_template ? (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Sistema
                </Badge>
              ) : template.workspace_id ? (
                <Badge variant="outline" className="text-xs">
                  Workspace
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  Personal
                </Badge>
              )}
            </div>
          </div>
          {template.description_es && (
            <p className="text-sm text-muted-foreground mt-1">{template.description_es}</p>
          )}
        </CardHeader>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Crear checklist desde plantilla
          </DialogTitle>
          <DialogDescription>
            Selecciona una plantilla para crear automáticamente elementos en tu checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Template Selection */}
          <div className="flex-1">
            <Tabs defaultValue="system" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="system">Plantillas del sistema</TabsTrigger>
                <TabsTrigger value="user">Mis plantillas</TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="mt-4">
                <ScrollArea className="h-[400px]" enableDragScroll={false}>
                  {loading ? (
                    <div className="text-center text-muted-foreground py-8">
                      Cargando plantillas...
                    </div>
                  ) : systemTemplates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No hay plantillas del sistema disponibles.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {systemTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="user" className="mt-4">
                <ScrollArea className="h-[400px]" enableDragScroll={false}>
                  {loading ? (
                    <div className="text-center text-muted-foreground py-8">
                      Cargando plantillas...
                    </div>
                  ) : userTemplates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No tienes plantillas personales.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Template Preview */}
          <div className="flex-1">
            <div className="border rounded-lg h-full">
              <div className="p-4 border-b">
                <h3 className="font-medium">Vista previa</h3>
              </div>
              <ScrollArea className="h-[400px] p-4">
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-lg flex items-center gap-2">
                        <span>{getTemplateEmoji(selectedTemplate.name_es)}</span>
                        {selectedTemplate.name_es}
                      </h4>
                      {selectedTemplate.description_es && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedTemplate.description_es}
                        </p>
                      )}
                    </div>
                    
                    {selectedTemplate.items && selectedTemplate.items.length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(groupItemsBySection(selectedTemplate.items)).map(([section, items]) => (
                          <div key={section}>
                            <h5 className="font-medium text-sm text-primary mb-2">
                              {section}
                            </h5>
                            <div className="space-y-2 ml-4">
                              {items.map((item) => (
                                <div 
                                  key={item.id} 
                                  className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors hover:bg-muted/50 ${
                                    selectedItems.has(item.id) ? 'bg-muted/30' : ''
                                  }`}
                                  onClick={() => toggleItemSelection(item.id)}
                                >
                                  <Checkbox 
                                    checked={selectedItems.has(item.id)}
                                    onChange={() => {}}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <span className={`text-sm ${selectedItems.has(item.id) ? '' : 'opacity-50'}`}>
                                      {item.task_es}
                                    </span>
                                    {item.owner_label_es && (
                                      <div className={`text-xs text-muted-foreground mt-1 ${selectedItems.has(item.id) ? '' : 'opacity-50'}`}>
                                        Responsable: {item.owner_label_es}
                                      </div>
                                    )}
                                  </div>
                                  {item.due_anchor && (
                                    <span className={`text-xs text-muted-foreground ml-auto ${selectedItems.has(item.id) ? '' : 'opacity-50'}`}>
                                      {item.due_days_offset !== 0 ? 
                                        `${item.due_days_offset! > 0 ? '+' : ''}${item.due_days_offset}d` : 
                                        'Día clave'
                                      }
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <Separator className="mt-3" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Esta plantilla no tiene elementos definidos.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Selecciona una plantilla para ver su contenido.
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={applyTemplate} 
            disabled={!selectedTemplate || applying || selectedItems.size === 0}
          >
            {applying ? "Aplicando..." : `Aplicar plantilla (${selectedItems.size} tareas)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}