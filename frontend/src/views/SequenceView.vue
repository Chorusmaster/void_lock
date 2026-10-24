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
  <main
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6 text-slate-100"
  >
    <img
      src="/images/sequence-background.png"
      alt=""
      class="absolute inset-0 h-full w-full object-cover"
    />

    <!-- Dark overlay -->
    <div class="absolute inset-0 bg-slate-950/60"></div>

    <!-- Main content -->
    <div class="relative z-10 bottom-18 right-14 w-full max-w-3xl text-center">
      <div class="grid grid-cols-5 gap-3 sm:gap-5">
        <div
          v-for="(symbol, index) in symbols"
          :key="index"
          class="flex aspect-square items-center justify-center p-3 shadow-lg backdrop-blur-sm"
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
    </div>
  </main>
</template>