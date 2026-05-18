import { useMemo, useState } from "react";
import { format, eachDayOfInterval, isAfter, isBefore, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
type EditingDateType = "start" | "end";

interface TaskDatePopoverProps {
  startDate: Date | null;
  dueDate: Date | null;
  placeholder?: string;
  triggerClassName?: string;
  onStartSelect: (date: Date | undefined) => void;
  onEndSelect: (date: Date | undefined) => void;
}

export default function TaskDatePopover({
  startDate,
  dueDate,
  placeholder = "Fechas",
  triggerClassName,
  onStartSelect,
  onEndSelect,
}: TaskDatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingDateType>("start");

  const hasStart = !!startDate;
  const hasEnd = !!dueDate;

  const triggerLabel = useMemo(() => {
    if (startDate && dueDate) {
      return (
        <span className="whitespace-nowrap">
          {format(startDate, "d MMM", { locale: es })} → {format(dueDate, "d MMM", { locale: es })}
        </span>
      );
    }
    if (startDate) return <span>{format(startDate, "d MMM yy", { locale: es })}</span>;
    return placeholder;
  }, [startDate, dueDate, placeholder]);

  const selected = editing === "start" ? startDate ?? undefined : dueDate ?? undefined;
  const defaultMonth = selected;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setEditing(hasStart ? "end" : "start");
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn(triggerClassName)}>
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={16}>
        <div className="p-3 border-b">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing("start")}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                editing === "start" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              )}
            >
              <CalendarIcon className="w-3 h-3 inline mr-1" />
              Inicio
            </button>
            <button
              type="button"
              onClick={() => setEditing("end")}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                editing === "end" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              )}
            >
              <CalendarIcon className="w-3 h-3 inline mr-1" />
              Fin
            </button>
          </div>
        </div>

        <div className="p-3">
          <Label className="text-xs text-muted-foreground mb-2 block">
            {editing === "start" ? "Seleccionar fecha de inicio" : "Seleccionar fecha de fin"}
          </Label>

          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={defaultMonth}
            onSelect={(date) => {
              if (editing === "start") onStartSelect(date);
              else onEndSelect(date);
              setOpen(false);
            }}
            disabled={(date) => {
              // Si no hay inicio, bloquear la edición del fin hasta definirlo.
              if (editing === "end" && !hasStart) return true;
              if (editing === "end" && startDate) return date <= startDate;
              if (editing === "start" && dueDate) return date >= dueDate;
              return false;
            }}
            modifiers={{
              otherDate: editing === "start" && dueDate 
                ? [dueDate] 
                : editing === "end" && startDate 
                  ? [startDate] 
                  : [],
              inRange: startDate && dueDate && isAfter(dueDate, startDate)
                ? eachDayOfInterval({ start: startDate, end: dueDate }).filter(
                    d => !isSameDay(d, startDate) && !isSameDay(d, dueDate)
                  )
                : [],
              rangeStart: startDate ? [startDate] : [],
              rangeEnd: dueDate ? [dueDate] : [],
            }}
            modifiersClassNames={{
              otherDate: "bg-primary/30 text-primary/70 rounded-md",
              inRange: "bg-accent/40 rounded-none",
              rangeStart: "bg-primary/20 rounded-l-md rounded-r-none",
              rangeEnd: "bg-primary/20 rounded-r-md rounded-l-none",
            }}
            initialFocus
            className="p-0 pointer-events-auto"
          />

          {editing === "end" && !hasStart && (
            <p className="text-xs text-muted-foreground mt-2">Primero selecciona una fecha de inicio.</p>
          )}
          {editing === "start" && hasEnd && (
            <p className="text-xs text-muted-foreground mt-2">La fecha de inicio debe ser anterior al fin.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
