import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Trash2, TriangleAlert, Plus, ChevronDown, Link } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ChecklistItem, TaskStatus } from './ProjectChecklistManager';
import { LinkTaskDialog } from './LinkTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  BLOCKED: 'Bloqueada',
  IN_REVIEW: 'En revisión'
};

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
};

const SECTION_COLORS = {
  PREPARATIVOS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PRODUCCION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DISEÑO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  MARKETING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  DISTRIBUCION: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  SIN_CATEGORIA: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

interface TaskNodeProps {
  data: {
    item: ChecklistItem;
    onStatusUpdate: (item: ChecklistItem, status: TaskStatus) => void;
    onDelete: (item: ChecklistItem) => void;
    canEdit: boolean;
    getTasksThatBlockOthers: () => Set<string>;
    extractBlockingInfo: (description: string | null) => { wasUnblocked: boolean; blockingTasks: string[]; additionalInfo: string; otherContent: string };
    projectId: string;
  };
}

function TaskNode({ data }: TaskNodeProps) {
  const { item, onStatusUpdate, onDelete, canEdit, getTasksThatBlockOthers, extractBlockingInfo, projectId } = data;
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // Check if task has linked items
  const getLinkedItemsCount = (taskId: string) => {
    const storedLinks = localStorage.getItem(`task_links_${taskId}`);
    return storedLinks ? JSON.parse(storedLinks).length : 0;
  };

  const toggleCompletion = () => {
    const newStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    
    // If changing from PENDING to COMPLETED, remove the unblocked message
    if (item.status === 'PENDING' && newStatus === 'COMPLETED') {
      const { wasUnblocked, otherContent } = extractBlockingInfo(item.description);
      if (wasUnblocked) {
        const updatedItem = {
          ...item,
          description: otherContent || null
        };
        onStatusUpdate(updatedItem, newStatus);
        return;
      }
    }
    
    onStatusUpdate(item, newStatus);
  };

  // Define card background based on status
  let cardBackgroundClass = 'bg-background border-border';
  if (item.status === 'COMPLETED') {
    cardBackgroundClass = 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/50';
  } else if (item.status === 'CANCELLED') {
    cardBackgroundClass = 'bg-gray-100 border-gray-300 dark:bg-gray-800/50 dark:border-gray-600/50';
  } else if (item.status === 'IN_PROGRESS') {
    cardBackgroundClass = 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50';
  } else if (item.status === 'BLOCKED') {
    cardBackgroundClass = 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50';
  } else if (item.status === 'IN_REVIEW') {
    cardBackgroundClass = 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800/50';
  }

  return (
    <div 
      className={`p-3 rounded-lg border-2 shadow-sm transition-all w-80 cursor-pointer hover:shadow-md ${cardBackgroundClass}`}
      onClick={() => setTaskDetailOpen(true)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-medium text-sm ${item.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
              {item.title}
            </h4>
            {getLinkedItemsCount(item.id) > 0 && (
              <Link className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
            {getTasksThatBlockOthers().has(item.title) && (
              <TriangleAlert className="w-3 h-3 text-orange-500 flex-shrink-0" />
            )}
            {extractBlockingInfo(item.description).wasUnblocked && item.status === 'PENDING' && (
              <TriangleAlert className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Status badge */}
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 px-2">
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
            onClick={() => {
              // If changing from PENDING to any other status, remove the unblocked message
              if (item.status === 'PENDING' && status !== 'PENDING') {
                const { wasUnblocked, otherContent } = extractBlockingInfo(item.description);
                if (wasUnblocked) {
                  // Create updated item with cleaned description
                  const updatedItem = {
                    ...item,
                    description: otherContent || null
                  };
                  onStatusUpdate(updatedItem, status as TaskStatus);
                  return;
                }
              }
              onStatusUpdate(item, status as TaskStatus);
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

          {canEdit && (
            <div onClick={(e) => e.stopPropagation()}>
              {/* Quick toggle completed */}
              <Button
                size="sm"
                variant="ghost"
                onClick={item.status === 'COMPLETED' ? toggleCompletion : () => setLinkDialogOpen(true)}
                className="h-6 w-6 p-0"
                title={item.status === 'COMPLETED' ? 'Marcar como pendiente' : 'Vincular con otros elementos'}
              >
                {item.status === 'COMPLETED' ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <Plus className="w-3 h-3 text-muted-foreground" />
                )}
              </Button>
              
              {/* Delete button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(item)}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-2 h-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <LinkTaskDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        taskId={item.id}
        taskTitle={item.title}
        projectId={projectId}
      />

      <TaskDetailDialog
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
        task={item}
        projectId={projectId}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  task: TaskNode,
};

interface TaskFlowManagerProps {
  items: ChecklistItem[];
  projectId: string;
  canEdit: boolean;
  onStatusUpdate: (item: ChecklistItem, status: TaskStatus) => void;
  onDelete: (item: ChecklistItem) => void;
  getTasksThatBlockOthers: () => Set<string>;
  extractBlockingInfo: (description: string | null) => { wasUnblocked: boolean; blockingTasks: string[]; additionalInfo: string; otherContent: string };
  fetchChecklistItems: () => void;
}

export function TaskFlowManager({ 
  items, 
  projectId, 
  canEdit, 
  onStatusUpdate, 
  onDelete, 
  getTasksThatBlockOthers, 
  extractBlockingInfo,
  fetchChecklistItems 
}: TaskFlowManagerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const getSectionDisplayName = (section: string) => {
    const sectionNames: { [key: string]: string } = {
      PREPARATIVOS: 'Preparativos',
      PRODUCCION: 'Producción',
      DISEÑO: 'Diseño',
      MARKETING: 'Marketing',
      DISTRIBUCION: 'Distribución',
      SIN_CATEGORIA: 'Sin categoría'
    };
    return sectionNames[section] || section;
  };

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: ChecklistItem[] } = {};
    
    items.forEach(item => {
      let section = item.section || 'SIN_CATEGORIA';
      if (section === 'PRODUCCIÓN') section = 'PRODUCCION';
      if (section === 'Sin categoría' || section === null) section = 'SIN_CATEGORIA';
      
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(item);
    });
    
    return groups;
  }, [items]);

  // Convert items to nodes
  useEffect(() => {
    const newNodes: Node[] = [];
    let sectionY = 0;

    // Add section headers and tasks
    Object.entries(groupedItems).forEach(([section, sectionItems]) => {
      // Add section header
      newNodes.push({
        id: `section-${section}`,
        type: 'default',
        position: { x: 50, y: sectionY },
        data: {
          label: (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={SECTION_COLORS[section as keyof typeof SECTION_COLORS]}>
                {getSectionDisplayName(section)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({sectionItems.filter(i => i.status === 'COMPLETED').length}/{sectionItems.length})
              </span>
            </div>
          )
        },
        draggable: false,
        selectable: false,
        style: {
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }
      });

      sectionY += 80;

      // Add tasks for this section
      sectionItems.forEach((item, index) => {
        newNodes.push({
          id: item.id,
          type: 'task',
          position: { x: 50 + (index % 3) * 320, y: sectionY + Math.floor(index / 3) * 120 },
          data: {
            item,
            onStatusUpdate,
            onDelete,
            canEdit,
            getTasksThatBlockOthers,
            extractBlockingInfo,
            projectId
          }
        });
      });

      sectionY += Math.ceil(sectionItems.length / 3) * 120 + 100;
    });

    setNodes(newNodes);
  }, [groupedItems, onStatusUpdate, onDelete, canEdit, getTasksThatBlockOthers, extractBlockingInfo]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeDrag = useCallback(async (event: any, node: Node) => {
    if (node.type !== 'task') return;

    // Get the current task's section
    const currentTask = Object.values(groupedItems).flat().find(item => item.id === node.id);
    if (!currentTask) return;

    const currentSection = currentTask.section || 'SIN_CATEGORIA';
    
    // Find which section this node is now in based on Y position
    const nodeY = node.position.y;
    let targetSection = currentSection; // Default to current section
    
    // Calculate section boundaries more precisely
    const sectionNodes = nodes.filter(n => n.id.startsWith('section-'));
    
    sectionNodes.forEach(sectionNode => {
      const sectionY = sectionNode.position.y;
      const sectionHeight = 400; // Section height
      
      // Only change section if we've clearly moved into another section's area
      if (nodeY >= sectionY + 60 && nodeY < sectionY + sectionHeight - 60) {
        targetSection = sectionNode.id.replace('section-', '');
      }
    });

    // Only update if the section has actually changed
    if (targetSection !== currentSection) {
      try {
        const { error } = await supabase
          .from('project_checklist_items')
          .update({ section: targetSection })
          .eq('id', node.id);

        if (error) throw error;

        // Update only the moved task's position without full refresh
        setNodes(prevNodes => {
          return prevNodes.map(n => {
            if (n.id === node.id && n.type === 'task') {
              return {
                ...n,
                data: {
                  ...n.data,
                  item: {
                    ...n.data.item,
                    section: targetSection
                  }
                }
              };
            }
            return n;
          });
        });

        toast({
          title: "Tarea movida",
          description: `La tarea ha sido movida a ${getSectionDisplayName(targetSection)}.`,
        });
      } catch (error) {
        console.error('Error updating task section:', error);
        toast({
          title: "Error",
          description: "No se pudo mover la tarea.",
          variant: "destructive",
        });
      }
    }
  }, [nodes, fetchChecklistItems, getSectionDisplayName, groupedItems]);

  return (
    <div className="h-[600px] w-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDrag}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        deleteKeyCode={null}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}