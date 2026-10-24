<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { useAlienSymbolsStore } from '@/stores/alienSymbols'

const gameStore = useGameStore()
const alienSymbolsStore = useAlienSymbolsStore()

const symbols = computed(() =>
  gameStore.secretCode.map((id) => ({
    id,
    image: alienSymbolsStore.getImage(id),
  })),
)
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
    <div class="w-full max-w-3xl text-center">
      <p class="mb-3 text-sm uppercase tracking-[0.3em] text-slate-500">
        Transmission sequence
      </p>

      <h1 class="mb-12 text-3xl font-bold">Alien Code</h1>

      <div class="grid grid-cols-5 gap-3 sm:gap-5">
        <div
          v-for="(symbol, index) in symbols"
          :key="index"
          class="flex aspect-square items-center justify-center rounded-2xl border border-cyan-900 bg-slate-900 p-3 shadow-lg shadow-cyan-950/20"
        >
          <img
            v-if="symbol.image"
            :src="symbol.image"
            :alt="symbol.id"
            class="h-full w-full object-contain"
          />

          <span v-else class="text-sm text-red-400">
            {{ symbol.id || '?' }}
          </span>
        </div>
      </div>

      <p class="mt-10 text-sm text-slate-400">
        Describe the symbols to your partner in the correct order.
      </p>
    </div>
  </main>
</template>