/**
 * Catálogo de tipos de oferta (deal types) estándar de la industria del booking.
 * Se usa como sugerencias en el combobox; el usuario puede escribir un valor libre.
 */

export interface OfferType {
  value: string;
  description: string;
}

export const OFFER_TYPES: OfferType[] = [
  { value: 'Flat Fee', description: 'Caché fijo cerrado' },
  { value: 'Door Deal', description: '% de taquilla' },
  { value: 'Flat Fee + Door Deal', description: 'Mínimo garantizado + % sobre umbral' },
  { value: 'Vs. Door Deal', description: 'El mayor entre flat fee y door deal' },
  { value: 'Bell Curve / Plus Walkout', description: 'Escalonado por taquilla' },
  { value: 'Guarantee + Bonus', description: 'Mínimo + bonus por objetivos' },
  { value: 'Profit Split', description: 'Reparto de beneficios tras gastos' },
];
