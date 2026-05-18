import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowTrigger } from "./ProjectWorkflowsTab";

const PRIO_COLORS: Record<string, string> = {
  "crítica": "text-red-500 bg-red-500/10",
  "alta":    "text-amber-500 bg-amber-500/10",
  "media":   "text-blue-500 bg-blue-500/10",
};

const PRIO_DOT: Record<string, string> = {
  "crítica": "bg-red-500",
  "alta":    "bg-amber-500",
  "media":   "bg-blue-500",
};

interface WorkflowToastProps {
  trigger: WorkflowTrigger;
  onClose: () => void;
}

export function WorkflowToast({ trigger, onClose }: WorkflowToastProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    onClose();
  };

  return (
    <div className="fixed bottom-6 right-6 w-[420px] bg-card border border-green-500/30 rounded-2xl p-5 z-50 shadow-2xl">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-base">{trigger.icono}</div>
          <div className="text-sm font-extrabold mt-1">{trigger.titulo}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Se han activado {trigger.acciones.length} acciones automáticamente
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {trigger.acciones.map((a, i) => (
          <div
            key={i}
            className="flex gap-2 items-start p-2 bg-background rounded-lg border"
          >
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", PRIO_DOT[a.prio] || "bg-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <div className="text-xs">{a.txt}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {a.resp} · {a.plazo}
              </div>
            </div>
            <span className={cn(
              "text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-wider flex-shrink-0",
              PRIO_COLORS[a.prio] || "text-muted-foreground bg-muted/10"
            )}>
              {a.prio}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3.5">
        <Button size="sm" className="text-xs" onClick={dismiss}>
          Añadir al checklist
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={dismiss}>
          Ignorar
        </Button>
      </div>
    </div>
  );
}
