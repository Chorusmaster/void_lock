export const SYMBOL_IDS = [
  'symbol1',
  'symbol2',
  'symbol3',
  'symbol4',
  'symbol5',
  'symbol6'
] as const;

export type SymbolId = (typeof SYMBOL_IDS)[number];