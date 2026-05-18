import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicDraft } from '@/hooks/useContractDrafts';
import { useAuth } from '@/hooks/useAuth';
import { useDraftParticipants } from '@/hooks/useDraftParticipants';
import { DraftStatusBanner } from '@/components/contract-drafts/DraftStatusBanner';
import { DraftCommentsSidebar } from '@/components/contract-drafts/DraftCommentsSidebar';
import { DraftParticipantsList } from '@/components/contract-drafts/DraftParticipantsList';
import { TextSelectionHandler, type TextSelection } from '@/components/contract-drafts/TextSelectionHandler';
import { NegotiationBanner } from '@/components/contract-drafts/NegotiationBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
// Pure HTML modal used instead of Dialog to avoid auth redirect issues
import { CheckCircle2, Clock, FileText, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getDefaultIPClauses,
  getPDFLabels,
  type IPLicenseLanguage,
  type IPLicenseRecordingType,
  type IPLegalClauses,
} from '@/lib/contracts/ipLicenseTemplates';

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} minutos`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} horas`;
  return `Hace ${Math.floor(hours / 24)} días`;
}

function s(val: string | undefined): string {
  return val?.trim() || '___________';
}

function numberToSpanishText(n: number): string {
  if (n < 0 || n > 100 || !Number.isInteger(n)) return '';
  const units = ['CERO','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIÚN','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  if (n <= 29) return units[n];
  const tens = ['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  if (n === 100) return 'CIEN';
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? tens[t] : `${tens[t]} Y ${units[u]}`;
}

function numberToEnglishText(n: number): string {
  if (n < 0 || n > 100 || !Number.isInteger(n)) return '';
  const units = ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
  if (n < 20) return units[n];
  const tens = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];
  if (n === 100) return 'ONE HUNDRED';
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? tens[t] : `${tens[t]}-${units[u]}`;
}

function resolveClause(text: string, d: any, language: IPLicenseLanguage = 'es'): string {
  const royaltyNum = parseInt(d.royalty_porcentaje) || 0;
  const royaltyText = (language === 'en' ? numberToEnglishText(royaltyNum) : numberToSpanishText(royaltyNum)) || s('');
  return text
    .replace(/\{\{calidad_entidad\}\}/g, s(d.calidad_entidad))
    .replace(/\{\{productora_nombre_artistico\}\}/g, s(d.productora_nombre_artistico))
    .replace(/\{\{royalty_texto\}\}/g, royaltyText)
    .replace(/\{\{royalty_porcentaje\}\}/g, s(d.royalty_porcentaje))
    .replace(/\{\{grabacion_titulo\}\}/g, s(d.grabacion_titulo))
    .replace(/\{\{productora_email\}\}/g, s(d.productora_email))
    .replace(/\{\{colaboradora_email\}\}/g, s(d.colaboradora_email));
}

interface UserIdentity {
  name: string;
  email: string;
}

export default function ContractDraftView() {
  const { token } = useParams<{ token: string }>();
  const {
    draft, comments, loading,
    addComment, addSelectionComment,
    resolveComment, proposeChange, approveChange, rejectChange,
  } = usePublicDraft(token);
  const { user } = useAuth();

  const [pendingSelection, setPendingSelection] = useState<TextSelection | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityName, setIdentityName] = useState('');
  const [identityEmail, setIdentityEmail] = useState('');

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = localStorage.getItem('draft_sidebar_width');
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) ? Math.min(720, Math.max(280, parsed)) : 360;
  });
  const isResizingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('draft_sidebar_width', String(sidebarWidth));
  }, [sidebarWidth]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.min(720, Math.max(280, newWidth)));
    };
    const onUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const toggleWideSidebar = () => {
    setSidebarWidth(prev => (prev < 480 ? 640 : 360));
  };

  // Load identity from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('contract_user_identity');
    if (stored) {
      try { setUserIdentity(JSON.parse(stored)); } catch {}
    } else {
      setShowIdentityModal(true);
    }
  }, []);

  // Participants tracking
  const { participants, trackParticipant, touchParticipant } = useDraftParticipants(draft?.id, token);

  const handleIdentitySubmit = async () => {
    if (!identityName.trim() || !identityEmail.trim()) return;
    const identity = { name: identityName.trim(), email: identityEmail.trim().toLowerCase() };
    localStorage.setItem('contract_user_identity', JSON.stringify(identity));
    setUserIdentity(identity);
    setShowIdentityModal(false);
    // Track participant immediately
    try { await trackParticipant(identity.name, identity.email, 'viewer'); } catch (e) { console.error(e); }
  };

  // Determine role from email
  const userRole = useMemo<'producer' | 'collaborator' | 'viewer'>(() => {
    if (!userIdentity || !draft) return 'viewer';
    const draftAny = draft as any;
    const email = userIdentity.email;
    console.log('👤 Identity:', userIdentity);
    console.log('📧 Draft producer_email:', draftAny.producer_email);
    console.log('📧 Draft collaborator_email:', draftAny.collaborator_email);
    console.log('📧 form_data productora_email:', draft.form_data?.productora_email);
    console.log('📧 form_data colaboradora_email:', draft.form_data?.colaboradora_email);
    if (draftAny.producer_email && email === draftAny.producer_email.toLowerCase()) { console.log('🎭 Role: producer'); return 'producer'; }
    if (draftAny.collaborator_email && email === draftAny.collaborator_email.toLowerCase()) { console.log('🎭 Role: collaborator'); return 'collaborator'; }
    const fd = draft.form_data || {};
    if (fd.productora_email && email === fd.productora_email.toLowerCase()) { console.log('🎭 Role (fallback): producer'); return 'producer'; }
    if (fd.colaboradora_email && email === fd.colaboradora_email.toLowerCase()) { console.log('🎭 Role (fallback): collaborator'); return 'collaborator'; }
    console.log('🎭 Role: viewer (no match)');
    return 'viewer';
  }, [userIdentity, draft]);

  // Re-track participant once role is known (to enrich role) + heartbeat
  useEffect(() => {
    if (!userIdentity || !draft) return;
    trackParticipant(userIdentity.name, userIdentity.email, userRole).catch(console.error);
  }, [userIdentity, draft, userRole, trackParticipant]);

  // Heartbeat every 5 min while page is open
  useEffect(() => {
    if (!userIdentity) return;
    const id = setInterval(() => { touchParticipant(userIdentity.email); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [userIdentity, touchParticipant]);

  const isOwner = !!(user && draft && draft.created_by === user.id);

  const hasPendingNegotiations = comments.some(c =>
    c.comment_status === 'open' || c.comment_status === 'proposing_change' || c.comment_status === 'pending_approval'
  );

  const handleTextSelected = useCallback((selection: TextSelection) => {
    setPendingSelection(selection);
    setShowSidebar(true);
  }, []);

  const handleScrollToClause = useCallback((clauseNumber: string) => {
    const el = contractRef.current?.querySelector(`[data-clause="${clauseNumber}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-amber-100');
      setTimeout(() => el.classList.remove('bg-amber-100'), 2000);
    }
  }, []);

  const scrollToComment = useCallback((commentId: string) => {
    setShowSidebar(true);
    setActiveCommentId(commentId);
    setTimeout(() => {
      document.getElementById(`comment-${commentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setActiveCommentId(null), 3000);
    }, 100);
  }, []);

  const scrollToHighlight = useCallback((commentId: string) => {
    const el = contractRef.current?.querySelector<HTMLElement>(`[data-comment-id="${commentId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const original = el.style.boxShadow;
      el.style.boxShadow = '0 0 0 3px hsl(38 92% 50%), 0 0 0 6px hsl(38 92% 50% / 0.3)';
      setTimeout(() => { el.style.boxShadow = original; }, 2200);
      return;
    }
    // Fallback: scroll to clause
    const comment = comments.find(c => c.id === commentId);
    if (comment?.clause_number) {
      handleScrollToClause(comment.clause_number);
    }
  }, [comments, handleScrollToClause]);


  const handleMarkReady = async () => {
    if (!draft) return;
    if (hasPendingNegotiations) {
      toast.error('Resuelve todos los comentarios pendientes antes de marcar como listo.');
      return;
    }
    const { error } = await supabase
      .from('contract_drafts')
      .update({ status: 'listo_para_firma' })
      .eq('id', draft.id);
    if (error) toast.error('Error al actualizar estado');
    else toast.success('Marcado como listo para firma');
  };

  // Get comments with selection for highlighting (active = not resolved).
  // Also passes proposed_change + approval flags so the document can render proposals inline.
  const selectionComments = useMemo(() => {
    const active = comments
      .filter(c => c.selected_text && !c.resolved && c.comment_status !== 'resolved')
      .map(c => ({
        id: c.id,
        selected_text: c.selected_text,
        proposed_change: (c as any).proposed_change || null,
        approved_by_producer: !!(c as any).approved_by_producer,
        approved_by_collaborator: !!(c as any).approved_by_collaborator,
        is_approved: c.comment_status === 'approved' || (!!(c as any).approved_by_producer && !!(c as any).approved_by_collaborator),
      }));
    if (pendingSelection?.selectedText) {
      active.push({
        id: '__pending__',
        selected_text: pendingSelection.selectedText,
        proposed_change: null,
        approved_by_producer: false,
        approved_by_collaborator: false,
        is_approved: false,
      });
    }
    return active;
  }, [comments, pendingSelection]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando documento...</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Documento no encontrado</h1>
          <p className="text-muted-foreground text-sm">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    );
  }

  const formData = draft.form_data || {};
  const isIPLicense = draft.draft_type === 'ip_license';

  return (
    <div className="min-h-screen bg-muted/40 flex">
      {/* Main content */}
      <div className="flex-1 py-8 px-4 md:px-8 overflow-y-auto">
        {/* Status header */}
        <div className="max-w-[794px] mx-auto mb-6 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <DraftStatusBanner status={draft.status} />
            <Badge variant="outline" className="text-xs">
              {isIPLicense ? 'Licencia de Propiedad Intelectual' : 'Contrato de Booking'}
            </Badge>
            {/* Mobile sidebar toggle */}
            <Button variant="outline" size="sm" className="lg:hidden ml-auto" onClick={() => setShowSidebar(!showSidebar)}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Comentarios ({comments.filter(c => !c.parent_comment_id).length})
            </Button>
          </div>
          <h1 className="text-2xl font-bold">{draft.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Última actualización: {formatTimeAgo(draft.updated_at)}</span>
          </div>

          {/* Negotiation banner */}
          <NegotiationBanner comments={comments} status={draft.status} />

          {draft.status === 'listo_para_firma' && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-700 text-sm">✓ Acuerdo alcanzado - Listo para firmar</p>
                <p className="text-xs text-green-600/80">Este documento ya no se modificará. Se convertirá en PDF para su firma.</p>
              </div>
            </div>
          )}

          {isOwner && (draft.status === 'borrador' || draft.status === 'en_negociacion') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkReady}
              disabled={hasPendingNegotiations}
              title={hasPendingNegotiations ? 'Resuelve los comentarios pendientes primero' : ''}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marcar como listo para firma
            </Button>
          )}
        </div>

        {/* Document – A4-like page with text selection */}
        <TextSelectionHandler
          onTextSelected={handleTextSelected}
          enabled={draft.status === 'borrador' || draft.status === 'en_negociacion'}
        >
          <div
            ref={contractRef}
            className="max-w-[794px] mx-auto bg-white shadow-lg border rounded"
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              fontSize: '11pt',
              lineHeight: 1.7,
              color: '#1a1a1a',
              padding: '60px 80px',
              textAlign: 'justify',
            }}
          >
            {isIPLicense
              ? renderIPLicenseContent(
                  formData,
                  draft.clauses_data,
                  selectionComments,
                  scrollToComment,
                  ((draft as any).recording_type as IPLicenseRecordingType) || 'single',
                  ((draft as any).language as IPLicenseLanguage) || 'es',
                )
              : renderBookingContent(formData, draft.clauses_data)}
          </div>
        </TextSelectionHandler>
      </div>

      {/* Comments sidebar with resize handle */}
      <div
        className={`${showSidebar ? 'block' : 'hidden'} lg:block border-l bg-muted/30 sticky top-0 h-screen overflow-hidden flex-shrink-0 relative`}
        style={{ width: typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : sidebarWidth }}
      >
        {/* Resize handle (desktop only) */}
        <div
          onMouseDown={startResize}
          className="hidden lg:block absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 z-20 group"
          title="Arrastra para redimensionar"
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-12 rounded-r bg-border group-hover:bg-primary transition-colors" />
        </div>

        {/* Quick expand/collapse */}
        <button
          onClick={toggleWideSidebar}
          className="hidden lg:flex absolute left-2 top-2 z-20 h-6 w-6 items-center justify-center rounded bg-background border hover:bg-muted text-muted-foreground hover:text-foreground"
          title={sidebarWidth < 480 ? 'Ampliar panel' : 'Reducir panel'}
        >
          {sidebarWidth < 480 ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
        </button>

        <div className="flex flex-col h-full pl-1.5">
          <DraftParticipantsList participants={participants} />
          <div className="flex-1 overflow-hidden">
            <DraftCommentsSidebar
              comments={comments}
              onAddComment={addComment}
              onAddSelectionComment={addSelectionComment}
              onResolve={resolveComment}
              onProposeChange={proposeChange}
              onApproveChange={approveChange}
              onRejectChange={rejectChange}
              isOwner={isOwner}
              userRole={userRole}
              defaultAuthorName={userIdentity?.name || (isOwner ? 'Equipo' : '')}
              pendingSelection={pendingSelection}
              onClearSelection={() => setPendingSelection(null)}
              onScrollToClause={handleScrollToClause}
              onScrollToHighlight={scrollToHighlight}
              activeCommentId={activeCommentId}
              sidebarWidth={sidebarWidth}
            />
          </div>
        </div>
      </div>

      {/* Identity modal – pure HTML/CSS to avoid auth redirect */}
      {showIdentityModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Identifícate para participar</h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Para poder comentar y aprobar cambios en este contrato, necesitamos saber quién eres.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Tu nombre</label>
                <input
                  value={identityName}
                  onChange={e => setIdentityName(e.target.value)}
                  placeholder="Ej: Leyre Estruch"
                  autoFocus
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleIdentitySubmit(); }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Tu email</label>
                <input
                  type="email"
                  value={identityEmail}
                  onChange={e => setIdentityEmail(e.target.value)}
                  placeholder="tu@email.com"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleIdentitySubmit(); }}
                />
              </div>
              <button
                onClick={handleIdentitySubmit}
                disabled={!identityName.trim() || !identityEmail.trim()}
                style={{
                  width: '100%', padding: '10px', backgroundColor: (!identityName.trim() || !identityEmail.trim()) ? '#9ca3af' : '#2563eb',
                  color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '4px',
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared style objects ────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = {
  textAlign: 'center', fontWeight: 'bold', fontSize: '12pt',
  textTransform: 'uppercase', marginTop: '32px', marginBottom: '16px', letterSpacing: '0.5px',
};

const clauseTitle: React.CSSProperties = {
  fontWeight: 'bold', fontSize: '11pt', marginTop: '28px', marginBottom: '12px',
};

const paragraph: React.CSSProperties = {
  marginBottom: '12px', textAlign: 'justify', textIndent: '24px',
};

const subItem: React.CSSProperties = {
  marginLeft: '40px', marginBottom: '4px',
};

const romanItem: React.CSSProperties = {
  marginBottom: '12px', textAlign: 'justify', paddingLeft: '32px', textIndent: '-32px',
};

// Type for highlight comments (with optional proposal data)
type HLComment = {
  id: string;
  selected_text: string | null;
  proposed_change?: string | null;
  is_approved?: boolean;
  approved_by_producer?: boolean;
  approved_by_collaborator?: boolean;
};

// Renders the visual span for a matched text fragment.
// - Plain comment (no proposal): yellow highlight.
// - Proposal pending: original text in red strike-through + proposed text in red underline.
// - Proposal approved by both: proposed text in green (no strike).
function renderHighlightSpan(
  comment: HLComment,
  matchedText: string,
  innerNode: React.ReactNode,
  keyStr: string,
  onCommentClick?: (commentId: string) => void,
): React.ReactNode {
  const cid = comment.id;
  const proposed = comment.proposed_change?.trim();
  const isApproved = !!comment.is_approved;

  if (proposed && isApproved) {
    // Accepted change: show proposed text in green
    return (
      <span
        key={keyStr}
        data-comment-id={cid}
        style={{
          color: '#15803d',
          backgroundColor: '#dcfce7',
          borderBottom: '2px solid #16a34a',
          cursor: 'pointer',
          borderRadius: '2px',
          padding: '0 2px',
          fontWeight: 500,
        }}
        onClick={(e) => { e.stopPropagation(); onCommentClick?.(cid); }}
        title="✅ Cambio aprobado por ambas partes"
      >
        {proposed}
      </span>
    );
  }

  if (proposed) {
    // Pending proposal: strike original, show proposed in red
    return (
      <span
        key={keyStr}
        data-comment-id={cid}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onCommentClick?.(cid); }}
        title="✏️ Propuesta de cambio pendiente — click para ver"
      >
        <span style={{ color: '#dc2626', textDecoration: 'line-through', backgroundColor: '#fee2e2', padding: '0 2px', borderRadius: '2px' }}>
          {innerNode}
        </span>
        <span style={{ color: '#dc2626', textDecoration: 'underline', fontWeight: 500, backgroundColor: '#fee2e2', padding: '0 2px', borderRadius: '2px', marginLeft: 4 }}>
          {proposed}
        </span>
      </span>
    );
  }

  // Plain comment highlight
  return (
    <span
      key={keyStr}
      data-comment-id={cid}
      style={{
        backgroundColor: '#FFF9C4',
        borderBottom: '2px solid #F59E0B',
        cursor: 'pointer',
        borderRadius: '2px',
        padding: '0 1px',
        transition: 'box-shadow 0.3s ease',
      }}
      onClick={(e) => { e.stopPropagation(); onCommentClick?.(cid); }}
      title="💬 Ver comentario"
    >
      {innerNode}
    </span>
  );
}

// Inline helper: returns a ReactNode array with yellow <mark>s wrapping any
// occurrences of comment.selected_text inside `text`.
function highlightText(
  text: string,
  comments?: Array<HLComment>,
  onCommentClick?: (commentId: string) => void,
): React.ReactNode {
  if (!comments || comments.length === 0 || !text) return text;
  const normalize = (str: string) => str.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ');
  let remaining = text;
  const parts: React.ReactNode[] = [];
  let idx = 0;

  // Sort by position in remaining text
  const findPos = (sel: string, hay: string) => {
    const direct = hay.indexOf(sel);
    if (direct !== -1) return direct;
    return normalize(hay).indexOf(normalize(sel));
  };

  // Iterate while we still find a match
  let safety = 0;
  while (safety++ < 50) {
    let nextPos = -1;
    let nextComment: HLComment | null = null;
    for (const c of comments) {
      if (!c.selected_text) continue;
      const p = findPos(c.selected_text, remaining);
      if (p !== -1 && (nextPos === -1 || p < nextPos)) {
        nextPos = p;
        nextComment = c;
      }
    }
    if (nextPos === -1 || !nextComment || !nextComment.selected_text) break;
    if (nextPos > 0) parts.push(<span key={`t-${idx++}`}>{remaining.slice(0, nextPos)}</span>);
    const sel = nextComment.selected_text;
    parts.push(renderHighlightSpan(nextComment, sel, sel, `h-${nextComment.id}-${idx++}`, onCommentClick));
    remaining = remaining.slice(nextPos + sel.length);
  }
  if (remaining) parts.push(<span key={`t-${idx++}`}>{remaining}</span>);
  return parts;
}

// Renders "<strong>label</strong> value" with yellow highlights applied to the
// FULL combined string so selections crossing the label/value boundary still match.
// We split the rendered output: characters within the bold-label range stay bold,
// but the highlight <mark> can wrap any substring (label-only, value-only, or crossing).
function LabeledHighlight({ label, value, comments, onCommentClick }: {
  label: string;
  value: string;
  comments?: Array<{ selected_text: string | null; id: string }>;
  onCommentClick?: (commentId: string) => void;
}) {
  const combined = `${label}${value}`;
  const labelLen = label.length;

  if (!comments || comments.length === 0) {
    return <><strong>{label}</strong>{value}</>;
  }

  const normalize = (str: string) => str.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ');
  // Find all highlight ranges in combined
  type Range = { start: number; end: number; id: string };
  const ranges: Range[] = [];
  for (const c of comments) {
    if (!c.selected_text) continue;
    let pos = combined.indexOf(c.selected_text);
    let selLen = c.selected_text.length;
    if (pos === -1) {
      const nCombined = normalize(combined);
      const nSel = normalize(c.selected_text);
      pos = nCombined.indexOf(nSel);
      selLen = nSel.length;
    }
    if (pos !== -1) ranges.push({ start: pos, end: pos + selLen, id: c.id });
  }
  ranges.sort((a, b) => a.start - b.start);

  // Build segments: each segment has text + isBold + optional highlightId
  const out: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  const pushSegment = (from: number, to: number, highlightId?: string) => {
    if (from >= to) return;
    // Split into bold/non-bold sub-segments at labelLen
    const subs: { text: string; bold: boolean }[] = [];
    if (to <= labelLen) {
      subs.push({ text: combined.slice(from, to), bold: true });
    } else if (from >= labelLen) {
      subs.push({ text: combined.slice(from, to), bold: false });
    } else {
      subs.push({ text: combined.slice(from, labelLen), bold: true });
      subs.push({ text: combined.slice(labelLen, to), bold: false });
    }
    const inner = subs.map((s, i) => s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>);
    if (highlightId) {
      out.push(
        <span
          key={`h-${key++}`}
          data-comment-id={highlightId}
          style={{ backgroundColor: '#FFF9C4', borderBottom: '2px solid #F59E0B', cursor: 'pointer', borderRadius: '2px', padding: '0 1px', transition: 'box-shadow 0.3s ease' }}
          onClick={(e) => { e.stopPropagation(); onCommentClick?.(highlightId); }}
          title="💬 Ver comentario"
        >
          {inner}
        </span>
      );
    } else {
      out.push(<span key={`p-${key++}`}>{inner}</span>);
    }
  };

  for (const r of ranges) {
    if (r.start > cursor) pushSegment(cursor, r.start);
    pushSegment(Math.max(r.start, cursor), r.end, r.id);
    cursor = Math.max(cursor, r.end);
  }
  if (cursor < combined.length) pushSegment(cursor, combined.length);

  return <>{out}</>;
}

// Helper to render a highlighted clause paragraph with inline yellow highlights
function ClauseParagraph({ clauseKey, text, style, comments, onCommentClick }: {
  clauseKey: string; text: string; style?: React.CSSProperties;
  comments?: Array<{ selected_text: string | null; id: string }>;
  onCommentClick?: (commentId: string) => void;
}) {
  const normalize = (str: string) => str.trim().replace(/\s+/g, ' ').replace(/\u00A0/g, ' ');
  const normalizedText = normalize(text);
  
  console.log(`🎯 ClauseParagraph [${clauseKey}] - ${comments?.length || 0} comments passed`);
  
  const relevantComments = comments?.filter(c => {
    if (!c.selected_text) return false;
    const normalizedSelected = normalize(c.selected_text);
    const found = normalizedText.includes(normalizedSelected);
    console.log('🔍 Buscando:', normalizedSelected.substring(0, 50));
    console.log('   En:', normalizedText.substring(0, 50));
    console.log('   Resultado:', found ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    return found;
  }) || [];

  if (relevantComments.length === 0) {
    return (
      <p data-clause={clauseKey} style={{ ...paragraph, ...style, transition: 'background 0.3s' }}>
        {text}
      </p>
    );
  }

  // Build highlighted segments
  const renderHighlightedText = () => {
    let remaining = text;
    const parts: React.ReactNode[] = [];
    let idx = 0;

    // Sort comments by position in text (earliest first)
    const sorted = [...relevantComments].sort((a, b) => {
      const posA = normalize(remaining).indexOf(normalize(a.selected_text!));
      const posB = normalize(remaining).indexOf(normalize(b.selected_text!));
      return posA - posB;
    });

    for (const comment of sorted) {
      const selectedText = comment.selected_text!;
      // Use normalized matching but find position in actual remaining text
      const normalizedRemaining = normalize(remaining);
      const normalizedSel = normalize(selectedText);
      const normPos = normalizedRemaining.indexOf(normalizedSel);
      if (normPos === -1) continue;
      // Find actual position by counting chars
      let actualPos = 0;
      let normCount = 0;
      const trimmedRemaining = remaining.trimStart();
      const leadingSpaces = remaining.length - trimmedRemaining.length;
      // Simple approach: find the selected_text directly first, fallback to normalized
      let pos = remaining.indexOf(selectedText);
      if (pos === -1) {
        // Try to find with collapsed whitespace
        pos = normPos; // approximate
      }
      if (pos === -1) continue;

      // Text before the highlight
      if (pos > 0) {
        parts.push(<span key={`t-${idx++}`}>{remaining.slice(0, pos)}</span>);
      }

      // Highlighted text
      parts.push(
        <span
          key={`h-${comment.id}`}
          data-comment-id={comment.id}
          style={{
            backgroundColor: '#FFF9C4',
            borderBottom: '2px solid #F59E0B',
            cursor: 'pointer',
            borderRadius: '2px',
            padding: '0 1px',
            transition: 'box-shadow 0.3s ease',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onCommentClick?.(comment.id);
          }}
          title="💬 Ver comentario"
        >
          {selectedText}
        </span>
      );

      remaining = remaining.slice(pos + selectedText.length);
    }

    // Remaining text
    if (remaining) {
      parts.push(<span key={`t-${idx++}`}>{remaining}</span>);
    }

    return parts;
  };

  return (
    <p data-clause={clauseKey} style={{ ...paragraph, ...style, transition: 'background 0.3s' }}>
      {renderHighlightedText()}
    </p>
  );
}

// ── IP License ──────────────────────────────────────────────────────────
function renderIPLicenseContent(
  formData: any,
  clausesData: any,
  selectionComments: Array<{ selected_text: string | null; id: string }>,
  onCommentClick?: (commentId: string) => void,
  recordingType: IPLicenseRecordingType = 'single',
  language: IPLicenseLanguage = 'es',
) {
  const d = formData;
  const L = getPDFLabels(language);
  const defaults = getDefaultIPClauses(language, recordingType) as unknown as Record<string, string>;
  const rawClauses = { ...defaults, ...(clausesData || {}) };
  const c: Record<string, string> = {};
  for (const k of Object.keys(rawClauses)) {
    c[k] = resolveClause(rawClauses[k], d, language);
  }

  const isFullAlbum = recordingType === 'fullAlbum';
  const isAlbumish = recordingType === 'album' || isFullAlbum;
  const isEN = language === 'en';

  // Header date
  const dateLine = isEN
    ? `In Barcelona, on ${s(d.fecha_dia)} of ${s(d.fecha_mes)} ${s(d.fecha_anio)}`
    : `En Barcelona, a ${s(d.fecha_dia)} de ${s(d.fecha_mes)} de ${s(d.fecha_anio)}`;

  const ambasFinal = isEN
    ? 'The Parties mutually acknowledge each other\u2019s legal capacity to contract and bind themselves and, to this effect,'
    : 'Las Partes se reconocen recíprocamente la capacidad legal necesaria para contratar y obligarse y, a tal efecto,';

  // Recitals
  const recitalI = isAlbumish
    ? L.manifiestoIAlbum(s(isFullAlbum ? d.album_titulo : d.grabacion_titulo), s(d.productora_nombre_artistico))
    : L.manifiestoI(s(d.grabacion_titulo), s(d.productora_nombre_artistico));
  const recitalII = isFullAlbum
    ? L.manifiestoIIFullAlbum
    : isAlbumish ? L.manifiestoIIAlbum : L.manifiestoII;
  const recitalIII = L.manifiestoIII(s(d.colaboradora_nombre_artistico));
  const recitalIV = isFullAlbum ? L.manifiestoIVFullAlbum : L.manifiestoIV;

  const fechasFijacionFullAlbum = isEN
    ? `from ${s(d.album_fecha_fijacion_desde)} to ${s(d.album_fecha_fijacion_hasta)}`
    : `desde ${s(d.album_fecha_fijacion_desde)} hasta ${s(d.album_fecha_fijacion_hasta)}`;
  const annexRefLabel = isEN ? 'According to attached Annex I' : 'Según Anexo I adjunto';

  return (
    <>
      <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '32px' }}>
        {L.title}
      </h2>

      <p style={{ textAlign: 'left', marginBottom: '28px' }}>{dateLine}</p>

      <p style={sectionTitle}>{L.reunidos}</p>

      <p data-clause="reunidos" style={paragraph}>
        <strong>{L.deUnaParte}</strong>
        {highlightText(
          L.parteIntervencionProductora(s(d.productora_nombre), s(d.productora_doc_tipo), s(d.productora_dni), s(d.productora_domicilio)),
          selectionComments, onCommentClick,
        )}
      </p>

      <p data-clause="reunidos" style={paragraph}>
        <strong>{L.deOtraParte}</strong>
        {highlightText(
          L.parteIntervencionColaboradora(s(d.colaboradora_nombre), s(d.colaboradora_doc_tipo), s(d.colaboradora_dni), s(d.colaboradora_domicilio)),
          selectionComments, onCommentClick,
        )}
      </p>

      <p data-clause="reunidos" style={{ ...paragraph, textIndent: '24px' }}>{highlightText(L.ambasPartes, selectionComments, onCommentClick)}</p>
      <p data-clause="reunidos" style={{ ...paragraph, textIndent: '24px' }}>{highlightText(ambasFinal, selectionComments, onCommentClick)}</p>

      <p style={sectionTitle}>{L.manifiestan}</p>

      <p data-clause="manifiestan-I" style={romanItem}><strong>I) </strong>{highlightText(recitalI, selectionComments, onCommentClick)}</p>
      <p data-clause="manifiestan-II" style={romanItem}><strong>II) </strong>{highlightText(recitalII, selectionComments, onCommentClick)}</p>
      <p data-clause="manifiestan-III" style={romanItem}><strong>III) </strong>{highlightText(recitalIII, selectionComments, onCommentClick)}</p>
      <p data-clause="manifiestan-IV" style={romanItem}><strong>IV) </strong>{highlightText(recitalIV, selectionComments, onCommentClick)}</p>

      <p data-clause="manifiestan" style={{ ...paragraph, textIndent: '24px' }}>{highlightText(L.paraAcordar, selectionComments, onCommentClick)}</p>

      <p style={sectionTitle}>{L.clausulas}</p>

      <p style={clauseTitle}>1. {L.clauseTitles.objeto}</p>
      <ClauseParagraph clauseKey="1.1" text={c.objeto_1_1} comments={selectionComments} onCommentClick={onCommentClick} />

      <div style={{ marginLeft: '40px', marginBottom: '16px' }} data-clause="1.1">
        {isFullAlbum ? (
          <>
            <p style={subItem}><strong>a. </strong><LabeledHighlight label={`${L.subItemsObjetoFullAlbum.a} `} value={s(d.album_titulo)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>b. </strong><LabeledHighlight label={`${L.subItemsObjetoFullAlbum.b} `} value={s(d.album_num_grabaciones || (Array.isArray(d.album_tracks) && d.album_tracks.length ? String(d.album_tracks.length) : ''))} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>c. </strong><LabeledHighlight label={`${L.subItemsObjetoFullAlbum.c} `} value={s(d.grabacion_calidad)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>d. </strong><LabeledHighlight label={`${L.subItemsObjetoFullAlbum.d} `} value={s(d.grabacion_caracter)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>e. </strong><LabeledHighlight label={`${L.subItemsObjetoFullAlbum.e} `} value={s(d.album_videoclips_si_no)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>f. </strong><LabeledHighlight label={`${L.subItemsObjetoFullAlbum.f} `} value={fechasFijacionFullAlbum} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>g. </strong><LabeledHighlight label={`${L.subItemsObjetoFullAlbum.g} `} value={annexRefLabel} comments={selectionComments} onCommentClick={onCommentClick} /></p>
          </>
        ) : (
          <>
            <p style={subItem}><strong>a. </strong><LabeledHighlight label={`${L.subItemsObjeto.a} `} value={s(d.grabacion_titulo)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>b. </strong><LabeledHighlight label={`${L.subItemsObjeto.b} `} value={s(d.grabacion_calidad)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>c. </strong><LabeledHighlight label={`${L.subItemsObjeto.c} `} value={s(d.grabacion_duracion)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>d. </strong><LabeledHighlight label={`${L.subItemsObjeto.d} `} value={s(d.grabacion_videoclip)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>e. </strong><LabeledHighlight label={`${L.subItemsObjeto.e} `} value={s(d.grabacion_fecha_fijacion)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
            <p style={subItem}><strong>f. </strong><LabeledHighlight label={`${L.subItemsObjeto.f} `} value={s(d.grabacion_caracter)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
          </>
        )}
      </div>

      <ClauseParagraph clauseKey="1.2" text={c.objeto_1_2} comments={selectionComments} onCommentClick={onCommentClick} />

      <p style={clauseTitle}>2. {L.clauseTitles.alcance}</p>
      <ClauseParagraph clauseKey="2.1" text={c.alcance_2_1} comments={selectionComments} onCommentClick={onCommentClick} />

      <div style={{ marginLeft: '48px', marginBottom: '16px' }} data-clause="2.1">
        <p style={{ marginBottom: '4px' }}><LabeledHighlight label={`${L.alcanceLetters.a} `} value={L.alcancePeriod} comments={selectionComments} onCommentClick={onCommentClick} /></p>
        <p style={{ marginBottom: '4px' }}><LabeledHighlight label={`${L.alcanceLetters.b} `} value={L.alcanceTerritory} comments={selectionComments} onCommentClick={onCommentClick} /></p>
        <p style={{ marginBottom: '4px' }}><LabeledHighlight label={`${L.alcanceLetters.c} `} value={L.alcanceMeans} comments={selectionComments} onCommentClick={onCommentClick} /></p>
      </div>

      <ClauseParagraph clauseKey="2.2" text={c.alcance_2_2} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="2.3" text={c.alcance_2_3} comments={selectionComments} onCommentClick={onCommentClick} />

      <div style={{ marginLeft: '40px', marginBottom: '16px' }} data-clause="2.3">
        <p style={subItem}><strong>a. </strong><LabeledHighlight label={`${L.acreditacion.a} `} value={s(d.acreditacion_nombre)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
        <p style={subItem}><strong>b. </strong><LabeledHighlight label={`${L.acreditacion.b} `} value={s(d.acreditacion_caracter)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
      </div>

      <ClauseParagraph clauseKey="2.4" text={c.alcance_2_4} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="2.5" text={c.alcance_2_5} comments={selectionComments} onCommentClick={onCommentClick} />

      <p style={clauseTitle}>3. {L.clauseTitles.contraprestacion}</p>
      <ClauseParagraph clauseKey="3.1" text={c.contraprestacion_3_1} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="3.2" text={c.contraprestacion_3_2} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="3.3" text={c.contraprestacion_3_3} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="3.4" text={c.contraprestacion_3_4} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="3.5" text={c.contraprestacion_3_5} comments={selectionComments} onCommentClick={onCommentClick} />

      <p style={clauseTitle}>4. {L.clauseTitles.notificaciones}</p>
      <ClauseParagraph clauseKey="4.1" text={c.notificaciones_4_1} comments={selectionComments} onCommentClick={onCommentClick} />

      <div style={{ marginLeft: '40px', marginBottom: '16px' }} data-clause="4.1">
        <p style={subItem}><strong>a. </strong><LabeledHighlight label={`${L.notificacionesParts.a} `} value={s(d.productora_email)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
        <p style={subItem}><strong>b. </strong><LabeledHighlight label={`${L.notificacionesParts.b} `} value={s(d.colaboradora_email)} comments={selectionComments} onCommentClick={onCommentClick} /></p>
      </div>

      <p style={clauseTitle}>5. {L.clauseTitles.confidencialidad}</p>
      <ClauseParagraph clauseKey="5.1" text={c.confidencialidad_5_1} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="5.2" text={c.confidencialidad_5_2} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="5.2b" text={c.confidencialidad_5_2b} comments={selectionComments} onCommentClick={onCommentClick} />

      <p style={clauseTitle}>6. {L.clauseTitles.ley}</p>
      <ClauseParagraph clauseKey="6.1" text={c.ley_6_1} comments={selectionComments} onCommentClick={onCommentClick} />
      <ClauseParagraph clauseKey="6.2" text={c.ley_6_2} comments={selectionComments} onCommentClick={onCommentClick} />

      <p data-clause="cierre" style={{ ...paragraph, marginTop: '28px' }}>{L.signOff}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', textAlign: 'center', marginTop: '60px' }}>
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>{L.signProducer}</p>
          <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
          <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(d.firma_productora || d.productora_nombre)}</p>
        </div>
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>{L.signCollaborator}</p>
          <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
          <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(d.firma_colaboradora || d.colaboradora_nombre)}</p>
        </div>
      </div>

      {isFullAlbum && (
        <div style={{ marginTop: '60px', borderTop: '2px solid #1a1a1a', paddingTop: '40px' }} data-clause="anexo-I">
          <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            {L.annexTitle}
          </h2>
          <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', marginBottom: '20px' }}>
            {L.annexSubtitle}
          </p>
          <p style={{ marginBottom: '14px' }}>{L.annexIntro}</p>
          <ol style={{ paddingLeft: '24px', marginBottom: '20px' }}>
            {(Array.isArray(d.album_tracks) && d.album_tracks.length > 0
              ? d.album_tracks
              : [{ titulo: '', duracion: '' }]
            ).map((t: { titulo: string; duracion: string }, i: number) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                <strong>{isEN ? 'Title' : 'Título'}: </strong>{s(t.titulo)}
                {' | '}
                <strong>{isEN ? 'Duration' : 'Duración'}: </strong>{s(t.duracion)}
              </li>
            ))}
          </ol>
          <p style={{ marginTop: '14px', textAlign: 'justify' }}>{L.annexClosing}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', textAlign: 'center', marginTop: '40px' }}>
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>{L.signProducer}</p>
              <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
              <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(d.firma_productora || d.productora_nombre)}</p>
            </div>
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>{L.signCollaborator}</p>
              <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
              <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(d.firma_colaboradora || d.colaboradora_nombre)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Booking Contract ────────────────────────────────────────────────────
function renderBookingContent(formData: any, clauses: any) {
  const agent = formData.agentData || formData;
  const promoter = formData.promoterData || {};
  const conditions = formData.conditions || {};
  const legal = clauses || formData.legalClauses || {};

  return (
    <>
      <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '32px' }}>
        Contrato de Representación Artística
      </h2>

      <p style={sectionTitle}>EL AGENTE</p>
      <p style={paragraph}>{s(agent.nombre)} — CIF: {s(agent.cif)}</p>
      <p style={paragraph}>Dirección: {s(agent.direccion)}</p>
      <p style={paragraph}>Representado por: {s(agent.representante)}</p>

      <p style={sectionTitle}>EL PROMOTOR</p>
      <p style={paragraph}>{s(promoter.nombre)} — CIF: {s(promoter.cif)}</p>
      <p style={paragraph}>Dirección: {s(promoter.direccion)}</p>
      <p style={paragraph}>Email: {s(promoter.email)}</p>

      <p style={clauseTitle}>CONDICIONES PARTICULARES</p>
      <div style={{ marginLeft: '24px', marginBottom: '16px' }}>
        <p style={subItem}><strong>Artista:</strong> {s(conditions.artista)}</p>
        <p style={subItem}><strong>Fecha:</strong> {s(conditions.fecha)}</p>
        <p style={subItem}><strong>Ciudad:</strong> {s(conditions.ciudad)}</p>
        <p style={subItem}><strong>Venue:</strong> {s(conditions.venue)}</p>
        <p style={subItem}><strong>Hora:</strong> {s(conditions.hora)}</p>
        <p style={subItem}><strong>Duración:</strong> {s(conditions.duracion)}</p>
        <p style={subItem}><strong>Fee:</strong> {conditions.fee ? `${conditions.fee}€` : s('')}</p>
        <p style={subItem}><strong>Aforo:</strong> {s(conditions.aforo)}</p>
      </div>

      {legal && Object.keys(legal).length > 0 && (
        <>
          <p style={clauseTitle}>CLÁUSULAS</p>
          {Object.entries(legal).map(([key, value]) => (
            <p key={key} data-clause={key} style={paragraph}>{String(value)}</p>
          ))}
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', textAlign: 'center', marginTop: '60px' }}>
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>EL AGENTE</p>
          <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
          <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(agent.representante)}</p>
        </div>
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>EL PROMOTOR</p>
          <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
          <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(promoter.representante)}</p>
        </div>
      </div>
    </>
  );
}
