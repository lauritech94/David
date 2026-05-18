import { useState } from 'react';
import { X, Send, Paperclip, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface EmailComposerProps {
  onClose: () => void;
  replyTo?: { to: string; subject: string; body?: string };
  forwardData?: { subject: string; body?: string };
}

export default function EmailComposer({ onClose, replyTo, forwardData }: EmailComposerProps) {
  const [to, setTo] = useState(replyTo?.to || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : forwardData ? `Fwd: ${forwardData.subject}` : ''
  );
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);

  const handleSend = () => {
    if (!to.trim()) {
      toast({ title: 'Error', description: 'Ingresa al menos un destinatario', variant: 'destructive' });
      return;
    }
    toast({ title: 'Correo enviado', description: `Mensaje enviado a ${to}` });
    onClose();
  };

  return (
    <div className="fixed bottom-4 right-4 w-[520px] bg-card border rounded-xl shadow-large z-50 flex flex-col max-h-[70vh] animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-primary rounded-t-xl">
        <span className="text-sm font-medium text-primary-foreground">
          {replyTo ? 'Responder' : forwardData ? 'Reenviar' : 'Nuevo mensaje'}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Fields */}
      <div className="px-4 py-2 space-y-1 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">Para:</span>
          <Input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="destinatario@email.com"
            className="border-0 shadow-none h-8 text-sm px-0 focus-visible:ring-0"
          />
          {!showCc && (
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setShowCc(true)}>
              CC
            </Button>
          )}
        </div>
        {showCc && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">CC:</span>
            <Input
              value={cc}
              onChange={e => setCc(e.target.value)}
              placeholder="cc@email.com"
              className="border-0 shadow-none h-8 text-sm px-0 focus-visible:ring-0"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">Asunto:</span>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Asunto del correo"
            className="border-0 shadow-none h-8 text-sm px-0 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-2 min-h-0">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Escribe tu mensaje..."
          className="border-0 shadow-none resize-none min-h-[200px] text-sm px-0 focus-visible:ring-0"
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex items-center gap-2">
        <Button size="sm" className="gap-1.5 bg-gradient-primary" onClick={handleSend}>
          <Send className="w-3.5 h-3.5" />
          Enviar
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Paperclip className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
