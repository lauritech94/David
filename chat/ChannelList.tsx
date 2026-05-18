import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Hash, Folder, Building2, Globe, Plus, Search, Trash2 } from 'lucide-react';
import { ChatChannel } from '@/hooks/useChatChannels';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ChannelListProps {
  channels: ChatChannel[];
  selectedChannel: ChatChannel | null;
  onSelectChannel: (channel: ChatChannel) => void;
  onCreateChannel: () => void;
  onDeleteChannel: (channelId: string) => void;
  loading: boolean;
}

export function ChannelList({
  channels,
  selectedChannel,
  onSelectChannel,
  onCreateChannel,
  onDeleteChannel,
  loading
}: ChannelListProps) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.project?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedChannels = {
    project: filteredChannels.filter(ch => ch.channel_type === 'project'),
    department: filteredChannels.filter(ch => ch.channel_type === 'department'),
    general: filteredChannels.filter(ch => ch.channel_type === 'general')
  };

  const typeIcons = {
    project: <Folder className="h-4 w-4" />,
    department: <Building2 className="h-4 w-4" />,
    general: <Globe className="h-4 w-4" />
  };

  const typeLabels = {
    project: 'Proyectos',
    department: 'Departamentos',
    general: 'General'
  };

  const renderChannelGroup = (type: 'project' | 'department' | 'general', channels: ChatChannel[]) => {
    if (channels.length === 0) return null;

    return (
      <div key={type} className="mb-4">
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
          {typeIcons[type]}
          <span>{typeLabels[type]}</span>
        </div>
        <div className="space-y-1">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedChannel?.id === channel.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => onSelectChannel(channel)}
            >
              <Hash className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-sm font-medium">{channel.name}</span>
              {channel.unread_count && channel.unread_count > 0 && (
                <Badge variant="destructive" className="text-xs h-5 px-1.5">
                  {channel.unread_count}
                </Badge>
              )}
              {channel.created_by === profile?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChannel(channel.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Canales
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onCreateChannel}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar canales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-3 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hash className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Sin canales</p>
              <p className="text-xs mt-1">Crea uno para empezar</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onCreateChannel}>
                <Plus className="h-4 w-4 mr-2" />
                Crear canal
              </Button>
            </div>
          ) : (
            <>
              {renderChannelGroup('project', groupedChannels.project)}
              {renderChannelGroup('department', groupedChannels.department)}
              {renderChannelGroup('general', groupedChannels.general)}
            </>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
