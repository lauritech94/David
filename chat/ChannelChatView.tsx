import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, User, Hash, Folder, Paperclip, FileText, Image, X } from 'lucide-react';
import { ChatChannel, ChannelMessage, useChannelMessages } from '@/hooks/useChatChannels';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChannelChatViewProps {
  channel: ChatChannel;
}

interface ProjectFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

export function ChannelChatView({ channel }: ChannelChatViewProps) {
  const { profile } = useAuth();
  const { messages, loading, sendMessage } = useChannelMessages(channel.id);
  const [newMessage, setNewMessage] = useState('');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchProjectFiles = async () => {
      if (channel.project_id) {
        const { data } = await supabase
          .from('project_files')
          .select('id, file_name, file_url, file_type')
          .eq('project_id', channel.project_id)
          .order('created_at', { ascending: false });
        setProjectFiles(data || []);
      }
    };
    fetchProjectFiles();
  }, [channel.project_id]);

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    await sendMessage(
      newMessage.trim() || (selectedFile ? `📎 ${selectedFile.file_name}` : ''),
      selectedFile ? {
        url: selectedFile.file_url,
        name: selectedFile.file_name,
        type: selectedFile.file_type
      } : undefined
    );

    setNewMessage('');
    setSelectedFile(null);
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm', { locale: es });
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "EEEE, d 'de' MMMM", { locale: es });
  };

  const groupMessagesByDate = (msgs: ChannelMessage[]) => {
    const groups: { date: string; messages: ChannelMessage[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.created_at, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b bg-muted/30 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {channel.channel_type === 'project' ? (
              <Folder className="h-5 w-5 text-primary" />
            ) : (
              <Hash className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <CardTitle className="text-lg">#{channel.name}</CardTitle>
            {channel.description && (
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            )}
            {channel.project && (
              <Badge variant="outline" className="mt-1 text-xs">
                <Folder className="h-3 w-3 mr-1" />
                {channel.project.name}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Bienvenido a #{channel.name}</p>
              <p className="text-sm">Sé el primero en enviar un mensaje</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messageGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatDate(group.date)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-3">
                    {group.messages.map((msg) => {
                      const isMine = msg.sender_id === profile?.id;
                      return (
                        <div key={msg.id} className="flex gap-3 group">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={msg.sender?.avatar_url || ''} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className={`font-semibold text-sm ${isMine ? 'text-primary' : 'text-foreground'}`}>
                                {msg.sender?.full_name || 'Usuario'}
                              </span>
                              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground mt-0.5 break-words">
                              {msg.message}
                            </p>
                            {msg.file_url && (
                              <a
                                href={msg.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-2 px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
                              >
                                {msg.file_type?.startsWith('image/') ? (
                                  <Image className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-orange-500" />
                                )}
                                <span className="truncate max-w-[200px]">{msg.file_name}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Selected file preview */}
        {selectedFile && (
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm flex-1 truncate">{selectedFile.file_name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Message input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            {channel.project_id && projectFiles.length > 0 && (
              <Popover open={showFilePicker} onOpenChange={setShowFilePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-0">
                  <div className="p-3 border-b">
                    <p className="font-medium text-sm">Archivos del proyecto</p>
                    <p className="text-xs text-muted-foreground">Selecciona un archivo para adjuntar</p>
                  </div>
                  <ScrollArea className="max-h-48">
                    <div className="p-2 space-y-1">
                      {projectFiles.map((file) => (
                        <button
                          key={file.id}
                          className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left text-sm"
                          onClick={() => {
                            setSelectedFile(file);
                            setShowFilePicker(false);
                          }}
                        >
                          {file.file_type?.startsWith('image/') ? (
                            <Image className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="truncate">{file.file_name}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
            <Input
              placeholder={`Mensaje en #${channel.name}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!newMessage.trim() && !selectedFile}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
