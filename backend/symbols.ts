export const SYMBOLS_BY_CATEGORY = {
  easy: [
    "easy1",
    "easy2",
    "easy3",
    "easy4",
    "easy5",
    "easy6",
    "easy7",
    "easy8",
  ],
  medium: [
    "medium1",
    "medium2",
    "medium3",
    "medium4",
    "medium5",
    "medium6",
    "medium7",
    "medium8",
  ],
  hard: [
    "hard1",
    "hard2",
    "hard3",
    "hard4",
    "hard5",
    "hard6",
    "hard7",
    "hard8",
    "hard9",
  ],
} as const;

export type SymbolCategory = keyof typeof SYMBOLS_BY_CATEGORY;
export type SymbolId = `${SymbolCategory}/${string}`;
export type SymbolCounts = Record<SymbolCategory, number>;