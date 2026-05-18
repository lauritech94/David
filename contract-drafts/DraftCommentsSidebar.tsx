import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, CheckCircle2, Reply, Edit3, X, Check, XCircle, Search } from 'lucide-react';
import type { DraftComment } from '@/hooks/useContractDrafts';
import type { TextSelection } from './TextSelectionHandler';

type CommentFilter = 'all' | 'open' | 'pending' | 'resolved';

interface DraftCommentsSidebarProps {
  comments: DraftComment[];
  onAddComment: (sectionKey: string, message: string, authorName: string, parentId?: string) => Promise<void>;
  onAddSelectionComment?: (data: {
    sectionKey: string;
    message: string;
    authorName: string;
    selectedText: string;
    clauseNumber: string;
    selectionStart: number;
    selectionEnd: number;
  }) => Promise<void>;
  onResolve: (commentId: string) => Promise<void>;
  onProposeChange?: (commentId: string, proposedText: string) => Promise<void>;
  onApproveChange?: (commentId: string, role: 'producer' | 'collaborator') => Promise<void>;
  onRejectChange?: (commentId: string) => Promise<void>;
  isOwner: boolean;
  userRole?: 'producer' | 'collaborator' | 'viewer';
  defaultAuthorName?: string;
  pendingSelection?: TextSelection | null;
  onClearSelection?: () => void;
  onScrollToClause?: (clauseNumber: string) => void;
  onScrollToHighlight?: (commentId: string) => void;
  activeCommentId?: string | null;
  sidebarWidth?: number;
}

export function DraftCommentsSidebar({
  comments,
  onAddComment,
  onAddSelectionComment,
  onResolve,
  onProposeChange,
  onApproveChange,
  onRejectChange,
  isOwner,
  userRole = 'viewer',
  defaultAuthorName = '',
  pendingSelection,
  onClearSelection,
  onScrollToClause,
  onScrollToHighlight,
  activeCommentId,
  sidebarWidth = 360,
}: DraftCommentsSidebarProps) {
  const [newMessage, setNewMessage] = useState('');
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [filter, setFilter] = useState<CommentFilter>('all');
  const [proposingFor, setProposingFor] = useState<string | null>(null);
  const [proposedText, setProposedText] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (pendingSelection) {
      setReplyTo(null);
      setProposingFor(null);
    }
  }, [pendingSelection]);

  // Order by position in the document (selection_start). Comments without
  // selection_start fall back to clause_number, then created_at, so the
  // sidebar stays coherent with the order users encounter while reading.
  const compareByDocPosition = (a: DraftComment, b: DraftComment) => {
    const sa = a.selection_start;
    const sb = b.selection_start;
    if (sa != null && sb != null && sa !== sb) return sa - sb;
    if (sa != null && sb == null) return -1;
    if (sa == null && sb != null) return 1;
    const ca = (a.clause_number || '').toString();
    const cb = (b.clause_number || '').toString();
    const byClause = ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' });
    if (byClause !== 0) return byClause;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  };

  const rootComments = comments
    .filter(c => !c.parent_comment_id)
    .slice()
    .sort(compareByDocPosition);
  const getReplies = (parentId: string) =>
    comments
      .filter(c => c.parent_comment_id === parentId)
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Counts for filter pills
  const counts = useMemo(() => ({
    all: rootComments.length,
    open: rootComments.filter(c => c.comment_status === 'open' || c.comment_status === 'proposing_change').length,
    pending: rootComments.filter(c => c.comment_status === 'pending_approval').length,
    resolved: rootComments.filter(c => c.comment_status === 'approved' || c.comment_status === 'resolved' || c.resolved).length,
  }), [rootComments]);

  let filteredComments = rootComments.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'open') return c.comment_status === 'open' || c.comment_status === 'proposing_change';
    if (filter === 'pending') return c.comment_status === 'pending_approval';
    if (filter === 'resolved') return c.comment_status === 'approved' || c.comment_status === 'resolved' || c.resolved;
    return true;
  });

  // Search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    filteredComments = filteredComments.filter(c =>
      c.message.toLowerCase().includes(q) ||
      c.author_name.toLowerCase().includes(q) ||
      (c.selected_text || '').toLowerCase().includes(q),
    );
  }

  // Group by clause when filter = 'all'. Group order follows the first
  // appearance of each clause in the document, NOT alphabetical key order,
  // so "Manifiestan" (early in the doc) shows before "§ 2.1".
  const grouped = useMemo(() => {
    const map = new Map<string, DraftComment[]>();
    const firstPos = new Map<string, number>();
    for (const c of filteredComments) {
      const key = c.clause_number || 'general';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
      const pos = c.selection_start ?? Number.POSITIVE_INFINITY;
      if (!firstPos.has(key) || pos < (firstPos.get(key) as number)) {
        firstPos.set(key, pos);
      }
    }
    // Sort each group internally by document position
    for (const [, list] of map) list.sort(compareByDocPosition);
    return Array.from(map.entries()).sort((a, b) => {
      const pa = firstPos.get(a[0]) ?? Number.POSITIVE_INFINITY;
      const pb = firstPos.get(b[0]) ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a[0].localeCompare(b[0], undefined, { numeric: true });
    });
  }, [filteredComments]);

  // Adaptive layout based on sidebar width — wider panels show longer
  // excerpts and roomier typography so users can review long paragraphs
  // without having to open each comment individually.
  const isRoomy = sidebarWidth >= 480;
  const isWide = sidebarWidth >= 640;
  const isXWide = sidebarWidth >= 820;
  // Selected-text truncation grows with the panel width
  const excerptLimit = isXWide ? 800 : isWide ? 480 : isRoomy ? 280 : 120;

  const handleSubmit = async () => {
    if (!newMessage.trim() || !authorName.trim()) return;
    if (pendingSelection && onAddSelectionComment) {
      await onAddSelectionComment({
        sectionKey: pendingSelection.clauseNumber,
        message: newMessage,
        authorName,
        selectedText: pendingSelection.selectedText,
        clauseNumber: pendingSelection.clauseNumber,
        selectionStart: pendingSelection.selectionStart,
        selectionEnd: pendingSelection.selectionEnd,
      });
      onClearSelection?.();
    } else {
      await onAddComment(replyTo ? comments.find(c => c.id === replyTo)?.section_key || 'general' : 'general', newMessage, authorName, replyTo || undefined);
    }
    setNewMessage('');
    setReplyTo(null);
  };

  const handlePropose = async (commentId: string) => {
    if (!proposedText.trim() || !onProposeChange) return;
    await onProposeChange(commentId, proposedText);
    setProposingFor(null);
    setProposedText('');
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      open: { label: 'Abierto', variant: 'secondary' },
      proposing_change: { label: 'Propuesta', variant: 'outline' },
      pending_approval: { label: 'Pendiente', variant: 'default' },
      approved: { label: 'Aprobado', variant: 'secondary' },
      resolved: { label: 'Resuelto', variant: 'secondary' },
    };
    const s = map[status] || map.open;
    return <Badge variant={s.variant} className="text-[10px] px-1.5 py-0">{s.label}</Badge>;
  };

  const renderCommentCard = (comment: DraftComment) => (
    <div
      key={comment.id}
      id={`comment-${comment.id}`}
      onClick={() => onScrollToHighlight?.(comment.id)}
      className={`rounded-lg border ${isWide ? 'p-4' : 'p-3'} text-sm space-y-2 transition-all cursor-pointer hover:bg-muted/50 hover:border-primary/40 ${
        comment.resolved || comment.comment_status === 'resolved' || comment.comment_status === 'approved' ? 'opacity-50' : ''
      } ${activeCommentId === comment.id ? 'ring-2 ring-primary animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {comment.clause_number && (
          <Badge
            variant="outline"
            className="text-[10px] cursor-pointer hover:bg-accent"
            onClick={(e) => { e.stopPropagation(); onScrollToClause?.(comment.clause_number!); }}
          >
            § {comment.clause_number}
          </Badge>
        )}
        {statusBadge(comment.comment_status || 'open')}
      </div>

      {comment.selected_text && (
        <div className={`bg-amber-50 border-l-2 border-amber-400 px-2 py-1 ${isRoomy ? 'text-sm' : 'text-xs'} italic text-amber-800 rounded-r whitespace-pre-wrap max-h-40 overflow-auto`}>
          "{comment.selected_text.length > excerptLimit ? comment.selected_text.slice(0, excerptLimit) + '...' : comment.selected_text}"
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-xs">{comment.author_name}</span>
          <span className="text-[10px] text-muted-foreground">{formatTime(comment.created_at)}</span>
        </div>
        <p className={`mt-0.5 whitespace-pre-wrap ${isWide ? 'text-base leading-relaxed' : 'text-sm'}`}>{comment.message}</p>
      </div>

      {comment.proposed_change && (comment.comment_status === 'pending_approval' || comment.comment_status === 'proposing_change') && (
        <div className="space-y-2 border rounded p-2 bg-muted/30" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] font-semibold flex items-center gap-1"><Edit3 className="h-3 w-3" /> Propuesta de cambio:</p>
          <div className="text-xs space-y-1">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">❌ Texto original:</p>
              <p className="text-muted-foreground line-through bg-red-50 rounded px-1 py-0.5">{comment.selected_text}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium" style={{ color: '#15803d' }}>✅ Texto propuesto:</p>
              <p className="font-medium bg-green-50 rounded px-1 py-0.5" style={{ color: '#15803d' }}>{comment.proposed_change}</p>
            </div>
          </div>
          <div className="space-y-1 border-t pt-1.5">
            <p className="text-[10px] font-semibold">Estado de aprobación:</p>
            <div className="flex flex-col gap-1 text-[10px]">
              <span className={comment.approved_by_producer ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                {comment.approved_by_producer ? '✅ Aprobado por: Productora' : '⏳ Pendiente: Productora'}
              </span>
              <span className={comment.approved_by_collaborator ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                {comment.approved_by_collaborator ? '✅ Aprobado por: Colaborador/a' : '⏳ Pendiente: Colaborador/a'}
              </span>
            </div>
          </div>
          {onApproveChange && onRejectChange && (userRole === 'producer' || userRole === 'collaborator') && (
            <div className="flex gap-1 pt-1">
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => onApproveChange(comment.id, userRole as 'producer' | 'collaborator')}>
                <Check className="h-3 w-3 mr-1" /> Aprobar como {userRole === 'producer' ? 'Productora' : 'Colaborador/a'}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => onRejectChange(comment.id)}>
                <XCircle className="h-3 w-3 mr-1" /> Rechazar
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1 pt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {!comment.resolved && comment.comment_status !== 'resolved' && comment.comment_status !== 'approved' && (
          <>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setReplyTo(comment.id); }}>
              <Reply className="h-3 w-3 mr-1" /> Responder
            </Button>
            {comment.selected_text && !comment.proposed_change && onProposeChange && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                setProposingFor(comment.id);
                setProposedText(comment.selected_text || '');
              }}>
                <Edit3 className="h-3 w-3 mr-1" /> Proponer cambio
              </Button>
            )}
          </>
        )}
        {isOwner && !comment.resolved && comment.comment_status !== 'resolved' && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-green-600" onClick={() => onResolve(comment.id)}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
          </Button>
        )}
      </div>

      {proposingFor === comment.id && (
        <div className="space-y-1.5 border-t pt-2" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] font-semibold">Texto propuesto:</p>
          <Textarea value={proposedText} onChange={e => setProposedText(e.target.value)} className="text-xs min-h-[60px]" />
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[10px]" onClick={() => handlePropose(comment.id)}>
              <Send className="h-3 w-3 mr-1" /> Enviar propuesta
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setProposingFor(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {getReplies(comment.id).map(reply => (
        <div key={reply.id} className="ml-4 mt-2 border-l-2 pl-3 text-xs space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium">{reply.author_name}</span>
            <span className="text-muted-foreground">{formatTime(reply.created_at)}</span>
          </div>
          <p>{reply.message}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Comentarios ({rootComments.length})</h3>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar en comentarios..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>
      </div>

      {/* Filters with counts */}
      <div className="px-3 py-2 border-b flex gap-1 flex-wrap">
        {(['all', 'open', 'pending', 'resolved'] as CommentFilter[]).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'ghost'}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `Todos (${counts.all})` : f === 'open' ? `Abiertos (${counts.open})` : f === 'pending' ? `Pendientes (${counts.pending})` : `Resueltos (${counts.resolved})`}
          </Button>
        ))}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredComments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {filter === 'all' && !search ? 'No hay comentarios aún. Selecciona texto en el contrato para comentar.' : 'Sin resultados con este filtro.'}
          </p>
        )}

        {filter === 'all' && !search ? (
          // Grouped view by clause
          <div className="space-y-4">
            {grouped.map(([clauseKey, items]) => (
              <div key={clauseKey} className="space-y-2">
                <div className="sticky top-0 bg-muted/30 backdrop-blur z-10 -mx-3 px-3 py-1 border-b">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    § {clauseKey === 'general' ? 'General' : clauseKey} · {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map(renderCommentCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComments.map(renderCommentCard)}
          </div>
        )}
      </div>

      {/* New comment form */}
      <div className="border-t p-3 space-y-2">
        {pendingSelection && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-800">Comentar selección (§ {pendingSelection.clauseNumber})</span>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClearSelection}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="italic text-amber-700">"{pendingSelection.selectedText.length > 80 ? pendingSelection.selectedText.slice(0, 80) + '...' : pendingSelection.selectedText}"</p>
          </div>
        )}
        {replyTo && !pendingSelection && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Reply className="h-3 w-3" />
            <span>Respondiendo a comentario</span>
            <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => setReplyTo(null)}>✕</Button>
          </div>
        )}
        {!defaultAuthorName && (
          <Input placeholder="Tu nombre" value={authorName} onChange={e => setAuthorName(e.target.value)} className="text-sm h-8" />
        )}
        <Textarea
          placeholder={pendingSelection ? 'Escribe tu comentario sobre el texto seleccionado...' : 'Escribe un comentario...'}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          className="text-sm min-h-[60px]"
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
        />
        <Button size="sm" className="w-full" onClick={handleSubmit} disabled={!newMessage.trim() || !authorName.trim()}>
          <Send className="h-3.5 w-3.5 mr-1" /> Enviar
        </Button>
      </div>
    </div>
  );
}
