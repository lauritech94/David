import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectQuestionsTabProps {
  projectId: string;
  questions: any[];
  onRefresh: () => void;
}

export function ProjectQuestionsTab({ projectId, questions, onRefresh }: ProjectQuestionsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    question: "",
    assigned_to: "",
    responsable: "",
    urgente: false,
  });

  const pendientes = questions.filter((q) => q.status === "abierta" || q.status === "en_discusion");
  const respondidas = questions.filter((q) => q.status === "resuelta");
  const urgentCount = pendientes.filter((q) => q.priority === "urgente").length;

  const handleCreate = async () => {
    if (!form.question.trim()) return;
    setCreating(true);
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase.from("project_questions" as any).insert({
        project_id: projectId,
        question: form.question.trim(),
        priority: form.urgente ? "urgente" : "normal",
        assigned_to: form.assigned_to.trim() || null,
        context: form.responsable.trim() ? `Responsable: ${form.responsable.trim()}` : null,
        asked_by: user.data.user?.id,
      });
      if (error) throw error;
      setForm({ question: "", assigned_to: "", responsable: "", urgente: false });
      setShowCreate(false);
      onRefresh();
      toast({ title: "Duda registrada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo crear la duda", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleMarkAnswered = async (id: string) => {
    try {
      const { error } = await supabase
        .from("project_questions" as any)
        .update({
          status: "resuelta",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Duda resuelta" });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with inline counts */}
      <div className="flex justify-between items-center">
        <div className="text-[13px] text-muted-foreground">
          <strong className="text-amber-500">{urgentCount}</strong> urgentes ·{" "}
          <strong className="text-foreground">{pendientes.length}</strong> sin respuesta ·{" "}
          <strong className="text-green-500">{respondidas.length}</strong> respondidas
        </div>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCreate(!showCreate)}>
          + Añadir duda
        </Button>
      </div>

      {/* Inline creation form */}
      {showCreate && (
        <Card className="border border-amber-500/25">
          <CardContent className="p-4 space-y-3">
            <p className="text-[13px] font-bold">Nueva duda</p>
            <Textarea
              placeholder="¿Cuál es la duda o pregunta que necesita respuesta?"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              rows={3}
            />
            <div className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="Dirigida a (promotor, sello, artista…)"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              />
              <Input
                className="flex-1"
                placeholder="Responsable de preguntar"
                value={form.responsable}
                onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex gap-2 items-center text-xs cursor-pointer">
                <Checkbox
                  checked={form.urgente}
                  onCheckedChange={(checked) => setForm({ ...form, urgente: !!checked })}
                />
                Es urgente (bloquea una decisión)
              </label>
              <div className="flex gap-2">
                <Button size="sm" className="text-xs" onClick={handleCreate} disabled={creating || !form.question.trim()}>
                  {creating ? "Añadiendo…" : "Añadir duda"}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending questions */}
      {pendientes.length > 0 && (
        <>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 mt-2">
            Sin respuesta
            <span className="bg-muted px-1.5 py-0 rounded-md ml-2 text-muted-foreground font-semibold">{pendientes.length}</span>
          </p>
          {pendientes
            .sort((a, b) => (b.priority === "urgente" ? 1 : 0) - (a.priority === "urgente" ? 1 : 0))
            .map((q) => (
              <Card
                key={q.id}
                className={cn(
                  "border-l-[3px]",
                  q.priority === "urgente" ? "border-l-amber-500" : "border-l-border"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex gap-2.5 items-start">
                    {/* Icon */}
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0",
                      q.priority === "urgente" ? "bg-amber-500/15" : "bg-blue-500/10"
                    )}>
                      {q.priority === "urgente" ? "❓" : "💬"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-snug mb-1">{q.question}</p>
                      <div className="flex gap-2 flex-wrap text-[10px]">
                        {q.assigned_to && (
                          <span className="text-muted-foreground">→ {q.assigned_to}</span>
                        )}
                        {q.context && q.context.startsWith("Responsable:") && (
                          <span className="text-muted-foreground">Resp: {q.context.replace("Responsable: ", "")}</span>
                        )}
                        {q.priority === "urgente" && (
                          <span className="font-extrabold text-amber-500">URGENTE</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(q.created_at), "d MMM", { locale: es })}
                      </span>
                      <Button size="sm" className="text-xs h-7" onClick={() => handleMarkAnswered(q.id)}>
                        ✓ Respondida
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </>
      )}

      {/* Answered: collapsible */}
      {respondidas.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-1">
            <ChevronDown className="h-3 w-3" />
            Mostrar {respondidas.length} respondidas
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 mt-2">
            {respondidas.map((q) => (
              <div key={q.id} className="p-2.5 px-3 bg-background rounded-lg border opacity-60">
                <p className="text-xs">{q.question}</p>
                <p className="text-[10px] text-green-500 mt-1">
                  ✓ Respondida{q.assigned_to ? ` · ${q.assigned_to}` : ""}
                </p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Sin dudas registradas ✓
        </div>
      )}
    </div>
  );
}
