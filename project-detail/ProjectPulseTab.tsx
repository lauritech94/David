import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProjectPulseTabProps {
  tasks: any[];
  budgets: any[];
  solicitudes: any[];
  incidents: any[];
  questions: any[];
  linkedEntities: any[];
  project: {
    start_date?: string | null;
    end_date_estimada?: string | null;
  };
  cobrosTotal?: number;
  cobradoTotal?: number;
}

const ENTITY_TYPE_META: Record<string, { emoji: string; label: string; colorClass: string; bgClass: string }> = {
  show:      { emoji: "🎤", label: "Show",      colorClass: "text-green-500",  bgClass: "bg-green-500/10" },
  release:   { emoji: "💿", label: "Release",   colorClass: "text-violet-500", bgClass: "bg-violet-500/10" },
  sync:      { emoji: "🎬", label: "Sync",      colorClass: "text-blue-500",   bgClass: "bg-blue-500/10" },
  videoclip: { emoji: "🎥", label: "Videoclip", colorClass: "text-amber-500",  bgClass: "bg-amber-500/10" },
};

const IMPACT_BORDER: Record<string, string> = {
  critica: "border-l-red-500",
  alta:    "border-l-red-400",
  media:   "border-l-amber-500",
  baja:    "border-l-muted-foreground/40",
};

const IMPACT_BADGE: Record<string, { label: string; variant: "destructive" | "warning" | "secondary" | "outline" }> = {
  critica: { label: "Crítico", variant: "destructive" },
  alta:    { label: "Alto",    variant: "warning" },
  media:   { label: "Medio",  variant: "secondary" },
  baja:    { label: "Bajo",   variant: "outline" },
};

export function ProjectPulseTab({
  tasks,
  budgets,
  solicitudes,
  incidents,
  questions,
  linkedEntities,
  project,
  cobrosTotal = 0,
  cobradoTotal = 0,
}: ProjectPulseTabProps) {
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.estado === "completada").length;
    const pendingTasks = tasks.filter((t) => t.estado !== "completada").length;
    const blockedTasks = tasks.filter((t) => t.estado === "bloqueada").length;
    const urgentTasks = tasks.filter((t) => t.is_urgent && t.estado !== "completada").length;
    const overdueTasks = tasks.filter((t) => {
      if (!t.fecha_vencimiento || t.estado === "completada") return false;
      return new Date(t.fecha_vencimiento) < new Date();
    }).length;

    const openIncidents = incidents.filter((i) => i.status === "abierto" || i.status === "en_progreso").length;
    const criticalIncidents = incidents.filter(
      (i) => i.severity === "critica" && i.status !== "resuelto" && i.status !== "cerrado"
    ).length;

    const openQuestions = questions.filter((q) => q.status === "abierta" || q.status === "en_discusion").length;
    const urgentQuestions = questions.filter((q) => q.priority === "urgente" && q.status !== "resuelta").length;

    let health = 100;
    if (totalTasks > 0) {
      health -= blockedTasks * 5;
      health -= overdueTasks * 10;
      health -= urgentTasks * 3;
    }
    health -= criticalIncidents * 15;
    health -= openIncidents * 3;
    health -= urgentQuestions * 5;
    health = Math.max(0, Math.min(100, health));

    return {
      totalTasks, completedTasks, pendingTasks, blockedTasks,
      urgentTasks, overdueTasks,
      openIncidents, criticalIncidents,
      openQuestions, urgentQuestions,
      health,
    };
  }, [tasks, incidents, questions]);

  const pendingActions = useMemo(() => {
    return tasks
      .filter((t) => t.estado !== "completada")
      .sort((a, b) => {
        if (a.is_urgent && !b.is_urgent) return -1;
        if (!a.is_urgent && b.is_urgent) return 1;
        if (a.estado === "bloqueada" && b.estado !== "bloqueada") return -1;
        if (a.estado !== "bloqueada" && b.estado === "bloqueada") return 1;
        const da = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity;
        const db = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 5);
  }, [tasks]);

  const activeIncidents = useMemo(() => {
    return incidents.filter((i) => i.status === "abierto" || i.status === "en_progreso").slice(0, 5);
  }, [incidents]);

  const openQs = useMemo(() => {
    return questions
      .filter((q) => q.status === "abierta" || q.status === "en_discusion")
      .sort((a, b) => (b.priority === "urgente" ? 1 : 0) - (a.priority === "urgente" ? 1 : 0))
      .slice(0, 3);
  }, [questions]);

  // Financial summary from linked entities
  const financials = useMemo(() => {
    const confirmedShows = linkedEntities.filter(
      (e) => e.entity_type === "show" && ["confirmado", "completado"].includes(normalizeStatus(e.entity_status))
    );
    const feeConfirmado = confirmedShows.reduce((sum, e) => sum + (e.entity_value || 0), 0);

    const syncsInNeg = linkedEntities.filter(
      (e) => e.entity_type === "sync" && normalizeStatus(e.entity_status) === "negociacion"
    );
    const syncPotencial = syncsInNeg.reduce((sum, e) => sum + (e.entity_value || 0), 0);

    const allInNeg = linkedEntities.filter(
      (e) => normalizeStatus(e.entity_status) === "negociacion" && e.entity_value
    );
    const totalNeg = allInNeg.reduce((sum, e) => sum + (e.entity_value || 0), 0);

    return { feeConfirmado, syncPotencial, totalNeg, confirmedShowCount: confirmedShows.length };
  }, [linkedEntities]);

  const getLinkedEntityForTask = (task: any) => {
    if (!task.linked_entity_id || linkedEntities.length === 0) return null;
    return linkedEntities.find((e) => e.entity_id === task.linked_entity_id) || null;
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    try { return format(new Date(d), "d MMM", { locale: es }); } catch { return null; }
  };

  const getHealthColor = (h: number) => h >= 70 ? "text-green-500" : h >= 40 ? "text-amber-500" : "text-red-500";
  const getHealthSub = (h: number) => h >= 70 ? "En buen estado" : h >= 40 ? "Necesita atención" : "Crítico";

  const kpis = [
    { label: "Salud del proyecto", val: `${stats.health}%`, icon: "💚", color: getHealthColor(stats.health), sub: getHealthSub(stats.health) },
    { label: "Tareas urgentes",    val: stats.urgentTasks,   icon: "🔥", color: stats.urgentTasks > 0 ? "text-red-500" : "text-green-500", sub: `de ${stats.pendingTasks} pendientes` },
    { label: "Tareas bloqueadas",  val: stats.blockedTasks,  icon: "🚧", color: stats.blockedTasks > 0 ? "text-amber-500" : "text-green-500", sub: "esperando otra acción" },
    { label: "Imprevistos abiertos", val: stats.openIncidents, icon: "⚡", color: stats.openIncidents > 0 ? "text-red-500" : "text-green-500", sub: `${stats.criticalIncidents} críticos` },
    { label: "Dudas sin respuesta", val: stats.openQuestions,  icon: "❓", color: stats.openQuestions > 0 ? "text-amber-500" : "text-green-500", sub: `${stats.urgentQuestions} urgentes` },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {kpis.map((k) => (
          <Card key={k.label} className="border">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-xl">{k.icon}</span>
              <p className={cn("text-[28px] font-black tabular-nums", k.color)}>{k.val}</p>
              <p className="text-xs font-bold">{k.label}</p>
              <p className="text-[10px] text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Próximas Acciones */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <SectionHeader label="Próximas acciones" count={stats.pendingTasks} />
            {pendingActions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">🎉 Sin tareas pendientes</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {pendingActions.map((task) => {
                  const entity = getLinkedEntityForTask(task);
                  const meta = entity ? ENTITY_TYPE_META[entity.entity_type] : null;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex gap-2.5 items-start p-2 px-2.5 bg-background rounded-lg border",
                        task.is_urgent && "border-red-500/20"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                        task.is_urgent ? "bg-red-500" : task.estado === "bloqueada" ? "bg-amber-500" : "bg-blue-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug">{task.titulo}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {meta && (
                            <span className={cn("text-[10px] px-1.5 py-0 rounded-md", meta.colorClass, meta.bgClass)}>
                              {meta.emoji} {entity?.entity_name}
                            </span>
                          )}
                          {task.responsable && (
                            <span className="text-[10px] text-muted-foreground">{task.responsable}</span>
                          )}
                          {task.is_urgent && (
                            <span className="text-[10px] font-extrabold text-red-500">URGENTE</span>
                          )}
                          {task.estado === "bloqueada" && (
                            <span className="text-[10px] font-extrabold text-amber-500">⚠ BLOQUEADA</span>
                          )}
                        </div>
                      </div>
                      {task.fecha_vencimiento && (
                        <span className={cn(
                          "text-[10px] flex-shrink-0",
                          task.fecha_vencimiento && new Date(task.fecha_vencimiento) < new Date() && task.estado !== "completada"
                            ? "text-red-500 font-semibold"
                            : "text-muted-foreground"
                        )}>
                          {formatDate(task.fecha_vencimiento)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {stats.pendingTasks > 5 && (
                  <p className="text-[11px] text-muted-foreground text-center py-1">
                    +{stats.pendingTasks - 5} tareas más en Checklist
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Incidents + Questions */}
        <div className="flex flex-col gap-3">
          {/* Active Incidents */}
          <Card className="border">
            <CardContent className="p-4 space-y-3">
              <SectionHeader
                label="Imprevistos activos"
                count={stats.openIncidents}
                countColor={stats.openIncidents > 0 ? "text-red-500" : undefined}
              />
              {activeIncidents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">Sin imprevistos activos ✓</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeIncidents.map((inc) => {
                    const impactCfg = IMPACT_BADGE[inc.severity] || IMPACT_BADGE.media;
                    return (
                      <div
                        key={inc.id}
                        className={cn(
                          "p-2.5 px-3 bg-background rounded-lg border-l-[3px]",
                          IMPACT_BORDER[inc.severity] || "border-l-muted-foreground/40"
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-semibold flex-1 mr-2 leading-snug">{inc.title}</p>
                          <Badge variant={impactCfg.variant} className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                            {impactCfg.label}
                          </Badge>
                        </div>
                        {inc.description && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {inc.description.length > 100 ? inc.description.slice(0, 100) + "…" : inc.description}
                          </p>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {inc.assigned_to && <>{inc.assigned_to} · </>}
                          {inc.created_at && formatDate(inc.created_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unanswered Questions */}
          <Card className="border">
            <CardContent className="p-4 space-y-3">
              <SectionHeader
                label="Dudas sin respuesta"
                count={stats.openQuestions}
                countColor={stats.openQuestions > 0 ? "text-amber-500" : undefined}
              />
              {openQs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">Sin dudas pendientes ✓</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {openQs.map((q) => (
                    <div
                      key={q.id}
                      className={cn(
                        "p-2 px-2.5 bg-background rounded-lg border-l-[3px]",
                        q.priority === "urgente" ? "border-l-amber-500" : "border-l-border"
                      )}
                    >
                      <div className="flex gap-2.5 items-start">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0",
                          q.priority === "urgente" ? "bg-amber-500/15" : "bg-blue-500/10"
                        )}>
                          {q.priority === "urgente" ? "❓" : "💬"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] leading-snug mb-1">{q.question}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {q.assigned_to && (
                              <span className="text-[10px] text-muted-foreground">→ {q.assigned_to}</span>
                            )}
                            {q.priority === "urgente" && (
                              <span className="text-[10px] font-extrabold text-amber-500">Urgente</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats.openQuestions > 3 && (
                    <p className="text-[11px] text-muted-foreground text-center py-1">
                      +{stats.openQuestions - 3} dudas más
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Economic Summary */}
      <Card className="border">
        <CardContent className="p-4 space-y-3">
          <SectionHeader label="Resumen económico en tiempo real" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Fee confirmado",       val: `${financials.feeConfirmado.toLocaleString("es-ES")}€`, color: "text-green-500", sub: `${financials.confirmedShowCount} shows` },
              { label: "Syncs en negociación",  val: `${financials.syncPotencial.toLocaleString("es-ES")}€`, color: "text-amber-500", sub: "potencial, no confirmado" },
              { label: "En negociación",        val: `${financials.totalNeg.toLocaleString("es-ES")}€`,      color: "text-blue-500",  sub: "total en negociación" },
              {
                label: "Cobrado vs facturado",
                val: cobrosTotal > 0 ? `${Math.round((cobradoTotal / cobrosTotal) * 100)}%` : "—",
                color: "text-violet-500",
                sub: cobrosTotal > 0
                  ? `${cobradoTotal.toLocaleString("es-ES")}€ de ${cobrosTotal.toLocaleString("es-ES")}€`
                  : "Sin cobros registrados",
              },
            ].map((k) => (
              <div key={k.label} className="p-3 bg-background rounded-lg border">
                <p className={cn("text-[22px] font-black", k.color)}>{k.val}</p>
                <p className="text-[11px] font-semibold mt-0.5">{k.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function normalizeStatus(s?: string | null): string {
  if (!s) return "";
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").trim();
}

function SectionHeader({ label, count, countColor }: { label: string; count?: number; countColor?: string }) {
  return (
    <div className="flex items-center gap-2">
      <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{label}</h4>
      {count !== undefined && count > 0 && (
        <span className={cn("text-[10px] font-semibold bg-muted px-1.5 py-0 rounded-md", countColor)}>
          {count}
        </span>
      )}
    </div>
  );
}
