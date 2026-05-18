import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Helpers to format changed values nicely (dates, nulls, arrays, etc.)
const isIsoDateTime = (val: any) =>
  typeof val === 'string' && /\d{4}-\d{2}-\d{2}T/.test(val) && !isNaN(new Date(val).getTime());

function formatValue(val: any) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') {
    if (isIsoDateTime(val)) return new Date(val).toLocaleString();
    return val;
  }
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

interface HistoryEntry {
  id: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  condicion: string | null;
  nota: string | null;
  changed_at: string;
  event_type?: 'create' | 'update' | 'status_change' | 'comment' | 'update_message';
  message?: string | null;
  changes?: Record<string, { old: any; new: any }> | null;
  profiles?: { full_name?: string | null } | null;
}


export function SolicitudHistory({ solicitudId }: { solicitudId: string }) {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('solicitud_history')
          .select(`id, estado, condicion, nota, changed_at, event_type, message, changes, profiles:changed_by_profile_id ( full_name )`)
          .eq('solicitud_id', solicitudId)
          .order('changed_at', { ascending: order === 'asc' });
        if (error) throw error;
        setItems((data as any) || []);
      } catch (e) {
        console.error('Error loading history', e);
      } finally {
        setLoading(false);
      }
    };

    if (solicitudId) fetchHistory();
  }, [solicitudId, order]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [order, items.length]);

  const EXCLUDED_KEYS = [
    'estado','updated_at','fecha_actualizacion','id','created_by','changed_at','decision_has_new_comment','related_message_id','message'
  ];
  const FRIENDLY_LABELS: Record<string, string> = {
    fecha_limite_respuesta: 'Fecha límite de respuesta',
    decision_fecha: 'Fecha de decisión',
    hora_show: 'Hora del show',
    hora_entrevista: 'Hora de la entrevista',
    nombre_solicitante: 'Nombre del solicitante',
    nombre_festival: 'Nombre del festival',
    lugar_concierto: 'Lugar del concierto',
    descripcion_libre: 'Descripción',
    prioridad: 'Prioridad',
  };
  const PRIORITY_KEYS = ['prioridad', 'priority', 'nivel_prioridad'];
  const humanizeKey = (k: string) => FRIENDLY_LABELS[k] ?? k.split('_').join(' ');
  const isChangeEntry = (v: any) => typeof v === 'object' && v && 'old' in v && 'new' in v;

  const buildSummary = (h: HistoryEntry) => {
    if (h.event_type === 'comment') return 'Comentario';
    if (h.event_type === 'create') return 'Creación de solicitud';

    const changes: Record<string, any> = (h.changes as any) || {};
    const keys = Object.keys(changes)
      .filter((k) => !EXCLUDED_KEYS.includes(k))
      .filter((k) => isChangeEntry(changes[k]));

    // Cambio de estado explícito
    if (h.event_type === 'status_change' && changes.estado && isChangeEntry(changes.estado)) {
      const v = changes.estado;
      return `Cambio de estado: ${formatValue(v.old)} → ${formatValue(v.new)}`;
    }

    if (keys.length === 0) return 'Actualización';

    const isDateTime = (k: string) => /(fecha|hora|date|time)/i.test(k);
    const dateKeys = keys.filter(isDateTime);
    const priorityKeys = keys.filter((k) => PRIORITY_KEYS.includes(k));
    const otherKeys = keys.filter((k) => !isDateTime(k) && !PRIORITY_KEYS.includes(k) && k !== 'estado');

    // Un solo cambio
    if (keys.length === 1) {
      const k = keys[0];
      const v = changes[k];
      if (dateKeys.length === 1) {
        return `Modificación de ${humanizeKey(k)}: ${formatValue(v.old)} → ${formatValue(v.new)}`;
      }
      if (priorityKeys.length === 1) {
        return `Cambio de prioridad: ${formatValue(v.old)} → ${formatValue(v.new)}`;
      }
      return `Edición de ${humanizeKey(k)}: ${formatValue(v.old)} → ${formatValue(v.new)}`;
    }

    // Solo fechas/horas
    if (dateKeys.length > 0 && otherKeys.length === 0 && priorityKeys.length === 0) {
      return dateKeys.length === 1
        ? `Modificación de ${humanizeKey(dateKeys[0])}`
        : `Modificación de fechas/horas (${dateKeys.length} cambios)`;
    }

    // Solo prioridad
    if (priorityKeys.length > 0 && otherKeys.length === 0 && dateKeys.length === 0) {
      const pk = priorityKeys[0];
      const v = changes[pk];
      return v ? `Cambio de prioridad: ${formatValue(v.old)} → ${formatValue(v.new)}` : 'Cambio de prioridad';
    }

    // Mezcla de campos
    const headlineList = keys.slice(0, 3).map(humanizeKey).join(', ');
    const suffix = keys.length > 3 ? ` +${keys.length - 3} más` : '';
    return `Edición de información: ${headlineList}${suffix}`;
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historial</CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">{items.length} eventos</div>
            <div className="w-[220px]">
              <Select value={order} onValueChange={(v) => setOrder(v as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Más recientes primero</SelectItem>
                  <SelectItem value="asc">Más antiguos primero</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando historial…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sin eventos aún.</div>
        ) : (
          <div ref={listRef} className="max-h-96 overflow-y-auto pr-1">
            <div className="space-y-4">
              {items.map((h, idx) => (
                <div key={h.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{buildSummary(h)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString()}
                    </div>
                  </div>
                  {h.profiles?.full_name && (
                    <div className="text-xs text-muted-foreground">por {h.profiles.full_name}</div>
                  )}

                  {h.event_type === 'status_change' && (h.changes as any)?.estado && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Estado: </span>
                      <span>
                        {String((h.changes as any).estado.old)} → {String((h.changes as any).estado.new)}
                      </span>
                    </div>
                  )}

                  {h.message && (
                    <div className="text-sm whitespace-pre-wrap">{h.message}</div>
                  )}

                  {h.event_type !== 'comment' && h.changes &&
                    Object.entries(h.changes as any)
                      .filter(([k, v]: any) => typeof v === 'object' && v && 'old' in v && 'new' in v)
                      .filter(([k]) => !['estado','updated_at','fecha_actualizacion','id','created_by','changed_at','decision_has_new_comment'].includes(k as string))
                      .length > 0 && (
                    <div className="space-y-1">
                      {Object.entries(h.changes as any)
                        .filter(([k, v]: any) => typeof v === 'object' && v && 'old' in v && 'new' in v)
                        .filter(([k]) => !['estado','updated_at','fecha_actualizacion','id','created_by','changed_at','decision_has_new_comment'].includes(k as string))
                        .map(([k, v]: any) => (
                          <div key={k} className="text-sm">
                            <span className="text-muted-foreground">{humanizeKey(k as string)}: </span>
                            <span className="whitespace-pre-wrap">{formatValue(v.old)} → {formatValue(v.new)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {h.condicion && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Condición: </span>
                      <span className="whitespace-pre-wrap">{h.condicion}</span>
                    </div>
                  )}
                  {h.nota && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Nota: </span>
                      <span className="whitespace-pre-wrap">{h.nota}</span>
                    </div>
                  )}

                  {idx < items.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
