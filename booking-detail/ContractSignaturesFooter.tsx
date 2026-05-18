import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Clock } from 'lucide-react';

interface ContractSigner {
  id: string;
  name: string;
  role: string;
  status: 'pending' | 'signed';
  signature_image_url: string | null;
  signed_at: string | null;
}

interface ContractSignaturesFooterProps {
  documentId: string;
  showInPdf?: boolean;
}

export function ContractSignaturesFooter({ documentId, showInPdf = false }: ContractSignaturesFooterProps) {
  const [signers, setSigners] = useState<ContractSigner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSigners();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`contract-signatures-footer-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_signers',
          filter: `document_id=eq.${documentId}`,
        },
        () => {
          console.log('Signature update received - refreshing footer');
          fetchSigners();
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
        .select('id, name, role, status, signature_image_url, signed_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSigners((data || []) as ContractSigner[]);
    } catch (error) {
      console.error('Error fetching signers for footer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (signers.length === 0) {
    return null;
  }

  // For PDF export, use simpler styling
  if (showInPdf) {
    return (
      <div className="mt-8 pt-8 border-t-2 border-gray-300">
        <h3 className="text-lg font-bold mb-6 text-center">FIRMAS</h3>
        <div 
          className="grid gap-8"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${Math.min(signers.length, 3)}, 1fr)`,
            gap: '2rem'
          }}
        >
          {signers.map((signer) => (
            <div key={signer.id} className="text-center">
              <p className="font-semibold text-sm mb-1">{signer.role.toUpperCase()}</p>
              <div 
                className="h-24 flex items-end justify-center border-b-2 border-gray-400 mb-2"
                style={{ minHeight: '96px' }}
              >
                {signer.status === 'signed' && signer.signature_image_url ? (
                  <img 
                    src={signer.signature_image_url} 
                    alt={`Firma de ${signer.name}`}
                    className="max-h-20 object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span className="text-gray-400 text-sm italic mb-2">
                    (Pendiente de firma)
                  </span>
                )}
              </div>
              <p className="font-medium">{signer.name}</p>
              {signer.status === 'signed' && signer.signed_at && (
                <p className="text-xs text-gray-500">
                  Firmado: {new Date(signer.signed_at).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t-2 border-border">
      <h3 className="text-lg font-bold mb-6 text-center text-foreground">FIRMAS</h3>
      <div 
        className={`grid gap-6 ${
          signers.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
          signers.length === 2 ? 'grid-cols-2' :
          'grid-cols-2 md:grid-cols-3'
        }`}
      >
        {signers.map((signer) => (
          <div 
            key={signer.id} 
            className={`text-center p-4 rounded-lg border-2 transition-all ${
              signer.status === 'signed' 
                ? 'border-green-500/50 bg-green-500/5' 
                : 'border-dashed border-muted-foreground/30 bg-muted/20'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              {signer.status === 'signed' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
              <p className="font-semibold text-sm text-muted-foreground">
                {signer.role.toUpperCase()}
              </p>
            </div>
            
            <div className="h-20 flex items-end justify-center mb-3 border-b border-muted-foreground/30">
              {signer.status === 'signed' && signer.signature_image_url ? (
                <img 
                  src={signer.signature_image_url} 
                  alt={`Firma de ${signer.name}`}
                  className="max-h-16 object-contain"
                />
              ) : (
                <span className="text-muted-foreground text-sm italic mb-2">
                  Pendiente de firma...
                </span>
              )}
            </div>
            
            <p className="font-medium text-foreground">{signer.name}</p>
            {signer.status === 'signed' && signer.signed_at && (
              <p className="text-xs text-green-600 mt-1">
                Firmado el {new Date(signer.signed_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Export helper function to get signers for PDF generation
export async function getDocumentSigners(documentId: string): Promise<ContractSigner[]> {
  const { data, error } = await supabase
    .from('contract_signers')
    .select('id, name, role, status, signature_image_url, signed_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching signers:', error);
    return [];
  }

  return (data || []) as ContractSigner[];
}
