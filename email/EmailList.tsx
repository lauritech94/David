import { Star, Paperclip, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { MockEmailMessage } from '@/lib/emailMockData';

interface EmailListProps {
  emails: MockEmailMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
}

function formatEmailDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ayer';
  return format(date, 'd MMM', { locale: es });
}

export default function EmailList({ emails, selectedId, onSelect, onToggleStar }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No hay correos en esta carpeta
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border">
      {emails.map(email => (
        <button
          key={email.id}
          onClick={() => onSelect(email.id)}
          className={cn(
            'w-full text-left px-4 py-3 flex gap-3 transition-colors group',
            selectedId === email.id
              ? 'bg-primary/5 border-l-2 border-primary'
              : 'hover:bg-muted/50 border-l-2 border-transparent',
            !email.is_read && 'bg-accent/5'
          )}
        >
          {/* Star */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStar(email.id); }}
            className="mt-0.5 flex-shrink-0"
          >
            <Star className={cn(
              'w-4 h-4 transition-colors',
              email.is_starred
                ? 'fill-warning text-warning'
                : 'text-muted-foreground/30 hover:text-warning/60'
            )} />
          </button>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn(
                'text-sm truncate',
                !email.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}>
                {email.from_name}
              </span>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                {formatEmailDate(email.date)}
              </span>
            </div>

            <p className={cn(
              'text-sm truncate mt-0.5',
              !email.is_read ? 'font-medium text-foreground' : 'text-foreground/80'
            )}>
              {email.subject}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground truncate flex-1">
                {email.snippet}
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                {email.has_attachments && (
                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                )}
                {email.links && email.links.length > 0 && (
                  <Link2 className="w-3 h-3 text-primary" />
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
