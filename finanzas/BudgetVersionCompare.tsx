import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lock, 
  Unlock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  History,
  GitCompare
} from 'lucide-react';
import { useBudgetVersions, BudgetVersion } from '@/hooks/useBudgetVersions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BudgetVersionCompareProps {
  budgetId: string;
  currentIncome?: number;
  currentExpenses?: number;
}

export function BudgetVersionCompare({ 
  budgetId,
  currentIncome = 0,
  currentExpenses = 0
}: BudgetVersionCompareProps) {
  const { 
    versions, 
    isLoading, 
    estimatedVersion, 
    actualVersion,
    variance,
    createVersion 
  } = useBudgetVersions(budgetId);

  const [creating, setCreating] = useState(false);

  const handleCreateSnapshot = async (type: 'estimated' | 'locked' | 'actual' | 'final') => {
    setCreating(true);
    try {
      await createVersion.mutateAsync({
        budget_id: budgetId,
        version_type: type,
        version_name: type === 'estimated' 
          ? 'Presupuesto Estimado'
          : type === 'locked'
          ? 'Presupuesto Bloqueado (Pre-producción)'
          : type === 'actual'
          ? 'Costes Reales'
          : 'Presupuesto Final',
      });
    } finally {
      setCreating(false);
    }
  };

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
      {/* Snapshot Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Versiones del Presupuesto
          </CardTitle>
          <CardDescription>
            Crea snapshots para comparar estimaciones vs realidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {!estimatedVersion && (
              <Button
                variant="outline"
                onClick={() => handleCreateSnapshot('estimated')}
                disabled={creating}
              >
                <Lock className="h-4 w-4 mr-2" />
                Bloquear como Estimado
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => handleCreateSnapshot('actual')}
              disabled={creating}
            >
              <FileText className="h-4 w-4 mr-2" />
              Guardar Snapshot Actual
            </Button>
            
            {estimatedVersion && actualVersion && (
              <Button
                onClick={() => handleCreateSnapshot('final')}
                disabled={creating}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Cerrar como Final
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Variance Analysis */}
      {variance && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              Análisis de Varianza
            </CardTitle>
            <CardDescription>
              Comparación: {estimatedVersion?.version_name} vs {actualVersion?.version_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Income Variance */}
              <Card className={variance.incomeVariance >= 0 ? 'border-green-500/50' : 'border-red-500/50'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Ingresos</span>
                    </div>
                    {variance.incomeVariance >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="mt-2">
                    <p className={`text-2xl font-bold ${variance.incomeVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variance.incomeVariance >= 0 ? '+' : ''}{variance.incomeVariance.toLocaleString()}€
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {variance.incomePercentage >= 0 ? '+' : ''}{variance.incomePercentage.toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Expense Variance */}
              <Card className={variance.expenseVariance <= 0 ? 'border-green-500/50' : 'border-red-500/50'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Gastos</span>
                    </div>
                    {variance.expenseVariance <= 0 ? (
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="mt-2">
                    <p className={`text-2xl font-bold ${variance.expenseVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variance.expenseVariance >= 0 ? '+' : ''}{variance.expenseVariance.toLocaleString()}€
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {variance.expensePercentage >= 0 ? '+' : ''}{variance.expensePercentage.toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Profit Variance */}
              <Card className={variance.profitVariance >= 0 ? 'border-green-500/50' : 'border-red-500/50'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Beneficio Neto</span>
                    </div>
                    <Badge className={variance.profitVariance >= 0 ? 'bg-green-500' : 'bg-red-500'}>
                      {variance.profitVariance >= 0 ? 'Mejor' : 'Peor'}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <p className={`text-2xl font-bold ${variance.profitVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variance.profitVariance >= 0 ? '+' : ''}{variance.profitVariance.toLocaleString()}€
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Versiones</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay versiones guardadas</p>
              <p className="text-sm mt-1">
                Crea un snapshot para empezar a comparar estimaciones vs realidad
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      version.version_type === 'estimated' ? 'bg-blue-500/10' :
                      version.version_type === 'locked' ? 'bg-amber-500/10' :
                      version.version_type === 'actual' ? 'bg-green-500/10' :
                      'bg-purple-500/10'
                    }`}>
                      {version.version_type === 'locked' ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{version.version_name}</p>
                      <p className="text-sm text-muted-foreground">
                        v{version.version_number} • {format(new Date(version.created_at), 'd MMM yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {(version.net_profit || 0).toLocaleString()}€
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ingresos: {(version.total_income || 0).toLocaleString()}€ | 
                      Gastos: {(version.total_expenses || 0).toLocaleString()}€
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
