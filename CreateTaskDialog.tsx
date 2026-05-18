import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

type Task = {
  id: string;
  etapa: "PREPARATIVOS" | "PRODUCCIÓN" | "CIERRE";
  nombre: string;
  categoria: string;
  responsables: string[];
  prioridad: "Alta" | "Media" | "Baja";
  estado: "pendiente" | "en_progreso" | "completada" | "bloqueada" | "cancelada";
  comentarios: string;
};

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapa: "PREPARATIVOS" | "PRODUCCIÓN" | "CIERRE" | null;
  onCreateTask: (task: Omit<Task, "id">) => void;
  teamMembers: Array<{ id: string; full_name: string; role?: string }>;
};

const CATEGORIAS = [
  "Promoción",
  "Finanzas", 
  "Ventas",
  "Stock",
  "Merch",
  "Logística",
  "Técnica",
  "Legal",
  "Producción"
];

const PRIORIDADES = ["Alta", "Media", "Baja"];

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "bloqueada", label: "Bloqueada" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" }
];

export function CreateTaskDialog({ 
  open, 
  onOpenChange, 
  etapa, 
  onCreateTask, 
  teamMembers 
}: CreateTaskDialogProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "",
    responsables: [] as string[],
    prioridad: "Media" as "Alta" | "Media" | "Baja",
    estado: "pendiente" as "pendiente" | "en_progreso" | "completada" | "bloqueada" | "cancelada",
    comentarios: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim() || !etapa) {
      return;
    }

    onCreateTask({
      etapa,
      nombre: formData.nombre.trim(),
      categoria: formData.categoria,
      responsables: formData.responsables,
      prioridad: formData.prioridad,
      estado: formData.estado,
      comentarios: formData.comentarios.trim()
    });

    // Reset form
    setFormData({
      nombre: "",
      categoria: "",
      responsables: [],
      prioridad: "Media",
      estado: "pendiente",
      comentarios: ""
    });

    onOpenChange(false);
  };

  const handleResponsableToggle = (memberName: string) => {
    setFormData(prev => ({
      ...prev,
      responsables: prev.responsables.includes(memberName)
        ? prev.responsables.filter(r => r !== memberName)
        : [...prev.responsables, memberName]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva tarea - {etapa}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Tarea */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Tarea *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre de la tarea"
                  required
                />
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(categoria => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsables */}
              <div className="space-y-2">
                <Label>Responsable(s)</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {teamMembers.length > 0 ? (
                    teamMembers.map(member => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`responsable-${member.id}`}
                          checked={formData.responsables.includes(member.full_name)}
                          onCheckedChange={() => handleResponsableToggle(member.full_name)}
                        />
                        <Label 
                          htmlFor={`responsable-${member.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {member.full_name}
                          {member.role && (
                            <span className="text-muted-foreground ml-1">({member.role})</span>
                          )}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay miembros del equipo</p>
                  )}
                </div>
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select 
                  value={formData.prioridad} 
                  onValueChange={(value: "Alta" | "Media" | "Baja") => 
                    setFormData(prev => ({ ...prev, prioridad: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(prioridad => (
                      <SelectItem key={prioridad} value={prioridad}>
                        {prioridad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                  value={formData.estado} 
                  onValueChange={(value: "pendiente" | "en_progreso" | "completada" | "bloqueada" | "cancelada") => 
                    setFormData(prev => ({ ...prev, estado: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(estado => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Comentarios */}
              <div className="space-y-2">
                <Label htmlFor="comentarios">Comentarios</Label>
                <Textarea
                  id="comentarios"
                  value={formData.comentarios}
                  onChange={(e) => setFormData(prev => ({ ...prev, comentarios: e.target.value }))}
                  placeholder="Comentarios adicionales..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.nombre.trim()}>
              Crear tarea
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}