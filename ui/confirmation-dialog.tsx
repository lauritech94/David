import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Archive } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'default';
  onConfirm: () => void;
  icon?: 'delete' | 'archive' | 'warning';
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'default',
  onConfirm,
  icon = 'warning'
}: ConfirmationDialogProps) {
  const getIcon = () => {
    switch (icon) {
      case 'delete':
        return <Trash2 className="h-6 w-6 text-destructive" />;
      case 'archive':
        return <Archive className="h-6 w-6 text-warning" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-warning" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          button: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          description: "text-destructive"
        };
      case 'warning':
        return {
          button: "bg-warning text-warning-foreground hover:bg-warning/90",
          description: "text-warning"
        };
      default:
        return {
          button: "bg-primary text-primary-foreground hover:bg-primary/90",
          description: "text-muted-foreground"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-modal">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle className="text-xl font-playfair">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className={`text-base ${styles.description}`}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="hover-lift">
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              className={`${styles.button} hover-lift transition-all duration-200`}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}