
import { defineStore } from 'pinia'

export interface AlienSymbol {
  id: string
  category: 'easy' | 'medium' | 'hard'
  src: string
}

const images = import.meta.glob(
  '../assets/symbols/*/*.{png,jpg,jpeg,webp,svg}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
) as Record<string, string>

export const useAlienSymbolsStore = defineStore('alienSymbols', () => {
  const symbols: AlienSymbol[] = Object.entries(images)
    .map(([path, src]) => {
      const pathParts = path.split('/')
      const categoryName = pathParts.at(-2)
      const filename = pathParts.at(-1)
      let category: AlienSymbol['category']
      if (
        categoryName === 'easy' ||
        categoryName === 'medium' ||
        categoryName === 'hard'
      ) {
        category = categoryName
      } else {
        throw new Error(`Unknown symbol category in asset path: ${path}`)
      }

      const id = filename?.replace(/\.[^.]+$/, '')
      if (!id) throw new Error(`Invalid symbol asset path: ${path}`)

      return {
        id: `${category}/${id}`,
        category,
        src,
      }
    })
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
