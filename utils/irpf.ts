/**
 * IRPF calculation helper based on artist fiscal profile.
 * Centralizes all IRPF logic so it's consistent across
 * MarcarCobradoDialog, BudgetDetailsDialog, and BookingDriveTab.
 */

export type IrpfType =
  | 'profesional_establecido'
  | 'inicio_actividad'
  | 'extranjero_ue'
  | 'extranjero_no_ue'
  | 'personalizado';

export interface ArtistFiscalProfile {
  irpf_type?: string | null;
  irpf_porcentaje?: number | null;
  actividad_inicio?: string | null; // ISO date string
}

export interface IrpfResult {
  percentage: number;
  label: string;
  warning?: string;
}

const IRPF_LABELS: Record<IrpfType, string> = {
  profesional_establecido: 'Profesional establecido',
  inicio_actividad: 'Inicio de actividad',
  extranjero_ue: 'Extranjero UE',
  extranjero_no_ue: 'Extranjero no UE',
  personalizado: 'Personalizado',
};

/**
 * Calculate IRPF percentage and label based on artist fiscal profile.
 * Falls back to 15% (profesional_establecido) if no profile data.
 */
export function getIrpfForArtist(artist?: ArtistFiscalProfile | null): IrpfResult {
  if (!artist || !artist.irpf_type) {
    return { percentage: 15, label: 'Profesional establecido' };
  }

  const type = artist.irpf_type as IrpfType;

  switch (type) {
    case 'extranjero_ue':
      return { percentage: 19, label: IRPF_LABELS.extranjero_ue };

    case 'extranjero_no_ue':
      return { percentage: 24, label: IRPF_LABELS.extranjero_no_ue };

    case 'inicio_actividad': {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      if (artist.actividad_inicio) {
        const startDate = new Date(artist.actividad_inicio);
        if (startDate > twoYearsAgo) {
          return { percentage: 7, label: IRPF_LABELS.inicio_actividad };
        }
        // Graduated from 7% — warn
        return {
          percentage: 15,
          label: IRPF_LABELS.inicio_actividad,
          warning: '⚠ Este artista inició actividad hace más de 2 años. Verifica si aplica 15%.',
        };
      }
      // No start date set — assume still in period
      return { percentage: 7, label: IRPF_LABELS.inicio_actividad };
    }

    case 'personalizado':
      return {
        percentage: artist.irpf_porcentaje ?? 15,
        label: IRPF_LABELS.personalizado,
      };

    case 'profesional_establecido':
    default:
      return { percentage: 15, label: IRPF_LABELS.profesional_establecido };
  }
}

/**
 * Get a human-readable IRPF type label.
 */
export function getIrpfTypeLabel(type: string | null | undefined): string {
  return IRPF_LABELS[(type as IrpfType) || 'profesional_establecido'] || 'Profesional establecido';
}

export const IRPF_TYPE_OPTIONS: { value: IrpfType; label: string; description: string }[] = [
  { value: 'profesional_establecido', label: 'Profesional establecido', description: '15% — Tipo general' },
  { value: 'inicio_actividad', label: 'Inicio de actividad', description: '7% — Primeros 2 años de actividad' },
  { value: 'extranjero_ue', label: 'Extranjero UE', description: '19% — No residente, UE' },
  { value: 'extranjero_no_ue', label: 'Extranjero no UE', description: '24% — No residente, fuera de UE' },
  { value: 'personalizado', label: 'Personalizado', description: 'Porcentaje manual' },
];
