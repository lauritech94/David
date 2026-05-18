import { useState, useCallback, useRef, useEffect } from 'react';
import { useStorageNodes, StorageNode } from '@/hooks/useStorageNodes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Upload,
  MoreVertical,
  Folder,
  FileText,
  Image,
  Video,
  Music,
  File,
  Download,
  Trash2,
  Search,
  Grid3X3,
  List,
  FolderPlus,
  Pencil,
  Home,
  ChevronRight,
  Calculator,
  ExternalLink,
  Receipt,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Loader2,
  Map,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { loadCrewFromFormat } from '@/utils/budgetCrewLoader';

interface FileExplorerProps {
  artistId: string | null;
  initialFolderId?: string | null;
  bookingId?: string | null;
  showBreadcrumbs?: boolean;
  compact?: boolean;
}

// Get file icon based on type
const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

// Format file size
const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Draggable file/folder item
function DraggableNode({ node, children }: { node: StorageNode; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { node },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

// Droppable folder
function DroppableFolder({ folderId, children }: { folderId: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: folderId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors ${isOver ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
    >
      {children}
    </div>
  );
}

export function FileExplorer({
  artistId,
  initialFolderId = null,
  bookingId,
  showBreadcrumbs = true,
  compact = false,
}: FileExplorerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [nodeToRename, setNodeToRename] = useState<StorageNode | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<StorageNode | null>(null);
  const [activeDragNode, setActiveDragNode] = useState<StorageNode | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<StorageNode[]>([]);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusNode, setStatusNode] = useState<StorageNode | null>(null);
  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<{
    found: boolean;
    billing_status?: string;
    contact_name?: string;
    fecha_emision?: string;
    item_name?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current folder is "Presupuesto" and has a linked budget
  const { data: budgetContext, refetch: refetchBudgetContext } = useQuery({
    queryKey: ['linked-budget', currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return null;
      
      // Get current folder info
      const { data: currentFolder } = await supabase
        .from('storage_nodes')
        .select('name, parent_id, metadata')
        .eq('id', currentFolderId)
        .single();
      
      if (!currentFolder || currentFolder.name !== 'Presupuesto') return null;
      
      // Get parent folder (event folder) to find booking_id
      const { data: parentFolder } = await supabase
        .from('storage_nodes')
        .select('name, metadata')
        .eq('id', currentFolder.parent_id)
        .single();
      
      if (!parentFolder?.metadata || !(parentFolder.metadata as any).booking_id) {
        return { isPresupuestoFolder: true, linkedBudget: null, bookingId: null, eventName: parentFolder?.name || 'Evento' };
      }
      
      const bookingId = (parentFolder.metadata as any).booking_id;
      
      // Find budget linked to this booking
      const { data: booking } = await supabase
        .from('booking_offers')
        .select('id, festival_ciclo, ciudad, lugar, venue, fecha, hora, fee, formato, condiciones, pais, es_internacional, artist_id')
        .eq('id', bookingId)
        .single();
      
      if (!booking) {
        return { isPresupuestoFolder: true, linkedBudget: null, bookingId: null, eventName: parentFolder?.name || 'Evento' };
      }
      
      // Try to find budget by festival_ciclo match first, then by name pattern
      let budget = null;
      
      // First try exact festival_ciclo match
      if (booking.festival_ciclo) {
        const { data: budgetByFestival } = await supabase
          .from('budgets')
          .select('id, name, fee, event_date, city, venue, formato, budget_status')
          .eq('festival_ciclo', booking.festival_ciclo)
          .eq('artist_id', booking.artist_id)
          .maybeSingle();
        budget = budgetByFestival;
      }
      
      // Fallback to name pattern matching
      if (!budget) {
        const budgetName = booking.festival_ciclo || `${booking.ciudad} - ${booking.lugar || booking.venue || 'TBD'}`;
        const { data: budgetByName } = await supabase
          .from('budgets')
          .select('id, name, fee, event_date, city, venue, formato, budget_status')
          .ilike('name', `%${budgetName.split(' ')[0]}%`)
          .maybeSingle();
        budget = budgetByName;
      }
      
      return { 
        isPresupuestoFolder: true, 
        linkedBudget: budget, 
        bookingId: booking.id,
        bookingData: booking,
        eventName: parentFolder?.name || 'Evento'
      };
    },
    enabled: !!currentFolderId,
  });
  
  const linkedBudget = budgetContext?.linkedBudget;
  const isPresupuestoFolder = budgetContext?.isPresupuestoFolder;

  // Check if current folder is "Hojas de Ruta" and fetch linked roadmaps
  const { data: roadmapContext } = useQuery({
    queryKey: ['linked-roadmaps', currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return null;
      
      const { data: currentFolder } = await supabase
        .from('storage_nodes')
        .select('name, parent_id, metadata')
        .eq('id', currentFolderId)
        .single();
      
      if (!currentFolder || currentFolder.name !== 'Hojas de Ruta') return null;
      
      // Get parent folder (event folder) to find booking_id
      const { data: parentFolder } = await supabase
        .from('storage_nodes')
        .select('name, metadata')
        .eq('id', currentFolder.parent_id)
        .single();
      
      if (!parentFolder?.metadata || !(parentFolder.metadata as any).booking_id) {
        return { isHojasDeRutaFolder: true, roadmaps: [], bookingId: null };
      }
      
      const bId = (parentFolder.metadata as any).booking_id;
      
      // Find roadmaps via junction table
      const { data: junctionRoadmaps } = await supabase
        .from('tour_roadmap_bookings')
        .select('roadmap_id')
        .eq('booking_id', bId);
      
      const junctionIds = (junctionRoadmaps || []).map(r => r.roadmap_id);
      
      // Find roadmaps via legacy booking_id
      const { data: legacyRoadmaps } = await supabase
        .from('tour_roadmaps')
        .select('id')
        .eq('booking_id', bId);
      
      const legacyIds = (legacyRoadmaps || []).map(r => r.id);
      
      // Combine unique IDs
      const allIds = [...new Set([...junctionIds, ...legacyIds])];
      
      if (allIds.length === 0) {
        return { isHojasDeRutaFolder: true, roadmaps: [], bookingId: bId };
      }
      
      // Fetch full roadmap data
      const { data: roadmaps } = await supabase
        .from('tour_roadmaps')
        .select('id, name, status, created_at')
        .in('id', allIds)
        .order('created_at', { ascending: false });
      
      // Fetch block counts for summary
      const { data: blocks } = await supabase
        .from('tour_roadmap_blocks')
        .select('roadmap_id, block_type')
        .in('roadmap_id', allIds);
      
      const blockSummary: Record<string, { travel: number; hospitality: number; schedule: number }> = {};
      (blocks || []).forEach(b => {
        if (!blockSummary[b.roadmap_id]) blockSummary[b.roadmap_id] = { travel: 0, hospitality: 0, schedule: 0 };
        if (b.block_type === 'travel') blockSummary[b.roadmap_id].travel++;
        if (b.block_type === 'hospitality') blockSummary[b.roadmap_id].hospitality++;
        if (b.block_type === 'schedule') blockSummary[b.roadmap_id].schedule++;
      });
      
      return {
        isHojasDeRutaFolder: true,
        roadmaps: (roadmaps || []).map(r => ({
          ...r,
          blocks: blockSummary[r.id] || { travel: 0, hospitality: 0, schedule: 0 },
        })),
        bookingId: bId,
      };
    },
    enabled: !!currentFolderId,
  });

  const isHojasDeRutaFolder = roadmapContext?.isHojasDeRutaFolder;
  const linkedRoadmaps = roadmapContext?.roadmaps || [];

  const {
    nodes,
    isLoading,
    createNode,
    updateNode,
    deleteNode,
    moveNode,
    uploadFile,
    isCreating,
  } = useStorageNodes(artistId, currentFolderId) as {
    nodes: StorageNode[];
    isLoading: boolean;
    createNode: (params: { artist_id: string; parent_id: string | null; name: string; node_type: 'folder' | 'file' }) => Promise<unknown>;
    updateNode: (params: { nodeId: string; updates: Partial<StorageNode> }) => Promise<unknown>;
    deleteNode: (nodeId: string) => Promise<void>;
    moveNode: (params: { nodeId: string; newParentId: string | null }) => Promise<unknown>;
    uploadFile: (params: { artistId: string; parentId: string | null; file: File }) => Promise<unknown>;
    isCreating: boolean;
  };

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter nodes by search
  const filteredNodes = nodes.filter((node) =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate folders and files
  const folders = filteredNodes.filter((n) => n.node_type === 'folder');
  const files = filteredNodes.filter((n) => n.node_type === 'file');

  // Build breadcrumb path when folder changes
  const buildBreadcrumbs = useCallback(async (folderId: string | null) => {
    if (!folderId || !artistId) {
      setBreadcrumbPath([]);
      return;
    }

    const path: StorageNode[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const { data, error } = await supabase
        .from('storage_nodes')
        .select('*')
        .eq('id', currentId)
        .single();

      if (error || !data) break;
      path.unshift(data);
      currentId = data.parent_id;
    }

    setBreadcrumbPath(path);
  }, [artistId]);

  // Update breadcrumbs when folder changes
  useState(() => {
    buildBreadcrumbs(currentFolderId);
  });

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const node = event.active.data.current?.node as StorageNode;
    setActiveDragNode(node);
  };

  // Handle drag end (move file/folder)
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragNode(null);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const draggedNode = active.data.current?.node as StorageNode;
    const targetId = over.id as string;

    // Don't allow dropping a folder into itself
    if (draggedNode.node_type === 'folder' && draggedNode.id === targetId) return;

    await moveNode({ nodeId: draggedNode.id, newParentId: targetId });
  };

  // Handle file drop upload
  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!artistId) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        for (const file of droppedFiles) {
          await uploadFile({
            artistId,
            parentId: currentFolderId,
            file,
          });
        }
      }
    },
    [artistId, currentFolderId, uploadFile]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!artistId || !e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    for (const file of selectedFiles) {
      await uploadFile({
        artistId,
        parentId: currentFolderId,
        file,
      });
    }
    e.target.value = '';
  };

  const handleCreateFolder = async () => {
    if (!artistId || !newFolderName.trim()) return;

    await createNode({
      artist_id: artistId,
      parent_id: currentFolderId,
      name: newFolderName.trim(),
      node_type: 'folder',
    });

    setNewFolderName('');
    setShowCreateFolderDialog(false);
  };

  const handleRename = async () => {
    if (!nodeToRename || !newFolderName.trim()) return;

    await updateNode({
      nodeId: nodeToRename.id,
      updates: { name: newFolderName.trim() },
    });

    setNodeToRename(null);
    setNewFolderName('');
    setShowRenameDialog(false);
  };

  const handleDelete = async () => {
    if (!nodeToDelete) return;

    await deleteNode(nodeToDelete.id);
    setNodeToDelete(null);
  };

  // Helper: generate PDF blob from booking_documents content
  const generatePdfFromContent = async (bookingDocumentId: string, fileName: string): Promise<Blob | null> => {
    try {
      const { data: doc } = await supabase
        .from('booking_documents')
        .select('content, file_name')
        .eq('id', bookingDocumentId)
        .single();
      
      if (!doc?.content) {
        toast({ title: 'Sin contenido', description: 'Este contrato no tiene contenido generado.', variant: 'destructive' });
        return null;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 5;

      let y = margin;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const cleanContent = doc.content
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/–/g, '-')
        .replace(/—/g, '-')
        .replace(/…/g, '...')
        .replace(/\u00A0/g, ' ');

      const lines = pdf.splitTextToSize(cleanContent, maxWidth);
      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight - 20) {
          pdf.addPage();
          y = margin;
        }
        const isSectionHeader = /^\d+\./.test(line.trim()) ||
          (line.length < 70 && line === line.toUpperCase() && line.trim().length > 0 && !line.includes('-'));
        pdf.setFont('helvetica', isSectionHeader ? 'bold' : 'normal');
        pdf.text(line, margin, y);
        y += lineHeight;
      });

      return pdf.output('blob');
    } catch (err) {
      console.error('Error generating PDF from content:', err);
      return null;
    }
  };

  const isGeneratedContract = (node: StorageNode): boolean => {
    const meta = node.metadata as any;
    return !!(meta?.booking_document_id && (!node.file_url || node.file_url === 'generated'));
  };

  const handleDownload = async (node: StorageNode) => {
    // Handle generated contracts without real file URL
    if (isGeneratedContract(node)) {
      const meta = node.metadata as any;
      const blob = await generatePdfFromContent(meta.booking_document_id, node.name);
      if (blob) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = node.name.endsWith('.pdf') ? node.name : node.name + '.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
      return;
    }

    if (!node.file_url) return;
    
    try {
      const response = await fetch(node.file_url);
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = node.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(node.file_url, '_blank');
    }
  };

  const handleView = async (node: StorageNode) => {
    // Handle generated contracts without real file URL
    if (isGeneratedContract(node)) {
      const meta = node.metadata as any;
      const blob = await generatePdfFromContent(meta.booking_document_id, node.name);
      if (blob) {
        const viewUrl = window.URL.createObjectURL(blob);
        window.open(viewUrl, '_blank');
      }
      return;
    }

    if (node.file_url) {
      window.open(node.file_url, '_blank');
    }
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    buildBreadcrumbs(folderId);
  };

  // Create budget for the linked booking
  const handleCreateBudget = async () => {
    if (!budgetContext?.bookingData || !user?.id) {
      toast({ title: 'Error', description: 'Faltan datos para crear el presupuesto', variant: 'destructive' });
      return;
    }

    setIsCreatingBudget(true);
    try {
      const booking = budgetContext.bookingData;
      const isInternational = booking.es_internacional || 
        (booking.pais && !['españa', 'espana', 'spain', 'es'].includes(booking.pais.toLowerCase()));
      
      const budgetName = budgetContext.eventName || booking.festival_ciclo || `${booking.ciudad} - ${booking.lugar || booking.venue || 'Evento'}`;

      const { data: newBudget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          name: budgetName,
          type: 'concierto',
          artist_id: booking.artist_id,
          city: booking.ciudad || null,
          country: booking.pais || null,
          venue: booking.venue || booking.lugar || null,
          event_date: booking.fecha || null,
          event_time: booking.hora || null,
          fee: booking.fee || null,
          formato: booking.formato || null,
          festival_ciclo: booking.festival_ciclo || null,
          condiciones: booking.condiciones || null,
          budget_status: isInternational ? 'internacional' : 'nacional',
          show_status: 'pendiente',
          created_by: user.id
        })
        .select('id')
        .single();

      if (budgetError) throw budgetError;

      if (newBudget) {
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
        if (booking.formato && booking.artist_id) {
          await loadCrewFromFormat({
            budgetId: newBudget.id,
            formatName: booking.formato,
            artistId: booking.artist_id,
            bookingFee: booking.fee || 0,
            isInternational: isInternational || false,
            userId: user.id,
          });
        }
        
        toast({ title: 'Presupuesto creado', description: 'Se ha creado el presupuesto correctamente' });
        refetchBudgetContext();
        setShowBudgetDialog(true);
      }
    } catch (err) {
      console.error('Error creating budget:', err);
      toast({ title: 'Error', description: 'No se pudo crear el presupuesto', variant: 'destructive' });
    } finally {
      setIsCreatingBudget(false);
    }
  };

  // Check invoice/payment status for a file
  const handleViewStatus = async (node: StorageNode) => {
    setStatusNode(node);
    setInvoiceStatus(null);
    setShowStatusDialog(true);

    try {
      // Look for a budget_item that has this file's URL as invoice_link
      const { data: budgetItem } = await supabase
        .from('budget_items')
        .select('id, name, billing_status, fecha_emision, contacts(name, legal_name)')
        .eq('invoice_link', node.file_url)
        .maybeSingle();

      if (budgetItem) {
        setInvoiceStatus({
          found: true,
          billing_status: budgetItem.billing_status || 'pendiente',
          contact_name: (budgetItem.contacts as any)?.legal_name || (budgetItem.contacts as any)?.name || 'Sin contacto',
          fecha_emision: budgetItem.fecha_emision,
          item_name: budgetItem.name,
        });
      } else {
        setInvoiceStatus({ found: false });
      }
    } catch (error) {
      console.error('Error fetching invoice status:', error);
      setInvoiceStatus({ found: false });
    }
  };

  // Render grid view item
  const renderGridItem = (node: StorageNode) => {
    const IconComponent = node.node_type === 'folder' ? Folder : getFileIcon(node.file_type);
    const isFolder = node.node_type === 'folder';

    const content = (
      <Card
        className={`cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group ${
          compact ? 'p-2' : ''
        }`}
        onClick={() => (isFolder ? navigateToFolder(node.id) : handleView(node))}
      >
        <CardContent className={`${compact ? 'p-2' : 'p-4'} flex flex-col items-center text-center relative`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setNodeToRename(node);
                  setNewFolderName(node.name);
                  setShowRenameDialog(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Renombrar
              </DropdownMenuItem>
              {!isFolder && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(node);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(node);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewStatus(node);
                    }}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Ver estado
                  </DropdownMenuItem>
                </>
              )}
              {!node.is_system_folder && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setNodeToDelete(node);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className={`${
              compact ? 'w-10 h-10 mb-2' : 'w-12 h-12 mb-3'
            } rounded-lg bg-gradient-to-br ${
              isFolder ? 'from-yellow-500/20 to-yellow-600/10' : 'from-primary/20 to-primary/5'
            } flex items-center justify-center`}
          >
            <IconComponent
              className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} ${
                isFolder ? 'text-yellow-600' : 'text-primary'
              }`}
            />
          </div>
          <h3 className={`font-medium ${compact ? 'text-xs' : 'text-sm'} truncate w-full`}>
            {node.name}
          </h3>
          {!compact && node.node_type === 'file' && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(node.file_size)}
            </p>
          )}
        </CardContent>
      </Card>
    );

    if (isFolder) {
      return (
        <DroppableFolder key={node.id} folderId={node.id}>
          <DraggableNode node={node}>{content}</DraggableNode>
        </DroppableFolder>
      );
    }

    return (
      <DraggableNode key={node.id} node={node}>
        {content}
      </DraggableNode>
    );
  };

  // Render list view item
  const renderListItem = (node: StorageNode) => {
    const IconComponent = node.node_type === 'folder' ? Folder : getFileIcon(node.file_type);
    const isFolder = node.node_type === 'folder';

    const content = (
      <div
        className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg cursor-pointer group"
        onClick={() => (isFolder ? navigateToFolder(node.id) : handleView(node))}
      >
        <IconComponent
          className={`w-5 h-5 ${isFolder ? 'text-yellow-600' : 'text-primary'}`}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{node.name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(node.created_at), 'd MMM yyyy', { locale: es })}
          </p>
        </div>
        {node.node_type === 'file' && (
          <span className="text-sm text-muted-foreground">{formatFileSize(node.file_size)}</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setNodeToRename(node);
                setNewFolderName(node.name);
                setShowRenameDialog(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Renombrar
            </DropdownMenuItem>
            {!isFolder && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(node);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(node);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStatus(node);
                  }}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Ver estado
                </DropdownMenuItem>
              </>
            )}
            {!node.is_system_folder && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setNodeToDelete(node);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );

    if (isFolder) {
      return (
        <DroppableFolder key={node.id} folderId={node.id}>
          <DraggableNode node={node}>{content}</DraggableNode>
        </DroppableFolder>
      );
    }

    return (
      <DraggableNode key={node.id} node={node}>
        {content}
      </DraggableNode>
    );
  };

  if (!artistId) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Selecciona un artista para ver sus archivos</p>
      </Card>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {showBreadcrumbs && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => navigateToFolder(null)}
                    className="cursor-pointer flex items-center gap-1"
                  >
                    <Home className="h-4 w-4" />
                    Drive
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbPath.map((folder, index) => (
                  <BreadcrumbItem key={folder.id}>
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-4 w-4" />
                    </BreadcrumbSeparator>
                    {index === breadcrumbPath.length - 1 ? (
                      <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        onClick={() => navigateToFolder(folder.id)}
                        className="cursor-pointer"
                      >
                        {folder.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48"
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

            <Button variant="outline" size="sm" onClick={() => setShowCreateFolderDialog(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Carpeta
            </Button>

            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Subir
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`min-h-[200px] border-2 border-dashed rounded-lg transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-transparent'
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {isLoading ? (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'gap-1'}`}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className={viewMode === 'grid' ? 'h-28' : 'h-14'} />
              ))}
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              {/* Linked Budget Card */}
              {linkedBudget && (
              <Card 
                  className="w-full max-w-md cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all bg-gradient-to-br from-primary/5 to-primary/10"
                  onClick={() => setShowBudgetDialog(true)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Calculator className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-lg">{linkedBudget.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {linkedBudget.city} • {linkedBudget.event_date ? format(new Date(linkedBudget.event_date), 'd MMM yyyy', { locale: es }) : 'Sin fecha'}
                        </p>
                        {linkedBudget.fee && (
                          <p className="text-sm font-medium text-primary mt-1">
                            Fee: {linkedBudget.fee.toLocaleString('es-ES')} €
                          </p>
                        )}
                      </div>
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Create Budget Button when in Presupuesto folder but no budget exists */}
              {isPresupuestoFolder && !linkedBudget && budgetContext?.bookingData && (
                <Card className="w-full max-w-md border-dashed">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                        <Calculator className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-lg">Sin presupuesto vinculado</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Crea un presupuesto para este evento
                        </p>
                      </div>
                      <Button onClick={handleCreateBudget} disabled={isCreatingBudget}>
                        {isCreatingBudget ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Crear presupuesto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Linked Roadmap Cards */}
              {isHojasDeRutaFolder && linkedRoadmaps.length > 0 && linkedRoadmaps.map((rm: any) => (
                <Card 
                  key={rm.id}
                  className="w-full max-w-md cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all bg-gradient-to-br from-accent/5 to-accent/10"
                  onClick={() => navigate(`/roadmaps/${rm.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
                        <Map className="w-7 h-7 text-accent-foreground" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{rm.name}</h3>
                          <Badge variant={rm.status === 'confirmed' ? 'success' : 'muted'}>
                            {rm.status === 'draft' ? 'Borrador' : rm.status === 'confirmed' ? 'Confirmada' : rm.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {[
                            rm.blocks.travel > 0 && `${rm.blocks.travel} viaje${rm.blocks.travel > 1 ? 's' : ''}`,
                            rm.blocks.hospitality > 0 && `${rm.blocks.hospitality} hotel${rm.blocks.hospitality > 1 ? 'es' : ''}`,
                            rm.blocks.schedule > 0 && `${rm.blocks.schedule} día${rm.blocks.schedule > 1 ? 's' : ''}`,
                          ].filter(Boolean).join(' • ') || 'Sin bloques'}
                        </p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Create Roadmap Button when in Hojas de Ruta folder but no roadmaps exist */}
              {isHojasDeRutaFolder && linkedRoadmaps.length === 0 && (
                <Card className="w-full max-w-md border-dashed">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                        <Map className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-lg">Sin hoja de ruta vinculada</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Crea una hoja de ruta desde el detalle del evento
                        </p>
                      </div>
                      {roadmapContext?.bookingId && (
                        <Button onClick={() => navigate(`/booking/${roadmapContext.bookingId}`)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Hoja de Ruta
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="flex flex-col items-center">
                <Folder className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No se encontraron resultados' : (linkedBudget || linkedRoadmaps.length > 0) ? 'También puedes subir archivos relacionados' : 'Esta carpeta está vacía'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Arrastra archivos aquí o usa el botón "Subir"
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-4">
              {/* Show linked budget card at top when in Presupuesto folder */}
              {linkedBudget && (
              <Card 
                  className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all bg-gradient-to-br from-primary/5 to-primary/10"
                  onClick={() => setShowBudgetDialog(true)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Calculator className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{linkedBudget.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {linkedBudget.fee ? `Fee: ${linkedBudget.fee.toLocaleString('es-ES')} €` : 'Ver presupuesto completo'}
                        </p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Show linked roadmap cards in grid view */}
              {isHojasDeRutaFolder && linkedRoadmaps.map((rm: any) => (
                <Card 
                  key={rm.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all bg-gradient-to-br from-accent/5 to-accent/10"
                  onClick={() => navigate(`/roadmaps/${rm.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                        <Map className="w-6 h-6 text-accent-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{rm.name}</h3>
                          <Badge variant={rm.status === 'confirmed' ? 'success' : 'muted'} className="text-xs">
                            {rm.status === 'draft' ? 'Borrador' : rm.status === 'confirmed' ? 'Confirmada' : rm.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[
                            rm.blocks.travel > 0 && `${rm.blocks.travel} viaje${rm.blocks.travel > 1 ? 's' : ''}`,
                            rm.blocks.hospitality > 0 && `${rm.blocks.hospitality} hotel${rm.blocks.hospitality > 1 ? 'es' : ''}`,
                            rm.blocks.schedule > 0 && `${rm.blocks.schedule} día${rm.blocks.schedule > 1 ? 's' : ''}`,
                          ].filter(Boolean).join(' • ') || 'Ver hoja de ruta'}
                        </p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {folders.map(renderGridItem)}
                {files.map(renderGridItem)}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Show linked budget in list view too */}
              {linkedBudget && (
              <div 
                  className="flex items-center gap-4 p-3 hover:bg-primary/5 rounded-lg cursor-pointer border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent"
                  onClick={() => setShowBudgetDialog(true)}
                >
                  <Calculator className="w-5 h-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{linkedBudget.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Presupuesto vinculado • {linkedBudget.fee ? `${linkedBudget.fee.toLocaleString('es-ES')} €` : 'Ver detalles'}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              {/* Show linked roadmaps in list view */}
              {isHojasDeRutaFolder && linkedRoadmaps.map((rm: any) => (
                <div 
                  key={rm.id}
                  className="flex items-center gap-4 p-3 hover:bg-accent/5 rounded-lg cursor-pointer border border-accent/20 bg-gradient-to-r from-accent/5 to-transparent"
                  onClick={() => navigate(`/roadmaps/${rm.id}`)}
                >
                  <Map className="w-5 h-5 text-accent-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{rm.name}</p>
                      <Badge variant={rm.status === 'confirmed' ? 'success' : 'muted'} className="text-xs">
                        {rm.status === 'draft' ? 'Borrador' : rm.status === 'confirmed' ? 'Confirmada' : rm.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hoja de ruta • {[
                        rm.blocks.travel > 0 && `${rm.blocks.travel} viaje${rm.blocks.travel > 1 ? 's' : ''}`,
                        rm.blocks.hospitality > 0 && `${rm.blocks.hospitality} hotel${rm.blocks.hospitality > 1 ? 'es' : ''}`,
                        rm.blocks.schedule > 0 && `${rm.blocks.schedule} día${rm.blocks.schedule > 1 ? 's' : ''}`,
                      ].filter(Boolean).join(', ') || 'Ver detalles'}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
              {folders.map(renderListItem)}
              {files.map(renderListItem)}
            </div>
          )}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDragNode && (
            <Card className="p-3 shadow-lg">
              <div className="flex items-center gap-2">
                {activeDragNode.node_type === 'folder' ? (
                  <Folder className="w-5 h-5 text-yellow-600" />
                ) : (
                  <File className="w-5 h-5 text-primary" />
                )}
                <span className="font-medium text-sm">{activeDragNode.name}</span>
              </div>
            </Card>
          )}
        </DragOverlay>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Carpeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nombre</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la carpeta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreating}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nuevo nombre</Label>
              <Input
                id="new-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!newFolderName.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={() => setNodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {nodeToDelete?.node_type === 'folder' ? 'carpeta' : 'archivo'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {nodeToDelete?.node_type === 'folder'
                ? 'Se eliminarán todos los archivos y subcarpetas contenidos.'
                : `Se eliminará "${nodeToDelete?.name}" permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Invoice Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Estado de factura
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {invoiceStatus === null ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : !invoiceStatus.found ? (
              <div className="text-center py-4 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Este archivo no está vinculado a ningún gasto del presupuesto.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Concepto</p>
                  <p className="font-medium">{invoiceStatus.item_name}</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Proveedor</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{invoiceStatus.contact_name}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${
                  invoiceStatus.billing_status === 'pagado' 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}>
                  <p className="text-sm text-muted-foreground mb-1">Estado de pago</p>
                  <div className="flex items-center gap-2">
                    {invoiceStatus.billing_status === 'pagado' ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-700">Pagado</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-700 capitalize">
                          {invoiceStatus.billing_status || 'Pendiente'}
                        </span>
                      </>
                    )}
                  </div>
                  {invoiceStatus.fecha_emision && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Fecha emisión: {format(new Date(invoiceStatus.fecha_emision), 'd MMM yyyy', { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Details Dialog */}
      {linkedBudget && (
        <BudgetDetailsDialog
          open={showBudgetDialog}
          onOpenChange={setShowBudgetDialog}
          budget={{
            id: linkedBudget.id,
            name: linkedBudget.name,
            type: 'concierto',
            city: linkedBudget.city || '',
            country: '',
            venue: linkedBudget.venue || '',
            budget_status: linkedBudget.budget_status || '',
            show_status: '',
            internal_notes: '',
            created_at: '',
            artist_id: artistId || '',
            event_date: linkedBudget.event_date || '',
            event_time: '',
            fee: linkedBudget.fee || 0,
            formato: linkedBudget.formato || '',
          }}
          onUpdate={() => refetchBudgetContext()}
        />
      )}
    </DndContext>
  );
}
