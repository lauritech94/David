import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Link, FileText, DollarSign, FileSignature, MessageSquare, ClipboardCheck, StickyNote } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LinkTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  projectId: string;
}

interface LinkableItem {
  id: string;
  title: string;
  type: string;
  status?: string;
  created_at?: string;
  description?: string;
}

const CATEGORIES = [
  { 
    id: 'presupuestos', 
    label: 'Presupuestos', 
    icon: DollarSign, 
    table: 'budgets' as const,
    titleField: 'name',
    statusField: 'budget_status',
    descField: 'internal_notes'
  },
  { 
    id: 'documentos', 
    label: 'Documentos', 
    icon: FileText, 
    table: 'documents' as const,
    titleField: 'title',
    statusField: 'category',
    descField: 'category'
  },
  { 
    id: 'solicitudes', 
    label: 'Solicitudes', 
    icon: MessageSquare, 
    table: 'solicitudes' as const,
    titleField: 'nombre_solicitante',
    statusField: 'estado',
    descField: 'observaciones'
  },
  { 
    id: 'aprobaciones', 
    label: 'Aprobaciones', 
    icon: ClipboardCheck, 
    table: 'approvals' as const,
    titleField: 'title',
    statusField: 'status',
    descField: 'description'
  }
];

export const LinkTaskDialog = ({ open, onOpenChange, taskId, taskTitle, projectId }: LinkTaskDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('presupuestos');
  const [items, setItems] = useState<Record<string, LinkableItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [linkedItems, setLinkedItems] = useState<string[]>([]);

  // Load items for each category
  useEffect(() => {
    if (!open) return;

    const loadCategoryItems = async () => {
      setLoading(true);
      const itemsByCategory: Record<string, LinkableItem[]> = {};

      for (const category of CATEGORIES) {
        try {
          const { data, error } = await supabase
            .from(category.table)
            .select('*')
            .eq('project_id', projectId);

          if (error) throw error;

          itemsByCategory[category.id] = data?.map(item => {
            const mappedItem: LinkableItem = {
              id: item.id,
              title: (item as any)[category.titleField] || 'Sin título',
              type: category.label,
              status: (item as any)[category.statusField],
              created_at: (item as any).created_at || (item as any).fecha_creacion,
              description: (item as any)[category.descField] || (item as any).observaciones
            };
            return mappedItem;
          }) || [];
        } catch (error) {
          console.error(`Error loading ${category.label}:`, error);
          itemsByCategory[category.id] = [];
        }
      }

      setItems(itemsByCategory);
      setLoading(false);
    };

    loadCategoryItems();
  }, [open, projectId]);

  // For now, we'll simulate linking by storing in localStorage
  // In a real implementation, you'd use the task_links table
  useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem(`task_links_${taskId}`);
    if (stored) {
      setLinkedItems(JSON.parse(stored));
    }
  }, [open, taskId]);

  const handleLinkItem = (item: LinkableItem) => {
    const newLinked = [...linkedItems, item.id];
    setLinkedItems(newLinked);
    localStorage.setItem(`task_links_${taskId}`, JSON.stringify(newLinked));
    
    toast({
      title: "Elemento vinculado",
      description: `${item.title} ha sido vinculado a la tarea "${taskTitle}".`,
    });
  };

  const handleUnlinkItem = (item: LinkableItem) => {
    const newLinked = linkedItems.filter(id => id !== item.id);
    setLinkedItems(newLinked);
    localStorage.setItem(`task_links_${taskId}`, JSON.stringify(newLinked));
    
    toast({
      title: "Vinculación eliminada",
      description: `${item.title} ya no está vinculado a la tarea.`,
    });
  };

  const filteredItems = items[activeCategory]?.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const isLinked = (item: LinkableItem) => linkedItems.includes(item.id);

  const linkedItemsDetails = Object.values(items).flat().filter(item => linkedItems.includes(item.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Vincular con "{taskTitle}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar elementos para vincular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                const count = items[category.id]?.length || 0;
                
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="text-xs flex items-center gap-1"
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{category.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] text-xs">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CATEGORIES.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Cargando {category.label.toLowerCase()}...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 
                        `No se encontraron ${category.label.toLowerCase()} que coincidan con "${searchTerm}"` :
                        `No hay ${category.label.toLowerCase()} disponibles en este proyecto`
                      }
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredItems.map((item) => {
                        const linked = isLinked(item);
                        
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{item.title}</h4>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {item.status && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.status}
                                  </Badge>
                                )}
                                {item.created_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant={linked ? "destructive" : "default"}
                              onClick={() => linked ? handleUnlinkItem(item) : handleLinkItem(item)}
                              className="ml-3 flex-shrink-0"
                            >
                              {linked ? "Desvincular" : "Vincular"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>

          {/* Linked items summary */}
          {linkedItemsDetails.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Elementos vinculados ({linkedItemsDetails.length})</h4>
              <div className="flex flex-wrap gap-2">
                {linkedItemsDetails.map((item) => (
                  <Badge key={item.id} variant="secondary" className="text-xs">
                    {item.type}: {item.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};