import { useParams } from 'react-router-dom';
import { ApprovalsModule } from '@/components/ApprovalsModule';
import { usePageTitle } from '@/hooks/useCommon';
import { HubGate } from '@/components/permissions/HubGate';

function ApprovalsInner() {
  usePageTitle('Aprobaciones');
  const { id: projectId } = useParams();

  if (!projectId) {
    return <div>Project ID not found</div>;
  }

  return (
    <ApprovalsModule 
      projectId={projectId}
      // These would be fetched based on the project
      workspace={{ id: 'demo-workspace', name: 'WORKSPACE DEMO' }}
      artist={{ id: 'demo-artist', name: 'Rita Payés' }}
      project={{ id: projectId, name: 'Gira 2025' }}
    />
  );
}

export default function Approvals() {
  return (
    <HubGate module="solicitudes" required="view">
      <ApprovalsInner />
    </HubGate>
  );
}
