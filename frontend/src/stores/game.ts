
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const level = ref(0)
  const availableSymbols = ref<string[]>([])
  const secretCode = ref<string[]>([])
  const roomCode = ref("")

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
  }

  function setSecretCode(sequence: string[]) {
    secretCode.value = sequence
  }

  return {
    level,
    availableSymbols,
    secretCode,
    roomCode,
    setLevel,
    setSecretCode,
    setRoomCode
  }
})
