import { supabase } from '@/integrations/supabase/client';
import type { DAMAsset } from '../DAMTypes';

/**
 * If the asset becomes a "Cover Álbum" in a ready/published status,
 * mirror its file_url onto releases.cover_image_url.
 */
export async function syncCoverIfNeeded(
  asset: DAMAsset,
  newSubType: string | null,
  newStatus: string,
) {
  const subTypeChangedToCover = newSubType === 'Cover Álbum' && asset.sub_type !== 'Cover Álbum';
  const statusChangedToReady =
    ['listo', 'publicado'].includes(newStatus) &&
    !['listo', 'publicado'].includes(asset.status || '');

  if (
    asset.section === 'artwork' &&
    newSubType === 'Cover Álbum' &&
    ['listo', 'publicado'].includes(newStatus) &&
    (subTypeChangedToCover || statusChangedToReady) &&
    asset.file_url &&
    (asset as any).release_id
  ) {
    await supabase
      .from('releases')
      .update({ cover_image_url: asset.file_url } as any)
      .eq('id', (asset as any).release_id);
  }
}
