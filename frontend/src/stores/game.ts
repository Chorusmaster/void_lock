
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const level = ref(0)
  const availableSymbols = ref<string[]>([])
  const secretCode = ref<string[]>([])
  const roomCode = ref("")
  const timerEndsAt = ref<number | null>(null)

  function setRoomCode(code: string) {
    roomCode.value = code
  }

  function setLevel(data: {
    level: number
    availableSymbols: string[]
  }) {
    level.value = data.level
    availableSymbols.value = data.availableSymbols
    secretCode.value = []
    timerEndsAt.value = null
  }

  function setTimerEndsAt(endsAt: number | null) {
    timerEndsAt.value = endsAt
  }

  function setSecretCode(sequence: string[]) {
    secretCode.value = sequence
  }

  function resetGame() {
    level.value = 0
    availableSymbols.value = []
    secretCode.value = []
    timerEndsAt.value = null
  }

  return {
    level,
    availableSymbols,
    secretCode,
    roomCode,
    timerEndsAt,
    setLevel,
    setSecretCode,
    setRoomCode,
    setTimerEndsAt,
    resetGame
  }
})
