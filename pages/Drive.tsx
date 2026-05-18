// Drive page now redirects to Carpetas which has the full functionality
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HubGate } from '@/components/permissions/HubGate';

function DriveInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Build the redirect URL preserving any query params
    const artistId = searchParams.get('artist');
    const folder = searchParams.get('folder');
    const category = searchParams.get('category');
    
    let redirectUrl = '/carpetas';
    const params = new URLSearchParams();
    
    if (artistId) params.set('artist', artistId);
    if (category) params.set('category', category);
    if (folder) params.set('folder', folder);
    
    if (params.toString()) {
      redirectUrl += '?' + params.toString();
    }
    
    navigate(redirectUrl, { replace: true });
  }, [navigate, searchParams]);

  return null;
}

export default function Drive() {
  return (
    <HubGate module="drive" required="view">
      <DriveInner />
    </HubGate>
  );
}
