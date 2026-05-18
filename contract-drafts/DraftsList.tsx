import { useState } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DraftStatusBanner } from './DraftStatusBanner';
import { Edit, Share2, Trash2, ExternalLink, FileText, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ContractDraft, DraftStatus } from '@/hooks/useContractDrafts';
import { toast } from 'sonner';

interface DraftsListProps {
  drafts: ContractDraft[];
  loading: boolean;
  onEdit?: (draft: ContractDraft) => void;
  onDelete?: (draftId: string) => Promise<boolean>;
  onStatusChange?: (draftId: string, status: DraftStatus) => Promise<boolean>;
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_negociacion', label: 'En negociación' },
  { value: 'listo_para_firma', label: 'Listo para firma' },
  { value: 'firmado', label: 'Firmado' },
];

export function DraftsList({ drafts, loading, onEdit, onDelete, onStatusChange }: DraftsListProps) {
  const [filter, setFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = filter === 'all' ? drafts : drafts.filter(d => d.status === filter);

  const getShareUrl = (draft: ContractDraft) => {
    return `${PUBLIC_APP_URL}/contract-draft/${draft.share_token}`;
  };

  const copyLink = async (draft: ContractDraft) => {
    await navigator.clipboard.writeText(getShareUrl(draft));
    setCopiedId(draft.id);
    toast.success('Link copiado');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground text-center py-8">Cargando borradores...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No hay borradores {filter !== 'all' ? 'con este estado' : ''}.
        </p>
      )}

      {filtered.map(draft => (
        <Card key={draft.id} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">{draft.title}</span>
                  <DraftStatusBanner status={draft.status} />
                  <Badge variant="outline" className="text-xs">
                    {draft.draft_type === 'ip_license' ? 'Licencia IP' : 'Booking'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Actualizado {format(new Date(draft.updated_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {draft.status !== 'firmado' && onEdit && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(draft)} title="Editar">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyLink(draft)} title="Copiar link">
                  {copiedId === draft.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(getShareUrl(draft), '_blank')} title="Ver link público">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                {draft.status === 'borrador' && onDelete && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(draft.id)} title="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
