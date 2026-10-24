
import { defineStore } from 'pinia'

export interface AlienSymbol {
  id: string
  src: string
}

const images = import.meta.glob(
  '../assets/symbols/*.{png,jpg,jpeg,webp,svg}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
) as Record<string, string>

export const useAlienSymbolsStore = defineStore('alienSymbols', () => {
  const symbols: AlienSymbol[] = Object.entries(images)
    .map(([path, src]) => ({
      id: path
        .split('/')
        .pop()!
        .replace(/\.[^.]+$/, ''),
      src,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const symbolsById = new Map(
    symbols.map((symbol) => [symbol.id, symbol]),
  )

  function getSymbol(id: string): AlienSymbol | undefined {
    return symbolsById.get(id)
  }

  function getImage(id: string): string | undefined {
    return getSymbol(id)?.src
  }

  return {
    symbols,
    getSymbol,
    getImage,
  }
})
