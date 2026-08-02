import type { MarketBar } from '../schemas.js';

export function chronologicalBars(bars: MarketBar[]) {
  return [...bars].sort((left, right) => left.date.localeCompare(right.date));
}

export function roundIndicator(value: number) {
  return Math.round(value * 100) / 100;
}

export function pricePosition(price: number, reference: number) {
  if (price > reference) return 'above' as const;
  if (price < reference) return 'below' as const;
  return 'equal' as const;
}
