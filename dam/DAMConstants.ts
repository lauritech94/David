// Section definitions
export const DAM_SECTIONS = ['fotografia', 'artwork', 'video', 'assets_digitales', 'formatos_fisicos'] as const;
export type DAMSection = typeof DAM_SECTIONS[number];

export const SECTION_LABELS: Record<string, string> = {
  fotografia: 'Fotografía',
  artwork: 'Artwork',
  video: 'Vídeo',
  assets_digitales: 'Assets Digitales',
  formatos_fisicos: 'Formatos Físicos',
};

// Status definitions
export const ASSET_STATUSES = ['en_produccion', 'pendiente_aprobacion', 'listo', 'publicado'] as const;
export type AssetStatus = typeof ASSET_STATUSES[number];

export const STATUS_LABELS: Record<string, string> = {
  en_produccion: 'En producción',
  pendiente_aprobacion: 'Pendiente aprobación',
  listo: 'Listo',
  publicado: 'Publicado',
};

export const STATUS_COLORS: Record<string, string> = {
  en_produccion: 'bg-muted text-muted-foreground',
  pendiente_aprobacion: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  listo: 'bg-primary/15 text-primary',
  publicado: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
};

// Photo session stages
export const PHOTO_STAGES = ['backup', 'seleccionadas', 'editadas', 'compartir'] as const;
export const STAGE_LABELS: Record<string, string> = {
  backup: 'Backup',
  seleccionadas: 'Seleccionadas',
  editadas: 'Editadas',
  compartir: 'Para compartir',
};

// Artwork subtypes
export const ARTWORK_TYPES = ['Cover Single', 'Cover Álbum', 'Versión limpia', 'Variante plataforma', 'Press Kit'];

// Video subtypes
export const VIDEO_TYPES = ['Videoclip', 'Video líric', 'Visualiser', 'Canvas (Spotify)', 'Performance', 'BTS', 'Reels / TikTok', 'Teaser', 'Otros'];

// Digital asset subtypes
export const DIGITAL_ASSET_TYPES = ['Banner RRSS', 'Story / Reel template', 'Spotify Canvas', 'GIF animado', 'EPK', 'Otro'];

// Physical format subtypes
export const PHYSICAL_TYPES = ['Vinilo', 'CD Digifile', 'CD Digipak', 'Poster', 'Merchandise'];

export const PHYSICAL_STATUSES = ['Borrador', 'Enviado a imprenta', 'Aprobado por imprenta'];

// Platform tags
export const PLATFORM_OPTIONS = ['YouTube', 'Instagram', 'TikTok', 'Spotify', 'Apple Music', 'Facebook', 'Prensa', 'Distribución'];

// Format specs (aspect ratios only)
export const FORMAT_SPECS = ['1:1', '9:16', '16:9', '4:3', '3:4', '4:5', '5:4'];

// Resolution options (pixel dimensions)
export const RESOLUTION_OPTIONS = ['3000×3000', '1920×1080', '1080×1080', '1080×1350', '1080×1920'];
