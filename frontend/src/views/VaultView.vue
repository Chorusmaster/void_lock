
<script setup lang="ts">
import { ref } from 'vue'

const symbols = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')
const codeLength = 5

const code = ref<(string | null)[]>(
  Array(codeLength).fill(null)
)

function addSymbol(symbol: string) {
  const index = code.value.findIndex(s => s === null)
  if (index !== -1) code.value[index] = symbol
}

function removeSymbol(index: number) {
  code.value[index] = null
}

function clearCode() {
  code.value = Array(codeLength).fill(null)
}

function unlockVault() {
  if (code.value.some(s => s === null)) return

  console.log('Entered code:', code.value.join(''))
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 text-gray-900">
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <span class="text-lg font-bold tracking-wider">VOIDLOCK</span>
        <span class="text-sm text-gray-500">Alien Vault</span>
      </div>
    </header>

    <div class="mx-auto max-w-xl px-5 py-12">
      <div class="mb-8">
        <p class="mb-2 text-sm font-medium text-gray-500">
          UNKNOWN ARTIFACT · 001
        </p>
        <h1 class="text-3xl font-bold tracking-tight">
          Alien Vault
        </h1>
        <p class="mt-2 text-gray-600">
          Select five symbols to unlock the vault.
        </p>
      </div>

      <section class="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="font-semibold">Your sequence</h2>
          <span class="text-sm text-gray-500">
            {{ code.filter(Boolean).length }} / {{ codeLength }}
          </span>
        </div>

        <div class="mb-6 flex justify-center gap-2 sm:gap-3">
          <button
            v-for="(symbol, index) in code"
            :key="index"
            type="button"
            class="flex h-14 w-12 items-center justify-center rounded-lg border text-xl font-semibold transition sm:h-16 sm:w-14"
            :class="symbol
              ? 'border-teal-500 bg-teal-50 text-teal-800'
              : 'border-gray-300 bg-gray-50 text-gray-400 hover:border-gray-400'"
            :aria-label="symbol ? `Remove ${symbol}` : `Empty slot ${index + 1}`"
            @click="removeSymbol(index)"
          >
            {{ symbol ?? '—' }}
          </button>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            :disabled="code.some(s => s === null)"
            @click="unlockVault"
          >
            Unlock vault
          </button>

          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="clearCode"
          >
            Clear
          </button>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-semibold">Alien symbols</h2>
          <span class="text-sm text-gray-500">
            {{ symbols.length }} symbols
          </span>
        </div>

        <div class="grid grid-cols-4 gap-3 sm:grid-cols-6">
          <button
            v-for="symbol in symbols"
            :key="symbol"
            type="button"
            class="flex aspect-square items-center justify-center rounded-lg border border-gray-200 bg-white text-xl font-semibold transition hover:border-teal-500 hover:bg-teal-50 active:bg-teal-100"
            @click="addSymbol(symbol)"
          >
            {{ symbol }}
          </button>
        </div>

        <p class="mt-4 text-center text-sm text-gray-500">
          Tap a symbol to add it to your sequence.
        </p>
      </section>
    </div>
  </main>
</template>
