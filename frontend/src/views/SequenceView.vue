<script setup lang="ts">
const secretCode = ['⌘', '⟁', '⋔', '⍟', '⌖']
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"
  >
    <div class="w-full max-w-3xl text-center">
      <p class="mb-3 text-sm uppercase tracking-[0.3em] text-slate-500">
        Transmission sequence
      </p>

      <h1 class="mb-12 text-3xl font-bold">
        Alien Code
      </h1>

      <div class="grid grid-cols-5 gap-3 sm:gap-5">
        <div
          v-for="(symbol, index) in secretCode"
          :key="index"
          class="flex aspect-square items-center justify-center rounded-2xl border border-cyan-900 bg-slate-900 text-4xl text-cyan-300 shadow-lg shadow-cyan-950/20 sm:text-6xl"
        >
          {{ symbol }}
        </div>
      </div>

      <p class="mt-10 text-sm text-slate-400">
        Describe the symbols to your partner in the correct order.
      </p>
    </div>
  </main>
</template>