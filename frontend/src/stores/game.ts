
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const level = ref(0)
  const availableSymbols = ref<string[]>([])
  const glitchIntensity = ref(0.5)
  const secretCode = ref<string[]>([])
  const roomCode = ref("")
  const timerEndsAt = ref<number | null>(null)
  const timerDurationSeconds = ref(0)

  function setRoomCode(code: string) {
    roomCode.value = code
  }

  function setLevel(data: {
    level: number
    availableSymbols: string[]
    glitchIntensity: number
  }) {
    level.value = data.level
    availableSymbols.value = data.availableSymbols
    glitchIntensity.value = data.glitchIntensity
    secretCode.value = []
    timerEndsAt.value = null
    timerDurationSeconds.value = 0
  }

  function setTimerEndsAt(endsAt: number | null) {
    timerEndsAt.value = endsAt
  }

  function setTimerDurationSeconds(durationSeconds: number) {
    timerDurationSeconds.value = durationSeconds
  }

  function setSecretCode(sequence: string[]) {
    secretCode.value = sequence
  }

  function resetGame() {
    level.value = 0
    availableSymbols.value = []
    glitchIntensity.value = 0.5
    secretCode.value = []
    timerEndsAt.value = null
    timerDurationSeconds.value = 0
  }

  return {
    level,
    availableSymbols,
    glitchIntensity,
    secretCode,
    roomCode,
    timerEndsAt,
    timerDurationSeconds,
    setLevel,
    setSecretCode,
    setRoomCode,
    setTimerEndsAt,
    setTimerDurationSeconds,
    resetGame
  }
})
