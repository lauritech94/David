import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Camera, 
  Receipt, 
  CheckCircle, 
  XCircle, 
  Link2, 
  Sparkles,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { useQuickExpenses, QuickExpense } from '@/hooks/useQuickExpenses';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDropzone } from 'react-dropzone';

interface QuickExpenseCaptureProps {
  artistId?: string;
  bookingId?: string;
  onExpenseCreated?: (expense: QuickExpense) => void;
}

const STATUS_COLORS: Record<string, string> = {
  unreconciled: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  reviewed: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  approved: 'bg-green-500/10 text-green-700 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/20',
  linked: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  unreconciled: 'Sin Revisar',
  reviewed: 'Revisado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  linked: 'Vinculado',
};

export function QuickExpenseCapture({ artistId, bookingId, onExpenseCreated }: QuickExpenseCaptureProps) {
  const { profile } = useAuth();
  const { 
    expenses, 
    isLoading, 
    unreconciledCount,
    totalPendingAmount,
    createExpense,
    approveExpense,
    rejectExpense
  } = useQuickExpenses({ artistId, bookingId, status: 'unreconciled' });

  const [uploading, setUploading] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<QuickExpense | null>(null);
  const [expenseDetails, setExpenseDetails] = useState({
    amount: '',
    description: '',
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of acceptedFiles) {
        // Upload to storage
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `quick-expenses/${profile?.user_id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        // Create expense record (auto-linking happens in trigger)
        const result = await createExpense.mutateAsync({
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          artist_id: artistId,
          booking_id: bookingId,
        });

        if (result) {
          onExpenseCreated?.(result as QuickExpense);
        }
      }
    } catch (error) {
      console.error('Error uploading expense:', error);
    } finally {
      setUploading(false);
    }
  }, [profile, artistId, bookingId, createExpense, onExpenseCreated]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const handleApprove = async (expense: QuickExpense) => {
    if (!expense.amount) {
      setSelectedExpense(expense);
      setShowDetailsDialog(true);
      return;
    }
    await approveExpense.mutateAsync(expense.id);
  };

  const handleSaveDetails = async () => {
    if (!selectedExpense) return;
    
    await approveExpense.mutateAsync(selectedExpense.id);
    
    setShowDetailsDialog(false);
    setSelectedExpense(null);
    setExpenseDetails({ amount: '', description: '' });
  };

  const handleReject = async (expense: QuickExpense) => {
    await rejectExpense.mutateAsync(expense.id);
  };

  return (
    <div className="space-y-4">
      {/* Quick Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }
              ${uploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                  <p className="text-muted-foreground">Subiendo...</p>
                </>
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Camera className="h-6 w-6 text-primary" />
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Captura Rápida de Gastos</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Arrastra tickets, facturas o fotos de recibos aquí
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Auto-vinculación inteligente basada en fecha y artista</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unreconciled Expenses */}
      {unreconciledCount > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Gastos Pendientes de Revisar
                <Badge variant="outline" className="ml-2">
                  {unreconciledCount}
                </Badge>
              </div>
              <span className="text-lg font-bold text-amber-600">
                {totalPendingAmount.toLocaleString()}€
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {expenses.map((expense) => (
                <Card key={expense.id} className="overflow-hidden">
                  <div className="aspect-video relative bg-muted">
                    {expense.file_type?.startsWith('image/') ? (
                      <img
                        src={expense.file_url}
                        alt={expense.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Receipt className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {expense.auto_linked && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500/90">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Auto-vinculado
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {expense.file_name}
                        </span>
                        <Badge className={STATUS_COLORS[expense.status]}>
                          {STATUS_LABELS[expense.status]}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {format(new Date(expense.expense_date), 'd MMM', { locale: es })}
                        </span>
                        {expense.amount && (
                          <span className="font-medium text-foreground">
                            {expense.amount.toLocaleString()}€
                          </span>
                        )}
                      </div>

                      {expense.auto_link_confidence && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Confianza</span>
                            <span>{Math.round(expense.auto_link_confidence * 100)}%</span>
                          </div>
                          <Progress 
                            value={expense.auto_link_confidence * 100} 
                            className="h-1"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove(expense)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleReject(expense)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Detalles del Gasto</DialogTitle>
            <DialogDescription>
              Añade el importe y descripción antes de aprobar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedExpense && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                {selectedExpense.file_type?.startsWith('image/') ? (
                  <img
                    src={selectedExpense.file_url}
                    alt={selectedExpense.file_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Receipt className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importe (€)</Label>
                <Input
                  type="number"
                  value={expenseDetails.amount}
                  onChange={(e) => setExpenseDetails({ ...expenseDetails, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  value={expenseDetails.description}
                  onChange={(e) => setExpenseDetails({ ...expenseDetails, description: e.target.value })}
                  placeholder="Descripción del gasto"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveDetails}>
                Guardar y Aprobar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
