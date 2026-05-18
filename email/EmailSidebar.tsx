import { Inbox, Send, FileEdit, Trash2, Archive, Plus, Mail, PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EmailFolder, folderLabels, MockEmailAccount, MockEmailMessage } from '@/lib/emailMockData';

const folderIcons: Record<EmailFolder, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  trash: Trash2,
  archive: Archive,
};

interface EmailSidebarProps {
  activeFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  accounts: MockEmailAccount[];
  emails: MockEmailMessage[];
  onCompose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeAccountId: string | null;
  onAccountChange: (id: string | null) => void;
}

export default function EmailSidebar({
  activeFolder, onFolderChange, accounts, emails, onCompose,
  collapsed, onToggleCollapse, activeAccountId, onAccountChange,
}: EmailSidebarProps) {
  const folders: EmailFolder[] = ['inbox', 'sent', 'drafts', 'trash', 'archive'];

  const getUnreadCount = (folder: EmailFolder) => {
    return emails.filter(e => e.folder === folder && !e.is_read).length;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        'border-r bg-muted/30 flex flex-col h-full transition-all duration-200 overflow-hidden',
        collapsed ? 'w-12' : 'w-56'
      )}>
        {/* Toggle + Compose */}
        <div className={cn('flex items-center gap-1 p-2', collapsed ? 'flex-col' : 'flex-row')}>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onToggleCollapse}>
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onCompose} size="icon" className="h-8 w-8 bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Redactar</TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={onCompose} className="flex-1 gap-2 h-8 bg-gradient-primary text-primary-foreground text-sm">
              <Plus className="w-4 h-4" />
              <span className="whitespace-nowrap">Redactar</span>
            </Button>
          )}
        </div>

        {/* Folders */}
        <nav className="flex-1 px-1.5 space-y-0.5">
          {folders.map(folder => {
            const Icon = folderIcons[folder];
            const unread = getUnreadCount(folder);
            const isActive = activeFolder === folder;

            const btn = (
              <button
                key={folder}
                onClick={() => onFolderChange(folder)}
                className={cn(
                  'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors relative',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="relative flex-shrink-0">
                  <Icon className="w-4 h-4" />
                  {collapsed && unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left whitespace-nowrap">{folderLabels[folder]}</span>
                    {unread > 0 && (
                      <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">
                        {unread}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            );

            return collapsed ? (
              <Tooltip key={folder}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right">
                  {folderLabels[folder]} {unread > 0 && `(${unread})`}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={folder}>{btn}</div>
            );
          })}
        </nav>

        <Separator />

        {/* Accounts */}
        <div className={cn('p-2 space-y-1', collapsed && 'px-1')}>
          {!collapsed && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">Cuentas</p>
          )}

          {/* All accounts option */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAccountChange(null)}
                  className={cn(
                    'w-full flex items-center justify-center py-1.5 rounded-md transition-colors',
                    activeAccountId === null ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Todas las cuentas</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => onAccountChange(null)}
              className={cn(
                'w-full flex items-center gap-2 px-1 py-1.5 rounded-md text-xs transition-colors',
                activeAccountId === null ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="whitespace-nowrap">Todas las cuentas</span>
            </button>
          )}

          {accounts.map(account => {
            const isActiveAccount = activeAccountId === account.id;
            if (collapsed) {
              return (
                <Tooltip key={account.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onAccountChange(account.id)}
                      className={cn(
                        'w-full flex items-center justify-center py-1.5 rounded-md transition-colors',
                        isActiveAccount ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Mail className={cn('w-3.5 h-3.5', account.provider === 'gmail' ? 'text-destructive' : 'text-accent')} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{account.display_name}</TooltipContent>
                </Tooltip>
              );
            }
            return (
              <button
                key={account.id}
                onClick={() => onAccountChange(account.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-1 py-1.5 rounded-md transition-colors',
                  isActiveAccount ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
              >
                <Mail className={cn(
                  'w-3.5 h-3.5 flex-shrink-0',
                  account.provider === 'gmail' ? 'text-destructive' : 'text-accent'
                )} />
                <div className="min-w-0 text-left">
                  <p className="text-xs font-medium truncate">{account.display_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{account.email_address}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
