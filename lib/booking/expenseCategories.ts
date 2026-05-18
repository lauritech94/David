// Categorías de imprevistos del booking. Alineadas con las categorías
// usadas habitualmente en `budget_items` (texto libre) para que un
// imprevisto pueda promocionarse a una partida del presupuesto sin
// inconsistencias.

export interface ExpenseCategory {
  value: string;        // valor que se guarda en booking_expenses.category y budget_items.category
  label: string;        // texto mostrado al usuario
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { value: 'equipo_artistico', label: 'Equipo artístico' },
  { value: 'equipo_tecnico',   label: 'Equipo técnico' },
  { value: 'transporte',       label: 'Transporte' },
  { value: 'alojamiento',      label: 'Alojamiento' },
  { value: 'catering',         label: 'Catering / Dietas' },
  { value: 'produccion',       label: 'Producción' },
  { value: 'marketing',        label: 'Marketing / Promo' },
  { value: 'comisiones',       label: 'Comisiones' },
  { value: 'gastos_generales', label: 'Gastos generales' },
  { value: 'otros',            label: 'Otros' },
];

export function getCategoryLabel(value?: string | null): string {
  if (!value) return '—';
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label ?? value;
}
