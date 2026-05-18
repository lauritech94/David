import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsibleSelector } from '@/components/releases/ResponsibleSelector';
import {
  StickyNote,
  MessageCircle,
  CheckCircle2,
  Circle,
  CheckCheck,
  Send,
  AtSign,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectSubtask, ProjectCommentMessage } from './ProjectTaskTypes';

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completada', label: 'Completada' },
];

interface ProjectTaskSubtasksProps {
  subtasks: ProjectSubtask[];
  artistId?: string | null;
  onUpdate: (subtaskId: string, updates: Partial<ProjectSubtask>) => void;
  onDelete: (subtaskId: string) => void;
}

export function ProjectTaskSubtasks({ subtasks, artistId, onUpdate, onDelete }: ProjectTaskSubtasksProps) {
  return (
    <div className="pl-10 pr-3 pb-2 space-y-1">
      {subtasks.map(subtask => {
        if (subtask.type === 'note') {
          return (
            <div key={subtask.id} className="rounded-md bg-amber-50/50 dark:bg-amber-950/20 p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs text-muted-foreground">Nota para:</span>
                <ResponsibleSelector
                  artistId={artistId || null}
                  value={subtask.directedTo || null}
                  onChange={(ref) => onUpdate(subtask.id, { directedTo: ref })}
                  placeholder="Destinatario"
                  compact
                />
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto text-muted-foreground hover:text-destructive" onClick={() => onDelete(subtask.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <Textarea
                value={subtask.content || ''}
                onChange={e => onUpdate(subtask.id, { content: e.target.value })}
                placeholder="Escribe una nota..."
                className="min-h-[40px] border-0 bg-transparent hover:bg-muted/50 focus:bg-muted text-sm resize-none ml-5"
              />
            </div>
          );
        }

        if (subtask.type === 'comment') {
          return (
            <div key={subtask.id} className={cn(
              "rounded-md border-l-2 p-2 space-y-1.5",
              subtask.resolved
                ? "bg-green-50/50 dark:bg-green-950/20 border-l-green-500"
                : "bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500"
            )}>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-xs font-medium">
                  {subtask.resolved ? 'Hilo resuelto' : 'Hilo de comentarios'}
                </span>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto" onClick={() => onUpdate(subtask.id, { resolved: !subtask.resolved })}>
                  {subtask.resolved ? <><CheckCheck className="w-3 h-3 mr-1 text-green-500" /> Reabrir</> : <><CheckCheck className="w-3 h-3 mr-1" /> Resolver</>}
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => onDelete(subtask.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              {(subtask.thread || []).map((msg, idx) => (
                <div key={msg.id || idx} className="flex items-start gap-2 ml-5">
                  <AtSign className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-xs">{msg.authorName}</span>
                    <p className="text-muted-foreground text-xs">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 ml-5">
                <Input
                  placeholder="Escribe un comentario..."
                  className="h-6 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const newMsg: ProjectCommentMessage = {
                        id: `msg-${Date.now()}`,
                        authorName: 'Yo',
                        content: e.currentTarget.value.trim(),
                        createdAt: new Date(),
                      };
                      onUpdate(subtask.id, { thread: [...(subtask.thread || []), newMsg] });
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Send className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          );
        }

        if (subtask.type === 'checkbox') {
          return (
            <div key={subtask.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/30">
              <button onClick={() => onUpdate(subtask.id, { completed: !subtask.completed })} className="shrink-0">
                {subtask.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
              </button>
              <Input
                value={subtask.name}
                onChange={e => onUpdate(subtask.id, { name: e.target.value })}
                className={cn('h-6 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted text-xs flex-1', subtask.completed && 'line-through text-muted-foreground')}
              />
              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => onDelete(subtask.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        }

        // Full subtask
        return (
          <div key={subtask.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/30">
            <span className="text-muted-foreground text-xs">↳</span>
            <Input
              value={subtask.name}
              onChange={e => onUpdate(subtask.id, { name: e.target.value })}
              className="h-6 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted text-xs flex-1"
            />
            <ResponsibleSelector
              value={subtask.responsible_ref ?? null}
              onChange={(ref) => onUpdate(subtask.id, { responsible_ref: ref })}
              artistId={artistId}
              placeholder="Asignar"
              compact
            />
            <Select value={subtask.status || 'pendiente'} onValueChange={(v) => onUpdate(subtask.id, { status: v })}>
              <SelectTrigger className="h-6 w-auto border-0 bg-transparent text-xs px-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => onDelete(subtask.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
