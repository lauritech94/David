import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Copy, ExternalLink, Loader2, Link as LinkIcon, Plus, List, Trash2, Power, PowerOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FormLink {
  id: string;
  token: string;
  title: string | null;
  description: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  max_uses: number | null;
  use_count: number;
}

interface CreateFormLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFormLinkDialog({ open, onOpenChange }: CreateFormLinkDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [existingLinks, setExistingLinks] = useState<FormLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  
  const [title, setTitle] = useState('Solicitud de Sincronización');
  const [description, setDescription] = useState('Completa este formulario para solicitar una licencia de sincronización.');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(30);
  const [hasMaxUses, setHasMaxUses] = useState(false);
  const [maxUses, setMaxUses] = useState(10);

  const fetchExistingLinks = async () => {
    if (!user) return;
    
    try {
      setLoadingLinks(true);
      const { data, error } = await supabase
        .from('sync_form_links')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingLinks(data || []);
    } catch (error) {
      console.error('Error fetching form links:', error);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchExistingLinks();
    }
  }, [open, user]);

  const handleCreate = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const expiresAt = hasExpiration 
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      const { data, error } = await supabase
        .from('sync_form_links')
        .insert({
          created_by: user.id,
          title: title || null,
          description: description || null,
          expires_at: expiresAt,
          max_uses: hasMaxUses ? maxUses : null,
        })
        .select('token')
        .single();

      if (error) throw error;
      
      const formUrl = `${PUBLIC_APP_URL}/sync-request/${data.token}`;
      setCreatedLink(formUrl);
      fetchExistingLinks();
      
      toast({
        title: "Enlace creado",
        description: "El formulario público está listo para compartir.",
      });
    } catch (error) {
      console.error('Error creating form link:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el enlace del formulario.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLinkActive = async (link: FormLink) => {
    try {
      const { error } = await supabase
        .from('sync_form_links')
        .update({ is_active: !link.is_active })
        .eq('id', link.id);

      if (error) throw error;
      
      fetchExistingLinks();
      toast({
        title: link.is_active ? "Enlace desactivado" : "Enlace activado",
        description: link.is_active 
          ? "El formulario ya no aceptará nuevas solicitudes."
          : "El formulario está activo nuevamente.",
      });
    } catch (error) {
      console.error('Error toggling link:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el enlace.",
        variant: "destructive",
      });
    }
  };

  const deleteLink = async (link: FormLink) => {
    try {
      const { error } = await supabase
        .from('sync_form_links')
        .delete()
        .eq('id', link.id);

      if (error) throw error;
      
      fetchExistingLinks();
      toast({
        title: "Enlace eliminado",
        description: "El formulario ha sido eliminado.",
      });
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el enlace.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Enlace copiado",
      description: "El enlace se ha copiado al portapapeles.",
    });
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  const getFormUrl = (token: string) => `${PUBLIC_APP_URL}/sync-request/${token}`;

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxedOut = (link: FormLink) => {
    if (!link.max_uses) return false;
    return link.use_count >= link.max_uses;
  };

  const getLinkStatus = (link: FormLink) => {
    if (!link.is_active) return { label: 'Inactivo', variant: 'secondary' as const };
    if (isExpired(link.expires_at)) return { label: 'Expirado', variant: 'destructive' as const };
    if (isMaxedOut(link)) return { label: 'Límite alcanzado', variant: 'outline' as const };
    return { label: 'Activo', variant: 'default' as const };
  };

  const handleClose = () => {
    setCreatedLink(null);
    setTitle('Solicitud de Sincronización');
    setDescription('Completa este formulario para solicitar una licencia de sincronización.');
    setHasExpiration(false);
    setExpirationDays(30);
    setHasMaxUses(false);
    setMaxUses(10);
    onOpenChange(false);
  };

  const resetForm = () => {
    setCreatedLink(null);
    setTitle('Solicitud de Sincronización');
    setDescription('Completa este formulario para solicitar una licencia de sincronización.');
    setHasExpiration(false);
    setExpirationDays(30);
    setHasMaxUses(false);
    setMaxUses(10);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Formularios Públicos
          </DialogTitle>
          <DialogDescription>
            Gestiona los enlaces de formulario para solicitudes externas de sincronización.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Formularios ({existingLinks.length})
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Nuevo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 overflow-auto mt-4">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : existingLinks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay formularios creados</p>
                <Button 
                  variant="link" 
                  onClick={() => setActiveTab('create')}
                  className="mt-2"
                >
                  Crear el primero
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {existingLinks.map((link) => {
                  const status = getLinkStatus(link);
                  const url = getFormUrl(link.token);
                  
                  return (
                    <div
                      key={link.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {link.title || 'Sin título'}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Creado {format(new Date(link.created_at), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <Badge variant={status.variant} className="text-xs shrink-0">
                          {status.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <span>{link.use_count} {link.use_count === 1 ? 'respuesta' : 'respuestas'}</span>
                        {link.max_uses && (
                          <span>/ {link.max_uses} máx</span>
                        )}
                        {link.expires_at && (
                          <>
                            <span className="mx-1">•</span>
                            <span>
                              {isExpired(link.expires_at) ? 'Expiró' : 'Expira'} {format(new Date(link.expires_at), "d MMM", { locale: es })}
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(url)}
                          className="h-7 text-xs gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInNewTab(url)}
                          className="h-7 text-xs gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLinkActive(link)}
                          className="h-7 text-xs gap-1"
                        >
                          {link.is_active ? (
                            <>
                              <PowerOff className="h-3 w-3" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <Power className="h-3 w-3" />
                              Activar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteLink(link)}
                          className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="flex-1 overflow-auto mt-4">
            {createdLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-sm font-medium text-success mb-2">¡Enlace creado exitosamente!</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdLink}
                      readOnly
                      className="text-xs"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={() => copyToClipboard(createdLink)} className="flex-1 gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar Enlace
                  </Button>
                  <Button onClick={() => openInNewTab(createdLink)} variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setActiveTab('list');
                  }}
                  className="w-full"
                >
                  Ver todos los formularios
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título del Formulario</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título que verán los solicitantes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instrucciones o contexto para el formulario"
                    rows={2}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="expiration">Fecha de Expiración</Label>
                      <p className="text-xs text-muted-foreground">
                        El enlace dejará de funcionar después de este tiempo
                      </p>
                    </div>
                    <Switch
                      id="expiration"
                      checked={hasExpiration}
                      onCheckedChange={setHasExpiration}
                    />
                  </div>
                  {hasExpiration && (
                    <div className="flex items-center gap-2 pl-4">
                      <Input
                        type="number"
                        value={expirationDays}
                        onChange={(e) => setExpirationDays(parseInt(e.target.value) || 1)}
                        min={1}
                        max={365}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">días</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="max-uses">Límite de Respuestas</Label>
                      <p className="text-xs text-muted-foreground">
                        Número máximo de solicitudes permitidas
                      </p>
                    </div>
                    <Switch
                      id="max-uses"
                      checked={hasMaxUses}
                      onCheckedChange={setHasMaxUses}
                    />
                  </div>
                  {hasMaxUses && (
                    <div className="flex items-center gap-2 pl-4">
                      <Input
                        type="number"
                        value={maxUses}
                        onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                        min={1}
                        max={1000}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">respuestas</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={loading} className="flex-1 gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4" />
                        Crear Enlace
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
