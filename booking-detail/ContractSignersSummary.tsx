import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ContractSignersSummaryProps {
  documentId: string;
}

export function ContractSignersSummary({ documentId }: ContractSignersSummaryProps) {
  const [signed, setSigned] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('contract_signers')
        .select('status')
        .eq('document_id', documentId);
      if (data) {
        setTotal(data.length);
        setSigned(data.filter((s: any) => s.status === 'signed').length);
      }
    };
    fetch();

    const channel = supabase
      .channel(`signer-summary-${documentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contract_signers',
        filter: `document_id=eq.${documentId}`,
      }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [documentId]);

  if (total === 0) return null;

  const allSigned = signed === total;

  return (
    <Badge
      variant={allSigned ? 'default' : 'secondary'}
      className={allSigned ? 'bg-green-600 text-white' : ''}
    >
      {signed}/{total} firmados
    </Badge>
  );
}
