import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';

const TYPE_LABELS: Record<string, string> = {
  concierto: 'Concierto',
  produccion_musical: 'Producción',
  campana_promocional: 'Campaña',
  videoclip: 'Videoclip',
  otros: 'Otros',
};

interface Props {
  projectId: string;
}

export function ProjectLinkedBudgets({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [selectedBudget, setSelectedBudget] = useState<any>(null);

  const { data: budgets } = useQuery({
    queryKey: ['project-budgets-linked', projectId],
    queryFn: async () => {
      // 1. Direct budgets
      const { data: directBudgets, error: e1 } = await supabase
        .from('budgets')
        .select('id, name, type, fee, show_status, budget_status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (e1) throw e1;

      // 2. Get release IDs for this project
      const { data: releases, error: e2 } = await supabase
        .from('releases')
        .select('id')
        .eq('project_id', projectId);
      if (e2) throw e2;

      const releaseIds = (releases || []).map((r) => r.id);
      if (releaseIds.length === 0) return directBudgets || [];

      // 3. Budgets linked via release_id
      const { data: releaseBudgets, error: e3 } = await supabase
        .from('budgets')
        .select('id, name, type, fee, show_status, budget_status')
        .in('release_id', releaseIds)
        .order('created_at', { ascending: false });
      if (e3) throw e3;

      // 4. Budgets linked via budget_release_links
      const { data: links, error: e4 } = await supabase
        .from('budget_release_links')
        .select('budget_id')
        .in('release_id', releaseIds);
      if (e4) throw e4;

      const linkedBudgetIds = (links || []).map((l) => l.budget_id);
      let linkedBudgets: typeof directBudgets = [];
      if (linkedBudgetIds.length > 0) {
        const { data: lb, error: e5 } = await supabase
          .from('budgets')
          .select('id, name, type, fee, show_status, budget_status')
          .in('id', linkedBudgetIds)
          .order('created_at', { ascending: false });
        if (e5) throw e5;
        linkedBudgets = lb || [];
      }

      // 5. Deduplicate
      const seen = new Set<string>();
      const all = [...(directBudgets || []), ...(releaseBudgets || []), ...linkedBudgets];
      return all.filter((b) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
    },
    enabled: !!projectId,
  });

  if (!budgets || budgets.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-green-500" />
        <h3 className="text-sm font-semibold">Presupuestos vinculados</h3>
        <Badge variant="secondary" className="text-[10px]">{budgets.length}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {budgets.map((budget) => (
          <Card
            key={budget.id}
            className="group cursor-pointer p-3 hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => setSelectedBudget(budget)}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-green-500/70" />
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
      {selectedBudget && (
        <BudgetDetailsDialog
          open={!!selectedBudget}
          onOpenChange={(open) => { if (!open) setSelectedBudget(null); }}
          budget={selectedBudget}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['project-budgets-linked', projectId] })}
        />
      )}
    </div>
  );
}
