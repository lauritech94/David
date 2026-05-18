import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  UserPlus, 
  Copy, 
  CheckCircle, 
  Clock, 
  Trash2,
  Users,
  Mail,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ContractSigner {
  id: string;
  document_id: string;
  name: string;
  role: string;
  email: string | null;
  token: string;
  status: 'pending' | 'signed';
  signature_image_url: string | null;
  signed_at: string | null;
  created_at: string;
}

interface ContractSignersManagerProps {
  documentId: string;
  onSignersChange?: () => void;
}

const SIGNER_ROLES = [
  'Promotor',
  'Artista',
  'Representante',
  'Agencia',
  'Manager',
  'Venue',
  'Otro'
];

export function ContractSignersManager({ documentId, onSignersChange }: ContractSignersManagerProps) {
  const [signers, setSigners] = useState<ContractSigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSignerName, setNewSignerName] = useState('');
  const [newSignerRole, setNewSignerRole] = useState('Promotor');
  const [newSignerEmail, setNewSignerEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchSigners();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`contract-signers-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_signers',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          console.log('Signer update received:', payload);
          fetchSigners();
          onSignersChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  const fetchSigners = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_signers')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSigners((data || []) as ContractSigner[]);
    } catch (error) {
      console.error('Error fetching signers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSigner = async () => {
    if (!newSignerName.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Introduce el nombre del firmante.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAdding(true);
      
      const { error } = await supabase
        .from('contract_signers')
        .insert({
          document_id: documentId,
          name: newSignerName.trim(),
          role: newSignerRole,
          email: newSignerEmail.trim() || null,
        });

      if (error) throw error;

      toast({
        title: 'Firmante añadido',
        description: `${newSignerName} ha sido añadido como firmante.`,
      });

      setNewSignerName('');
      setNewSignerEmail('');
      setNewSignerRole('Promotor');
      setShowAddDialog(false);
      fetchSigners();
      onSignersChange?.();
    } catch (error) {
      console.error('Error adding signer:', error);
      toast({
        title: 'Error',
        description: 'No se pudo añadir el firmante.',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSigner = async (signerId: string) => {
    try {
      const { error } = await supabase
        .from('contract_signers')
        .delete()
        .eq('id', signerId);

      if (error) throw error;

      toast({
        title: 'Firmante eliminado',
      });

      fetchSigners();
      onSignersChange?.();
    } catch (error) {
      console.error('Error deleting signer:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el firmante.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = (signer: ContractSigner) => {
    const signUrl = `${PUBLIC_APP_URL}/sign/${signer.token}`;
    navigator.clipboard.writeText(signUrl);
    toast({
      title: 'Enlace copiado',
      description: `Enlace de firma para ${signer.name} copiado al portapapeles.`,
    });
  };

  const signedCount = signers.filter(s => s.status === 'signed').length;
  const totalCount = signers.length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-12 bg-muted rounded" />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Firmantes</span>
            {totalCount > 0 && (
              <Badge variant={signedCount === totalCount ? 'default' : 'secondary'} className={signedCount === totalCount ? 'bg-green-600' : ''}>
                {signedCount}/{totalCount} firmados
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Añadir Firmante
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Firmante</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Nombre completo"
                  value={newSignerName}
                  onChange={(e) => setNewSignerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol</label>
                <Select value={newSignerRole} onValueChange={setNewSignerRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNER_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email (opcional)</label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={newSignerEmail}
                  onChange={(e) => setNewSignerEmail(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddSigner} disabled={adding}>
                  {adding ? 'Añadiendo...' : 'Añadir Firmante'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CollapsibleContent className="mt-4">
        {signers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay firmantes configurados</p>
            <p className="text-xs mt-1">Añade los firmantes que deben firmar este contrato</p>
          </div>
        ) : (
          <div className="space-y-2">
            {signers.map((signer) => (
              <div
                key={signer.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  signer.status === 'signed' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    signer.status === 'signed' ? 'bg-green-500/20' : 'bg-amber-500/20'
                  }`}>
                    {signer.status === 'signed' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{signer.name}</span>
                      <Badge variant="outline" className="text-xs">{signer.role}</Badge>
                    </div>
                    {signer.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {signer.email}
                      </div>
                    )}
                    {signer.status === 'signed' && signer.signed_at && (
                      <p className="text-xs text-green-600">
                        Firmado el {new Date(signer.signed_at).toLocaleString('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {signer.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(signer)}
                      className="text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                  )}
                  
                  {signer.signature_image_url && (
                    <div className="h-10 w-20 bg-white dark:bg-gray-900 rounded border p-1">
                      <img 
                        src={signer.signature_image_url} 
                        alt={`Firma de ${signer.name}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}

                  {signer.status === 'pending' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteSigner(signer.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
