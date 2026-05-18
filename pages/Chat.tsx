import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Send, User, Users, Search, Phone, Video, Plus, Mail, MessageSquare, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChatChannels, ChatChannel } from '@/hooks/useChatChannels';
import { ChannelList } from '@/components/chat/ChannelList';
import { ChannelChatView } from '@/components/chat/ChannelChatView';
import { CreateChannelDialog } from '@/components/chat/CreateChannelDialog';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  roles: ('artist' | 'management')[];
  active_role: 'artist' | 'management';
  phone?: string | null;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  profile: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function Chat() {
  usePageTitle('Chat');
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Channels state
  const { channels, loading: channelsLoading, fetchChannels, createChannel, deleteChannel } = useChatChannels();
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  
  // Direct messages state
  const [allContacts, setAllContacts] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'direct'>('channels');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchAllContacts();
      fetchConversations();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchAllContacts = async () => {
    try {
      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;
      
      let filteredContacts = [];
      
      if (profile?.active_role === 'management') {
        filteredContacts = allProfiles?.filter(p => p.roles.includes('artist')) || [];
      } else if (profile?.active_role === 'artist') {
        filteredContacts = allProfiles?.filter(p => p.roles.includes('management')) || [];
      }

      setAllContacts(filteredContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data: messageProfiles } = await supabase
        .from('chat_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${profile?.id},recipient_id.eq.${profile?.id}`);

      const userIds = new Set<string>();
      messageProfiles?.forEach(msg => {
        if (msg.sender_id !== profile?.id) userIds.add(msg.sender_id);
        if (msg.recipient_id !== profile?.id) userIds.add(msg.recipient_id);
      });

      if (userIds.size === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(userIds));

      const conversationsData: Conversation[] = [];

      for (const userProfile of profiles || []) {
        const { data: lastMessageData } = await supabase
          .from('chat_messages')
          .select('*')
          .or(`and(sender_id.eq.${profile?.id},recipient_id.eq.${userProfile.id}),and(sender_id.eq.${userProfile.id},recipient_id.eq.${profile?.id})`)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count: unreadCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', userProfile.id)
          .eq('recipient_id', profile?.id)
          .is('read_at', null);

        conversationsData.push({
          profile: userProfile,
          lastMessage: lastMessageData?.[0] || null,
          unreadCount: unreadCount || 0,
        });
      }

      conversationsData.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${profile?.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${profile?.id})`)
        .order('created_at', { ascending: true });

      setMessages(data || []);

      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', userId)
        .eq('recipient_id', profile?.id)
        .is('read_at', null);

      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !profile) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          message: newMessage.trim(),
          sender_id: profile.id,
          recipient_id: selectedConversation.id,
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    }
  };

  const startWhatsAppChat = (contact: Profile) => {
    const phone = contact.phone?.replace(/[^\d+]/g, '') || '';
    const message = encodeURIComponent(`Hola ${contact.full_name}, te escribo desde la plataforma de gestión artística.`);
    
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Este contacto no tiene número de teléfono configurado",
        variant: "destructive",
      });
    }
  };

  const startEmailChat = (contact: Profile) => {
    const subject = encodeURIComponent('Comunicación desde plataforma de gestión artística');
    const body = encodeURIComponent(`Hola ${contact.full_name},\n\nTe escribo desde nuestra plataforma de gestión artística.\n\nSaludos cordiales.`);
    window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.profile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = allContacts.filter(contact =>
    contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startNewConversation = (contact: Profile) => {
    setSelectedConversation(contact);
    setShowNewChatDialog(false);
    setMessages([]);
    toast({
      title: "Chat iniciado",
      description: `Conversación iniciada con ${contact.full_name}`,
    });
  };

  const handleCreateChannel = async (data: {
    name: string;
    description?: string;
    channel_type: 'project' | 'department' | 'general';
    project_id?: string;
  }) => {
    const newChannel = await createChannel(data);
    if (newChannel) {
      setSelectedChannel(newChannel as ChatChannel);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-xl">
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Chat & Canales</h1>
            <p className="text-muted-foreground">Comunicación contextual por proyecto o directa</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'channels' | 'direct')} className="space-y-4">
          <TabsList>
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Canales
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensajes directos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="space-y-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
              {/* Channel List */}
              <div className="lg:col-span-1">
                <ChannelList
                  channels={channels}
                  selectedChannel={selectedChannel}
                  onSelectChannel={setSelectedChannel}
                  onCreateChannel={() => setShowCreateChannel(true)}
                  onDeleteChannel={deleteChannel}
                  loading={channelsLoading}
                />
              </div>

              {/* Channel Chat */}
              <div className="lg:col-span-2">
                {selectedChannel ? (
                  <ChannelChatView channel={selectedChannel} />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-muted/50 rounded-2xl flex items-center justify-center">
                        <Hash className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Selecciona un canal</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Los canales te permiten organizar conversaciones por proyecto o departamento
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setShowCreateChannel(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Crear canal
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="direct" className="space-y-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
              {/* Conversations List */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-gradient-primary rounded-lg">
                        <Users className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg">Conversaciones</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewChatDialog(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar contactos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {filteredConversations.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground space-y-4">
                        <div className="w-16 h-16 mx-auto bg-muted/50 rounded-2xl flex items-center justify-center">
                          <MessageCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-3">
                          <p className="font-medium">No hay conversaciones activas</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowNewChatDialog(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Iniciar nueva conversación
                          </Button>
                        </div>
                      </div>
                    ) : (
                      filteredConversations.map((conversation) => (
                        <div
                          key={conversation.profile.id}
                          className={`p-4 border-b border-border cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                            selectedConversation?.id === conversation.profile.id ? 'bg-primary/10 border-primary/20' : ''
                          }`}
                          onClick={() => setSelectedConversation(conversation.profile)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={conversation.profile.avatar_url || ''} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">
                                  {conversation.profile.full_name}
                                </p>
                                {conversation.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.lastMessage?.message || 'Sin mensajes'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Messages Area */}
              <Card className="lg:col-span-2">
                {selectedConversation ? (
                  <>
                    <CardHeader className="border-b bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={selectedConversation.avatar_url || ''} />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{selectedConversation.full_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{selectedConversation.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => startWhatsAppChat(selectedConversation)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => startEmailChat(selectedConversation)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[400px] p-4">
                        {messages.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No hay mensajes aún. ¡Envía el primero!
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((message) => (
                              <div
                                key={message.id}
                                className={`flex ${
                                  message.sender_id === profile?.id ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-[70%] p-3 rounded-lg ${
                                    message.sender_id === profile?.id
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <p className="text-sm">{message.message}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </ScrollArea>
                      <div className="border-t p-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Escribe tu mensaje..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            className="flex-1"
                          />
                          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="text-6xl">💬</div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Chat Directo</h3>
                        <p className="text-muted-foreground mb-4">
                          Selecciona una conversación o inicia una nueva
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowNewChatDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nueva conversación
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* New Direct Chat Dialog */}
        {showNewChatDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewChatDialog(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Nueva Conversación</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewChatDialog(false)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contactos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-64">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2" />
                      <p>No se encontraron contactos</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => startNewConversation(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={contact.avatar_url || ''} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{contact.full_name}</p>
                              <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Channel Dialog */}
        <CreateChannelDialog
          open={showCreateChannel}
          onOpenChange={setShowCreateChannel}
          onSubmit={handleCreateChannel}
        />
      </div>
    </div>
  );
}
