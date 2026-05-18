import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Link2 } from "lucide-react";
import { WorkflowToast } from "./WorkflowToast";

/* ── Phase maps per entity type ──────────────────────────────── */

interface PhaseConfig {
  id: string;
  label: string;
  color: string;
  textColor: string;
}

const SHOW_PHASES: PhaseConfig[] = [
  { id: "interes",      label: "Interés",      color: "bg-blue-500",    textColor: "text-blue-600 dark:text-blue-400" },
  { id: "negociacion",  label: "Negociación",  color: "bg-amber-500",   textColor: "text-amber-600 dark:text-amber-400" },
  { id: "confirmado",   label: "Confirmado",   color: "bg-green-500",   textColor: "text-green-600 dark:text-green-400" },
  { id: "completado",   label: "Completado",   color: "bg-emerald-600", textColor: "text-emerald-600 dark:text-emerald-400" },
  { id: "cancelado",    label: "Cancelado",    color: "bg-red-500",     textColor: "text-red-600 dark:text-red-400" },
];

const RELEASE_PHASES: PhaseConfig[] = [
  { id: "en_desarrollo", label: "En desarrollo", color: "bg-blue-500",    textColor: "text-blue-600 dark:text-blue-400" },
  { id: "en_produccion", label: "En producción", color: "bg-violet-500",  textColor: "text-violet-600 dark:text-violet-400" },
  { id: "en_revision",   label: "En revisión",   color: "bg-amber-500",   textColor: "text-amber-600 dark:text-amber-400" },
  { id: "lanzado",       label: "Lanzado",        color: "bg-green-500",   textColor: "text-green-600 dark:text-green-400" },
];

const SYNC_PHASES: PhaseConfig[] = [
  { id: "interes",      label: "Interés",        color: "bg-blue-500",    textColor: "text-blue-600 dark:text-blue-400" },
  { id: "negociacion",  label: "Negociación",     color: "bg-amber-500",   textColor: "text-amber-600 dark:text-amber-400" },
  { id: "confirmado",   label: "Confirmado",      color: "bg-green-500",   textColor: "text-green-600 dark:text-green-400" },
  { id: "completado",   label: "Completado",      color: "bg-emerald-600", textColor: "text-emerald-600 dark:text-emerald-400" },
  { id: "caido",        label: "Caído",           color: "bg-red-500",     textColor: "text-red-600 dark:text-red-400" },
];

const ENTITY_PHASE_MAP: Record<string, PhaseConfig[]> = {
  show: SHOW_PHASES,
  release: RELEASE_PHASES,
  sync: SYNC_PHASES,
  videoclip: RELEASE_PHASES,
  prensa: SHOW_PHASES,
  merch: SHOW_PHASES,
};

/* ── Enriched workflow triggers ─────────────────────────────── */

export interface WorkflowAction {
  txt: string;
  resp: string;
  plazo: string;
  prio: "crítica" | "alta" | "media";
}

export interface WorkflowTrigger {
  titulo: string;
  icono: string;
  acciones: WorkflowAction[];
}

export const WORKFLOW_TRIGGERS: Record<string, WorkflowTrigger> = {
  "show:interes→negociacion": {
    titulo: "Show entra en negociación",
    icono: "🤝",
    acciones: [
      { txt: "Enviar disponibilidad de fechas al promotor",     resp: "Booking",     plazo: "24h",   prio: "alta"   },
      { txt: "Compartir rider técnico y hospitalidad",          resp: "Producción",  plazo: "48h",   prio: "alta"   },
      { txt: "Solicitar condiciones económicas (caché, split)", resp: "Management",  plazo: "48h",   prio: "alta"   },
      { txt: "Confirmar aforo y tipo de sala",                  resp: "Booking",     plazo: "48h",   prio: "media"  },
    ],
  },
  "show:negociacion→confirmado": {
    titulo: "Show confirmado 🎉",
    icono: "✅",
    acciones: [
      { txt: "Solicitar contrato firmado al promotor",          resp: "Management",   plazo: "72h",   prio: "crítica" },
      { txt: "Facturar anticipo del 50% del caché",             resp: "Admin",        plazo: "72h",   prio: "crítica" },
      { txt: "Añadir al plan de PR y comunicación",             resp: "PR/Marketing", plazo: "1 sem", prio: "alta"    },
      { txt: "Briefing de producción: backline, PA, luces",     resp: "Producción",   plazo: "2 sem", prio: "alta"    },
      { txt: "Gestionar alojamiento y transporte",              resp: "Tour Manager", plazo: "2 sem", prio: "media"   },
      { txt: "Publicar en RRSS y añadir a la web",              resp: "PR/Marketing", plazo: "1 sem", prio: "media"   },
    ],
  },
  "release:en_produccion→lanzado": {
    titulo: "Release publicado",
    icono: "💿",
    acciones: [
      { txt: "Pitch a listas editoriales de Spotify/Apple",     resp: "Distribución", plazo: "Inmediato", prio: "crítica" },
      { txt: "Enviar a medios y blogs especializados",          resp: "PR",           plazo: "Inmediato", prio: "alta"    },
      { txt: "Publicar en todas las RRSS del artista",          resp: "PR/Marketing", plazo: "Inmediato", prio: "alta"    },
      { txt: "Notificar a la lista de email/fans",              resp: "Management",   plazo: "24h",       prio: "media"   },
      { txt: "Registrar en SGAE/CEDRO si no está hecho",        resp: "Admin",        plazo: "1 sem",     prio: "alta"    },
    ],
  },
  "sync:interes→negociacion": {
    titulo: "Sincronización entra en negociación",
    icono: "🎬",
    acciones: [
      { txt: "Confirmar uso: territorio, duración, exclusividad", resp: "Management",  plazo: "48h",    prio: "crítica" },
      { txt: "Revisar quién posee el máster y la composición",    resp: "Admin/Legal",  plazo: "24h",    prio: "crítica" },
      { txt: "Preparar propuesta de tarifa (MFN/buyout/royalty)", resp: "Management",  plazo: "3 días", prio: "alta"    },
      { txt: "Consultar con el artista si acepta el uso",         resp: "Management",  plazo: "24h",    prio: "alta"    },
    ],
  },
  "sync:negociacion→confirmado": {
    titulo: "Sync confirmada 💰",
    icono: "🎬",
    acciones: [
      { txt: "Redactar y firmar contrato de licencia de sync",  resp: "Legal",       plazo: "5 días",        prio: "crítica" },
      { txt: "Facturar el importe acordado",                    resp: "Admin",       plazo: "5 días",        prio: "crítica" },
      { txt: "Entregar stems y máster en el formato solicitado", resp: "Producción",  plazo: "Según contrato", prio: "alta"    },
      { txt: "Comunicar a SGAE/entidad de gestión el uso",      resp: "Admin",       plazo: "1 mes",         prio: "media"   },
    ],
  },
};

/* ── Entity type config ─────────────────────────────────────── */

const ENTITY_TYPE_CONFIG: Record<string, { emoji: string; label: string }> = {
  show:      { emoji: "🎤", label: "Show" },
  release:   { emoji: "💿", label: "Release" },
  sync:      { emoji: "🎬", label: "Sync" },
  videoclip: { emoji: "🎥", label: "Videoclip" },
  prensa:    { emoji: "📰", label: "Prensa" },
  merch:     { emoji: "👕", label: "Merch" },
};

const PRIO_COLORS: Record<string, string> = {
  "crítica": "text-red-500",
  "alta":    "text-amber-500",
  "media":   "text-blue-500",
};

/* ── Helpers ────────────────────────────────────────────────── */

function normalizePhase(phase?: string | null): string {
  if (!phase) return "";
  return phase
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function getCurrentPhaseIndex(phases: PhaseConfig[], entityStatus?: string | null): number {
  const normalized = normalizePhase(entityStatus);
  if (!normalized) return 0;
  const idx = phases.findIndex((p) => p.id === normalized);
  return idx >= 0 ? idx : 0;
}

/* ── Component ──────────────────────────────────────────────── */

interface ProjectWorkflowsTabProps {
  tasks: any[];
  budgets: any[];
  solicitudes: any[];
  linkedEntities?: any[];
  onOpenChecklist?: () => void;
}

export function ProjectWorkflowsTab({
  linkedEntities = [],
  onOpenChecklist,
}: ProjectWorkflowsTabProps) {
  const [activeTrigger, setActiveTrigger] = useState<string | null>(null);

  const entitiesWithPhases = useMemo(() => {
    return linkedEntities
      .filter((e) => ENTITY_PHASE_MAP[e.entity_type])
      .map((entity) => {
        const phases = ENTITY_PHASE_MAP[entity.entity_type] || SHOW_PHASES;
        const currentIdx = getCurrentPhaseIndex(phases, entity.entity_status);
        const nextPhase = currentIdx < phases.length - 1 ? phases[currentIdx + 1] : null;
        const currentPhaseId = phases[currentIdx]?.id;
        const triggerKey = nextPhase
          ? `${entity.entity_type}:${currentPhaseId}→${nextPhase.id}`
          : null;
        const trigger = triggerKey ? WORKFLOW_TRIGGERS[triggerKey] : null;

        return {
          ...entity,
          phases,
          currentIdx,
          nextPhase,
          triggerKey,
          trigger,
        };
      });
  }, [linkedEntities]);

  const handlePhaseClick = (_entityId: string, _phaseId: string) => {
    // In real implementation this would update the entity status via supabase
    // For now we just show the trigger preview
  };

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.08] p-4">
        <div className="text-[13px] font-bold text-blue-300 dark:text-blue-300 mb-1">⚡ Motor de workflows</div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Cuando cambias el estado de una entidad, el sistema detecta la transición y activa
          automáticamente las tareas que corresponden según el workflow de la industria musical.
          Pruébalo: cambia el estado de cualquier entidad abajo.
        </p>
      </div>

      {/* Empty state */}
      {entitiesWithPhases.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Link2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Sin entidades vinculadas</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Vincula shows, releases o sincronizaciones a este proyecto para ver su progreso
              en el motor de workflows.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Entity cards */}
      <div className="flex flex-col gap-2.5">
        {entitiesWithPhases.map((entity) => {
          const typeConfig = ENTITY_TYPE_CONFIG[entity.entity_type] || { emoji: "📋", label: entity.entity_type };

          return (
            <Card
              key={entity.id}
              className={cn(
                "overflow-hidden transition-colors",
                onOpenChecklist && "cursor-pointer hover:bg-muted/30"
              )}
              onClick={() => onOpenChecklist?.()}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center gap-3">
                  {/* Entity info */}
                  <span className="text-[22px] flex-shrink-0">{typeConfig.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] truncate">{entity.entity_name || "Sin nombre"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {typeConfig.label}
                      {entity.entity_date && (
                        <> · {new Date(entity.entity_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</>
                      )}
                      {entity.entity_module && <> · {entity.entity_module}</>}
                    </p>
                  </div>

                  {/* Interactive phase stepper */}
                  <div className="flex items-center gap-1">
                    {entity.phases.map((phase: PhaseConfig, idx: number) => {
                      const isCompleted = idx < entity.currentIdx;
                      const isCurrent = idx === entity.currentIdx;

                      return (
                        <button
                          key={phase.id}
                          onClick={(e) => { e.stopPropagation(); handlePhaseClick(entity.id, phase.id); }}
                          className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer px-1.5 py-1"
                        >
                          {/* Circle */}
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all",
                              isCompleted && "border-green-500/40 bg-green-500/10",
                              isCurrent && cn("border-transparent", phase.color),
                              !isCompleted && !isCurrent && "border-muted-foreground/25 bg-transparent"
                            )}
                          >
                            {isCompleted && (
                              <Check className="h-3 w-3 text-green-500" />
                            )}
                            {isCurrent && (
                              <div className="w-2 h-2 rounded-full bg-black dark:bg-white/90" />
                            )}
                          </div>
                          {/* Label */}
                          <span
                            className={cn(
                              "text-[9px] whitespace-nowrap leading-tight",
                              isCompleted && "text-green-500 font-medium",
                              isCurrent && cn("font-bold", phase.textColor),
                              !isCompleted && !isCurrent && "text-muted-foreground/60"
                            )}
                          >
                            {phase.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Next actions preview */}
                {entity.trigger && entity.nextPhase && (
                  <div className="mt-2.5 p-2 px-3 bg-green-500/[0.06] border border-green-500/[0.15] rounded-lg">
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Si avanzas a{" "}
                      <strong className="text-green-500">{entity.nextPhase.label}</strong>
                      , se activarán:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {entity.trigger.acciones.slice(0, 3).map((a: WorkflowAction, i: number) => (
                        <span key={i} className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded-md">
                          {a.txt.length > 40 ? a.txt.slice(0, 40) + "…" : a.txt}
                        </span>
                      ))}
                      {entity.trigger.acciones.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{entity.trigger.acciones.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Workflow Toast */}
      {activeTrigger && WORKFLOW_TRIGGERS[activeTrigger] && (
        <WorkflowToast
          trigger={WORKFLOW_TRIGGERS[activeTrigger]}
          onClose={() => setActiveTrigger(null)}
        />
      )}
    </div>
  );
}
