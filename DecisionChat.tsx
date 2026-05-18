import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DecisionMessage {
  id: string;
  solicitud_id: string;
  author_profile_id: string | null;
  author_name?: string | null;
  is_system: boolean;
  message: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export function DecisionChat({ solicitudId }: { solicitudId: string }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<DecisionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const canSend = Boolean(profile) && input.trim().length > 0;

  const formattedDate = (iso: string) => {
    try {
      return format(new Date(iso), "d MMM, HH:mm", { locale: es });
    } catch {
      return iso;
    }
  };

  const dayKey = (iso: string) => {
    try { return format(new Date(iso), 'yyyy-MM-dd'); } catch { return iso; }
  };

  const dayLabel = (iso: string) => {
    try { return format(new Date(iso), "EEE, d LLL", { locale: es }); } catch { return iso; }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitud_decision_messages')
        .select(`*, profiles:author_profile_id(full_name)`) // join opcional
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data as any) || []);
    } catch (err) {
      console.error('Error fetching decision messages', err);
    } finally {
      setLoading(false);
      // scroll al final
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel('solicitud-decision-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'solicitud_decision_messages' },
        (payload) => {
          const newRow = payload.new as DecisionMessage;
          if (newRow.solicitud_id === solicitudId) {
            setMessages((prev) => [...prev, newRow]);
            requestAnimationFrame(() => {
              listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [solicitudId]);

  useEffect(() => {
    console.info('[DecisionChat] mounted/updated - solicitudId:', solicitudId);
  }, [solicitudId]);
 
   const sendMessage = async () => {
    if (!canSend) return;
    try {
      const { error } = await supabase.from('solicitud_decision_messages').insert({
        solicitud_id: solicitudId,
        author_profile_id: profile?.id || null,
        message: input.trim(),
        is_system: false,
      });
      if (error) throw error;
      setInput('');
    } catch (err) {
      console.error('Error sending message', err);
      toast({ title: 'Error', description: 'No se pudo enviar el mensaje', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat de decisión</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={listRef} className="max-h-64 overflow-y-auto space-y-2 pr-1 py-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando chat...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin mensajes todavía. Inicia la conversación.</p>
          ) : (
            messages.map((m, idx) => {
              const isMine = !m.is_system && m.author_profile_id && (m.author_profile_id === profile?.id);
              const isSystem = m.is_system;
              const showDay = idx === 0 || dayKey(messages[idx - 1].created_at) !== dayKey(m.created_at);
              return (
                <div key={m.id} className="space-y-1">
                  {showDay && (
                    <div className="flex justify-center my-2">
                      <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                        {dayLabel(m.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isSystem ? 'justify-center' : isMine ? 'justify-end' : 'justify-start'}`}>
                    {isSystem ? (
                      <div className="text-xs text-muted-foreground italic">
                        {m.message} · {formattedDate(m.created_at)}
                      </div>
                    ) : (
                      <div className={`${isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} rounded-2xl px-3 py-2 max-w-[80%] shadow-sm`}> 
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <div className="mt-1 text-[10px] opacity-70 text-right">{formattedDate(m.created_at)}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escribe un comentario de decisión..."
            rows={2}
          />
          <Button disabled={!canSend} onClick={sendMessage} className="self-stretch">
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
