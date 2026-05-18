import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Send,
  Pencil
} from 'lucide-react';
import { usePaymentSchedules, PaymentSchedule } from '@/hooks/usePaymentSchedules';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentScheduleManagerProps {
  bookingId?: string;
  budgetId?: string;
  totalFee?: number;
  eventDate?: string;
  onCreateDefaultSchedule?: () => void;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  deposit: 'Señal',
  balance: 'Resto',
  full: 'Pago Completo',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  partial: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  received: 'bg-green-500/10 text-green-700 border-green-500/20',
  overdue: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  sent: 'Enviada',
  received: 'Recibida',
};

export function PaymentScheduleManager({ 
  bookingId, 
  budgetId, 
  totalFee = 0,
  eventDate,
  onCreateDefaultSchedule
}: PaymentScheduleManagerProps) {
  const { 
    schedules, 
    isLoading, 
    totals, 
    createSchedule, 
    updateSchedule,
    createDefaultSchedule 
  } = usePaymentSchedules(bookingId, budgetId);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<PaymentSchedule | null>(null);
  const [newPayment, setNewPayment] = useState({
    payment_type: 'deposit' as const,
    amount: 0,
    percentage: 50,
    due_date: '',
    notes: '',
  });

  const handleCreateDefault = async () => {
    if (!bookingId || !totalFee || !eventDate) return;
    await createDefaultSchedule.mutateAsync({
      bookingId,
      fee: totalFee,
      eventDate,
    });
    onCreateDefaultSchedule?.();
  };

  const handleAddPayment = async () => {
    await createSchedule.mutateAsync({
      booking_id: bookingId,
      budget_id: budgetId,
      ...newPayment,
    });
    setShowAddDialog(false);
    setNewPayment({
      payment_type: 'deposit',
      amount: 0,
      percentage: 50,
      due_date: '',
      notes: '',
    });
  };

  const handleUpdateStatus = async (id: string, status: PaymentSchedule['payment_status']) => {
    await updateSchedule.mutateAsync({
      id,
      payment_status: status,
      received_date: status === 'received' ? new Date().toISOString().split('T')[0] : null,
    });
  };

  const handleSendInvoice = async (schedule: PaymentSchedule) => {
    await updateSchedule.mutateAsync({
      id: schedule.id,
      invoice_status: 'sent',
    });
  };

  const progressPercentage = totals.totalAmount > 0 
    ? (totals.received / totals.totalAmount) * 100 
    : 0;

  // Check for upcoming due dates
  const upcomingPayments = schedules.filter(s => {
    if (!s.due_date || s.payment_status === 'received') return false;
    const dueDate = new Date(s.due_date);
    const today = new Date();
    return isWithinInterval(dueDate, { start: today, end: addDays(today, 7) });
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fee Total</p>
                <p className="text-2xl font-bold">{totals.totalAmount.toLocaleString()}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cobrado</p>
                <p className="text-2xl font-bold text-green-600">{totals.received.toLocaleString()}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente</p>
                <p className="text-2xl font-bold text-amber-600">{totals.pending.toLocaleString()}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso de cobro</span>
              <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {upcomingPayments.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                {upcomingPayments.length} pago(s) con vencimiento próximo
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Schedule Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Calendario de Pagos
            </CardTitle>
            <CardDescription>
              Gestiona señales, restos y fechas de vencimiento
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {schedules.length === 0 && totalFee > 0 && eventDate && (
              <Button 
                variant="outline" 
                onClick={handleCreateDefault}
                disabled={createDefaultSchedule.isPending}
              >
                Crear 50/50 por defecto
              </Button>
            )}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Pago
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir Pago Programado</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={newPayment.payment_type}
                        onValueChange={(value: any) => setNewPayment({ ...newPayment, payment_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Señal</SelectItem>
                          <SelectItem value="balance">Resto</SelectItem>
                          <SelectItem value="full">Pago Completo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Porcentaje</Label>
                      <Input
                        type="number"
                        value={newPayment.percentage}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value) || 0;
                          setNewPayment({ 
                            ...newPayment, 
                            percentage: pct,
                            amount: totalFee * (pct / 100)
                          });
                        }}
                        placeholder="50"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Importe (€)</Label>
                      <Input
                        type="number"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de Vencimiento</Label>
                      <Input
                        type="date"
                        value={newPayment.due_date}
                        onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Input
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddPayment} disabled={createSchedule.isPending}>
                      Añadir
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay pagos programados</p>
              <p className="text-sm mt-1">Añade señales y restos con sus fechas de vencimiento</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const isOverdue = schedule.due_date && isPast(new Date(schedule.due_date)) && schedule.payment_status !== 'received';
                  
                  return (
                    <TableRow key={schedule.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {PAYMENT_TYPE_LABELS[schedule.payment_type]}
                          </Badge>
                          {schedule.percentage && (
                            <span className="text-sm text-muted-foreground">
                              ({schedule.percentage}%)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {schedule.amount?.toLocaleString()}€
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {schedule.due_date ? (
                            <>
                              <span className={isOverdue ? 'text-red-600' : ''}>
                                {format(new Date(schedule.due_date), 'd MMM yyyy', { locale: es })}
                              </span>
                              {isOverdue && (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Sin fecha</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {INVOICE_STATUS_LABELS[schedule.invoice_status]}
                          </Badge>
                          {schedule.invoice_status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => handleSendInvoice(schedule)}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[isOverdue ? 'overdue' : schedule.payment_status]}>
                          {isOverdue ? 'Vencido' : schedule.payment_status === 'received' ? 'Cobrado' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {schedule.payment_status !== 'received' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleUpdateStatus(schedule.id, 'received')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Cobrado
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => setEditingSchedule(schedule)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
