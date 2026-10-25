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
  const symbols: AlienSymbol[] = Object.entries(images).map(
    ([path, src]) => {
      const [, category, filename] = path.match(
        /\/(easy|medium|hard)\/([^/]+)$/,
      )!

      if (!filename) {
        throw new Error(`Invalid symbol asset path`)
      }

      const id = `${category}/${filename.replace(/\.[^.]+$/, '')}`

      return {
        id,
        category: category as AlienSymbol['category'],
        src,
      }
    },
  )

  function getSymbol(id: string) {
    return symbols.find((symbol) => symbol.id === id)
  }

  function getImage(id: string) {
    return getSymbol(id)?.src
  }

  return { symbols, getSymbol, getImage }
})