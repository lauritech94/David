import { AlertTriangle, MessageSquare, Clock } from 'lucide-react';
import type { DraftComment } from '@/hooks/useContractDrafts';

interface NegotiationBannerProps {
  comments: DraftComment[];
  status: string;
}

export function NegotiationBanner({ comments, status }: NegotiationBannerProps) {
  if (status !== 'borrador' && status !== 'en_negociacion') return null;

  const openCount = comments.filter(c => c.comment_status === 'open' && !c.parent_comment_id).length;
  const pendingCount = comments.filter(c => c.comment_status === 'pending_approval').length;

  if (openCount === 0 && pendingCount === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h3 className="font-semibold text-amber-800 text-sm">DOCUMENTO EN NEGOCIACIÓN</h3>
      </div>
      <p className="text-xs text-amber-700">
        Este contrato está en modo borrador. Las partes pueden proponer cambios seleccionando texto y añadiendo comentarios.
        Los cambios solo se aplicarán cuando ambas partes los aprueben.
      </p>
      <div className="flex gap-4 text-xs text-amber-700">
        {openCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            Comentarios activos: {openCount}
          </span>
        )}
        {pendingCount > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Propuestas pendientes: {pendingCount}
          </span>
        )}
      </div>
    </div>
  );
}
