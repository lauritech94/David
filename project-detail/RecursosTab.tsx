import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProjectResources } from '@/hooks/useProjectResources';
import { RESOURCE_TYPES, type ProjectResourceType } from '@/lib/validation/projectResource';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, ChevronLeft, ChevronRight, FileText, Calculator,
  FileSignature, Inbox, CheckCircle2, Disc3, Mic2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_META: Record<ProjectResourceType, { label: string; icon: React.ElementType; color: string }> = {
  budget:    { label: 'Presupuesto', icon: Calculator,    color: 'text-emerald-600' },
  contract:  { label: 'Contrato',    icon: FileSignature, color: 'text-indigo-600' },
  file:      { label: 'Archivo',     icon: FileText,      color: 'text-slate-600' },
  solicitud: { label: 'Solicitud',   icon: Inbox,         color: 'text-amber-600' },
  approval:  { label: 'Aprobación',  icon: CheckCircle2,  color: 'text-blue-600' },
  release:   { label: 'Lanzamiento', icon: Disc3,         color: 'text-orange-600' },
  booking:   { label: 'Booking',     icon: Mic2,          color: 'text-purple-600' },
};

interface RecursosTabProps {
  projectId: string;
}

const PAGE_SIZE = 25;

export default function RecursosTab({ projectId }: RecursosTabProps) {
  const [activeTypes, setActiveTypes] = useState<ProjectResourceType[]>([...RESOURCE_TYPES]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useProjectResources({
    projectId,
    types: activeTypes,
    search: search.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const toggleType = (t: ProjectResourceType) => {
    setPage(1);
    setActiveTypes((prev) => {
      if (prev.length === RESOURCE_TYPES.length) return [t]; // primer click aísla
      if (prev.includes(t)) {
        const next = prev.filter((x) => x !== t);
        return next.length ? next : [...RESOURCE_TYPES];
      }
      return [...prev, t];
    });
  };

  const resetTypes = () => { setActiveTypes([...RESOURCE_TYPES]); setPage(1); };
  const allActive = activeTypes.length === RESOURCE_TYPES.length;

  // Construye link al recurso correspondiente
  const buildLink = (type: ProjectResourceType, id: string): string | null => {
    switch (type) {
      case 'release':   return `/releases/${id}`;
      case 'booking':   return `/booking?offer=${id}`;
      case 'solicitud': return `/solicitudes/${id}`;
      case 'approval':  return `/approvals/${id}`;
      default:          return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en todos los recursos…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Button
            variant={allActive ? 'default' : 'outline'}
            size="sm"
            onClick={resetTypes}
          >
            Todos
          </Button>
          {RESOURCE_TYPES.map((t) => {
            const m = TYPE_META[t];
            const active = !allActive && activeTypes.includes(t);
            const Icon = m.icon;
            return (
              <Button
                key={t}
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleType(t)}
                className="gap-1.5"
              >
                <Icon className={cn('h-3.5 w-3.5', active ? '' : m.color)} />
                {m.label}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-destructive">
            Error al cargar los recursos. Intenta de nuevo.
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No se encontraron recursos con esos filtros.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[140px]">Estado</TableHead>
                  <TableHead className="w-[160px]">Actualizado</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => {
                  const m = TYPE_META[r.type];
                  const Icon = m.icon;
                  const link = buildLink(r.type, r.id);
                  return (
                    <TableRow key={`${r.type}-${r.id}`} className="group">
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Icon className={cn('h-3.5 w-3.5', m.color)} />
                          <span className="text-xs">{m.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[400px]">{r.title}</TableCell>
                      <TableCell>
                        {r.status ? (
                          <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.updated_at).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {link && (
                          <Link to={link}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Paginación */}
            <div className="flex items-center justify-between p-3 border-t">
              <span className="text-xs text-muted-foreground">
                {data.total} recursos · página {data.page} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!data.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
