import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'blocking';
}

export interface ValidationWarning {
  field: string;
  message: string;
  type: 'warning';
  severity: 'yellow' | 'red';
}

export interface BookingOffer {
  id?: string;
  fecha?: string;
  estado?: string;
  contratos?: string;
  link_venta?: string;
  contacto?: string;
  tour_manager?: string;
  artist_id?: string;
  created_at?: string;
  [key: string]: any;
}

export async function validateBookingOffer(
  offer: BookingOffer, 
  isNew: boolean = false,
  hasContract?: boolean
): Promise<ValidationResult> {
  console.log('Validating booking offer:', offer);
  
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Contract required check removed - handled in section 5

  // 2. Date conflict check
  if (offer.estado?.toLowerCase() === 'confirmado' && offer.fecha && offer.artist_id) {
    try {
      const { data: conflictingOffers, error } = await supabase
        .from('booking_offers')
        .select('id, fecha')
        .eq('fecha', offer.fecha)
        .eq('artist_id', offer.artist_id)
        .ilike('estado', 'confirmado')
        .neq('id', offer.id || '');

      if (error) {
        console.error('Error checking date conflicts:', error);
      } else if (conflictingOffers && conflictingOffers.length > 0) {
        errors.push({
          field: 'fecha',
          message: 'Ya existe otra oferta confirmada en esta fecha para el mismo artista',
          type: 'blocking'
        });
      }
    } catch (error) {
      console.error('Error checking date conflicts:', error);
    }
  }

  // 3. Sales link for confirmed future shows
  if (offer.estado?.toLowerCase() === 'confirmado' && offer.fecha) {
    const showDate = new Date(offer.fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (showDate > today && !offer.link_venta?.trim()) {
      warnings.push({
        field: 'link_venta',
        message: 'Se recomienda añadir el link de venta para shows confirmados futuros',
        type: 'warning',
        severity: 'yellow'
      });
    }
  }

  // 4. Lead time validation
  if (offer.fecha) {
    const showDate = new Date(offer.fecha);
    const creationDate = offer.created_at ? new Date(offer.created_at) : new Date();
    const leadTimeDays = Math.ceil((showDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));

    if (leadTimeDays < 7) {
      warnings.push({
        field: 'fecha',
        message: `Lead time muy corto: ${leadTimeDays} días (mínimo recomendado: 14 días)`,
        type: 'warning',
        severity: 'red'
      });
    } else if (leadTimeDays < 14) {
      warnings.push({
        field: 'fecha',
        message: `Lead time corto: ${leadTimeDays} días (recomendado: 14+ días)`,
        type: 'warning',
        severity: 'yellow'
      });
    }
  }

  // 5. Required fields by status
  const estado = offer.estado?.toLowerCase();
  
  console.log('Checking required fields for estado:', estado, 'contacto:', offer.contacto);
  
  // Only require contacto for propuesta (not for interés)
  if (estado === 'propuesta') {
    if (!offer.contacto?.trim()) {
      console.log('Adding contacto error for estado:', estado);
      errors.push({
        field: 'contacto',
        message: 'El contacto es obligatorio para propuestas',
        type: 'blocking'
      });
    }
  }
  
  if (estado === 'confirmado') {
    if (!offer.contacto?.trim()) {
      errors.push({
        field: 'contacto',
        message: 'El contacto es obligatorio para ofertas confirmadas',
        type: 'blocking'
      });
    }
    // Check contract from booking_documents (hasContract param) instead of legacy field
    if (hasContract === false) {
      errors.push({
        field: 'contratos',
        message: 'Los contratos son obligatorios para ofertas confirmadas',
        type: 'blocking'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function getAlertSummary(errors: ValidationError[], warnings: ValidationWarning[]) {
  if (errors.length > 0) {
    return {
      type: 'blocking' as const,
      severity: 'red' as const,
      count: errors.length,
      message: `${errors.length} error${errors.length > 1 ? 'es' : ''} de validación`
    };
  }
  
  if (warnings.length > 0) {
    const redWarnings = warnings.filter(w => w.severity === 'red');
    const severity = redWarnings.length > 0 ? 'red' : 'yellow';
    
    return {
      type: 'warning' as const,
      severity,
      count: warnings.length,
      message: `${warnings.length} aviso${warnings.length > 1 ? 's' : ''}`
    };
  }
  
  return null;
}