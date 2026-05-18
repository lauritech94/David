import { CashflowView } from '@/components/finanzas/CashflowView';

interface PagosTabProps {
  artistId: string;
}

export function PagosTab({ artistId }: PagosTabProps) {
  return <CashflowView artistId={artistId} />;
}
