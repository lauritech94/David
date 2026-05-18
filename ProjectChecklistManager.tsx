import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Trash2, Plus, CheckCircle2, FileText, Save, Filter, Users, ChevronDown, MoreVertical, Clock, CheckCircle, ChevronUp, TriangleAlert, Link, Search, Pencil, ListChecks, Copy } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TemplateSelectionDialog } from "./TemplateSelectionDialog";
import { SaveTemplateDialog } from "./SaveAsTemplateDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { TaskFlowManager } from "./TaskFlowManager";
import { LinkTaskDialog } from "./LinkTaskDialog";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  status: TaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
  section?: string;
  section_es?: string;
  owner_label_es?: string;
  checklist_id?: string | null;
}

interface ProjectChecklist {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectChecklistManagerProps {
  projectId: string;
  canEdit: boolean;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  'PENDING': 'Pendiente',
  'IN_PROGRESS': 'En progreso',
  'BLOCKED': 'Bloqueada',
  'IN_REVIEW': 'En revisión',
  'COMPLETED': 'Completada',
  'CANCELLED': 'Cancelada'
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  'PENDING': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'IN_PROGRESS': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-300',
  'BLOCKED': 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-300',
  'IN_REVIEW': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-300',
  'COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-300',
  'CANCELLED': 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
};

export function ProjectChecklistManager({ projectId, canEdit }: ProjectChecklistManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'flow'>('list');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [allItems, setAllItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState<ProjectChecklist[]>([]);
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [renamingChecklistId, setRenamingChecklistId] = useState<string | null>(null);
  const [renameChecklistName, setRenameChecklistName] = useState("");
  const [deleteChecklistConfirm, setDeleteChecklistConfirm] = useState<ProjectChecklist | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ChecklistItem | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  const [openSaveTemplateDialog, setOpenSaveTemplateDialog] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedTaskForLink, setSelectedTaskForLink] = useState<ChecklistItem | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<ChecklistItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<TaskStatus>>(new Set());
  const [soloFilterStatus, setSoloFilterStatus] = useState<TaskStatus | null>(null);
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkUpdateConfirm, setBulkUpdateConfirm] = useState<{
    count: number;
    status: TaskStatus;
    items: Set<string>;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'PREPARATIVOS': true,
    'PRODUCCION': true,
    'CIERRE': true
  });
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(true);
  const [blockingDialog, setBlockingDialog] = useState<{
    item: ChecklistItem;
    blockingTasks: string[];
    additionalInfo: string;
  } | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{
    item: ChecklistItem;
    reason: string;
  } | null>(null);

  // Helper function to check if task has linked items
  const getLinkedItemsCount = (taskId: string) => {
    const storedLinks = localStorage.getItem(`task_links_${taskId}`);
    return storedLinks ? JSON.parse(storedLinks).length : 0;
  };

  // Fetch checklists for this project
  const fetchChecklists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('project_checklists')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      let checklistsList = data || [];

      setChecklists(checklistsList);

      // Set active checklist if none selected or current one no longer exists
      if (checklistsList.length > 0 && (!activeChecklistId || !checklistsList.find(c => c.id === activeChecklistId))) {
        setActiveChecklistId(checklistsList[0]?.id || null);
      } else if (checklistsList.length === 0) {
        setActiveChecklistId(null);
      }

      return checklistsList;
    } catch (error) {
      console.error('Error fetching checklists:', error);
      return [];
    }
  }, [projectId, activeChecklistId]);

  useEffect(() => {
    const init = async () => {
      await fetchChecklists();
    };
    init();
  }, [projectId]);

  // Fetch items when activeChecklistId changes
  useEffect(() => {
    if (activeChecklistId) {
      fetchChecklistItems();
    } else {
      // No active checklist (project may have none yet) — stop the loading state
      setItems([]);
      setLoading(false);
    }
  }, [activeChecklistId]);

  // Helper functions for dependency management
  const extractBlockingInfo = (description: string | null) => {
    if (!description) return { blockingTasks: [], additionalInfo: '', otherContent: '', wasUnblocked: false };
    
    const blockingTasksMatch = description.match(/Tareas bloqueantes: ([^|]+)/);
    const additionalInfoMatch = description.match(/Información adicional: ([^|]+)/);
    const reviewMatch = description.match(/Motivo de revisión: ([^|]+)/);
    const unblockedMatch = description.match(/Las dependencias se han completado!\s*🎉/);
    
    let blockingTasks: string[] = [];
    let additionalInfo = '';
    let wasUnblocked = !!unblockedMatch;
    let otherContent = description;
    
    if (blockingTasksMatch) {
      blockingTasks = blockingTasksMatch[1].split(', ').filter(task => task.trim());
      otherContent = otherContent.replace(/Tareas bloqueantes: [^|]+(\s*\|\s*)?/g, '').trim();
    }
    
    if (additionalInfoMatch) {
      additionalInfo = additionalInfoMatch[1].trim();
      otherContent = otherContent.replace(/Información adicional: [^|]+(\s*\|\s*)?/g, '').trim();
    }
    
    if (reviewMatch) {
      otherContent = otherContent.replace(/Motivo de revisión: [^|]+(\s*\|\s*)?/g, '').trim();
    }
    
    if (unblockedMatch) {
      otherContent = otherContent.replace(/Las dependencias se han completado!\s*🎉(\s*\|\s*)?/g, '').trim();
    }
    
    // Clean up any remaining separators
    otherContent = otherContent.replace(/^\s*\|\s*|\s*\|\s*$/g, '').trim();
    
    return { blockingTasks, additionalInfo, otherContent, wasUnblocked };
  };

  const getTasksThatBlockOthers = () => {
    const blockingTasks = new Set<string>();
    
    items.forEach(item => {
      if (item.status === 'BLOCKED') {
        const { blockingTasks: blocking } = extractBlockingInfo(item.description);
        blocking.forEach(taskTitle => blockingTasks.add(taskTitle));
      }
    });
    
    return blockingTasks;
  };

  const checkForUnblockedTasks = async () => {
    console.log('Checking for unblocked tasks...');
    const tasksToUpdate: ChecklistItem[] = [];
    
    items.forEach(item => {
      console.log(`Checking item: ${item.title}, status: ${item.status}`);
      if (item.status === 'BLOCKED') {
        const { blockingTasks, otherContent } = extractBlockingInfo(item.description);
        console.log(`Blocking tasks for "${item.title}":`, blockingTasks);
        
        // Check if all blocking tasks are now completed or cancelled
        const stillBlockedTasks = blockingTasks.filter(taskTitle => {
          const blockingTask = items.find(t => t.title === taskTitle);
          console.log(`Found blocking task "${taskTitle}":`, blockingTask?.status);
          return blockingTask && blockingTask.status !== 'COMPLETED' && blockingTask.status !== 'CANCELLED';
        });
        
        console.log(`Still blocked tasks for "${item.title}":`, stillBlockedTasks);
        
        if (stillBlockedTasks.length === 0 && blockingTasks.length > 0) {
          // Task is no longer blocked, add notification
          let newDescription = otherContent;
          if (newDescription) {
            newDescription += ' | ';
          }
          newDescription += "Las dependencias se han completado! 🎉";
          
          console.log(`Task "${item.title}" will be unblocked`);
          tasksToUpdate.push({
            ...item,
            description: newDescription,
            status: 'PENDING'
          });
        }
      }
    });
    
    console.log('Tasks to unblock:', tasksToUpdate.length);
    
    // Update unblocked tasks
    for (const task of tasksToUpdate) {
      console.log(`Updating task "${task.title}" to PENDING`);
      const { error } = await supabase
        .from('project_checklist_items')
        .update({ 
          description: task.description,
          status: 'PENDING'
        })
        .eq('id', task.id);
        
      if (error) {
        console.error('Error updating unblocked task:', error);
      }
    }
    
    if (tasksToUpdate.length > 0) {
      fetchChecklistItems();
      toast({
        title: "Tareas desbloqueadas",
        description: `${tasksToUpdate.length} tarea(s) ya pueden continuar.`,
      });
    }
  };

  const checkForUnblockedTasksWithItems = async (currentItems: ChecklistItem[]) => {
    console.log('Checking for unblocked tasks with fresh items...');
    const tasksToUpdate: ChecklistItem[] = [];
    
    currentItems.forEach(item => {
      console.log(`Checking item: ${item.title}, status: ${item.status}`);
      if (item.status === 'BLOCKED') {
        const { blockingTasks, otherContent } = extractBlockingInfo(item.description);
        console.log(`Blocking tasks for "${item.title}":`, blockingTasks);
        
        // Check if all blocking tasks are now completed or cancelled
        const stillBlockedTasks = blockingTasks.filter(taskTitle => {
          const blockingTask = currentItems.find(t => t.title === taskTitle);
          console.log(`Found blocking task "${taskTitle}":`, blockingTask?.status);
          return blockingTask && blockingTask.status !== 'COMPLETED' && blockingTask.status !== 'CANCELLED';
        });
        
        console.log(`Still blocked tasks for "${item.title}":`, stillBlockedTasks);
        
        if (stillBlockedTasks.length === 0 && blockingTasks.length > 0) {
          // Task is no longer blocked, add notification
          let newDescription = otherContent;
          if (newDescription) {
            newDescription += ' | ';
          }
          newDescription += "Las dependencias se han completado! 🎉";
          
          console.log(`Task "${item.title}" will be unblocked`);
          tasksToUpdate.push({
            ...item,
            description: newDescription,
            status: 'PENDING'
          });
        }
      }
    });
    
    console.log('Tasks to unblock:', tasksToUpdate.length);
    
    // Update unblocked tasks
    for (const task of tasksToUpdate) {
      console.log(`Updating task "${task.title}" to PENDING`);
      const { error } = await supabase
        .from('project_checklist_items')
        .update({ 
          description: task.description,
          status: 'PENDING'
        })
        .eq('id', task.id);
        
      if (error) {
        console.error('Error updating unblocked task:', error);
      }
    }
    
    if (tasksToUpdate.length > 0) {
      fetchChecklistItems();
      toast({
        title: "Tareas desbloqueadas",
        description: `${tasksToUpdate.length} tarea(s) ya pueden continuar.`,
      });
    }
  };

  const fetchChecklistItems = async (skipDefaultTemplate = false) => {
    try {
      // Fetch ALL items for the project (for badge count etc.)
      const { data: allData, error: allError } = await supabase
        .from('project_checklist_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (allError) throw allError;
      setAllItems(allData || []);

      // Filter by active checklist
      const checklistItems = (allData || []).filter(item => 
        activeChecklistId ? item.checklist_id === activeChecklistId : true
      );
      setItems(checklistItems);
      
      // No auto-loading of templates - user decides when to create
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const addChecklistItem = async () => {
    if (!newTitle.trim()) return;

    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('project_checklist_items')
        .insert({
          project_id: projectId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          sort_order: items.length,
          created_by: user.data.user?.id || '',
          checklist_id: activeChecklistId,
        });

      if (error) throw error;

      setNewTitle("");
      setNewDescription("");
      setOpenAddDialog(false);
      fetchChecklistItems();
      
      toast({
        title: "Tarea añadida",
        description: "La tarea se ha añadido correctamente.",
      });
    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir la tarea.",
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (item: ChecklistItem, newStatus: TaskStatus) => {
    console.log('updateTaskStatus called with:', { itemId: item.id, newStatus, itemTitle: item.title });
    
    try {
      console.log('Updating task status:', {
        itemId: item.id,
        newStatus,
        selectedItems: Array.from(selectedItems),
        isSelected: selectedItems.has(item.id),
        selectedCount: selectedItems.size
      });

      const user = await supabase.auth.getUser();
      const updates: any = { status: newStatus };
      
      // Clean blocking/review text when completing or cancelling
      if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
        const { otherContent } = extractBlockingInfo(item.description);
        updates.description = otherContent || null;
      }
      
      // Update legacy is_completed field for backwards compatibility
      if (newStatus === 'COMPLETED') {
        updates.is_completed = true;
        updates.completed_by = user.data.user?.id;
        updates.completed_at = new Date().toISOString();
      } else {
        updates.is_completed = false;
        updates.completed_by = null;
        updates.completed_at = null;
      }

      // If this item is selected and there are multiple selected items, show confirmation dialog
      if (selectedItems.has(item.id) && selectedItems.size > 1) {
        console.log('Updating multiple selected items:', Array.from(selectedItems));
        
        // For BLOCKED status with multiple items, handle special blocking dialog
        if (newStatus === 'BLOCKED') {
          console.log('Setting blocking dialog for BLOCKED status with multiple items');
          setBlockingDialog({
            item,
            blockingTasks: [],
            additionalInfo: ''
          });
          return;
        }

        // For IN_REVIEW status with multiple items, handle special review dialog
        if (newStatus === 'IN_REVIEW') {
          console.log('Setting review dialog for IN_REVIEW status with multiple items');
          setReviewDialog({
            item,
            reason: ''
          });
          return;
        }

        // Set up bulk update confirmation for other statuses
        setBulkUpdateConfirm({
          count: selectedItems.size,
          status: newStatus,
          items: new Set(selectedItems)
        });
        return; // Exit here, the actual update will happen in the confirmation dialog
      } else {
        console.log('Updating single item');
        
        // For single items with special statuses, show dialogs
        if (newStatus === 'BLOCKED') {
          console.log('Setting blocking dialog for BLOCKED status');
          setBlockingDialog({
            item,
            blockingTasks: [],
            additionalInfo: ''
          });
          return;
        }

        if (newStatus === 'IN_REVIEW') {
          console.log('Setting review dialog for IN_REVIEW status');
          setReviewDialog({
            item,
            reason: ''
          });
          return;
        }
        
        // Update only the single item
        const { error } = await supabase
          .from('project_checklist_items')
          .update(updates)
          .eq('id', item.id);

        if (error) throw error;

        fetchChecklistItems();
        
        // Check for tasks that might now be unblocked after fetching fresh data
        if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
          setTimeout(async () => {
            // Re-fetch items to get the latest state
            const { data: latestItems } = await supabase
              .from('project_checklist_items')
              .select('*')
              .eq('project_id', projectId)
              .order('sort_order', { ascending: true });
              
            if (latestItems) {
              await checkForUnblockedTasksWithItems(latestItems);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la tarea.",
        variant: "destructive",
      });
    }
  };

  const handleBlockingConfirm = async () => {
    if (!blockingDialog) return;

    try {
      const user = await supabase.auth.getUser();
      const updates: any = { 
        status: 'BLOCKED',
        is_completed: false,
        completed_by: null,
        completed_at: null
      };

      // Check if this item is selected and there are multiple selected items
      const itemsToUpdate = selectedItems.has(blockingDialog.item.id) && selectedItems.size > 1 
        ? Array.from(selectedItems) 
        : [blockingDialog.item.id];

      console.log('Blocking items:', itemsToUpdate, 'Selected items:', Array.from(selectedItems));

      // For bulk blocking, we need to update each item individually to handle descriptions properly
      if (itemsToUpdate.length > 1) {
        // Get all items to update their descriptions individually
        const { data: itemsData, error: fetchError } = await supabase
          .from('project_checklist_items')
          .select('*')
          .in('id', itemsToUpdate);

        if (fetchError) throw fetchError;

        // Update each item with its own description + blocking info
        for (const item of itemsData || []) {
          const { otherContent } = extractBlockingInfo(item.description);
          let description = otherContent;
          
          // Remove duplicates and filter empty values from blocking tasks
          const uniqueBlockingTasks = [...new Set(blockingDialog.blockingTasks.filter(task => task.trim()))];
          
          // Append blocking information
          if (uniqueBlockingTasks.length > 0 || blockingDialog.additionalInfo.trim()) {
            const blockingInfo = [];
            if (uniqueBlockingTasks.length > 0) {
              blockingInfo.push(`Tareas bloqueantes: ${uniqueBlockingTasks.join(', ')}`);
            }
            if (blockingDialog.additionalInfo.trim()) {
              blockingInfo.push(`Información adicional: ${blockingDialog.additionalInfo.trim()}`);
            }
            
            // Add blocking info to description
            if (description) {
              description += ` | ${blockingInfo.join(' | ')}`;
            } else {
              description = blockingInfo.join(' | ');
            }
          }

          const itemUpdates = {
            ...updates,
            description: description || null
          };

          const { error } = await supabase
            .from('project_checklist_items')
            .update(itemUpdates)
            .eq('id', item.id);

          if (error) throw error;
        }

        setSelectedItems(new Set());
        
        toast({
          title: "Tareas bloqueadas",
          description: `${itemsToUpdate.length} tareas han sido marcadas como bloqueadas correctamente.`,
        });
      } else {
        // Single item blocking
        const { otherContent } = extractBlockingInfo(blockingDialog.item.description);
        let description = otherContent;
        
        // Remove duplicates and filter empty values from blocking tasks
        const uniqueBlockingTasks = [...new Set(blockingDialog.blockingTasks.filter(task => task.trim()))];
        
        // Append blocking information
        if (uniqueBlockingTasks.length > 0 || blockingDialog.additionalInfo.trim()) {
          const blockingInfo = [];
          if (uniqueBlockingTasks.length > 0) {
            blockingInfo.push(`Tareas bloqueantes: ${uniqueBlockingTasks.join(', ')}`);
          }
          if (blockingDialog.additionalInfo.trim()) {
            blockingInfo.push(`Información adicional: ${blockingDialog.additionalInfo.trim()}`);
          }
          
          // Add blocking info to description
          if (description) {
            description += ` | ${blockingInfo.join(' | ')}`;
          } else {
            description = blockingInfo.join(' | ');
          }
          updates.description = description;
        } else {
          // If no blocking info, just keep the original content
          updates.description = description || null;
        }

        const { error } = await supabase
          .from('project_checklist_items')
          .update(updates)
          .eq('id', blockingDialog.item.id);

        if (error) throw error;

        toast({
          title: "Tarea bloqueada",
          description: "La tarea ha sido marcada como bloqueada correctamente.",
        });
      }

      setBlockingDialog(null);
      fetchChecklistItems();
      
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la tarea.",
        variant: "destructive",
      });
    }
  };

  const handleReviewConfirm = async () => {
    if (!reviewDialog) return;

    try {
      const user = await supabase.auth.getUser();
      const updates: any = { 
        status: 'IN_REVIEW',
        is_completed: false,
        completed_by: null,
        completed_at: null
      };

      // Check if this item is selected and there are multiple selected items
      const itemsToUpdate = selectedItems.has(reviewDialog.item.id) && selectedItems.size > 1 
        ? Array.from(selectedItems) 
        : [reviewDialog.item.id];

      if (itemsToUpdate.length > 1) {
        // Bulk update for multiple items
        for (const itemId of itemsToUpdate) {
          const item = items.find(i => i.id === itemId);
          if (!item) continue;

          let description = item.description || '';
          
          // Add review reason to description if provided
          if (reviewDialog.reason.trim()) {
            const reviewInfo = `Motivo de revisión: ${reviewDialog.reason.trim()}`;
            if (description) {
              description += ` | ${reviewInfo}`;
            } else {
              description = reviewInfo;
            }
          }

          const itemUpdates = {
            ...updates,
            description: description || null
          };

          const { error } = await supabase
            .from('project_checklist_items')
            .update(itemUpdates)
            .eq('id', itemId);

          if (error) throw error;
        }

        setSelectedItems(new Set());
        
        toast({
          title: "Tareas en revisión",
          description: `${itemsToUpdate.length} tareas han sido marcadas para revisión correctamente.`,
        });
      } else {
        // Single item review
        let description = reviewDialog.item.description || '';
        
        // Add review reason to description if provided
        if (reviewDialog.reason.trim()) {
          const reviewInfo = `Motivo de revisión: ${reviewDialog.reason.trim()}`;
          if (description) {
            description += ` | ${reviewInfo}`;
          } else {
            description = reviewInfo;
          }
          updates.description = description;
        }

        const { error } = await supabase
          .from('project_checklist_items')
          .update(updates)
          .eq('id', reviewDialog.item.id);

        if (error) throw error;

        toast({
          title: "Tarea en revisión",
          description: "La tarea ha sido marcada para revisión correctamente.",
        });
      }

      setReviewDialog(null);
      fetchChecklistItems();
      
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la tarea.",
        variant: "destructive",
      });
    }
  };

  const toggleItemCompletion = async (item: ChecklistItem) => {
    const newStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await updateTaskStatus(item, newStatus);
  };

  const deleteItem = async () => {
    if (!deleteConfirm) return;

    try {
      // If this item is selected and there are multiple selected items, delete all selected
      if (selectedItems.has(deleteConfirm.id) && selectedItems.size > 1) {
        const { error } = await supabase
          .from('project_checklist_items')
          .delete()
          .in('id', Array.from(selectedItems));

        if (error) throw error;

        setSelectedItems(new Set());
        setDeleteConfirm(null);
        fetchChecklistItems();
        
        toast({
          title: "Tareas eliminadas",
          description: `${selectedItems.size} tareas han sido eliminadas.`,
        });
      } else {
        // Delete only the single item
        const { error } = await supabase
          .from('project_checklist_items')
          .delete()
          .eq('id', deleteConfirm.id);

        if (error) throw error;

        setDeleteConfirm(null);
        fetchChecklistItems();
        
        toast({
          title: "Tarea eliminada",
          description: "La tarea se ha eliminado.",
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea.",
        variant: "destructive",
      });
    }
  };

  const clearAllItems = async () => {
    try {
      let query = supabase
        .from('project_checklist_items')
        .delete()
        .eq('project_id', projectId);
      
      if (activeChecklistId) {
        query = query.eq('checklist_id', activeChecklistId);
      }

      const { error } = await query;

      if (error) throw error;

      setClearAllConfirm(false);
      setItems([]);
      
      toast({
        title: "Tareas vaciadas",
        description: "Todas las tareas de esta checklist han sido eliminadas.",
      });
    } catch (error) {
      console.error('Error clearing checklist:', error);
      toast({
        title: "Error",
        description: "No se pudo vaciar las tareas.",
        variant: "destructive",
      });
    }
  };

  // Checklist CRUD
  const createChecklist = async () => {
    if (!newChecklistName.trim()) return;
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('project_checklists')
        .insert({
          project_id: projectId,
          name: newChecklistName.trim(),
          sort_order: checklists.length,
          created_by: user.data.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setNewChecklistName("");
      setIsCreatingChecklist(false);
      setActiveChecklistId(data.id);
      await fetchChecklists();
      
      toast({
        title: "Checklist creada",
        description: `"${data.name}" se ha creado correctamente.`,
      });
    } catch (error) {
      console.error('Error creating checklist:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la checklist.",
        variant: "destructive",
      });
    }
  };

  const renameChecklist = async () => {
    if (!renamingChecklistId || !renameChecklistName.trim()) return;
    try {
      const { error } = await supabase
        .from('project_checklists')
        .update({ name: renameChecklistName.trim(), updated_at: new Date().toISOString() })
        .eq('id', renamingChecklistId);

      if (error) throw error;

      setRenamingChecklistId(null);
      setRenameChecklistName("");
      await fetchChecklists();

      toast({
        title: "Checklist renombrada",
        description: "El nombre se ha actualizado correctamente.",
      });
    } catch (error) {
      console.error('Error renaming checklist:', error);
      toast({
        title: "Error",
        description: "No se pudo renombrar la checklist.",
        variant: "destructive",
      });
    }
  };

  const duplicateChecklist = async () => {
    const activeChecklist = checklists.find(c => c.id === activeChecklistId);
    if (!activeChecklist) return;
    try {
      const user = await supabase.auth.getUser();
      const { data: newChecklist, error: insertError } = await supabase
        .from('project_checklists')
        .insert({
          project_id: projectId,
          name: `${activeChecklist.name} (copia)`,
          sort_order: checklists.length,
          created_by: user.data.user?.id || null,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Copy items from active checklist
      const activeItems = items.filter(i => i.checklist_id === activeChecklistId);
      if (activeItems.length > 0) {
        const newItems = activeItems.map((item, idx) => ({
          project_id: projectId,
          title: item.title,
          description: item.description,
          section: item.section,
          sort_order: idx,
          created_by: user.data.user?.id || '',
          checklist_id: newChecklist.id,
        }));
        const { error: itemsError } = await supabase
          .from('project_checklist_items')
          .insert(newItems);
        if (itemsError) throw itemsError;
      }

      await fetchChecklists();
      setActiveChecklistId(newChecklist.id);
      toast({
        title: "Checklist duplicada",
        description: `Se creó "${newChecklist.name}" con ${activeItems.length} tarea(s).`,
      });
    } catch (error) {
      console.error('Error duplicating checklist:', error);
      toast({ title: "Error", description: "No se pudo duplicar la checklist.", variant: "destructive" });
    }
  };

  const deleteChecklist = async () => {
    if (!deleteChecklistConfirm) return;
    try {
      // Delete items first (cascade should handle it but be safe)
      const { error } = await supabase
        .from('project_checklists')
        .delete()
        .eq('id', deleteChecklistConfirm.id);

      if (error) throw error;

      setDeleteChecklistConfirm(null);
      
      // If we deleted the active one, switch to the first remaining
      if (activeChecklistId === deleteChecklistConfirm.id) {
        setActiveChecklistId(null);
      }
      
      await fetchChecklists();
      
      toast({
        title: "Checklist eliminada",
        description: `"${deleteChecklistConfirm.name}" y sus tareas han sido eliminadas.`,
      });
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la checklist.",
        variant: "destructive",
      });
    }
  };

  // Selection functions
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const selectAllVisible = () => {
    // Calculate filtered items with normalized sections
    const visibleItems = items.filter(item => {
      let itemSection = item.section || 'SIN_CATEGORIA';
      if (itemSection === 'PRODUCCIÓN') itemSection = 'PRODUCCION';
      if (itemSection === 'Sin categoría' || itemSection === null) itemSection = 'SIN_CATEGORIA';
      
      const sectionMatch = filterSection === 'all' || itemSection === filterSection;
      const statusMatch = selectedStatuses.size === 0 || !selectedStatuses.has(item.status || 'PENDING');
      const ownerMatch = filterOwner === 'all' || (item.description || 'Sin asignar') === filterOwner;
      return sectionMatch && statusMatch && ownerMatch;
    });
    const visibleItemIds = new Set(visibleItems.map(item => item.id));
    setSelectedItems(visibleItemIds);
  };

  // Bulk actions
  const bulkUpdateStatus = async (newStatus: TaskStatus) => {
    if (selectedItems.size === 0) return;

    try {
      const user = await supabase.auth.getUser();
      const updates: any = { status: newStatus };
      
      if (newStatus === 'COMPLETED') {
        updates.is_completed = true;
        updates.completed_by = user.data.user?.id;
        updates.completed_at = new Date().toISOString();
      } else {
        updates.is_completed = false;
        updates.completed_by = null;
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('project_checklist_items')
        .update(updates)
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      fetchChecklistItems();
      
      toast({
        title: "Tareas actualizadas",
        description: `${selectedItems.size} tareas han sido marcadas como ${STATUS_LABELS[newStatus].toLowerCase()}.`,
      });
    } catch (error) {
      console.error('Error updating tasks:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las tareas seleccionadas.",
        variant: "destructive",
      });
    }
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      const { error } = await supabase
        .from('project_checklist_items')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      fetchChecklistItems();
      
      toast({
        title: "Tareas eliminadas",
        description: `${selectedItems.size} tareas han sido eliminadas.`,
      });
    } catch (error) {
      console.error('Error deleting tasks:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las tareas seleccionadas.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Checklist del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Cargando tareas...</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate progress based on COMPLETED status only
  const completedCount = items.filter(item => item.status === 'COMPLETED').length;
  const progressPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  // Get unique sections for filters (normalize them)
  const sections = Array.from(new Set(items.map(item => {
    let section = item.section || 'SIN_CATEGORIA';
    if (section === 'PRODUCCIÓN') section = 'PRODUCCION';
    if (section === 'Sin categoría' || section === null) section = 'SIN_CATEGORIA';
    return section;
  }).filter(Boolean)));
  const owners = Array.from(new Set(items.map(item => item.description || 'Sin asignar').filter(Boolean)));

  // Filter items based on current filters
  const filteredItems = items.filter(item => {
    let itemSection = item.section || 'SIN_CATEGORIA';
    if (itemSection === 'PRODUCCIÓN') itemSection = 'PRODUCCION';
    if (itemSection === 'Sin categoría' || itemSection === null) itemSection = 'SIN_CATEGORIA';
    
    const sectionMatch = filterSection === 'all' || itemSection === filterSection;
    
    // Solo filter takes precedence over multi-status filter
    const statusMatch = soloFilterStatus 
      ? (item.status || 'PENDING') === soloFilterStatus
      : (selectedStatuses.size === 0 || !selectedStatuses.has(item.status || 'PENDING'));
    
    const ownerMatch = filterOwner === 'all' || (item.description || 'Sin asignar') === filterOwner;
    
    return sectionMatch && statusMatch && ownerMatch;
  });

  // Group items by section
  const groupedItems = filteredItems.reduce((acc, item) => {
    let section = item.section || 'SIN_CATEGORIA';
    // Normalize section names - handle accented versions
    if (section === 'PRODUCCIÓN') section = 'PRODUCCION';
    if (section === 'Sin categoría' || section === null) section = 'SIN_CATEGORIA';
    
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const getSectionDisplayName = (section: string) => {
    const sectionMap: Record<string, string> = {
      'PREPARATIVOS': 'PREPARATIVOS',
      'PRODUCCION': 'PRODUCCION', 
      'CIERRE': 'CIERRE',
      'SIN_CATEGORIA': 'SIN CATEGORIA'
    };
    return sectionMap[section] || section;
  };

  const getSectionColor = (section: string) => {
    // Return neutral colors for all sections
    return 'bg-muted text-muted-foreground';
  };

  // Get status counts for filter labels
  const statusCounts = items.reduce((acc, item) => {
    const status = item.status || 'PENDING';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const activeChecklist = checklists.find(c => c.id === activeChecklistId);

  // Empty state: no checklists at all
  if (checklists.length === 0 && !loading) {
    return (
      <>
        <Card className="border-dashed border-2">
          <CardContent className="text-center p-12">
            <div className="bg-muted/50 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <ListChecks className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-xl mb-3">No hay checklists en este proyecto</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Crea una checklist para organizar las tareas del proyecto.
            </p>
            {canEdit && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setOpenTemplateDialog(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Crear desde plantilla
                </Button>
                <Button variant="outline" onClick={() => setIsCreatingChecklist(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear checklist vacía
                </Button>
              </div>
            )}
            {isCreatingChecklist && (
              <div className="mt-4 flex gap-2 max-w-xs mx-auto">
                <Input
                  value={newChecklistName}
                  onChange={(e) => setNewChecklistName(e.target.value)}
                  placeholder="Nombre de la checklist..."
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createChecklist();
                    if (e.key === 'Escape') {
                      setIsCreatingChecklist(false);
                      setNewChecklistName("");
                    }
                  }}
                />
                <Button size="sm" onClick={createChecklist}>Crear</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <TemplateSelectionDialog
          open={openTemplateDialog}
          onOpenChange={setOpenTemplateDialog}
          projectId={projectId}
          onTemplateApplied={async (newChecklistId) => {
            const cls = await fetchChecklists();
            if (newChecklistId) {
              setActiveChecklistId(newChecklistId);
            } else if (cls.length > 0) {
              setActiveChecklistId(cls[0].id);
            }
          }}
          checklistId={activeChecklistId}
        />
      </>
    );
  }

  return (
    <>
      <Collapsible open={isChecklistExpanded} onOpenChange={setIsChecklistExpanded}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                    <CheckCircle2 className="w-5 h-5" />
                    {isChecklistExpanded ? (
                      <ChevronUp className="w-4 h-4 ml-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                {/* Checklist Selector Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 font-semibold">
                      <ListChecks className="w-4 h-4" />
                      {activeChecklist?.name || 'Checklist'}
                      {checklists.length > 1 && (
                        <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1 text-[10px]">
                          {checklists.length}
                        </Badge>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 bg-background border shadow-lg z-50">
                    {checklists.map((cl) => (
                      <DropdownMenuItem
                        key={cl.id}
                        className={`flex items-center justify-between ${cl.id === activeChecklistId ? 'bg-accent' : ''}`}
                        onClick={() => setActiveChecklistId(cl.id)}
                      >
                        <span className="truncate">{cl.name}</span>
                        {canEdit && (
                          <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingChecklistId(cl.id);
                                setRenameChecklistName(cl.name);
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            {(
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteChecklistConfirm(cl);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </DropdownMenuItem>
                    ))}
                    {canEdit && (
                      <>
                        <DropdownMenuSeparator />
                        {isCreatingChecklist ? (
                          <div className="p-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={newChecklistName}
                              onChange={(e) => setNewChecklistName(e.target.value)}
                              placeholder="Nombre..."
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') createChecklist();
                                if (e.key === 'Escape') {
                                  setIsCreatingChecklist(false);
                                  setNewChecklistName("");
                                }
                              }}
                            />
                            <Button size="sm" className="h-8 px-2" onClick={createChecklist}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => setIsCreatingChecklist(true)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Crear checklist vacía
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setOpenTemplateDialog(true)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Crear desde plantilla
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MoreVertical className="w-4 h-4 mr-2" />
                        Acciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg">
                      <DropdownMenuItem onClick={() => setOpenAddDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir elemento
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOpenTemplateDialog(true)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Importar desde plantilla
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOpenSaveTemplateDialog(true)}>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar como plantilla
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        if (activeChecklistId) {
                          const cl = checklists.find(c => c.id === activeChecklistId);
                          setRenamingChecklistId(activeChecklistId);
                          setRenameChecklistName(cl?.name || "");
                        }
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Renombrar checklist
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateChecklist()}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar checklist
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {items.length > 0 && (
                        <DropdownMenuItem 
                          onClick={() => setClearAllConfirm(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Vaciar todo
                        </DropdownMenuItem>
                      )}
                      {(
                        <DropdownMenuItem 
                          onClick={() => {
                            const cl = checklists.find(c => c.id === activeChecklistId);
                            if (cl) setDeleteChecklistConfirm(cl);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar checklist
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('list')}
                    className="h-7 px-3 text-xs"
                  >
                    Lista
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'flow' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('flow')}
                    className="h-7 px-3 text-xs"
                  >
                    Flujo
                  </Button>
                </div>
              </div>
            </div>
            {items.length > 0 && (
              <div className="flex items-center justify-between text-sm mt-3">
                <div className="text-muted-foreground">
                  {completedCount} completadas · {progressPercentage}%
                </div>
                <div className="h-2 bg-muted rounded-full w-32">
                  <div 
                    className="h-2 bg-primary rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No hay elementos en esta checklist.
                  {canEdit && (
                    <div className="mt-4 flex justify-center gap-3">
                      <Button size="sm" variant="outline" onClick={() => setOpenAddDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir elemento
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setOpenTemplateDialog(true)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Importar desde plantilla
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {viewMode === 'flow' ? (
                    <TaskFlowManager
                      items={filteredItems}
                      projectId={projectId}
                      canEdit={canEdit}
                      onStatusUpdate={updateTaskStatus}
                      onDelete={(item) => setDeleteConfirm(item)}
                      getTasksThatBlockOthers={getTasksThatBlockOthers}
                      extractBlockingInfo={extractBlockingInfo}
                      fetchChecklistItems={fetchChecklistItems}
                    />
                  ) : (
                    <>
                  {/* Toolbar (controles, no contenido) */}
                  <div className="flex items-center justify-between gap-3 py-2 mb-4 border-b border-border flex-wrap">
                    <div className="flex items-center gap-3">
                      {/* Master checkbox */}
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedItems.size > 0 && selectedItems.size === filteredItems.length && filteredItems.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                selectAllVisible();
                              } else {
                                clearSelection();
                              }
                            }}
                            className="border-2"
                          />
                          <span className="text-sm">
                            {selectedItems.size > 0 ? `${selectedItems.size} seleccionadas` : 'Seleccionar todas'}
                          </span>
                          
                          {/* Deselect button - always integrated, only visible when items are selected */}
                          {selectedItems.size > 0 && (
                            <Button
                              onClick={clearSelection}
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                            >
                              Deseleccionar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <Select value={filterSection} onValueChange={setFilterSection}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Por sección" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg">
                          <SelectItem value="all">Todas las secciones</SelectItem>
                          {sections.map((section) => (
                            <SelectItem key={section} value={section}>
                              {getSectionDisplayName(section)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                       {/* Multi-select Status Filter */}
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="outline" size="sm" className="w-40 justify-between">
                             <span>
                               {soloFilterStatus ? `Solo: ${STATUS_LABELS[soloFilterStatus]}` :
                                selectedStatuses.size === 0 ? 'Todos los estados' : 
                                selectedStatuses.size === 1 ? STATUS_LABELS[Array.from(selectedStatuses)[0]] :
                                `${selectedStatuses.size} estados`}
                             </span>
                             <ChevronDown className="w-4 h-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent className="w-56 bg-background border shadow-lg z-50" onCloseAutoFocus={(e) => e.preventDefault()}>
                           {Object.entries(STATUS_LABELS).map(([status, label]) => (
                             <DropdownMenuCheckboxItem
                               key={status}
                               checked={soloFilterStatus ? false : !selectedStatuses.has(status as TaskStatus)}
                               onCheckedChange={(checked) => {
                                 // Clear solo filter when using multi-select
                                 setSoloFilterStatus(null);
                                 
                                 const newStatuses = new Set(selectedStatuses);
                                 if (!checked) {
                                   newStatuses.add(status as TaskStatus);
                                 } else {
                                   newStatuses.delete(status as TaskStatus);
                                 }
                                 setSelectedStatuses(newStatuses);
                               }}
                               onSelect={(e) => e.preventDefault()}
                             >
                               <div className="flex items-center justify-between w-full">
                                 <div className="flex items-center">
                                   <Badge variant="secondary" className={`${STATUS_COLORS[status as TaskStatus]} mr-2`}>
                                     {label}
                                   </Badge>
                                   ({statusCounts[status as TaskStatus] || 0})
                                 </div>
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   className={`h-6 w-6 p-0 hover:bg-muted ${soloFilterStatus === status ? 'bg-primary/20 text-primary' : ''}`}
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     // Toggle solo filter
                                     if (soloFilterStatus === status) {
                                       // Turn off solo filter if it's already active for this status
                                       setSoloFilterStatus(null);
                                     } else {
                                       // Set solo filter for this status
                                       setSoloFilterStatus(status as TaskStatus);
                                       setSelectedStatuses(new Set());
                                     }
                                   }}
                                   title={soloFilterStatus === status ? "Desactivar filtro solo" : "Solo mostrar este estado"}
                                 >
                                   <Search className="w-3 h-3" />
                                 </Button>
                               </div>
                             </DropdownMenuCheckboxItem>
                           ))}
                           {(selectedStatuses.size > 0 || soloFilterStatus) && (
                             <>
                               <div className="border-t my-1" />
                               <DropdownMenuItem
                                 onClick={() => {
                                   setSelectedStatuses(new Set());
                                   setSoloFilterStatus(null);
                                 }}
                                 className="text-sm"
                               >
                                 Limpiar filtros
                               </DropdownMenuItem>
                             </>
                           )}
                         </DropdownMenuContent>
                       </DropdownMenu>

                      <Select value={filterOwner} onValueChange={setFilterOwner}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Por responsable" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg">
                          <SelectItem value="all">Todos</SelectItem>
                          {owners.map((owner) => (
                            <SelectItem key={owner} value={owner}>
                              {owner}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>


                  {Object.entries(groupedItems).map(([section, sectionItems]) => {
                    const sectionCompleted = sectionItems.filter(item => item.status === 'COMPLETED').length;
                    const sectionProgress = sectionItems.length > 0 ? Math.round((sectionCompleted / sectionItems.length) * 100) : 0;
                    const isOpen = !!expandedSections[section];

                    return (
                      <div key={section} className="mb-3">
                        {/* Section header — folder style */}
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 py-2 px-1 group hover:bg-muted/30 rounded-md transition-colors"
                          onClick={() => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))}
                        >
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0",
                              !isOpen && "-rotate-90"
                            )}
                          />
                          <span className={cn(
                            "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                            sectionProgress === 100 && "line-through"
                          )}>
                            {getSectionDisplayName(section)}
                          </span>
                          <span className="text-xs text-muted-foreground/70 tabular-nums">
                            {sectionCompleted}/{sectionItems.length} · {sectionProgress}%
                          </span>
                          <div className="h-1 bg-muted rounded-full w-16 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${sectionProgress}%` }}
                            />
                          </div>
                          <div className="flex-1 border-b border-border/40 ml-2" />
                        </button>

                        {isOpen && (
                          <div className="mt-1 ml-1.5 pl-3 border-l border-border/60 space-y-px">
                            {sectionItems.map((item) => {
                              // Status accent — only as a left border, never as full background
                              let statusAccent = '';
                              if (item.status === 'COMPLETED') statusAccent = 'border-l-2 border-l-emerald-500/60';
                              else if (item.status === 'CANCELLED') statusAccent = 'border-l-2 border-l-muted-foreground/40';
                              else if (item.status === 'IN_PROGRESS') statusAccent = 'border-l-2 border-l-blue-500/60';
                              else if (item.status === 'BLOCKED') statusAccent = 'border-l-2 border-l-destructive/60';
                              else if (item.status === 'IN_REVIEW') statusAccent = 'border-l-2 border-l-amber-500/60';
                              else statusAccent = 'border-l-2 border-l-transparent';

                              return (
                                <div
                                  key={item.id}
                                  className={cn(
                                    'group/row flex items-start gap-2 pl-2 pr-1 py-1.5 rounded-sm hover:bg-muted/40 transition-colors',
                                    statusAccent,
                                    selectedItems.has(item.id) && 'bg-primary/5'
                                  )}
                                >
                                <div className="flex items-start gap-2 w-full">
                                   {canEdit && (
                                     <SelectionCheckbox
                                       checked={selectedItems.has(item.id)}
                                       onCheckedChange={() => toggleItemSelection(item.id)}
                                       className="mt-1"
                                     />
                                   )}
                                  
                                    <div 
                                      className="flex-1 min-w-0 cursor-pointer" 
                                      onClick={() => {
                                        setSelectedTaskForDetail(item);
                                        setTaskDetailOpen(true);
                                      }}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <h4 className={`font-medium ${item.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
                                              {item.title}
                                            </h4>
                                            {getLinkedItemsCount(item.id) > 0 && (
                                              <Link className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            )}
                                            {getTasksThatBlockOthers().has(item.title) && (
                                              <TriangleAlert className="w-4 h-4 text-orange-500 flex-shrink-0" aria-label="Esta tarea está bloqueando otras" />
                                            )}
                                            {extractBlockingInfo(item.description).wasUnblocked && item.status === 'PENDING' && (
                                              <TriangleAlert className="w-4 h-4 text-green-500 flex-shrink-0" aria-label="Esta tarea fue desbloqueada recientemente" />
                                            )}
                                          </div>
                                          {item.description && (
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                              {item.description}
                                            </p>
                                          )}
                                       </div>
                                      
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Status badge and quick actions */}
                                        <div className="flex items-center gap-2">
                                          {canEdit ? (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button 
                                                  size="sm" 
                                                  variant="ghost" 
                                                  className="h-6 px-2"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <Badge variant="secondary" className={STATUS_COLORS[item.status || 'PENDING']}>
                                                    {STATUS_LABELS[item.status || 'PENDING']}
                                                  </Badge>
                                                  <ChevronDown className="w-3 h-3 ml-1" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent className="bg-background border shadow-lg">
                                                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                                  <DropdownMenuItem
                                                    key={status}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      updateTaskStatus(item, status as TaskStatus);
                                                    }}
                                                  >
                                                    <Badge variant="secondary" className={`${STATUS_COLORS[status as TaskStatus]} mr-2`}>
                                                      {label}
                                                    </Badge>
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          ) : (
                                            <Badge variant="secondary" className={STATUS_COLORS[item.status || 'PENDING']}>
                                              {STATUS_LABELS[item.status || 'PENDING']}
                                            </Badge>
                                          )}
                                        </div>

                                        {canEdit && (
                                          <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                  onClick={(e) => e.stopPropagation()}
                                                  title="Acciones"
                                                >
                                                  <MoreVertical className="w-3.5 h-3.5" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                                                <DropdownMenuItem
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.status === 'COMPLETED') {
                                                      toggleItemCompletion(item);
                                                    } else {
                                                      setSelectedTaskForLink(item);
                                                      setLinkDialogOpen(true);
                                                    }
                                                  }}
                                                >
                                                  {item.status === 'COMPLETED' ? (
                                                    <><CheckCircle className="w-4 h-4 mr-2" /> Marcar como pendiente</>
                                                  ) : (
                                                    <><Link className="w-4 h-4 mr-2" /> Vincular con otros</>
                                                  )}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                  className="text-destructive focus:text-destructive"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirm(item);
                                                  }}
                                                >
                                                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                 </div>
                                </div>
                              );
                            })}
                           </div>
                        )}
                      </div>
                    );
                  })}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Delete single item confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La tarea "{deleteConfirm?.title}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirmation */}
      <AlertDialog open={clearAllConfirm} onOpenChange={setClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Vaciar todas las tareas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Todas las tareas serán eliminadas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAllItems}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Vaciar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      

      {/* Add new item dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir nueva tarea</DialogTitle>
            <DialogDescription>
              Agrega una nueva tarea al proyecto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="text-sm font-medium">
                Título de la tarea
              </label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título de la tarea"
              />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Descripción (opcional)
              </label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descripción de la tarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addChecklistItem}>
              Añadir tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk update confirmation */}
      <AlertDialog 
        open={!!bulkUpdateConfirm} 
        onOpenChange={() => setBulkUpdateConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Actualizar elementos seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkUpdateConfirm && (
                <>
                  Se actualizarán {bulkUpdateConfirm.count} elementos al estado "{STATUS_LABELS[bulkUpdateConfirm.status]}".
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (bulkUpdateConfirm) {
                  try {
                    await bulkUpdateStatus(bulkUpdateConfirm.status);
                    setBulkUpdateConfirm(null);
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "No se pudieron actualizar las tareas seleccionadas.",
                      variant: "destructive",
                    });
                  }
                }
              }}
            >
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocking dialog */}
      <Dialog open={!!blockingDialog} onOpenChange={() => setBlockingDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Marcar tarea como bloqueada</DialogTitle>
            <DialogDescription>
              Proporciona información sobre qué está bloqueando esta tarea: "{blockingDialog?.item.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="blocking-tasks" className="text-sm font-medium mb-2 block">
                ¿Hay alguna tarea que esté bloqueando esta?
              </label>
              <div className="space-y-2">
                {items
                  .filter(item => item.id !== blockingDialog?.item.id && item.status !== 'COMPLETED')
                  .map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`blocking-${item.id}`}
                        checked={blockingDialog?.blockingTasks.includes(item.title) || false}
                        onCheckedChange={(checked) => {
                          if (!blockingDialog) return;
                          const newBlockingTasks = checked
                            ? [...blockingDialog.blockingTasks, item.title]
                            : blockingDialog.blockingTasks.filter(t => t !== item.title);
                          setBlockingDialog({
                            ...blockingDialog,
                            blockingTasks: newBlockingTasks
                          });
                        }}
                      />
                      <label htmlFor={`blocking-${item.id}`} className="text-sm">
                        {item.title}
                        <Badge variant="secondary" className={`${STATUS_COLORS[item.status || 'PENDING']} ml-2`}>
                          {STATUS_LABELS[item.status || 'PENDING']}
                        </Badge>
                      </label>
                    </div>
                  ))}
                {items.filter(item => item.id !== blockingDialog?.item.id && item.status !== 'COMPLETED').length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay otras tareas disponibles para seleccionar.</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="additional-info" className="text-sm font-medium mb-2 block">
                Información adicional (opcional)
              </label>
              <Textarea
                id="additional-info"
                value={blockingDialog?.additionalInfo || ''}
                onChange={(e) => {
                  if (!blockingDialog) return;
                  setBlockingDialog({
                    ...blockingDialog,
                    additionalInfo: e.target.value
                  });
                }}
                placeholder="Describe qué está bloqueando esta tarea o proporciona información adicional..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockingDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleBlockingConfirm} variant="destructive">
              Marcar como bloqueada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar tarea en revisión</DialogTitle>
            <DialogDescription>
              Añade el motivo por el cual la tarea "{reviewDialog?.item.title}" necesita revisión.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="review-reason" className="text-sm font-medium mb-2 block">
              Motivo de revisión (opcional)
            </label>
            <Textarea
              id="review-reason"
              value={reviewDialog?.reason || ''}
              onChange={(e) => {
                if (!reviewDialog) return;
                setReviewDialog({
                  ...reviewDialog,
                  reason: e.target.value
                });
              }}
              placeholder="Describe por qué esta tarea necesita revisión..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleReviewConfirm} variant="secondary">
              Marcar en revisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <TemplateSelectionDialog
        open={openTemplateDialog}
        onOpenChange={setOpenTemplateDialog}
        projectId={projectId}
        onTemplateApplied={async (newChecklistId) => {
          const cls = await fetchChecklists();
          if (newChecklistId) {
            setActiveChecklistId(newChecklistId);
          }
          fetchChecklistItems();
        }}
        checklistId={activeChecklistId}
      />

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={openSaveTemplateDialog}
        onOpenChange={setOpenSaveTemplateDialog}
        checklistItems={items}
        onTemplateSaved={() => {
          setOpenSaveTemplateDialog(false);
          toast({
            title: "Plantilla guardada",
            description: "La plantilla se ha guardado correctamente.",
          });
        }}
      />

      {/* Link Task Dialog */}
      {selectedTaskForLink && (
        <LinkTaskDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          taskId={selectedTaskForLink.id}
          taskTitle={selectedTaskForLink.title}
          projectId={projectId}
        />
      )}

      {/* Task Detail Dialog */}
      {selectedTaskForDetail && (
        <TaskDetailDialog
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          task={selectedTaskForDetail}
          projectId={projectId}
          onUpdateTask={(updatedTask) => {
            setItems(prevItems => 
              prevItems.map(item => 
                item.id === updatedTask.id ? updatedTask : item
              )
            );
            setSelectedTaskForDetail(updatedTask);
          }}
        />
      )}

      {/* Rename Checklist Dialog */}
      <Dialog open={!!renamingChecklistId} onOpenChange={() => { setRenamingChecklistId(null); setRenameChecklistName(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renombrar checklist</DialogTitle>
          </DialogHeader>
          <Input
            value={renameChecklistName}
            onChange={(e) => setRenameChecklistName(e.target.value)}
            placeholder="Nuevo nombre..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') renameChecklist();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenamingChecklistId(null); setRenameChecklistName(""); }}>
              Cancelar
            </Button>
            <Button onClick={renameChecklist}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Checklist Confirmation */}
      <AlertDialog open={!!deleteChecklistConfirm} onOpenChange={() => setDeleteChecklistConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la checklist "{deleteChecklistConfirm?.name}" y todas sus tareas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteChecklist}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}