import { ApprovalDetail } from '@/components/ApprovalDetail';
import { usePageTitle } from '@/hooks/useCommon';
import { HubGate } from '@/components/permissions/HubGate';

export default function ApprovalDetailPage() {
  usePageTitle('Detalle de Aprobación');

  return (
    <HubGate module="solicitudes" required="view">
      <ApprovalDetail />
    </HubGate>
  );
}
