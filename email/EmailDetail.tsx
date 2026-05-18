import { Reply, Forward, Archive, Trash2, Star, Paperclip, Link2, Plus, ExternalLink, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MockEmailMessage } from '@/lib/emailMockData';

interface EmailDetailProps {
  email: MockEmailMessage;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onAddLink: () => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function EmailDetail({ email, onReply, onForward, onArchive, onDelete, onToggleStar, onAddLink }: EmailDetailProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground leading-tight">{email.subject}</h2>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleStar}>
              <Star className={cn('w-4 h-4', email.is_starred ? 'fill-warning text-warning' : 'text-muted-foreground')} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onArchive}>
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
            {email.from_name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{email.from_name}</span>
              <span className="text-xs text-muted-foreground">&lt;{email.from_address}&gt;</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Para: {email.to_addresses.map(t => t.name || t.email).join(', ')}
              {' · '}
              {format(new Date(email.date), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: email.body_html }}
        />

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {email.attachments.length} adjunto{email.attachments.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map(att => (
                <button
                  key={att.id}
                  className="flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-xs font-medium truncate max-w-[180px]">{att.filename}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size_bytes)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="mt-6">
          <Separator className="mb-4" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              Vinculado a
            </p>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onAddLink}>
              <Plus className="w-3 h-3" />
              Vincular
            </Button>
          </div>
          {email.links && email.links.length > 0 ? (
            <div className="space-y-1.5">
              {email.links.map(link => (
                <div key={link.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {link.type}
                  </Badge>
                  <span className="text-sm text-foreground hover:text-primary cursor-pointer flex items-center gap-1">
                    {link.entity_name}
                    <ExternalLink className="w-3 h-3" />
                  </span>
                  {link.auto && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">auto</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin vinculaciones</p>
          )}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="border-t px-6 py-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onReply}>
          <Reply className="w-4 h-4" />
          Responder
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onForward}>
          <Forward className="w-4 h-4" />
          Reenviar
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
