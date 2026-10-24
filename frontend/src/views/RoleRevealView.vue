<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { socket } from '../socket'
import { usePlayerStore, type PlayerRole } from '../stores/player'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()

const seconds = ref(5)
const role = computed(() => playerStore.role ?? '')
const roomCode = computed(() => String(route.params.roomCode ?? ''))

let timer: ReturnType<typeof setInterval> | undefined

function handleStartLevel(data: {
  level: number
  availableSymbols: string[]
}) {
  if (timer) clearInterval(timer)

  gameStore.setLevel(data)

  router.replace({
    name: 'game',
    params: { roomCode: roomCode.value },
  })
}

onMounted(() => {
  const startAt = Number(route.query.startAt)

  if (!role.value || !Number.isFinite(startAt) || startAt <= 0) {
    router.replace({ name: 'lobby' })
    return
  }

  const updateCountdown = () => {
    seconds.value = Math.max(
      0,
      Math.ceil((startAt - Date.now()) / 1000),
    )
  }

  updateCountdown()
  timer = setInterval(updateCountdown, 100)

  socket.on('level-started', handleStartLevel)
})

onUnmounted(() => {
  socket.off('level-started', handleStartLevel)

  if (timer) clearInterval(timer)
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
    <section class="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
      <p class="text-sm uppercase tracking-[0.3em] text-gray-400">
        Your assigned role
      </p>

      <h1 class="mt-6 text-4xl font-bold">
        {{ role }}
      </h1>

      <p class="mt-4 text-gray-400">
        {{
          role === 'Decoder'
            ? 'Decode the alien symbols and guide your teammate.'
            : 'Listen to your teammate and enter the correct code.'
        }}
      </p>

      <div class="mx-auto mt-8 flex size-20 items-center justify-center rounded-full border-4 border-gray-700">
        <span class="text-3xl font-semibold tabular-nums">
          {{ seconds }}
        </span>
      </div>

      <p class="mt-4 text-sm text-gray-500">
        Entering the game...
      </p>
    </section>
  </main>
</template>