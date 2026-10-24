import { SYMBOL_IDS } from './symbols.js'

export function getRandomSymbols(count) {
  if (count < 1 || count > SYMBOL_IDS.length) {
    throw new Error('Invalid number of symbols')
  }

  const shuffled = [...SYMBOL_IDS]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}

export function generateSequence(availableSymbols, length) {
  if (
    availableSymbols.length === 0 ||
    !Number.isInteger(length) ||
    length < 1
  ) {
    throw new Error('Invalid sequence parameters')
  }

  return Array.from(
    { length },
    () => availableSymbols[
      Math.floor(Math.random() * availableSymbols.length)
    ],
  )
}