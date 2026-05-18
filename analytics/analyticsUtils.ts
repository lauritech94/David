export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export const formatCurrencyDecimal = (value: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('es-ES').format(value);

export const formatPercent = (value: number): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

export const calcVariation = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
};

export const PIPELINE_PHASES = ['interes', 'oferta', 'negociacion', 'confirmado', 'facturado'] as const;

export const PHASE_LABELS: Record<string, string> = {
  interes: 'Interés',
  oferta: 'Oferta',
  negociacion: 'Negociación',
  confirmado: 'Confirmado',
  facturado: 'Facturado',
};

export const SOURCE_COLORS = {
  booking: 'hsl(142, 70%, 45%)',
  sync: 'hsl(260, 85%, 65%)',
  royalties: 'hsl(213, 94%, 60%)',
  otros: 'hsl(38, 92%, 50%)',
};

export const ARTIST_PALETTE = [
  'hsl(142, 70%, 45%)',
  'hsl(260, 85%, 65%)',
  'hsl(213, 94%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(180, 70%, 45%)',
  'hsl(320, 70%, 55%)',
  'hsl(50, 90%, 50%)',
];

export const FUNNEL_COLORS = [
  'hsl(142, 40%, 75%)',
  'hsl(142, 50%, 65%)',
  'hsl(142, 60%, 55%)',
  'hsl(142, 70%, 45%)',
  'hsl(142, 80%, 35%)',
];

export const getMarginColor = (margin: number): string => {
  if (margin >= 40) return 'text-green-600 dark:text-green-400';
  if (margin >= 20) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const getMarginBg = (margin: number): string => {
  if (margin >= 40) return 'bg-green-100 dark:bg-green-900/30';
  if (margin >= 20) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
};
