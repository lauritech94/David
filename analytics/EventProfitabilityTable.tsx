import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import type { EventProfit } from '@/hooks/useAnalyticsData';
import { formatCurrency, getMarginColor, getMarginBg } from './analyticsUtils';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  data: EventProfit[];
  isLoading?: boolean;
}

type SortKey = 'name' | 'feeBruto' | 'gastos' | 'feeNeto' | 'margin';

export function EventProfitabilityTable({ data, isLoading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('margin');
  const [sortAsc, setSortAsc] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...data].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    if (sortKey === 'name') return mul * a.name.localeCompare(b.name);
    return mul * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Rentabilidad por Evento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No hay eventos confirmados en este período
        </CardContent>
      </Card>
    );
  }

  const SortableHead = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(k)}
    >
      {label} {sortKey === k && (sortAsc ? '↑' : '↓')}
    </TableHead>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Rentabilidad por Evento
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Evento" k="name" />
                <TableHead className="text-right">Fecha</TableHead>
                <SortableHead label="Fee Bruto" k="feeBruto" />
                <SortableHead label="Gastos" k="gastos" />
                <SortableHead label="Fee Neto" k="feeNeto" />
                <SortableHead label="Margen" k="margin" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.slice(0, 20).map(event => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{event.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                    {event.fecha ? format(new Date(event.fecha), 'd MMM yy', { locale: es }) : '—'}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(event.feeBruto)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(event.gastos)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(event.feeNeto)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={cn("text-xs", getMarginColor(event.margin), getMarginBg(event.margin))}>
                      {event.margin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
