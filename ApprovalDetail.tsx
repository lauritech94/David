import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAuthz, useConditionalRender } from '@/hooks/useAuthz';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  User,
  Calendar,
  MessageSquare,
  Activity,
  UserPlus,
  Edit
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Approval {
  id: string;
  project_id: string;
  type: 'BUDGET' | 'PR_REQUEST' | 'LOGISTICS';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  title: string;
  description?: string;
  amount?: number;
  assigned_to_user_id?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  created_by_profile?: { id: string; full_name: string; email: string };
  assigned_to_profile?: { id: string; full_name: string; email: string };
}

interface Comment {
  id: string;
  approval_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  author_profile?: { id: string; full_name: string; email: string };
}

interface ApprovalEvent {
  id: string;
  approval_id: string;
  actor_user_id: string;
  event_type: 'CREATED' | 'UPDATED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMMENTED' | 'ASSIGN_CHANGED';
  from_status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  to_status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  diff: any;
  created_at: string;
  actor_profile?: { id: string; full_name: string; email: string };
}

export function ApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { renderIf } = useConditionalRender();
  
  const [approval, setApproval] = useState<Approval | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [events, setEvents] = useState<ApprovalEvent[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    amount: ''
  });
  
  // Confirmation dialogs
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');

  const permissions = useAuthz({ projectId: approval?.project_id });

  // Load approval and related data
  useEffect(() => {
    if (id) {
      loadApproval();
      loadComments();
      loadEvents();
      loadUsers();
    }
  }, [id]);

  // Real-time comments subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('approval-comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_comments',
          filter: `approval_id=eq.${id}`
        },
        (payload) => {
          console.log('New comment:', payload);
          loadComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_events',
          filter: `approval_id=eq.${id}`
        },
        (payload) => {
          console.log('New event:', payload);
          loadEvents();
          loadApproval(); // Refresh approval status
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadApproval = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('approvals')
      .select(`
        *,
        created_by_profile:profiles!created_by(id, full_name, email),
        assigned_to_profile:profiles!assigned_to_user_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading approval:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la aprobación',
        variant: 'destructive'
      });
      return;
    }

    setApproval(data as any);
    setEditForm({
      title: data?.title || '',
      description: data?.description || '',
      amount: data?.amount?.toString() || ''
    });
    setLoading(false);
  };

  const loadComments = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('approval_comments')
      .select(`
        *,
        author_profile:profiles!author_user_id(id, full_name, email)
      `)
      .eq('approval_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading comments:', error);
      return;
    }

    setComments(data as any || []);
  };

  const loadEvents = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('approval_events')
      .select(`
        *,
        actor_profile:profiles!actor_user_id(id, full_name, email)
      `)
      .eq('approval_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
      return;
    }

    setEvents(data as any || []);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');

    if (error) {
      console.error('Error loading users:', error);
      return;
    }

    setUsers(data || []);
  };

  const submitApproval = async () => {
    try {
      const response = await fetch(`/approvals/${id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to submit');

      toast({
        title: 'Enviado',
        description: 'La aprobación ha sido enviada para revisión'
      });

      setShowSubmitDialog(false);
      loadApproval();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar la aprobación',
        variant: 'destructive'
      });
    }
  };

  const approveApproval = async () => {
    try {
      const response = await fetch(`/approvals/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to approve');

      toast({
        title: 'Aprobado',
        description: 'La aprobación ha sido aprobada exitosamente'
      });

      setShowApproveDialog(false);
      loadApproval();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo aprobar la aprobación',
        variant: 'destructive'
      });
    }
  };

  const rejectApproval = async () => {
    try {
      const response = await fetch(`/approvals/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to reject');

      toast({
        title: 'Rechazado',
        description: 'La aprobación ha sido rechazada'
      });

      setShowRejectDialog(false);
      loadApproval();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo rechazar la aprobación',
        variant: 'destructive'
      });
    }
  };

  const assignApproval = async () => {
    try {
      const response = await fetch(`/approvals/${id}/assign`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assigned_to_user_id: selectedAssignee })
      });

      if (!response.ok) throw new Error('Failed to assign');

      toast({
        title: 'Asignado',
        description: 'La aprobación ha sido asignada correctamente'
      });

      setShowAssignDialog(false);
      setSelectedAssignee('');
      loadApproval();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo asignar la aprobación',
        variant: 'destructive'
      });
    }
  };

  const updateApproval = async () => {
    try {
      const response = await fetch(`/approvals/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          amount: editForm.amount ? parseFloat(editForm.amount) : null
        })
      });

      if (!response.ok) throw new Error('Failed to update');

      toast({
        title: 'Actualizado',
        description: 'La aprobación ha sido actualizada'
      });

      setIsEditing(false);
      loadApproval();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la aprobación',
        variant: 'destructive'
      });
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/approvals/${id}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: newComment })
      });

      if (!response.ok) throw new Error('Failed to add comment');

      setNewComment('');
      // Comments will be updated via real-time subscription
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo añadir el comentario',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: Approval['status']) => {
    const variants = {
      DRAFT: { variant: 'secondary' as const, icon: Clock, text: 'Borrador' },
      SUBMITTED: { variant: 'default' as const, icon: Send, text: 'Enviado' },
      APPROVED: { variant: 'default' as const, icon: CheckCircle, text: 'Aprobado', className: 'bg-green-500 text-white hover:bg-green-600' },
      REJECTED: { variant: 'destructive' as const, icon: XCircle, text: 'Rechazado' }
    };
    
    const config = variants[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={`gap-1 ${'className' in config ? config.className : ''}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const getTypeBadge = (type: Approval['type']) => {
    const types = {
      BUDGET: { text: 'Presupuesto', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      PR_REQUEST: { text: 'Solicitud PR', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      LOGISTICS: { text: 'Logística', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${types[type].className}`}>
        {types[type].text}
      </span>
    );
  };

  const getEventDescription = (event: ApprovalEvent) => {
    switch (event.event_type) {
      case 'CREATED':
        return 'Aprobación creada';
      case 'UPDATED':
        return 'Aprobación actualizada';
      case 'SUBMITTED':
        return 'Enviado para aprobación';
      case 'APPROVED':
        return 'Aprobado';
      case 'REJECTED':
        return 'Rechazado';
      case 'COMMENTED':
        return 'Comentario añadido';
      case 'ASSIGN_CHANGED':
        return 'Asignación cambiada';
      default:
        return event.event_type;
    }
  };

  const canEdit = () => approval?.status === 'DRAFT' && approval?.created_by === user?.id;
  const canSubmit = () => approval?.status === 'DRAFT' && approval?.created_by === user?.id;
  const canApprove = () => approval?.status === 'SUBMITTED' && approval?.assigned_to_user_id === user?.id;
  const canAssign = () => permissions.canEdit;

  if (loading) {
    return <div className="flex items-center justify-center py-8">Cargando...</div>;
  }

  if (!approval) {
    return <div className="flex items-center justify-center py-8">Aprobación no encontrada</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{approval.title}</h1>
            <div className="flex items-center space-x-2 mt-1">
              {getTypeBadge(approval.type)}
              {getStatusBadge(approval.status)}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {renderIf(canEdit() && !isEditing, (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          ))}
          
          {renderIf(canSubmit(), (
            <Button onClick={() => setShowSubmitDialog(true)}>
              <Send className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          ))}
          
          {renderIf(canApprove(), (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowRejectDialog(true)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
              <Button onClick={() => setShowApproveDialog(true)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprobar
              </Button>
            </>
          ))}
          
          {renderIf(canAssign(), (
            <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Asignar
            </Button>
          ))}
        </div>
      </div>

      {/* Approval Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {approval.created_by_profile && (
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>Creado por {approval.created_by_profile.full_name}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(approval.created_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              </div>
              
              {approval.assigned_to_profile && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>Asignado a: {approval.assigned_to_profile.full_name}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Detalle</TabsTrigger>
          <TabsTrigger value="comments" className="relative">
            Comentarios
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                {comments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Título</label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descripción</label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  {approval.type === 'BUDGET' && (
                    <div>
                      <label className="text-sm font-medium">Monto</label>
                      <Input
                        type="number"
                        value={editForm.amount}
                        onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button onClick={updateApproval}>Guardar</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Título</h4>
                    <p className="text-muted-foreground">{approval.title}</p>
                  </div>
                  {approval.description && (
                    <div>
                      <h4 className="font-medium">Descripción</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">{approval.description}</p>
                    </div>
                  )}
                  {approval.amount && (
                    <div>
                      <h4 className="font-medium">Monto</h4>
                      <p className="text-muted-foreground">€{approval.amount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Comentarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No hay comentarios</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {comment.author_profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">
                            {comment.author_profile?.full_name || 'Usuario'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  ))
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <Textarea
                    placeholder="Añadir comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={addComment} disabled={!newComment.trim()}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Comentar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de cambios</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay eventos</p>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{getEventDescription(event)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          por {event.actor_profile?.full_name || 'Usuario'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar para aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres enviar esta aprobación para revisión? Una vez enviada, no podrás editarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={submitApproval}>Enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprobar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres aprobar esta solicitud? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={approveApproval}>Aprobar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres rechazar esta solicitud? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={rejectApproval} className="bg-red-600 hover:bg-red-700">
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Asignar aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona la persona responsable de esta aprobación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={assignApproval} disabled={!selectedAssignee}>
              Asignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}