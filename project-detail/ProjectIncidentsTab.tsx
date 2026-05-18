import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectIncidentsTabProps {
  projectId: string;
  incidents: any[];
  onRefresh: () => void;
}

const IMPACT_BORDER: Record<string, string> = {
  critica: "border-l-red-500",
  alta:    "border-l-orange-500",
  media:   "border-l-amber-500",
  baja:    "border-l-blue-400",
};

const IMPACT_BADGE: Record<string, { label: string; variant: "destructive" | "warning" | "secondary" | "outline" }> = {
  critica: { label: "Crítico",  variant: "destructive" },
  alta:    { label: "Alto",     variant: "warning" },
  media:   { label: "Medio",   variant: "secondary" },
  baja:    { label: "Bajo",    variant: "outline" },
};

const STATUS_LABEL: Record<string, string> = {
  abierto: "Abierto",
  en_progreso: "En resolución",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export function ProjectIncidentsTab({ projectId, incidents, onRefresh }: ProjectIncidentsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "media",
    assigned_to: "",
  });

  const abiertos = incidents.filter((i) => i.status === "abierto");
  const enResolucion = incidents.filter((i) => i.status === "en_progreso");
  const resueltos = incidents.filter((i) => i.status === "resuelto" || i.status === "cerrado");
  const active = [...abiertos, ...enResolucion];

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase.from("project_incidents" as any).insert({
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        severity: form.severity,
        assigned_to: form.assigned_to.trim() || null,
        reported_by: user.data.user?.id,
      });
      if (error) throw error;
      setForm({ title: "", description: "", severity: "media", assigned_to: "" });
      setShowCreate(false);
      onRefresh();
      toast({ title: "Imprevisto registrado" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo crear el imprevisto", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "resuelto" || newStatus === "cerrado") {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("project_incidents" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Estado actualizado" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id: string, resolution: string) => {
    try {
      const { error } = await supabase
        .from("project_incidents" as any)
        .update({
          status: "resuelto",
          resolution,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Imprevisto resuelto" });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with inline status indicators */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          {[
            { label: "Abiertos", color: "bg-red-500", n: abiertos.length },
            { label: "En resolución", color: "bg-amber-500", n: enResolucion.length },
            { label: "Resueltos", color: "bg-green-500", n: resueltos.length },
          ].map((s) => (
            <div key={s.label} className="flex gap-1.5 items-center">
              <div className={cn("w-2 h-2 rounded-full", s.color)} />
              <span className="text-xs text-muted-foreground">
                {s.label}: <strong className="text-foreground">{s.n}</strong>
              </span>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCreate(!showCreate)}>
          + Registrar imprevisto
        </Button>
      </div>

      {/* Inline creation form */}
      {showCreate && (
        <Card className="border border-red-500/25">
          <CardContent className="p-4 space-y-3">
            <p className="text-[13px] font-bold">Nuevo imprevisto</p>
            <Input
              placeholder="Título del imprevisto"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              placeholder="Descripción detallada del imprevisto y su impacto…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
            <div className="flex gap-2">
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Bajo</SelectItem>
                  <SelectItem value="media">Medio</SelectItem>
                  <SelectItem value="alta">Alto</SelectItem>
                  <SelectItem value="critica">Crítico</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="flex-1"
                placeholder="Responsable"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="text-xs" onClick={handleCreate} disabled={creating || !form.title.trim()}>
                {creating ? "Registrando…" : "Registrar imprevisto"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active incidents */}
      {active.length === 0 && resueltos.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Sin imprevistos registrados ✓
        </div>
      )}

      {abiertos.length > 0 && (
        <>
          <SectionLabel label="Abiertos" color="text-red-500" />
          {abiertos.map((inc) => (
            <IncidentCard key={inc.id} incident={inc} onUpdateStatus={handleUpdateStatus} onResolve={handleResolve} />
          ))}
        </>
      )}

      {enResolucion.length > 0 && (
        <>
          <SectionLabel label="En resolución" color="text-amber-500" />
          {enResolucion.map((inc) => (
            <IncidentCard key={inc.id} incident={inc} onUpdateStatus={handleUpdateStatus} onResolve={handleResolve} />
          ))}
        </>
      )}

      {/* Resolved: collapsible */}
      {resueltos.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-1">
            <ChevronDown className="h-3 w-3" />
            Mostrar {resueltos.length} resueltos
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {resueltos.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} onUpdateStatus={handleUpdateStatus} onResolve={handleResolve} resolved />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────── */

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <p className={cn("text-[10px] font-extrabold uppercase tracking-widest mt-2", color)}>{label}</p>
  );
}

function IncidentCard({
  incident,
  onUpdateStatus,
  onResolve,
  resolved,
}: {
  incident: any;
  onUpdateStatus: (id: string, status: string) => void;
  onResolve: (id: string, resolution: string) => void;
  resolved?: boolean;
}) {
  const impactCfg = IMPACT_BADGE[incident.severity] || IMPACT_BADGE.media;
  const acciones: string[] = incident.acciones_posibles || [];

  return (
    <Card className={cn(
      "border-l-[3px] overflow-hidden",
      IMPACT_BORDER[incident.severity] || "border-l-muted-foreground/40",
      resolved && "opacity-60"
    )}>
      <CardContent className="p-3.5">
        {/* Title row */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 mr-2">
            <p className="text-[13px] font-bold leading-snug mb-1">{incident.title}</p>
          </div>
          <div className="flex gap-1.5 items-center flex-shrink-0">
            <Badge variant={impactCfg.variant} className="text-[10px] px-1.5 py-0 h-4">
              {impactCfg.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {STATUS_LABEL[incident.status] || incident.status}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {incident.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{incident.description}</p>
        )}

        {/* Resolution options */}
        {acciones.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
              Opciones de resolución
            </p>
            {acciones.map((a, i) => (
              <div key={i} className="flex gap-2 items-start py-1">
                <span className="text-blue-500 text-xs mt-0.5 flex-shrink-0">→</span>
                <span className="text-xs">{a}</span>
              </div>
            ))}
          </div>
        )}

        {/* Resolution */}
        {incident.resolution && (
          <div className="text-xs bg-green-500/5 text-green-700 dark:text-green-400 rounded p-2 mb-2 border border-green-500/20">
            ✅ {incident.resolution}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">
            {incident.assigned_to && <>{incident.assigned_to} · </>}
            {format(new Date(incident.created_at), "d MMM yyyy", { locale: es })}
          </span>
          <div className="flex gap-1.5">
            {incident.status === "abierto" && (
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onUpdateStatus(incident.id, "en_progreso")}>
                Marcar en resolución
              </Button>
            )}
            {incident.status === "en_progreso" && (
              <Button size="sm" className="text-xs h-7" onClick={() => {
                const resolution = prompt("¿Cómo se resolvió?");
                if (resolution) onResolve(incident.id, resolution);
              }}>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Marcar resuelto
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
