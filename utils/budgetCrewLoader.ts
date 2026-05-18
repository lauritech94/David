import { supabase } from '@/integrations/supabase/client';
import { getIrpfForArtist } from '@/utils/irpf';

interface LoadCrewParams {
  budgetId: string;
  formatName?: string;
  formatId?: string;
  artistId: string;
  bookingFee: number;
  isInternational: boolean;
  userId: string;
}

async function getOrCreateCategory(categoryName: string, iconName: string, userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('budget_categories')
    .select('id')
    .eq('name', categoryName)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: newCat } = await supabase
    .from('budget_categories')
    .insert({
      name: categoryName,
      icon_name: iconName,
      created_by: userId,
      sort_order: categoryName === 'Artista Principal' ? 0 : categoryName === 'Músicos' ? 1 : 50,
    })
    .select('id')
    .single();

  return newCat?.id ?? null;
}

/**
 * Loads crew members from a booking product (format) into budget items
 * with smart categorization: Artista Principal, Management, Músicos, Equipo técnico.
 */
export async function loadCrewFromFormat(params: LoadCrewParams): Promise<void> {
  const { budgetId, formatName, formatId, artistId, bookingFee, isInternational, userId } = params;

  // Resolve the booking product ID
  let resolvedFormatId = formatId;
  if (!resolvedFormatId && formatName) {
    const { data: bp } = await supabase
      .from('booking_products')
      .select('id')
      .eq('artist_id', artistId)
      .ilike('name', formatName)
      .eq('is_active', true)
      .limit(1)
      .single();
    if (!bp) return;
    resolvedFormatId = bp.id;
  }
  if (!resolvedFormatId) return;

  // Fetch crew
  const { data: crewData, error: crewError } = await supabase
    .from('booking_product_crew')
    .select('*')
    .eq('booking_product_id', resolvedFormatId);

  if (crewError) throw crewError;
  if (!crewData || crewData.length === 0) return;

  // Get artist info
  const { data: formatData } = await supabase
    .from('booking_products')
    .select('artist_id, artists(id, name, legal_name)')
    .eq('id', resolvedFormatId)
    .single();

  const artistInfo = formatData?.artists as { id: string; name: string; legal_name: string | null } | null;

  // Get IRPF default
  const { data: artistFiscal } = await supabase
    .from('artists')
    .select('irpf_type, irpf_porcentaje, actividad_inicio')
    .eq('id', artistId)
    .maybeSingle();
  const irpfDefault = getIrpfForArtist(artistFiscal as any).percentage;

  // Build budget items with smart categorization
  const budgetItems = await Promise.all(
    crewData.map(async (crew) => {
      let concept = crew.role_label || 'Miembro del equipo';
      let memberCategory = 'Músicos';
      let contactId: string | null = null;
      let isArtist = false;

      // === Artist detection ===
      if (crew.member_id === artistId && artistInfo) {
        concept = 'Artista Principal';
        memberCategory = 'Artista Principal';
        isArtist = true;

        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('field_config->>roster_artist_id', artistId)
          .maybeSingle();

        if (existingContact?.id) {
          contactId = existingContact.id;
        } else {
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({
              name: artistInfo.name,
              legal_name: artistInfo.legal_name,
              stage_name: artistInfo.name,
              category: 'artista',
              role: 'Artista',
              created_by: userId,
              field_config: { roster_artist_id: artistId, mirror_type: 'roster_artist' },
            })
            .select('id')
            .single();
          if (newContact?.id) contactId = newContact.id;
        }
      }

      // === Non-artist members ===
      if (!isArtist) {
        if (crew.member_type === 'workspace') {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, stage_name, roles')
            .eq('user_id', crew.member_id)
            .maybeSingle();

          if (profileData) {
            const roles = profileData.roles as string[] | null;
            if (roles && (roles.includes('management') || roles.includes('manager') || roles.includes('booker'))) {
              memberCategory = 'Management';
            }

            const { data: existingMirror } = await supabase
              .from('contacts')
              .select('id')
              .eq('field_config->>workspace_user_id', crew.member_id)
              .maybeSingle();

            if (existingMirror?.id) {
              contactId = existingMirror.id;
            } else if (profileData.full_name) {
              const { data: newContact } = await supabase
                .from('contacts')
                .insert({
                  name: profileData.stage_name || profileData.full_name,
                  legal_name: profileData.full_name,
                  category: 'management',
                  role: crew.role_label || 'Management',
                  created_by: userId,
                  field_config: { workspace_user_id: crew.member_id, mirror_type: 'workspace_member' },
                })
                .select('id')
                .single();
              if (newContact?.id) contactId = newContact.id;
            }
          }
        } else if (crew.member_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id, name, role, category')
            .eq('id', crew.member_id)
            .maybeSingle();

          if (contact) {
            if (!crew.role_label || crew.role_label === 'Miembro del equipo') {
              concept = contact.role || concept;
            }
            contactId = contact.id;

            const contactRole = contact.role?.toLowerCase() || '';
            if (contact.category === 'tecnico' || contactRole.includes('técnico') || contactRole.includes('sonido')) {
              memberCategory = 'Equipo técnico';
            } else if (contact.category === 'management' || contactRole.includes('manager')) {
              memberCategory = 'Management';
            }
          }
        }
      }

      // Commission detection overrides category
      if (crew.is_percentage) {
        memberCategory = 'Management';
      }

      const targetCategoryId = await getOrCreateCategory(
        memberCategory,
        memberCategory === 'Artista Principal' ? 'Music' :
        memberCategory === 'Management' ? 'DollarSign' : 'Users',
        userId
      );

      // Calculate unit price
      let unitPrice = 0;
      if (crew.is_percentage) {
        const percentage = isInternational
          ? (crew.percentage_international || crew.percentage_national || 0)
          : (crew.percentage_national || crew.percentage_international || 0);
        unitPrice = (bookingFee * percentage) / 100;
      } else {
        unitPrice = isInternational
          ? (crew.fee_international || crew.fee_national || 0)
          : (crew.fee_national || crew.fee_international || 0);
      }

      const commissionPercentage = crew.is_percentage
        ? (isInternational
          ? (crew.percentage_international || crew.percentage_national || 0)
          : (crew.percentage_national || crew.percentage_international || 0))
        : null;

      return {
        budget_id: budgetId,
        category_id: targetCategoryId,
        category: memberCategory,
        name: concept,
        quantity: 1,
        unit_price: unitPrice,
        iva_percentage: 0,
        irpf_percentage: irpfDefault,
        is_attendee: true,
        billing_status: 'pendiente' as const,
        is_commission_percentage: crew.is_percentage || false,
        commission_percentage: commissionPercentage,
        contact_id: contactId,
        subcategory: crew.is_percentage ? `${commissionPercentage}% del fee` : undefined,
        observations: 'Cargado desde formato',
      };
    })
  );

  const { error: insertError } = await supabase
    .from('budget_items')
    .insert(budgetItems);

  if (insertError) throw insertError;
}
