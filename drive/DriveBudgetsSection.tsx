import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ArrowRight } from 'lucide-react';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';

interface Props {
  artistId: string;
  viewMode?: 'grid' | 'list';
}

const TYPE_LABELS: Record<string, string> = {
  concierto: 'Concierto',
  produccion_musical: 'Producción',
  campana_promocional: 'Campaña',
  videoclip: 'Videoclip',
  otros: 'Otros',
};

export function DriveBudgetsSection({ artistId, viewMode = 'grid' }: Props) {
  const queryClient = useQueryClient();
  const [selectedBudget, setSelectedBudget] = useState<any>(null);

  const { data: budgets } = useQuery({
    queryKey: ['drive-budgets', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, name, type, fee, show_status, budget_status, city, venue, event_date, event_time, country, internal_notes, created_at, artist_id, expense_budget, formato')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!artistId,
  });

  if (!budgets || budgets.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Presupuestos</h3>
        <Badge variant="secondary" className="text-[10px]">{budgets.length}</Badge>
      </div>
      {viewMode === 'list' ? (
        <Card className="divide-y divide-border">
          {budgets.map((budget) => (
            <div
              key={budget.id}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => setSelectedBudget(budget)}
            >
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-primary/70" />
              </div>
              <p className="font-medium text-sm truncate flex-1 group-hover:text-primary transition-colors">
                {budget.name}
              </p>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {TYPE_LABELS[budget.type] || budget.type}
              </Badge>
              {budget.show_status && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {budget.show_status}
                </Badge>
              )}
              {budget.fee != null && budget.fee > 0 && (
                <span className="text-xs text-muted-foreground shrink-0">
                  €{budget.fee.toLocaleString()}
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ))}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {budgets.map((budget) => (
            <Card
              key={budget.id}
              className="group cursor-pointer p-3 hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedBudget(budget)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-primary/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {budget.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[budget.type] || budget.type}
                    </Badge>
                    {budget.show_status && (
                      <Badge variant="outline" className="text-[10px]">
                        {budget.show_status}
                      </Badge>
                    )}
                  </div>
                  {budget.fee != null && budget.fee > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      €{budget.fee.toLocaleString()}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedBudget && (
        <BudgetDetailsDialog
          open={!!selectedBudget}
          onOpenChange={(open) => { if (!open) setSelectedBudget(null); }}
          budget={selectedBudget}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['drive-budgets', artistId] })}
        />
      )}
    </div>
  );
}
