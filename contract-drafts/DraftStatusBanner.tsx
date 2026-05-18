import { Badge } from '@/components/ui/badge';
import { FileEdit, Share2, CheckCircle2, Lock } from 'lucide-react';

type Status = 'borrador' | 'en_negociacion' | 'listo_para_firma' | 'firmado';

const STATUS_CONFIG: Record<Status, { label: string; icon: React.ReactNode; className: string }> = {
  borrador: {
    label: 'Borrador',
    icon: <FileEdit className="h-3.5 w-3.5" />,
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  en_negociacion: {
    label: 'En negociación',
    icon: <Share2 className="h-3.5 w-3.5" />,
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  },
  listo_para_firma: {
    label: 'Listo para firma',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: 'bg-green-500/15 text-green-700 border-green-500/30',
  },
  firmado: {
    label: 'Firmado',
    icon: <Lock className="h-3.5 w-3.5" />,
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  },
};

interface DraftStatusBannerProps {
  status: string;
  className?: string;
}

export function DraftStatusBanner({ status, className }: DraftStatusBannerProps) {
  const config = STATUS_CONFIG[status as Status] || STATUS_CONFIG.borrador;

  return (
    <Badge variant="outline" className={`gap-1.5 ${config.className} ${className || ''}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
