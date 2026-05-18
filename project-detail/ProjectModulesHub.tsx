import { LucideIcon, CalendarDays, Calculator, ListChecks, FileText, FileSignature, Inbox, Link2, AlertTriangle, HelpCircle, Target, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export type ModuleColor = "blue" | "green" | "pink" | "purple" | "amber" | "cyan" | "indigo" | "rose" | "emerald";

const COLOR_MAP: Record<ModuleColor, { bg: string; iconBg: string; iconText: string; ring: string }> = {
  blue:    { bg: "bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30",       iconBg: "bg-white dark:bg-blue-950/40",   iconText: "text-blue-600 dark:text-blue-400",     ring: "border-blue-200/70 dark:border-blue-900/50" },
  green:   { bg: "bg-green-50/70 dark:bg-green-950/20 hover:bg-green-50 dark:hover:bg-green-950/30",   iconBg: "bg-white dark:bg-green-950/40",  iconText: "text-green-600 dark:text-green-400",   ring: "border-green-200/70 dark:border-green-900/50" },
  pink:    { bg: "bg-pink-50/70 dark:bg-pink-950/20 hover:bg-pink-50 dark:hover:bg-pink-950/30",       iconBg: "bg-white dark:bg-pink-950/40",   iconText: "text-pink-600 dark:text-pink-400",     ring: "border-pink-200/70 dark:border-pink-900/50" },
  purple:  { bg: "bg-purple-50/70 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/30", iconBg: "bg-white dark:bg-purple-950/40", iconText: "text-purple-600 dark:text-purple-400", ring: "border-purple-200/70 dark:border-purple-900/50" },
  amber:   { bg: "bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30",   iconBg: "bg-white dark:bg-amber-950/40",  iconText: "text-amber-600 dark:text-amber-400",   ring: "border-amber-200/70 dark:border-amber-900/50" },
  cyan:    { bg: "bg-cyan-50/70 dark:bg-cyan-950/20 hover:bg-cyan-50 dark:hover:bg-cyan-950/30",       iconBg: "bg-white dark:bg-cyan-950/40",   iconText: "text-cyan-600 dark:text-cyan-400",     ring: "border-cyan-200/70 dark:border-cyan-900/50" },
  indigo:  { bg: "bg-indigo-50/70 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30", iconBg: "bg-white dark:bg-indigo-950/40", iconText: "text-indigo-600 dark:text-indigo-400", ring: "border-indigo-200/70 dark:border-indigo-900/50" },
  rose:    { bg: "bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30",       iconBg: "bg-white dark:bg-rose-950/40",   iconText: "text-rose-600 dark:text-rose-400",     ring: "border-rose-200/70 dark:border-rose-900/50" },
  emerald: { bg: "bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30", iconBg: "bg-white dark:bg-emerald-950/40", iconText: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-200/70 dark:border-emerald-900/50" },
};

interface ModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  color: ModuleColor;
  onClick: () => void;
}

function ModuleCard({ icon: Icon, title, description, count, color, onClick }: ModuleCardProps) {
  const c = COLOR_MAP[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative text-left rounded-xl border p-5 transition-all w-full",
        "hover:shadow-md hover:-translate-y-0.5",
        c.bg, c.ring,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("h-11 w-11 rounded-lg flex items-center justify-center shrink-0 shadow-sm", c.iconBg)}>
          <Icon className={cn("h-5 w-5", c.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
            {typeof count === "number" && count > 0 && (
              <span className={cn("text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-background/80 border", c.iconText, c.ring)}>
                {count}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{description}</p>
        </div>
      </div>
    </button>
  );
}

interface KpiTileProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  color: ModuleColor;
  progress?: number;
}

function KpiTile({ label, value, hint, icon: Icon, color, progress }: KpiTileProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground truncate">{label}</div>
          <div className="text-2xl font-bold tabular-nums text-foreground mt-1">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</div>}
        </div>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", c.iconBg, c.ring, "border")}>
          <Icon className={cn("h-4 w-4", c.iconText)} />
        </div>
      </div>
      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", c.iconText.replace("text-", "bg-"))} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  );
}

export interface ProjectHubCounts {
  tasksCompleted: number;
  tasksTotal: number;
  budgetsCount: number;
  feeConfirmado: number;
  vinculadosCount: number;
  alertCount: number;
  incidentsOpen: number;
  questionsOpen: number;
  documentsCount: number;
  contractsCount: number;
  solicitudesCount: number;
}

interface ProjectModulesHubProps {
  objective?: string | null;
  description?: string | null;
  counts: ProjectHubCounts;
  onNavigate: (tab: string) => void;
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

export function ProjectModulesHub({ objective, description, counts, onNavigate }: ProjectModulesHubProps) {
  const tasksPct = counts.tasksTotal > 0 ? Math.round((counts.tasksCompleted / counts.tasksTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Misión sobria */}
      {objective && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Misión del proyecto</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{objective}</p>
          {description && description !== objective && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t leading-relaxed">{description}</p>
          )}
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="Tareas"
          value={`${counts.tasksCompleted}/${counts.tasksTotal}`}
          hint={`${tasksPct}% completado`}
          icon={ListChecks}
          color="blue"
          progress={tasksPct}
        />
        <KpiTile
          label="Fee confirmado"
          value={fmtEUR(counts.feeConfirmado)}
          hint={`${counts.budgetsCount} presupuesto${counts.budgetsCount !== 1 ? "s" : ""}`}
          icon={Calculator}
          color="green"
        />
        <KpiTile
          label="Vinculados"
          value={String(counts.vinculadosCount)}
          hint="entidades conectadas"
          icon={Link2}
          color="purple"
        />
        <KpiTile
          label="Alertas"
          value={String(counts.alertCount)}
          hint={`${counts.incidentsOpen} imprevistos · ${counts.questionsOpen} dudas`}
          icon={Activity}
          color={counts.alertCount > 0 ? "rose" : "cyan"}
        />
      </div>

      {/* Grid de módulos */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Módulos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ModuleCard icon={CalendarDays} title="Cronograma" description="Planifica y visualiza el timeline del proyecto" color="blue" onClick={() => onNavigate("cronograma")} />
          <ModuleCard icon={Calculator} title="Presupuestos" description="Controla gastos estimados y reales" count={counts.budgetsCount} color="green" onClick={() => onNavigate("presupuestos")} />
          <ModuleCard icon={ListChecks} title="Tareas" description="Centro de tareas y checklists del equipo" count={counts.tasksTotal - counts.tasksCompleted} color="indigo" onClick={() => onNavigate("checklist")} />
          <ModuleCard icon={FileText} title="Archivos" description="Documentos, imágenes y material del proyecto" count={counts.documentsCount} color="amber" onClick={() => onNavigate("proyectos")} />
          <ModuleCard icon={FileSignature} title="Contratos" description="Royalties, cesiones y licencias" count={counts.contractsCount} color="purple" onClick={() => onNavigate("contratos")} />
          <ModuleCard icon={Inbox} title="Solicitudes" description="Aprobaciones y peticiones pendientes" count={counts.solicitudesCount} color="cyan" onClick={() => onNavigate("solicitudes")} />
          <ModuleCard icon={Link2} title="Vinculados" description="Releases, eventos y otras entidades conectadas" count={counts.vinculadosCount} color="pink" onClick={() => onNavigate("vinculados")} />
          <ModuleCard icon={AlertTriangle} title="Imprevistos" description="Riesgos abiertos y bloqueos del proyecto" count={counts.incidentsOpen} color="rose" onClick={() => onNavigate("imprevistos")} />
          <ModuleCard icon={HelpCircle} title="Dudas" description="Preguntas pendientes y discusiones" count={counts.questionsOpen} color="emerald" onClick={() => onNavigate("dudas")} />
        </div>
      </div>
    </div>
  );
}

export default ProjectModulesHub;
