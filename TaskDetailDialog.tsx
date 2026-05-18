import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChecklistItem, TaskStatus } from "./ProjectChecklistManager";
import { 
  Link, 
  Copy, 
  ExternalLink, 
  FileText, 
  DollarSign, 
  Users, 
  Calendar,
  Edit3,
  Save,
  X,
  Plus,
  Edit
} from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ChecklistItem;
  projectId: string;
  onUpdateTask?: (task: ChecklistItem) => void;
}

interface LinkableItem {
  id: string;
  title: string;
  type: string;
  status?: string;
  created_at?: string;
  description?: string;
}

interface TaskNote {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

export const TaskDetailDialog = ({ open, onOpenChange, task, projectId, onUpdateTask }: TaskDetailDialogProps) => {
  const [linkedItems, setLinkedItems] = useState<string[]>([]);
  const [linkedItemsDetails, setLinkedItemsDetails] = useState<LinkableItem[]>([]);
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [editedStatus, setEditedStatus] = useState<TaskStatus>(task.status);

  // Load linked items and notes from localStorage
  useEffect(() => {
    if (open && task) {
      // Reset edit state when dialog opens
      setIsEditingTask(false);
      setEditedTitle(task.title);
      setEditedDescription(task.description || '');
      setEditedStatus(task.status);
      
      const storedLinks = localStorage.getItem(`task_links_${task.id}`);
      const taskLinkedItems = storedLinks ? JSON.parse(storedLinks) : [];
      setLinkedItems(taskLinkedItems);

      const storedNotes = localStorage.getItem(`task_notes_${task.id}`);
      const taskNotes = storedNotes ? JSON.parse(storedNotes) : [];
      setNotes(taskNotes);

      // Get linked items details (simplified for demo)
      // In a real app, you'd fetch these from your database
      const mockLinkedItems: LinkableItem[] = taskLinkedItems.map((id: string) => ({
        id,
        title: `Elemento ${id.substring(0, 8)}`,
        type: 'Presupuesto',
        status: 'Pendiente',
        created_at: new Date().toISOString(),
        description: 'Descripción del elemento vinculado'
      }));
      setLinkedItemsDetails(mockLinkedItems);
    }
  }, [open, task]);

  const addNote = () => {
    if (!newNote.trim()) return;

    const note: TaskNote = {
      id: Date.now().toString(),
      text: newNote,
      createdAt: new Date().toISOString(),
      author: 'Usuario Actual'
    };

    const updatedNotes = [...notes, note];
    setNotes(updatedNotes);
    localStorage.setItem(`task_notes_${task.id}`, JSON.stringify(updatedNotes));
    setNewNote('');
    setIsEditingNote(false);

    toast({
      title: "Nota añadida",
      description: "La nota se ha guardado correctamente",
    });
  };

  const copyTaskInfo = () => {
    const taskInfo = `
📋 TAREA: ${task.title}
📁 Sección: ${task.section}
📊 Estado: ${task.status}
📝 Descripción: ${task.description || 'Sin descripción'}

${linkedItemsDetails.length > 0 ? `🔗 ELEMENTOS VINCULADOS:
${linkedItemsDetails.map(item => `• ${item.type}: ${item.title} (${item.status})`).join('\n')}` : ''}

${notes.length > 0 ? `📝 NOTAS:
${notes.map(note => `• ${note.text} - ${note.author} (${new Date(note.createdAt).toLocaleDateString()})`).join('\n')}` : ''}

---
Generado desde el sistema de gestión de proyectos
    `.trim();

    navigator.clipboard.writeText(taskInfo);
    toast({
      title: "Información copiada",
      description: "La información de la tarea se ha copiado al portapapeles",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'presupuesto':
      case 'budget':
        return <DollarSign className="w-4 h-4" />;
      case 'documento':
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'solicitud':
      case 'request':
        return <Users className="w-4 h-4" />;
      case 'approval':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Link className="w-4 h-4" />;
    }
  };

  const openLinkedItem = (item: LinkableItem) => {
    // Navigate to the appropriate page based on item type
    if (item.type === 'Presupuesto') {
      // Navigate to budgets page - you can customize this URL as needed
      window.open(`/budgets`, '_blank');
    } else {
      // For other types, show details in toast
      toast({
        title: `${item.type}: ${item.title}`,
        description: `Estado: ${item.status} - ${item.description}`,
      });
    }
  };

  const removeLink = (itemId: string) => {
    const updatedLinks = linkedItems.filter(id => id !== itemId);
    setLinkedItems(updatedLinks);
    localStorage.setItem(`task_links_${task.id}`, JSON.stringify(updatedLinks));
    
    const updatedDetails = linkedItemsDetails.filter(item => item.id !== itemId);
    setLinkedItemsDetails(updatedDetails);

    toast({
      title: "Enlace eliminado",
      description: "El elemento ha sido desvinculado de la tarea",
    });
  };

  const saveTaskChanges = async () => {
    try {
      const { error } = await supabase
        .from('project_checklist_items')
        .update({
          title: editedTitle,
          description: editedDescription || null,
          status: editedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      const updatedTask = {
        ...task,
        title: editedTitle,
        description: editedDescription || null,
        status: editedStatus
      };

      // Call the callback to update the parent component
      if (onUpdateTask) {
        onUpdateTask(updatedTask);
      }

      setIsEditingTask(false);
      
      toast({
        title: "Tarea actualizada",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  };

  const cancelTaskEdit = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description || '');
    setEditedStatus(task.status);
    setIsEditingTask(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalles de la Tarea
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Task Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-lg flex-1">
                      {isEditingTask ? (
                        <Textarea
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="text-lg font-semibold min-h-[80px] resize-none w-full"
                          placeholder="Título de la tarea"
                          rows={3}
                        />
                      ) : (
                        task.title
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      {isEditingTask ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelTaskEdit}
                            className="flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveTaskChanges}
                            className="flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Guardar
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingTask(true)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Sección</Label>
                    <p className="text-sm">{task.section}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                    {isEditingTask ? (
                      <Select value={editedStatus} onValueChange={(value) => setEditedStatus(value as TaskStatus)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">PENDING</SelectItem>
                          <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                          <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                          <SelectItem value="IN_REVIEW">IN_REVIEW</SelectItem>
                          <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge 
                        variant={task.status === 'COMPLETED' ? 'default' : 
                                 task.status === 'BLOCKED' ? 'destructive' :
                                 task.status === 'IN_PROGRESS' ? 'secondary' : 'outline'}
                        className="ml-0"
                      >
                        {task.status}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
                  {isEditingTask ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Descripción de la tarea"
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{task.description || 'Sin descripción'}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyTaskInfo}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Info
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Linked Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Elementos Vinculados ({linkedItemsDetails.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkedItemsDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay elementos vinculados a esta tarea
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedItemsDetails.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getTypeIcon(item.type)}
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openLinkedItem(item)}
                            className="h-8 w-8 p-0"
                            title="Ver elemento"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLink(item.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Desvincular"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Notas y Comentarios ({notes.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingNote(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir Nota
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Add Note Form */}
                {isEditingNote && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <Textarea
                      placeholder="Escribe tu nota o comentario..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={addNote}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingNote(false);
                          setNewNote('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes List */}
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay notas para esta tarea
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 border rounded-lg bg-background"
                      >
                        <p className="text-sm mb-2">{note.text}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{note.author}</span>
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;