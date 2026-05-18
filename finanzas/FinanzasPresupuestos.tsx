import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, FileText, Eye, Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import CreateBudgetDialog from '@/components/CreateBudgetDialog';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PermissionWrapper } from '@/components/PermissionBoundary';

interface Budget {
  id: string;
  name: string;
  city?: string;
  venue?: string;
  event_date?: string;
  budget_status?: string;
  show_status?: string;
  fee?: number;
  created_at: string;
  created_by: string;
  booking_offer_id?: string;
  project_id?: string;
  release_id?: string;
  type: string;
}

interface BudgetImpact {
  itemCount: number;
  retentionCount: number;
  lockedRetentionCount: number;
  hasBooking: boolean;
  hasProject: boolean;
  hasRelease: boolean;
  bookingName?: string;
  projectName?: string;
}

interface FinanzasPresupuestosProps {
  artistId?: string;
}

export function FinanzasPresupuestos({ artistId }: FinanzasPresupuestosProps = {}) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<BudgetImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, [filterStatus, artistId]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('budgets')
        .select('id, name, city, venue, event_date, budget_status, show_status, fee, created_at, created_by, booking_offer_id, project_id, release_id, type')
        .order('created_at', { ascending: false });

      if (artistId && artistId !== 'all') {
        query = query.eq('artist_id', artistId);
      }

      if (filterStatus !== 'all') {
        query = query.eq('budget_status', filterStatus as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({ title: "Error", description: "No se pudieron cargar los presupuestos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeleteImpact = async (budget: Budget) => {
    setLoadingImpact(true);
    setDeleteTarget(budget);
    try {
      const [itemsRes, retentionsRes, bookingRes, projectRes] = await Promise.all([
        supabase.from('budget_items').select('id', { count: 'exact', head: true }).eq('budget_id', budget.id),
        supabase.from('irpf_retentions').select('id, trimestre, ejercicio', { count: 'exact' }).eq('budget_id', budget.id),
        budget.booking_offer_id
          ? supabase.from('booking_offers').select('id, festival_ciclo, lugar, ciudad').eq('id', budget.booking_offer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        budget.project_id
          ? supabase.from('projects').select('id, name').eq('id', budget.project_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      // Check locked quarters for retentions
      let lockedRetentionCount = 0;
      if (retentionsRes.data && retentionsRes.data.length > 0) {
        const quarters = [...new Set(retentionsRes.data.map(r => `${r.ejercicio}-${r.trimestre}`))];
        const { data: quarterStatuses } = await supabase
          .from('irpf_quarter_status')
          .select('trimestre, ejercicio, presentado')
          .eq('presentado', true);

        if (quarterStatuses) {
          const lockedKeys = new Set(quarterStatuses.map(q => `${q.ejercicio}-${q.trimestre}`));
          lockedRetentionCount = retentionsRes.data.filter(r => lockedKeys.has(`${r.ejercicio}-${r.trimestre}`)).length;
        }
      }

      setDeleteImpact({
        itemCount: itemsRes.count || 0,
        retentionCount: retentionsRes.count || retentionsRes.data?.length || 0,
        lockedRetentionCount,
        hasBooking: !!budget.booking_offer_id,
        hasProject: !!budget.project_id,
        hasRelease: !!budget.release_id,
        bookingName: (bookingRes as any)?.data?.festival_ciclo || (bookingRes as any)?.data?.lugar || (bookingRes as any)?.data?.ciudad || undefined,
        projectName: (projectRes as any)?.data?.name || undefined,
      });
    } catch (error) {
      console.error('Error fetching impact:', error);
      toast({ title: "Error", description: "No se pudo analizar el impacto", variant: "destructive" });
      setDeleteTarget(null);
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      // Step 1: Delete retentions
      const { error: retError } = await supabase.from('irpf_retentions').delete().eq('budget_id', id);
      if (retError) throw retError;

      // Step 2: Delete budget items
      const { error: itemsError } = await supabase.from('budget_items').delete().eq('budget_id', id);
      if (itemsError) throw itemsError;

      // Step 3: Delete budget versions
      const { error: versionsError } = await supabase.from('budget_versions').delete().eq('budget_id', id);
      if (versionsError) throw versionsError;

      // Step 4: Delete budget attachments
      const { error: attachError } = await supabase.from('budget_attachments').delete().eq('budget_id', id);
      if (attachError) throw attachError;

      // Step 5: Delete the budget
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;

      toast({ title: "Éxito", description: "Presupuesto eliminado correctamente" });
      setDeleteTarget(null);
      setDeleteImpact(null);
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({ title: "Error", description: "No se pudo eliminar el presupuesto", variant: "destructive" });
    }
  };

  const filteredBudgets = budgets.filter(budget => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      budget.name.toLowerCase().includes(searchTermLower) ||
      (budget.city?.toLowerCase().includes(searchTermLower)) ||
      (budget.venue?.toLowerCase().includes(searchTermLower))
    );
  });

  if (loading) {
    return (
      <Card className="card-moodita">
        <CardContent className="py-12 text-center text-muted-foreground">
          Cargando presupuestos...
        </CardContent>
      </Card>
    );
  }

  const hasImpact = deleteImpact && (deleteImpact.itemCount > 0 || deleteImpact.retentionCount > 0 || deleteImpact.hasBooking || deleteImpact.hasProject || deleteImpact.hasRelease);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="card-moodita">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Buscar por nombre, ciudad o lugar..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
              <PermissionWrapper requiredPermission="createBudget">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo
                </Button>
              </PermissionWrapper>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-moodita">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            Lista de Presupuestos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBudgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay presupuestos que coincidan con los filtros
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.map((budget) => (
                  <TableRow key={budget.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{budget.name}</TableCell>
                    <TableCell>{budget.city || '-'}</TableCell>
                    <TableCell>
                      {budget.event_date ? new Date(budget.event_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {budget.budget_status || budget.show_status || 'borrador'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {budget.fee ? `€${budget.fee.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBudget(budget);
                            setShowDetailsDialog(true);
                          }}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <PermissionWrapper requiredPermission="manage">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBudget(budget);
                              setShowDetailsDialog(true);
                            }}
                            title="Editar presupuesto"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => fetchDeleteImpact(budget)}
                            title="Eliminar presupuesto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionWrapper>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Impact Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteImpact(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {loadingImpact ? (
                  <p className="text-muted-foreground">Analizando dependencias...</p>
                ) : deleteImpact && hasImpact ? (
                  <>
                    <p className="text-sm font-medium">Este presupuesto tiene las siguientes vinculaciones:</p>
                    <ul className="space-y-1.5 text-sm">
                      {deleteImpact.itemCount > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-amber-500">⚠️</span>
                          <span>{deleteImpact.itemCount} partida{deleteImpact.itemCount !== 1 ? 's' : ''} presupuestaria{deleteImpact.itemCount !== 1 ? 's' : ''} (se eliminarán)</span>
                        </li>
                      )}
                      {deleteImpact.retentionCount > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-amber-500">⚠️</span>
                          <span>{deleteImpact.retentionCount} retenci{deleteImpact.retentionCount !== 1 ? 'ones' : 'ón'} IRPF (se eliminarán)</span>
                        </li>
                      )}
                      {deleteImpact.hasBooking && (
                        <li className="flex items-start gap-2">
                          <span>🔗</span>
                          <span>Vinculado al booking "{deleteImpact.bookingName || 'Sin nombre'}" (perderá su presupuesto)</span>
                        </li>
                      )}
                      {deleteImpact.hasProject && (
                        <li className="flex items-start gap-2">
                          <span>🔗</span>
                          <span>Vinculado al proyecto "{deleteImpact.projectName || 'Sin nombre'}" (se desvinculará)</span>
                        </li>
                      )}
                      {deleteImpact.hasRelease && (
                        <li className="flex items-start gap-2">
                          <span>🔗</span>
                          <span>Vinculado a un lanzamiento (se desvinculará)</span>
                        </li>
                      )}
                    </ul>
                    {deleteImpact.lockedRetentionCount > 0 && (
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
                        <p className="font-semibold text-destructive">🔴 {deleteImpact.lockedRetentionCount} retenci{deleteImpact.lockedRetentionCount !== 1 ? 'ones pertenecen' : 'ón pertenece'} a un trimestre fiscal PRESENTADO.</p>
                        <p className="text-destructive/80 mt-1">Eliminar este presupuesto alterará las cifras del Modelo 111.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p>Este presupuesto no tiene dependencias. Se eliminará de forma segura.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteBudget(deleteTarget.id)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={loadingImpact}
            >
              {deleteImpact?.lockedRetentionCount ? 'Eliminar igualmente' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <CreateBudgetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchBudgets}
      />

      {selectedBudget && (
        <BudgetDetailsDialog
          open={showDetailsDialog}
          onOpenChange={(open) => {
            setShowDetailsDialog(open);
            if (!open) setSelectedBudget(null);
          }}
          budget={selectedBudget as any}
          onUpdate={fetchBudgets}
        />
      )}
    </div>
  );
}
