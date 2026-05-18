import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface StatusCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: 'aprobada' | 'denegada' | 'pendiente';
  onSubmit: (comment: string) => void;
}

export function StatusCommentDialog({ open, onOpenChange, status, onSubmit }: StatusCommentDialogProps) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) setComment("");
  }, [open]);

  const handleConfirm = () => {
    onSubmit(comment.trim());
  };

  const title =
    status === 'aprobada'
      ? 'Añadir condiciones al aprobar'
      : status === 'denegada'
      ? 'Añadir motivo al denegar'
      : 'Motivo de reapertura a pendiente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="status-comment">Comentario (opcional)</Label>
          <Textarea
            id="status-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              status === 'aprobada'
                ? 'Condiciones, notas internas, próximos pasos…'
                : status === 'denegada'
                ? 'Explica brevemente el motivo de la denegación…'
                : 'Motivo o contexto del cambio (p. ej., nuevas fechas)…'
            }
            rows={5}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
