<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useGameStore } from "../stores/game";
import { useAlienSymbolsStore } from "../stores/alienSymbols";
import { socket } from "../socket";

const result = ref<boolean | null>(null);

const gameStore = useGameStore();
const alienSymbolsStore = useAlienSymbolsStore();

const codeLength = 5;
const code = ref<(string | null)[]>(Array(codeLength).fill(null));

const symbols = computed(() =>
  gameStore.availableSymbols
    .map((id) => alienSymbolsStore.getSymbol(id))
    .filter((symbol) => symbol !== undefined),
);

function addSymbol(symbolId: string) {
  result.value = null;

  const index = code.value.findIndex((s) => s === null);
  if (index !== -1) {
    code.value[index] = symbolId;
  }
}

function removeSymbol(index: number) {
  result.value = null;
  code.value[index] = null;
}

function clearCode() {
  result.value = null;
  code.value = Array(codeLength).fill(null);
}

function unlockVault() {
  if (code.value.some((symbol) => symbol === null)) return;

  socket.emit("submit-code", {
    roomCode: gameStore.roomCode,
    code: code.value,
  });
}

function handleCodeResult(data: { isCorrect: boolean }) {
  result.value = data.isCorrect;
}

onMounted(() => {
  socket.on("code-result", handleCodeResult);
});

onUnmounted(() => {
  socket.off("code-result", handleCodeResult);
});
</script>

<template>
  <main class="min-h-screen bg-gray-50 text-gray-900">
    <header class="border-b border-gray-200 bg-white">
      <div
        class="mx-auto flex h-16 max-w-3xl items-center justify-between px-5"
      >
        <span class="text-lg font-bold tracking-wider">VOIDLOCK</span>
        <span class="text-sm text-gray-500">Alien Vault</span>
      </div>
    </header>

    <div class="mx-auto max-w-xl px-5 py-12">
      <div class="mb-8">
        <p class="mb-2 text-sm font-medium text-gray-500">
          UNKNOWN ARTIFACT · 001
        </p>

        <h1 class="text-3xl font-bold tracking-tight">Alien Vault</h1>

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
            v-for="(symbolId, index) in code"
            :key="index"
            type="button"
            class="flex h-14 w-12 items-center justify-center rounded-lg border p-2 transition sm:h-16 sm:w-14"
            :class="
              symbolId
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            "
            :aria-label="
              symbolId
                ? `Remove symbol ${index + 1}`
                : `Empty slot ${index + 1}`
            "
            @click="removeSymbol(index)"
          >
            <img
              v-if="symbolId && alienSymbolsStore.getImage(symbolId)"
              :src="alienSymbolsStore.getImage(symbolId)"
              :alt="symbolId"
              class="h-full w-full object-contain"
            />
            <span v-else class="text-xl text-gray-400">—</span>
          </button>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            :disabled="code.some((s) => s === null)"
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

        <p
          v-if="result !== null"
          class="mt-4 rounded-lg p-3 text-center text-sm font-medium"
          :class="
            result ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          "
        >
          {{
            result
              ? "Vault unlocked! Correct code."
              : "Incorrect code. Try again."
          }}
        </p>
      </section>

      <section class="mt-8">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-semibold">Available alien symbols</h2>

          <span class="text-sm text-gray-500">
            {{ symbols.length }} symbols
          </span>
        </div>

        <div class="grid grid-cols-4 gap-3 sm:grid-cols-6">
          <button
            v-for="symbol in symbols"
            :key="symbol.id"
            type="button"
            class="flex aspect-square items-center justify-center rounded-lg border border-gray-200 bg-white p-3 transition hover:border-teal-500 hover:bg-teal-50 active:bg-teal-100"
            :aria-label="`Add symbol ${symbol.id}`"
            @click="addSymbol(symbol.id)"
          >
            <img
              :src="symbol.src"
              :alt="symbol.id"
              class="h-full w-full object-contain"
            />
          </button>
        </div>

        <p class="mt-4 text-center text-sm text-gray-500">
          Tap a symbol to add it to your sequence.
        </p>
      </section>
    </div>
  </main>
</template>
