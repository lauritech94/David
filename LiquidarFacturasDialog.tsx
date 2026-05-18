import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { billingStatusLabel } from '@/lib/billingStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface BudgetItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  iva_percentage: number;
  billing_status: string;
  observations?: string;
}

interface LiquidarFacturasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetArtistId?: string;
  onSuccess?: () => void;
}

export default function LiquidarFacturasDialog({
  open,
  onOpenChange,
  budgetId,
  budgetArtistId,
  onSuccess
}: LiquidarFacturasDialogProps) {
  const [pendingItems, setPendingItems] = useState<BudgetItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [concepto, setConcepto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPendingItems();
      // Reset form
      setSelectedItems(new Set());
      setConcepto('');
      setDescripcion('');
    }
  }, [open, budgetId]);

  const fetchPendingItems = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budgetId)
        .in('billing_status', ['pendiente', 'factura_solicitada', 'facturado'])
        .order('category', { ascending: true });

      if (error) throw error;
      setPendingItems(data || []);
    } catch (error) {
      console.error('Error fetching pending items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las facturas pendientes",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map(item => item.id)));
    }
  };

  const getQuarterFromDate = (date: Date): string => {
    const month = date.getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
  };

  const handleLiquidar = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Aviso",
        description: "Debes seleccionar al menos una factura",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Build observations text
      let observationsText = '';
      if (concepto) observationsText += `Concepto: ${concepto}`;
      if (descripcion) {
        if (observationsText) observationsText += '\n';
        observationsText += `Descripción: ${descripcion}`;
      }

      // Update all selected items
      const { error } = await supabase
        .from('budget_items')
        .update({ 
          billing_status: 'pagado',
          observations: observationsText || null
        })
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      // Auto-create IRPF retention records for items with IRPF > 0
      const itemsWithIrpf = pendingItems.filter(
        item => selectedItems.has(item.id) && ((item as any).irpf_percentage ?? 15) > 0
      );

      if (itemsWithIrpf.length > 0) {
        // Get workspace_id from the user's profile
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('workspace_id')
            .eq('user_id', currentUser.id)
            .single();

          if (profile?.workspace_id) {
            const now = new Date();
            const trimestre = getQuarterFromDate(now);
            const ejercicio = now.getFullYear();

            const retentionRecords = itemsWithIrpf.map(item => {
              const subtotal = item.quantity * item.unit_price;
              const irpfPct = (item as any).irpf_percentage ?? 15;
              const importe = subtotal * (irpfPct / 100);
              // Try to get contact name if available
              const providerName = (item as any).contacts?.name || item.name;
              const providerNif = (item as any).contacts?.nif || null;

              return {
                workspace_id: profile.workspace_id,
                artist_id: budgetArtistId || null,
                budget_id: budgetId,
                budget_item_id: item.id,
                provider_name: providerName,
                provider_nif: providerNif,
                concepto: concepto || item.name,
                base_imponible: subtotal,
                irpf_percentage: irpfPct,
                importe_retenido: importe,
                fecha_pago: now.toISOString().split('T')[0],
                trimestre,
                ejercicio,
                is_manual: false,
                created_by: currentUser.id,
              };
            });

            await supabase.from('irpf_retentions').insert(retentionRecords as any);
          }
        }
      }

      toast({
        title: "Facturas liquidadas",
        description: `Se liquidaron ${selectedItems.size} factura(s) correctamente`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error liquidating invoices:', error);
      toast({
        title: "Error",
        description: "No se pudieron liquidar las facturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateLiquidoBreakdown = (item: BudgetItem) => {
    const subtotal = item.quantity * item.unit_price;
    const iva = subtotal * (item.iva_percentage / 100);
    const irpf = subtotal * ((item as any).irpf_percentage ?? 15) / 100;
    const aProveedor = subtotal + iva - irpf;
    const totalSalida = subtotal + iva; // aProveedor + irpf
    return { subtotal, iva, irpf, aProveedor, totalSalida };
  };

  const calculateTotal = (item: BudgetItem) => {
    return calculateLiquidoBreakdown(item).aProveedor;
  };

  const getSelectedTotal = () => {
    return pendingItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + calculateLiquidoBreakdown(item).aProveedor, 0);
  };

  const getSelectedRetention = () => {
    return pendingItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + calculateLiquidoBreakdown(item).irpf, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Liquidar Facturas Pendientes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay facturas pendientes de liquidar
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">A proveedor</TableHead>
                      <TableHead className="text-right">Retención</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          €{item.unit_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{calculateLiquidoBreakdown(item).aProveedor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          €{calculateLiquidoBreakdown(item).irpf.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            {billingStatusLabel(item.billing_status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedItems.size > 0 && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="text-sm font-medium">
                    Facturas seleccionadas: {selectedItems.size}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>A proveedor (transferir):</span>
                    <span className="font-bold">€{getSelectedTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Retención IRPF (Hacienda):</span>
                    <span>€{getSelectedRetention().toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Total salida:</span>
                    <span>€{(getSelectedTotal() + getSelectedRetention()).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="concepto">Concepto (opcional)</Label>
                  <Input
                    id="concepto"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Ej: Pago de servicios de producción"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Detalles adicionales sobre la liquidación"
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLiquidar} 
            disabled={loading || selectedItems.size === 0 || fetching}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Liquidar {selectedItems.size > 0 && `(${selectedItems.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
