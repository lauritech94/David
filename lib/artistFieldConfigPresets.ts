export type ArtistFieldConfig = Record<string, boolean>;

export interface ArtistFieldPreset {
  label: string;
  config: ArtistFieldConfig;
}

export const ARTIST_FIELD_LABELS: Record<string, string> = {
  stage_name: 'Nombre artístico',
  genre: 'Género musical',
  description: 'Biografía',
  email: 'Email',
  phone: 'Teléfono',
  address: 'Dirección',
  instagram_url: 'Instagram',
  spotify_url: 'Spotify',
  tiktok_url: 'TikTok',
  clothing_size: 'Talla de ropa',
  shoe_size: 'Talla de calzado',
  allergies: 'Alergias',
  special_needs: 'Necesidades especiales',
  company_name: 'Empresa',
  legal_name: 'Nombre legal',
  tax_id: 'CIF / NIF',
  nif: 'NIF personal',
  tipo_entidad: 'Tipo entidad',
  irpf_type: 'Tipo IRPF',
  irpf_porcentaje: '% IRPF',
  actividad_inicio: 'Inicio actividad',
  bank_name: 'Banco',
  iban: 'IBAN',
  swift_code: 'SWIFT',
  notes: 'Notas',
  ipi_number: 'Número IPI (CISAC)',
  pro_name: 'Sociedad de gestión (PRO)',
};

const allTrue: ArtistFieldConfig = Object.fromEntries(
  Object.keys(ARTIST_FIELD_LABELS).map(k => [k, true])
);

const allFalse: ArtistFieldConfig = Object.fromEntries(
  Object.keys(ARTIST_FIELD_LABELS).map(k => [k, false])
);

export const ARTIST_FIELD_PRESETS: Record<string, ArtistFieldPreset> = {
  complete: {
    label: 'Completo',
    config: allTrue,
  },
  basic: {
    label: 'Básico',
    config: {
      ...allFalse,
      stage_name: true,
      genre: true,
      description: true,
      email: true,
      phone: true,
      instagram_url: true,
      spotify_url: true,
    },
  },
  touring: {
    label: 'Gira / Tour',
    config: {
      ...allFalse,
      stage_name: true,
      email: true,
      phone: true,
      address: true,
      clothing_size: true,
      shoe_size: true,
      allergies: true,
      special_needs: true,
      notes: true,
    },
  },
  fiscal: {
    label: 'Fiscal / Legal',
    config: {
      ...allFalse,
      legal_name: true,
      company_name: true,
      tax_id: true,
      nif: true,
      tipo_entidad: true,
      irpf_type: true,
      irpf_porcentaje: true,
      actividad_inicio: true,
      bank_name: true,
      iban: true,
      swift_code: true,
    },
  },
};

/**
 * For artists, empty field_config {} means ALL fields visible.
 * Only fields explicitly set to false are hidden.
 */
export function isArtistFieldVisible(fieldConfig: ArtistFieldConfig | null | undefined, field: string): boolean {
  if (!fieldConfig || Object.keys(fieldConfig).length === 0) return true;
  return fieldConfig[field] !== false;
}

export function detectArtistPreset(current: ArtistFieldConfig): string {
  if (!current || Object.keys(current).length === 0) return 'complete';
  for (const [key, preset] of Object.entries(ARTIST_FIELD_PRESETS)) {
    const match = Object.keys(ARTIST_FIELD_LABELS).every(
      field => !!current[field] === !!preset.config[field]
    );
    if (match) return key;
  }
  return 'custom';
}
