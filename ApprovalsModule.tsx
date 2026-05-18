import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAuthz, useConditionalRender } from '@/hooks/useAuthz';
import { AuthzBreadcrumb } from '@/components/AuthzBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  MoreHorizontal,
  Filter,
  MessageSquare,
  User,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Approval {
  id: string;
  type: 'BUDGET' | 'PR_REQUEST' | 'LOGISTICS';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by_profile?: { id: string; full_name: string; email: string };
  assigned_to_profile?: { id: string; full_name: string; email: string };
  metadata?: Record<string, any>;
}

interface ApprovalsModuleProps {
  projectId: string;
  workspace?: { id: string; name: string };
  artist?: { id: string; name: string };
  project?: { id: string; name: string };
}

export function ApprovalsModule({ projectId, workspace, artist, project }: ApprovalsModuleProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const permissions = useAuthz({ projectId });
  const { renderIf } = useConditionalRender();
  
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Create approval form state
  const [createForm, setCreateForm] = useState({
    type: 'BUDGET' as const,
    title: '',
    description: '',
    assignedToUserId: ''
  });

  // Load approvals
  useEffect(() => {
    loadApprovals();
  }, [projectId]);

  const loadApprovals = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('approvals-api', {
        body: { projectId }
      });

      if (error) throw error;
      setApprovals(data?.data || []);
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las aprobaciones',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createApproval = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('approvals-api', {
        body: {
          projectId,
          ...createForm
        }
      });

      if (error) throw error;

      toast({
        title: 'Aprobación creada',
        description: 'La aprobación se ha creado exitosamente'
      });

      setShowCreateDialog(false);
      setCreateForm({
        type: 'BUDGET',
        title: '',
        description: '',
        assignedToUserId: ''
      });
      loadApprovals();
    } catch (error) {
      console.error('Error creating approval:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la aprobación',
        variant: 'destructive'
      });
    }
  };

  const submitApproval = async (approvalId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approvals-api', {
        body: { action: 'submit', approvalId }
      });

      if (error) throw error;

      toast({
        title: 'Aprobación enviada',
        description: 'La aprobación ha sido enviada para revisión'
      });
      loadApprovals();
    } catch (error) {
      console.error('Error submitting approval:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la aprobación',
        variant: 'destructive'
      });
    }
  };

  const approveApproval = async (approvalId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approvals-api', {
        body: { action: 'approve', approvalId }
      });

      if (error) throw error;

      toast({
        title: 'Aprobación aprobada',
        description: 'La aprobación ha sido aprobada exitosamente'
      });
      loadApprovals();
    } catch (error) {
      console.error('Error approving approval:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar la aprobación',
        variant: 'destructive'
      });
    }
  };

  const rejectApproval = async (approvalId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approvals-api', {
        body: { action: 'reject', approvalId }
      });

      if (error) throw error;

      toast({
        title: 'Aprobación rechazada',
        description: 'La aprobación ha sido rechazada'
      });
      loadApprovals();
    } catch (error) {
      console.error('Error rejecting approval:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar la aprobación',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: Approval['status']) => {
    const variants = {
      DRAFT: { variant: 'secondary' as const, icon: Clock, text: 'Borrador' },
      SUBMITTED: { variant: 'warning' as const, icon: Send, text: 'Enviado' },
      APPROVED: { variant: 'success' as const, icon: CheckCircle, text: 'Aprobado' },
      REJECTED: { variant: 'destructive' as const, icon: XCircle, text: 'Rechazado' }
    };
    
    const config = variants[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const getTypeBadge = (type: Approval['type']) => {
    const types = {
      BUDGET: { text: 'Presupuesto', color: 'bg-blue-100 text-blue-800' },
      PR_REQUEST: { text: 'Solicitud PR', color: 'bg-green-100 text-green-800' },
      LOGISTICS: { text: 'Logística', color: 'bg-purple-100 text-purple-800' }
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${types[type].color}`}>
        {types[type].text}
      </span>
    );
  };

  const filteredApprovals = approvals.filter(approval => {
    const statusMatch = statusFilter === 'all' || approval.status === statusFilter;
    const typeMatch = typeFilter === 'all' || approval.type === typeFilter;
    return statusMatch && typeMatch;
  });

  const canSubmit = (approval: Approval) => {
    return approval.status === 'DRAFT' && approval.created_by_profile?.id === user?.id;
  };

  const canApprove = (approval: Approval) => {
    return approval.status === 'SUBMITTED' && approval.assigned_to_profile?.id === user?.id;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Cargando aprobaciones...</div>;
  }

  return (
    <div className="space-y-6">
      <AuthzBreadcrumb 
        workspace={workspace}
        artist={artist}
        project={project}
        current="Aprobaciones"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aprobaciones</h1>
          <p className="text-muted-foreground">Gestiona las aprobaciones del proyecto</p>
        </div>
        
        {renderIf(permissions.canEdit, (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Aprobación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Aprobación</DialogTitle>
                <DialogDescription>
                  Crea una nueva solicitud de aprobación para el proyecto
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <Select 
                    value={createForm.type} 
                    onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUDGET">Presupuesto</SelectItem>
                      <SelectItem value="PR_REQUEST">Solicitud PR</SelectItem>
                      <SelectItem value="LOGISTICS">Logística</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Título</label>
                  <Input
                    value={createForm.title}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título de la aprobación"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción detallada"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createApproval} disabled={!createForm.title}>
                    Crear
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="DRAFT">Borrador</SelectItem>
            <SelectItem value="SUBMITTED">Enviado</SelectItem>
            <SelectItem value="APPROVED">Aprobado</SelectItem>
            <SelectItem value="REJECTED">Rechazado</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="BUDGET">Presupuesto</SelectItem>
            <SelectItem value="PR_REQUEST">Solicitud PR</SelectItem>
            <SelectItem value="LOGISTICS">Logística</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Approvals List */}
      <div className="grid gap-4">
        {filteredApprovals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay aprobaciones</h3>
              <p className="text-muted-foreground text-center mb-4">
                {statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No se encontraron aprobaciones con los filtros aplicados'
                  : 'Aún no se han creado aprobaciones para este proyecto'
                }
              </p>
              {renderIf(permissions.canEdit && statusFilter === 'all' && typeFilter === 'all', (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Aprobación
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : (
          filteredApprovals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 
                        className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/approvals/${approval.id}`)}
                      >
                        {approval.title}
                      </h3>
                      {getTypeBadge(approval.type)}
                      {getStatusBadge(approval.status)}
                    </div>
                    
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
                      <div className="text-sm text-muted-foreground">
                        Asignado a: {approval.assigned_to_profile.full_name}
                      </div>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canSubmit(approval) && (
                        <DropdownMenuItem onClick={() => submitApproval(approval.id)}>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar para aprobación
                        </DropdownMenuItem>
                      )}
                      {canApprove(approval) && (
                        <>
                          <DropdownMenuItem onClick={() => approveApproval(approval.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprobar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => rejectApproval(approval.id)}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              {approval.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{approval.description}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}